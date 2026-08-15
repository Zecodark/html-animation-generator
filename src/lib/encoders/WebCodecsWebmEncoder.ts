import { WorkerEncoderAdapter } from "./workerAdapter";

/**
 * WebM via WebCodecs (VP9 with VP8 fallback) muxed with webm-muxer inside a
 * worker. The most reliable deterministic WebM pipeline available.
 */
export class WebCodecsWebmEncoder extends WorkerEncoderAdapter {
  readonly name = "WebCodecs WebM (VP9)";

  protected createWorker(): Worker {
    return new Worker(new URL("../../workers/renderer.worker.ts", import.meta.url), {
      type: "module",
    });
  }

  protected initPayload() {
    return { kind: "webm" };
  }

  override async isSupported(): Promise<boolean> {
    if (typeof Worker === "undefined" || typeof VideoEncoder === "undefined") {
      return false;
    }
    try {
      for (const codec of [
        "vp09.00.10.08",
        "vp09.00.41.08",
        "vp8",
      ]) {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width: 1280,
          height: 720,
          bitrate: 4_000_000,
          framerate: 30,
        });
        if (support.supported) return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}