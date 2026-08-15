import type { ExportSettings } from "@/types/encoder";

/**
 * Dedicated worker hosting FFmpeg.wasm.
 *
 * FFmpeg is lazy-loaded (and only loaded when a job actually needs it). The
 * core is fetched from a CDN at runtime, so it may fail in offline
 * environments — in that case a clear ERROR is reported and the caller offers
 * fallback formats.
 */

type InitMessage = {
  type: "INIT";
  settings: ExportSettings;
  outputFormat: "mov" | "mp4" | "webm";
};

type FrameMessage = {
  type: "FRAME";
  index: number;
  frame: ImageBitmap;
};

type ControlMessage = { type: "FINALIZE" } | { type: "CANCEL" };

interface HmrWorkerGlobalScope {
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
}

const scope = self as unknown as HmrWorkerGlobalScope;

function post(message: unknown, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

type FFmpegInstance = {
  loaded: boolean;
  load: () => Promise<unknown>;
  writeFile: (name: string, data: Uint8Array) => Promise<unknown>;
  readFile: (name: string) => Promise<Uint8Array>;
  exec: (args: string[]) => Promise<unknown>;
  deleteFile: (name: string) => Promise<unknown>;
  terminate: () => void;
};

let ffmpeg: FFmpegInstance | null = null;
let initialized = false;
let cancelled = false;
let settings: ExportSettings | null = null;
let frameFiles: string[] = [];
let hasFrames = false;

/** Serializes frame writes and finalization inside the worker. */
let chain: Promise<unknown> = Promise.resolve();

async function ensureFfmpeg() {
  if (ffmpeg) return ffmpeg;
  const mod = (await import("@ffmpeg/ffmpeg")) as {
    FFmpeg: new () => FFmpegInstance;
  };
  if (typeof mod.FFmpeg !== "function") {
    throw new Error("FFmpeg.wasm did not load (invalid module)");
  }
  ffmpeg = new mod.FFmpeg();
  await ffmpeg.load();
  return ffmpeg;
}

async function addFrame(frame: ImageBitmap, index: number) {
  if (!ffmpeg) throw new Error("FFmpeg not initialized");
  const canvas = new OffscreenCanvas(frame.width, frame.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D context");
  ctx.clearRect(0, 0, frame.width, frame.height);
  ctx.drawImage(frame, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const name = `frame_${String(index).padStart(5, "0")}.png`;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await ffmpeg.writeFile(name, bytes);
  frameFiles.push(name);
  hasFrames = true;
  frame.close();
}

async function runFinalize(): Promise<Blob> {
  if (!ffmpeg) throw new Error("FFmpeg not initialized");
  if (!settings) throw new Error("Missing export settings");
  if (!hasFrames) throw new Error("No frames were received");

  const fps = settings.fps;
  const codec =
    settings.format === "mov" ? "mpeg4" : settings.format === "webm" ? "libvpx-vp9" : "libx264";

  const args = [
    "-y",
    "-framerate",
    String(fps),
    "-i",
    "frame_%05d.png",
    "-c:v",
    codec,
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
  ];

  // Respect the user's quality selection instead of libx264's lossy default CRF.
  const crfByQuality: Record<string, number> = {
    low: 23,
    medium: 20,
    high: 18,
    "very-high": 15,
  };
  const crf = crfByQuality[settings.quality] ?? 18;
  const width = settings.width;
  const height = settings.height;
  const pixels = width * height;
  const bitrateKbps = Math.round((16_000_000 * (pixels / (1920 * 1080))) / 1000);

  if (settings.format === "webm") {
    args.push("-crf", String(crf), "-b:v", `${bitrateKbps}k`, "-deadline", "good", "-cpu-used", "4");
  } else if (settings.format === "mov") {
    args.push("-q:v", "5");
  } else {
    args.push("-crf", String(crf), "-preset", "medium");
  }

  args.push("output.mov");

  await ffmpeg.exec(args);
  const data = await ffmpeg.readFile("output.mov");

  let type = "video/mp4";
  if (settings.format === "mov") type = "video/quicktime";
  if (settings.format === "webm") type = "video/webm";

  const bytes = data.slice(0);
  return new Blob([bytes], { type });
}

function cleanup() {
  for (const name of frameFiles) {
    try {
      ffmpeg?.deleteFile(name);
    } catch {
      /* ignore */
    }
  }
  frameFiles = [];
}

self.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as InitMessage | FrameMessage | ControlMessage;
  if (!data || typeof data !== "object" || !("type" in data)) return;

  switch (data.type) {
    case "INIT": {
      cancelled = false;
      chain = Promise.resolve();
      settings = data.settings;
      void ensureFfmpeg()
        .then(() => {
          initialized = true;
          post({ type: "READY" });
        })
        .catch((error) => {
          post({
            type: "ERROR",
            message: `FFmpeg.wasm unavailable: ${String(error?.message ?? error)}. ` +
              "A network connection is required to fetch the FFmpeg core. " +
              "Fallback: MP4, WebM, PNG Sequence.",
          });
        });
      break;
    }

    case "FRAME": {
      if (!initialized || cancelled) return;
      chain = chain
        .then(() => addFrame(data.frame, data.index))
        .catch((error) => post({ type: "ERROR", message: String(error?.message ?? error) }));
      break;
    }

    case "FINALIZE": {
      if (!initialized || cancelled) {
        post({ type: "ERROR", message: "FFmpeg is not initialized" });
        return;
      }
      chain = chain
        .then(() => runFinalize())
        .then((blob) => post({ type: "DONE", blob }))
        .catch((error) => post({ type: "ERROR", message: String(error?.message ?? error) }));
      break;
    }

    case "CANCEL": {
      cancelled = true;
      chain = Promise.resolve();
      cleanup();
      try {
        ffmpeg?.terminate();
      } catch {
        /* ignore */
      }
      ffmpeg = null;
      initialized = false;
      break;
    }
  }
});

export {};