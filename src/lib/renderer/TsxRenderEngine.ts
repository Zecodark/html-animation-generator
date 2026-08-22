import type { RenderOptions, RenderCallbacks } from "./RenderEngine";
import { RenderCancelledError } from "./RenderEngine";

/**
 * Frame capture interface for TSX — extends the base with reloadMemory
 * to periodically purge detached React/DOM nodes.
 */
export interface TsxFrameCaptureInterface {
  beginRender(options: RenderOptions): Promise<void>;
  setTime(time: number): void;
  captureFrame(index: number): Promise<ImageBitmap>;
  endRender(): void;
  /** Reload the iframe to purge accumulated memory from html-to-image clones. */
  reloadMemory(): Promise<void>;
}

/**
 * TSX-specific render engine.
 *
 * Identical to RenderEngine but with a critical difference: it calls
 * `reloadMemory()` every N frames to purge detached DOM nodes and canvas
 * contexts accumulated by html-to-image when rendering React components.
 *
 * This is separated from the HTML RenderEngine so that changes to the TSX
 * pipeline can NEVER break the stable HTML pipeline.
 */
export class TsxRenderEngine {
  /**
   * How many frames to render before reloading the iframe to purge memory.
   * Lower = less RAM but slower (each reload costs ~200ms).
   * Higher = faster but more RAM.
   */
  private static readonly RELOAD_INTERVAL = 20;

  constructor(
    private readonly frameSource: TsxFrameCaptureInterface,
    private readonly encoder: {
      encode: (frame: ImageBitmap, timestampMs: number, index: number) => Promise<void>;
      finalize: () => Promise<Blob>;
    }
  ) {}

  async render(options: RenderOptions, callbacks: RenderCallbacks = {}): Promise<Blob> {
    const { signal, onProgress } = callbacks;
    const totalFrames = Math.round(options.fps * options.duration);
    const startedAt = performance.now();

    await this.frameSource.beginRender(options);

    try {
      for (let frame = 0; frame < totalFrames; frame++) {
        if (signal?.aborted) throw new RenderCancelledError();

        const time = frame / options.fps;
        this.frameSource.setTime(time);
        const bitmap = await this.frameSource.captureFrame(frame);

        try {
          await this.encoder.encode(bitmap, time * 1000, frame);
        } catch (error) {
          bitmap.close();
          throw error;
        }

        if (onProgress) {
          onProgress({
            frame: frame + 1,
            totalFrames,
            percent: totalFrames > 0 ? ((frame + 1) / totalFrames) * 100 : 0,
            elapsedMs: performance.now() - startedAt,
          });
        }

        // TSX-specific: Reload the iframe periodically to purge memory.
        // React components + html-to-image create massive amounts of detached
        // DOM nodes that the GC can't reclaim fast enough. By reloading the
        // iframe, we force a full teardown of the JS heap inside it.
        if (frame > 0 && frame % TsxRenderEngine.RELOAD_INTERVAL === 0) {
          await this.frameSource.reloadMemory();
        }
      }

      return await this.encoder.finalize();
    } finally {
      this.frameSource.endRender();
    }
  }
}
