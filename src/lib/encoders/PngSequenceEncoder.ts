import { WorkerEncoderAdapter } from "./workerAdapter";

/**
 * PNG sequence packed into a ZIP archive via JSZip inside a worker.
 * The most reliable fallback in the entire pipeline.
 */
export class PngSequenceEncoder extends WorkerEncoderAdapter {
  readonly name = "PNG Sequence (ZIP)";

  protected createWorker(): Worker {
    return new Worker(new URL("../../workers/renderer.worker.ts", import.meta.url), {
      type: "module",
    });
  }

  protected initPayload() {
    return { kind: "png-sequence" };
  }
}