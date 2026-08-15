import { WorkerEncoderAdapter } from "./workerAdapter";

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

  override async isSupported(): Promise<boolean> {
    if (typeof Worker === "undefined" || typeof VideoEncoder === "undefined") {
      return false;
    }
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec: "avc1.42E01E",
        width: 1280,
        height: 720,
        bitrate: 4_000_000,
        framerate: 30,
      });
      return !!support.supported;
    } catch {
      return false;
    }
  }
}