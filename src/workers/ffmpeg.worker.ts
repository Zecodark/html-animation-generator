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

  // MOV is a container, not a codec: transparent MOV is a NEW isolated path
  // (ProRes 4444 / Animation / PNG all carry alpha). Opaque MOV stays mpeg4.
  if (settings.format === "mov" && settings.transparent) {
    return encodeMovAlpha(fps);
  }

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

  try {
    await ffmpeg.exec(args);
  } catch (error) {
    // Never leave a partial/corrupt file that could be mistaken for success.
    try {
      await ffmpeg.deleteFile("output.mov");
    } catch {
      /* noop */
    }
    throw error;
  }
  const data = await ffmpeg.readFile("output.mov");

  let type = "video/mp4";
  if (settings.format === "mov") type = "video/quicktime";
  if (settings.format === "webm") type = "video/webm";

  const bytes = data.slice(0);
  return new Blob([bytes], { type });
}

/**
 * Transparent MOV (alpha) via an alpha-capable codec in MOV. The frames fed
 * here are RGBA PNGs written by addFrame(), so the alpha is real — no
 * color-key / background-removal tricks, so no halo.
 *
 * Priority:
 *   1. Apple ProRes 4444  (yuva444p10le) — stock/editing standard, efficient.
 *   2. QuickTime Animation (qtrle)       — native QT lossless alpha.
 *   3. PNG in MOV         (rgba)         — lossless, most universal decoder.
 *
 * Any candidate missing from a given FFmpeg.wasm build causes exec() to fail;
 * we then clean the partial and try the next one. If none is available we
 * raise a clear error instead of producing a fake/opaque file. The finished
 * file is decoded back and its alpha plane verified before handing it over.
 */
async function encodeMovAlpha(fps: number): Promise<Blob> {
  if (!ffmpeg) throw new Error("FFmpeg not initialized");

  const candidates: Array<{ label: string; args: string[] }> = [
    {
      label: "Apple ProRes 4444",
      args: ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le"],
    },
    {
      label: "QuickTime Animation",
      args: ["-c:v", "qtrle", "-pix_fmt", "rgba"],
    },
    {
      label: "PNG",
      args: ["-c:v", "png", "-pix_fmt", "rgba"],
    },
  ];

  const base = [
    "-y",
    "-framerate",
    String(fps),
    "-i",
    "frame_%05d.png",
    "-movflags",
    "+faststart",
  ];

  let ok = false;
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    try {
      await ffmpeg.exec([...base, ...cand.args, "output.mov"]);
      ok = true;
      break;
    } catch {
      // Encoder unavailable in this FFmpeg.wasm build (or encode failed).
      try {
        await ffmpeg.deleteFile("output.mov");
      } catch {
        /* noop */
      }
      if (i === candidates.length - 1) {
        throw new Error(
          `Alpha MOV requires an alpha-capable encoder, but none is available in this FFmpeg build: ` +
            `${candidates.map((c) => c.label).join(", ")}. ` +
            `Use PNG Sequence for guaranteed transparency, or check the network connection used to load the FFmpeg core.`
        );
      }
    }
  }
  if (!ok || !ffmpeg) throw new Error("Alpha MOV encoding failed unexpectedly");

  // Verify the alpha plane survived. Decode the first frame back to a PNG and
  // inspect its color type (4 = grey+alpha, 6 = RGBA) — fail loudly otherwise.
  try {
    await ffmpeg.exec([
      "-v",
      "error",
      "-i",
      "output.mov",
      "-frames:v",
      "1",
      "-c:v",
      "png",
      "alpha_check.png",
    ]);
    const bytes = await ffmpeg.readFile("alpha_check.png");
    // PNG: 8-byte sig + IHDR len(4) + "IHDR"(4) + width(4) + height(4) + bitdepth(1) + colortype(1)
    const colorType = bytes.length > 25 ? bytes[25] : 0;
    const hasAlpha = colorType === 4 || colorType === 6;
    if (!hasAlpha) {
      throw new Error("Alpha channel was not detected in rendered frames. Export cancelled.");
    }
  } catch (error) {
    try {
      await ffmpeg.deleteFile("output.mov");
    } catch {
      /* noop */
    }
    throw error instanceof Error && error.message.includes("not detected")
      ? error
      : new Error(`MOV encoding produced a file that could not be validated: ${String((error as Error)?.message ?? error)}`);
  }

  const data = await ffmpeg.readFile("output.mov");
  return new Blob([data.slice(0)], { type: "video/quicktime" });
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