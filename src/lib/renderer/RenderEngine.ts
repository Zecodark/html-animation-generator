export interface RenderOptions {
  width: number;
  height: number;
  fps: number;
  duration: number;
  transparent: boolean;
  backgroundColor?: string | null;
  /** Source canvas size the user content is laid out on (project settings). */
  sourceWidth?: number;
  sourceHeight?: number;
  /** How the source canvas maps onto the output frame. */
  fit?: "contain" | "cover" | "fill";
  alignX?: "left" | "center" | "right";
  alignY?: "top" | "center" | "bottom";
}

export interface FrameCapture {
  /** Enter capture mode (auto-capture every SET_TIME). */
  beginRender(options: RenderOptions): Promise<void>;
  /** Seek the deterministic clock to `time` (seconds). */
  setTime(time: number): void;
  /** Wait for the iframe to produce the frame for the given index. */
  captureFrame(index: number): Promise<ImageBitmap>;
  /** Leave capture mode. */
  endRender(): void;
}

export interface RenderCallbacks {
  onProgress?: (info: {
    frame: number;
    totalFrames: number;
    percent: number;
    elapsedMs: number;
  }) => void;
  signal?: AbortSignal;
}

export class RenderCancelledError extends Error {
  constructor() {
    super("Render cancelled");
    this.name = "RenderCancelledError";
  }
}

/**
 * Deterministic render loop:
 *
 *   for frame in 0..totalFrames:
 *     time = frame / fps
 *     frameSource.setTime(time)
 *     bitmap = frameSource.captureFrame(frame)
 *     encoder.encode(bitmap, time)
 *
 * Progress callbacks are throttled by the caller (spec §18). Frame bitmaps are
 * closed by the encoder once consumed.
 */
export class RenderEngine {
  constructor(
    private readonly frameSource: FrameCapture,
    private readonly encoder: { encode: (frame: ImageBitmap, timestampMs: number, index: number) => Promise<void>; finalize: () => Promise<Blob> }
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
      }

      return await this.encoder.finalize();
    } finally {
      this.frameSource.endRender();
    }
  }
}