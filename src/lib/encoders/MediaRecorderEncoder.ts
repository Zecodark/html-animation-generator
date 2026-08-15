import type {
  ExportSettings,
  VideoEncoderAdapter,
} from "@/types/encoder";

/**
 * WebM via MediaRecorder on the main thread.
 *
 * MediaRecorder only exists on the main thread and samples a canvas stream in
 * real time, so this encoder is NOT deterministic and only usable for modest
 * resolutions where frame capture is faster than real-time. It is kept as an
 * experimental fallback when WebCodecs VP9 is unavailable.
 */
export class MediaRecorderEncoder implements VideoEncoderAdapter {
  readonly name = "MediaRecorder WebM";

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private width = 0;
  private height = 0;
  private bg: string | null = null;
  private startWall = 0;
  private lastFinish: Promise<Blob> | null = null;

  async isSupported(): Promise<boolean> {
    if (
      typeof MediaRecorder === "undefined" ||
      typeof HTMLCanvasElement === "undefined" ||
      typeof HTMLCanvasElement.prototype.captureStream !== "function"
    ) {
      return false;
    }
    return (
      MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ||
      MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
    );
  }

  initialize(settings: ExportSettings): Promise<void> {
    try {
      this.width = settings.width;
      this.height = settings.height;
      this.bg = settings.transparent ? null : settings.backgroundColor ?? "#000000";

      this.canvas = document.createElement("canvas");
      this.canvas.width = settings.width;
      this.canvas.height = settings.height;
      this.ctx = this.canvas.getContext("2d");

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm;codecs=vp8";

      const bitrate =
        settings.quality === "low"
          ? 2_000_000
          : settings.quality === "medium"
            ? 5_000_000
            : settings.quality === "high"
              ? 9_000_000
              : 14_000_000;

      this.stream = this.canvas.captureStream(settings.fps);
      this.recorder = new MediaRecorder(this.stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      });

      this.chunks = [];
      this.recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) this.chunks.push(event.data);
      };
      this.recorder.onerror = () => {
        void this.finalize().catch(() => undefined);
      };
      this.recorder.start(500);
      this.startWall = performance.now();
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async encode(frame: ImageBitmap, timestampMs: number): Promise<void> {
    if (!this.canvas || !this.ctx) throw new Error("Encoder not initialized");

    // Wait until the frame's presentation time before drawing so the recorder
    // samples each frame at the correct moment.
    const target = this.startWall + timestampMs;
    const wait = target - performance.now();
    if (wait > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }

    if (this.bg) {
      this.ctx.fillStyle = this.bg;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    this.ctx.drawImage(frame, 0, 0, this.width, this.height);
    frame.close();
  }

  finalize(): Promise<Blob> {
    if (this.lastFinish) return this.lastFinish;
    this.lastFinish = new Promise<Blob>((resolve, reject) => {
      const recorder = this.recorder;
      if (!recorder) {
        reject(new Error("Encoder not initialized"));
        return;
      }
      const cleanup = () => {
        try {
          this.stream?.getTracks().forEach((track) => track.stop());
        } catch {
          /* ignore */
        }
        this.recorder = null;
        this.canvas = null;
        this.ctx = null;
      };
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: "video/webm" });
        cleanup();
        resolve(blob);
      };
      try {
        recorder.stop();
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
    return this.lastFinish;
  }

  async cancel(): Promise<void> {
    try {
      this.recorder?.stop();
    } catch {
      /* ignore */
    }
    try {
      this.stream?.getTracks().forEach((track) => track.stop());
    } catch {
      /* ignore */
    }
    this.recorder = null;
    this.stream = null;
    this.canvas = null;
    this.ctx = null;
  }
}