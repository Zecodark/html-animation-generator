import { WorkerEncoderAdapter } from "./workerAdapter";

/**
 * GIF via gifenc inside a worker. Never requires any special browser support.
 */
export class GifEncoder extends WorkerEncoderAdapter {
  readonly name = "GIF (gifenc)";

  protected createWorker(): Worker {
    return new Worker(new URL("../../workers/renderer.worker.ts", import.meta.url), {
      type: "module",
    });
  }

  protected initPayload() {
    return { kind: "gif" };
  }
}