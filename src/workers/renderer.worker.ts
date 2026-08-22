import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from "webm-muxer";
import { GIFEncoder, quantize, applyPalette, prequantize } from "gifenc";
import JSZip from "jszip";
import type { ExportSettings, QualityLevel } from "@/types/encoder";

/**
 * Dedicated worker that turns deterministic ImageBitmaps into finalized
 * assets:
 *
 *   mp4          WebCodecs H.264 -> mp4-muxer
 *   webm         WebCodecs VP9/VP8 -> webm-muxer
 *   gif          gifenc (palette / transparency aware)
 *   png-sequence PNG frames -> JSZip archive
 *
 * Communicates with the main thread via postMessage.
 */

type InitMessage = {
  type: "INIT";
  kind: "mp4" | "webm" | "gif" | "png-sequence";
  settings: ExportSettings;
};

type FrameMessage = {
  type: "FRAME";
  index: number;
  timestampMs: number;
  frame: ImageBitmap;
};

type ControlMessage = { type: "FINALIZE" } | { type: "CANCEL" };

interface HmrWorkerGlobalScope {
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
}

const scope = self as unknown as HmrWorkerGlobalScope;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function post(message: unknown, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

function calcBitrate(
  quality: QualityLevel,
  width: number,
  height: number
): number {
  // Raised base bitrates so smooth gradients (glow / soft shadows / blur) do
  // not band or block at 1080p-equivalent content.
  const base =
    quality === "low"
      ? 4_000_000
      : quality === "medium"
        ? 8_000_000
        : quality === "high"
          ? 16_000_000
          : 24_000_000;
  const pixels = width * height;
  return Math.round((base * pixels) / (1920 * 1080));
}

// H.264 profile candidates ordered by quality/capability. Level 5.1 is
// required for 3840x2160 / 4096x2160 (Level 4.0 tops out at 1080p and causes
// 4K exports to fail). Prefer High (64) over Main (4D) / Baseline (42).
const H264_CODECS = [
  "avc1.640033", // High 5.1  (4K capable)
  "avc1.640032", // High 5.0
  "avc1.640028", // High 4.0  (1080p)
  "avc1.4D0028", // Main 4.0
  "avc1.42E01E", // Baseline 3.0
];

function gifMaxColors(quality: QualityLevel): number {
  return quality === "low"
    ? 64
    : quality === "medium"
      ? 128
      : quality === "high"
        ? 256
        : 256;
}

interface Renderer {
  addFrame(bitmap: ImageBitmap, index: number, timestampMs: number): Promise<void>;
  finalize(): Promise<Blob>;
  dispose(): void;
}

class Mp4Renderer implements Renderer {
  private encoder: VideoEncoder | null = null;
  private muxer: Muxer<ArrayBufferTarget> | null = null;
  private width: number;
  private height: number;
  private fps: number;
  private keyframeInterval: number;
  private bg: string | null;
  private quality: QualityLevel;
  private codec = "";

  constructor(settings: ExportSettings) {
    this.width = settings.width;
    this.height = settings.height;
    this.fps = settings.fps;
    this.quality = settings.quality;
    this.keyframeInterval = Math.max(1, Math.round(settings.fps));
    this.bg = settings.transparent ? null : settings.backgroundColor ?? "#000000";
  }

  async init() {
    if (typeof VideoEncoder === "undefined") {
      throw new Error("WebCodecs VideoEncoder is not available in this browser");
    }
    const { width, height, fps } = this;
    const bitrate = calcBitrate(this.quality, width, height);

    let codec = H264_CODECS[0];
    let config: VideoEncoderConfig | null = null;
    for (const candidate of H264_CODECS) {
      const attempt: VideoEncoderConfig = {
        codec: candidate,
        width,
        height,
        bitrate,
        framerate: fps,
        latencyMode: "quality",
      };
      try {
        const support = await VideoEncoder.isConfigSupported(attempt);
        if (support.supported) {
          codec = candidate;
          config = attempt;
          break;
        }
      } catch {
        /* try next */
      }
    }

    if (!config) {
      throw new Error("H.264 (avc1) encoding is not supported here");
    }
    this.codec = codec;

    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width, height },
      fastStart: false,
      firstTimestampBehavior: "offset",
    });

    this.encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        this.muxer?.addVideoChunk(chunk, metadata);
      },
      error: (error) => {
        console.error("[renderer-worker] MP4 encoder error", error);
      },
    });
    this.encoder.configure(config);
  }

  async addFrame(bitmap: ImageBitmap, index: number, timestampMs: number) {
    if (!this.encoder || !this.muxer) throw new Error("MP4 renderer not initialized");
    const usPerFrame = Math.round(1e6 / this.fps);
    // Always re-render at the renderer's exact size. A HiDPI capture
    // (pixelRatio > 1) produces a larger bitmap; feeding it straight to the
    // encoder mismatches the configured resolution and breaks the stream.
    const source = drawOnBackground(bitmap, this.width, this.height, this.bg);

    const frame = new VideoFrame(source, {
      timestamp: Math.round(timestampMs * 1000),
      duration: usPerFrame,
    });
    this.encoder.encode(frame, { keyFrame: index % this.keyframeInterval === 0 });
    frame.close();
    (source as OffscreenCanvas).width = 0;
    bitmap.close();
  }

  async finalize(): Promise<Blob> {
    if (!this.encoder || !this.muxer) throw new Error("MP4 renderer not initialized");
    await this.encoder.flush();
    this.muxer.finalize();
    const buffer = this.muxer.target.buffer as ArrayBuffer;
    return new Blob([buffer], { type: "video/mp4" });
  }

  dispose() {
    try {
      this.encoder?.close();
    } catch {
      /* already closed */
    }
    this.encoder = null;
    this.muxer = null;
  }
}

class WebmRenderer implements Renderer {
  private encoder: VideoEncoder | null = null;
  private muxer: WebmMuxer<WebmTarget> | null = null;
  private width: number;
  private height: number;
  private fps: number;
  private keyframeInterval: number;
  private bg: string | null;
  private quality: QualityLevel;
  private codec = "";

  constructor(settings: ExportSettings) {
    this.width = settings.width;
    this.height = settings.height;
    this.fps = settings.fps;
    this.quality = settings.quality;
    this.keyframeInterval = Math.max(1, Math.round(settings.fps));
    this.bg = settings.transparent ? null : settings.backgroundColor ?? "#000000";
  }

  async init() {
    if (typeof VideoEncoder === "undefined") {
      throw new Error("WebCodecs VideoEncoder is not available in this browser");
    }
    const { width, height, fps } = this;
    const bitrate = calcBitrate(this.quality, width, height);

    const candidates = ["vp09.00.10.08", "vp09.00.41.08", "vp8"];
    let config: VideoEncoderConfig | null = null;
    for (const codec of candidates) {
      const candidate: VideoEncoderConfig = {
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
        latencyMode: "quality",
        alpha: this.bg === null ? "keep" : "discard",
      };
      try {
        const support = await VideoEncoder.isConfigSupported(candidate);
        if (support.supported) {
          config = candidate;
          this.codec = codec.startsWith("vp8") ? "V_VP8" : "V_VP9";
          break;
        }
      } catch {
        /* try next */
      }
    }

    if (!config) {
      throw new Error("WebCodecs VP9/VP8 encoding is not supported here");
    }

    this.muxer = new WebmMuxer({
      target: new WebmTarget(),
      video: { codec: this.codec, width, height },
      firstTimestampBehavior: "offset",
    });

    this.encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        this.muxer?.addVideoChunk(chunk, metadata);
      },
      error: (error) => {
        console.error("[renderer-worker] WebM encoder error", error);
      },
    });
    this.encoder.configure(config);
  }

  async addFrame(bitmap: ImageBitmap, index: number, timestampMs: number) {
    if (!this.encoder || !this.muxer) throw new Error("WebM renderer not initialized");
    const usPerFrame = Math.round(1e6 / this.fps);
    // Always re-render at the renderer's exact size (see MP4 renderer).
    const source = drawOnBackground(bitmap, this.width, this.height, this.bg);

    const frame = new VideoFrame(source, {
      timestamp: Math.round(timestampMs * 1000),
      duration: usPerFrame,
    });
    this.encoder.encode(frame, { keyFrame: index % this.keyframeInterval === 0 });
    frame.close();
    (source as OffscreenCanvas).width = 0;
    bitmap.close();
  }

  async finalize(): Promise<Blob> {
    if (!this.encoder || !this.muxer) throw new Error("WebM renderer not initialized");
    await this.encoder.flush();
    this.muxer.finalize();
    const buffer = this.muxer.target.buffer as ArrayBuffer;
    return new Blob([buffer], { type: "video/webm" });
  }

  dispose() {
    try {
      this.encoder?.close();
    } catch {
      /* already closed */
    }
    this.encoder = null;
    this.muxer = null;
  }
}

class GifRenderer implements Renderer {
  private encoder: GIFEncoder = GIFEncoder();
  private width: number;
  private height: number;
  private fps: number;
  private maxColors: number;
  private transparent: boolean;
  private bg: string | null;
  private processed = 0;

  constructor(settings: ExportSettings) {
    this.width = settings.width;
    this.height = settings.height;
    this.fps = settings.fps;
    this.maxColors = gifMaxColors(settings.quality);
    this.transparent = settings.transparent;
    this.bg = settings.transparent ? null : settings.backgroundColor ?? "#000000";
  }

  async addFrame(bitmap: ImageBitmap) {
    const canvas = drawOnBackground(bitmap, this.width, this.height, this.bg);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not acquire 2D context");
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const rgba = imageData.data;

    const format = this.transparent ? "rgba4444" : "rgb565";

    if (this.transparent) {
      // GIF only supports 1-bit alpha. Snap every pixel's alpha to 0/255
      // BEFORE quantization (the ffmpeg equivalent of
      // paletteuse=alpha_threshold=128) so anti-aliased (semi-transparent)
      // edge pixels can never become a translucent palette color.
      prequantize(rgba, { oneBitAlpha: 127 });
    }

    const palette = quantize(rgba, this.maxColors, {
      format,
      ...(this.transparent ? { clearAlpha: true, clearAlphaColor: 0 } : {}),
    });
    const index = applyPalette(rgba, palette, format);

    let transparent = false;
    let transparentIndex = 0;
    if (this.transparent) {
      // Find a fully transparent palette entry (the reserved transparency
      // slot). gifenc's merge step can skip alpha, so guarantee one exists.
      transparentIndex = -1;
      for (let i = 0; i < palette.length; i++) {
        const entry = palette[i];
        if (entry.length === 4 && entry[3] === 0) {
          transparentIndex = i;
          break;
        }
      }
      if (transparentIndex < 0) {
        palette.push([0, 0, 0, 0]);
        transparentIndex = palette.length - 1;
      }
      transparent = true;

      // Force every fully-transparent source pixel to the reserved index.
      // Nearest-color matching alone can snap them to an opaque entry (RGB
      // distance beats alpha distance), which is what caused the dark halo.
      const view = new Uint32Array(rgba.buffer, rgba.byteOffset, rgba.byteLength >>> 2);
      for (let i = 0; i < view.length; i++) {
        if (((view[i] >>> 24) & 0xff) === 0) index[i] = transparentIndex;
      }
    }

    this.encoder.writeFrame(index, this.width, this.height, {
      palette,
      delay: Math.max(1, Math.round(1000 / this.fps)),
      transparent,
      transparentIndex,
      repeat: 0,
    });
    this.processed += 1;
    bitmap.close();
  }

  async finalize(): Promise<Blob> {
    if (this.processed === 0) {
      throw new Error("GIF renderer received no frames");
    }
    this.encoder.finish();
    const bytes = this.encoder.bytes();
    return new Blob([bytes as BlobPart], { type: "image/gif" });
  }

  dispose() {
    // nothing to release - encoded output already produced
  }
}

class PngSequenceRenderer implements Renderer {
  private zip: JSZip = new JSZip();
  private width: number;
  private height: number;
  private bg: string | null;
  private processed = 0;

  constructor(settings: ExportSettings) {
    this.width = settings.width;
    this.height = settings.height;
    this.bg = settings.transparent ? null : settings.backgroundColor ?? null;
  }

  async addFrame(bitmap: ImageBitmap, index: number) {
    const canvas = drawOnBackground(bitmap, this.width, this.height, this.bg);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const name = `frame_${String(index).padStart(5, "0")}.png`;
    this.zip.file(name, blob);
    this.processed += 1;
    bitmap.close();
  }

  async finalize(): Promise<Blob> {
    if (this.processed === 0) throw new Error("PNG renderer received no frames");
    return this.zip.generateAsync({
      type: "blob",
      compression: "STORE",
    });
  }

  dispose() {
    this.zip = new JSZip();
  }
}

function drawOnBackground(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  bg: string | null
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D context");
  if (bg && ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

let active: Renderer | null = null;
let cancelled = false;

/** Serializes frame encoding and finalization inside the worker. */
let chain: Promise<unknown> = Promise.resolve();

self.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as InitMessage | FrameMessage | ControlMessage;
  if (!data || typeof data !== "object" || !("type" in data)) return;

  switch (data.type) {
    case "INIT": {
      cancelled = false;
      chain = Promise.resolve();
      try {
        if (data.kind === "mp4") {
          const r = new Mp4Renderer(data.settings);
          active = r;
          void r.init().then(
            () => post({ type: "READY" }),
            (error) => post({ type: "ERROR", message: String(error?.message ?? error) })
          );
        } else if (data.kind === "webm") {
          const r = new WebmRenderer(data.settings);
          active = r;
          void r.init().then(
            () => post({ type: "READY" }),
            (error) => post({ type: "ERROR", message: String(error?.message ?? error) })
          );
        } else if (data.kind === "gif") {
          active = new GifRenderer(data.settings);
          post({ type: "READY" });
        } else if (data.kind === "png-sequence") {
          active = new PngSequenceRenderer(data.settings);
          post({ type: "READY" });
        } else {
          post({ type: "ERROR", message: `Unknown renderer kind: ${String((data as InitMessage).kind)}` });
        }
      } catch (error) {
        post({
          type: "ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
      }
      break;
    }

    case "FRAME": {
      if (!active || cancelled) return;
      chain = chain
        .then(() => active?.addFrame(data.frame, data.index, data.timestampMs))
        .then(() => post({ type: "PROGRESS", index: data.index }))
        .catch((error) => post({ type: "ERROR", message: String(error?.message ?? error) }));
      break;
    }

    case "FINALIZE": {
      if (!active) {
        post({ type: "ERROR", message: "Worker has no active renderer" });
        return;
      }
      chain = chain
        .then(() => active?.finalize())
        .then((blob) => post({ type: "DONE", blob }))
        .catch((error) => post({ type: "ERROR", message: String(error?.message ?? error) }));
      break;
    }

    case "CANCEL": {
      cancelled = true;
      chain = Promise.resolve();
      active?.dispose();
      active = null;
      break;
    }
  }
});

export {};
