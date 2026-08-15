import { WorkerEncoderAdapter } from "./workerAdapter";
import type { ExportSettings } from "@/types/encoder";

/**
 * MP4 + H.264 via WebCodecs and mp4-muxer, running inside a worker.
 * Requires WebCodecs H.264 support (capability-detected).
 */
export class WebCodecsMp4Encoder extends WorkerEncoderAdapter {
  readonly name = "WebCodecs MP4 (H.264)";

  protected createWorker(): Worker {
    return new Worker(new URL("../../workers/renderer.worker.ts", import.meta.url), {
      type: "module",
    });
  }

  protected initPayload() {
    return { kind: "mp4" };
  }

  override async isSupported(settings?: ExportSettings): Promise<boolean> {
    if (typeof Worker === "undefined" || typeof VideoEncoder === "undefined") {
      return false;
    }
    const width = settings?.width ?? 1280;
    const height = settings?.height ?? 720;
    try {
      for (const codec of ["avc1.640033", "avc1.640032", "avc1.640028", "avc1.4D0028", "avc1.42E01E"]) {
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