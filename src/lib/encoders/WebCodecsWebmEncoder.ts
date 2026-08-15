import { WorkerEncoderAdapter } from "./workerAdapter";
import type { ExportSettings } from "@/types/encoder";

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

  override async isSupported(settings?: ExportSettings): Promise<boolean> {
    if (typeof Worker === "undefined" || typeof VideoEncoder === "undefined") {
      return false;
    }
    const width = settings?.width ?? 1280;
    const height = settings?.height ?? 720;
    try {
      for (const codec of [
        "vp09.00.10.08",
        "vp09.00.41.08",
        "vp8",
      ]) {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width,
          height,
          bitrate: 16_000_000,
          framerate: settings?.fps ?? 30,
        });
        if (support.supported) return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}