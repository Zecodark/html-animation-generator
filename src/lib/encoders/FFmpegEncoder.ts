import { WorkerEncoderAdapter } from "./workerAdapter";

/**
 * FFmpeg.wasm encoder (MOV, plus MP4/WebM fallback). FFmpeg is lazy-loaded
 * and its core is fetched from a CDN at runtime, so a network connection is
 * required. If loading fails, a clear error is raised and the caller offers
 * the documented fallback formats (see spec §11).
 */
export class FFmpegEncoder extends WorkerEncoderAdapter {
  readonly name = "FFmpeg.wasm";

  protected createWorker(): Worker {
    return new Worker(new URL("../../workers/ffmpeg.worker.ts", import.meta.url), {
      type: "module",
    });
  }

  protected initPayload() {
    return { outputFormat: this.settings?.format ?? "mov" };
  }

  override async isSupported(): Promise<boolean> {
    return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
  }
}