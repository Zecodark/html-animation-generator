import type {
  ExportSettings,
  ProgressDelegate,
  VideoEncoderAdapter,
} from "@/types/encoder";

export interface WorkerEncoderMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * Base class for encoders that run inside a dedicated worker.
 *
 * The worker is spawned lazily on `initialize()` and terminated as soon as the
 * final Blob has been produced or the encode is cancelled, so frames and the
 * worker itself are cleaned up (see spec §25 Memory Management).
 */
export abstract class WorkerEncoderAdapter implements VideoEncoderAdapter {
  abstract readonly name: string;

  protected worker: Worker | null = null;
  protected onProgress: ProgressDelegate | null = null;
  protected settings: ExportSettings | null = null;

  private initResolve: (() => void) | null = null;
  private initReject: ((error: Error) => void) | null = null;
  private donePromise: Promise<Blob> | null = null;
  private resolveDone: ((blob: Blob) => void) | null = null;
  private rejectDone: ((error: Error) => void) | null = null;
  private terminated = false;

  /** Which worker file to use. Must be the literal `new Worker(new URL(...))`. */
  protected abstract createWorker(): Worker;
  /** Extra payload passed with the INIT message (e.g. `kind`). */
  protected abstract initPayload(): Record<string, unknown>;

  async isSupported(): Promise<boolean> {
    return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
  }

  initialize(settings: ExportSettings, onProgress?: ProgressDelegate): Promise<void> {
    this.settings = settings;
    this.onProgress = onProgress ?? null;
    this.terminated = false;

    return new Promise<void>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;

      let worker: Worker;
      try {
        worker = this.createWorker();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      this.worker = worker;

      worker.addEventListener("message", (event) => this.handleMessage(event));
      worker.addEventListener("error", (event) => {
        this.fail(new Error(event?.message || "Worker crashed"));
      });

      worker.postMessage({
        type: "INIT",
        ...this.initPayload(),
        settings,
      });
    });
  }

  async encode(
    frame: ImageBitmap,
    timestampMs: number,
    frameIndex: number
  ): Promise<void> {
    if (!this.worker || this.terminated) {
      throw new Error("Encoder is not initialized");
    }
    this.worker.postMessage(
      { type: "FRAME", index: frameIndex, timestampMs, frame },
      [frame]
    );
  }

  finalize(): Promise<Blob> {
    if (this.donePromise) return this.donePromise;
    if (!this.worker || this.terminated) {
      return Promise.reject(new Error("Encoder is not initialized"));
    }
    this.donePromise = new Promise<Blob>((resolve, reject) => {
      this.resolveDone = resolve;
      this.rejectDone = reject;
      this.worker?.postMessage({ type: "FINALIZE" });
    });
    return this.donePromise;
  }

  async cancel(): Promise<void> {
    this.terminated = true;
    if (this.worker) {
      try {
        this.worker.postMessage({ type: "CANCEL" });
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        try {
          this.worker?.terminate();
        } catch {
          /* ignore */
        }
      }, 50);
    }
    this.worker = null;
  }

  protected handleMessage(event: MessageEvent) {
    if (!this.worker) return;
    const data = event.data as WorkerEncoderMessage;
    if (!data || typeof data !== "object") return;

    switch (data.type) {
      case "READY": {
        this.initResolve?.();
        this.initResolve = null;
        this.initReject = null;
        break;
      }
      case "ERROR": {
        const message = String(data.message ?? "Worker error");
        this.fail(new Error(message));
        break;
      }
      case "PROGRESS": {
        if (this.onProgress && this.settings) {
          const total = Math.round(this.settings.fps * this.settings.duration);
          this.onProgress({
            frame: Number(data.index ?? 0),
            totalFrames: total,
            percent: total > 0 ? (Number(data.index ?? 0) / total) * 100 : 0,
            elapsedMs: 0,
          });
        }
        break;
      }
      case "DONE": {
        const blob = data.blob as Blob;
        this.resolveDone?.(blob);
        this.resolveDone = null;
        this.rejectDone = null;
        this.terminateWorker();
        break;
      }
    }
  }

  private fail(error: Error) {
    this.initReject?.(error);
    this.initReject = null;
    this.initResolve = null;
    this.rejectDone?.(error);
    this.rejectDone = null;
    this.resolveDone = null;
    this.terminateWorker();
  }

  private terminateWorker() {
    this.terminated = true;
    try {
      this.worker?.terminate();
    } catch {
      /* ignore */
    }
    this.worker = null;
  }
}