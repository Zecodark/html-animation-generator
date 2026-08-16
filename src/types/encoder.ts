export type ExportFormat = "mp4" | "webm" | "gif" | "mov" | "png-sequence";

export type QualityLevel = "low" | "medium" | "high" | "very-high";

export type BackgroundKind = "transparent" | "solid" | "gradient";

export type FitMode = "contain" | "cover" | "fill";
export type AlignX = "left" | "center" | "right";
export type AlignY = "top" | "center" | "bottom";

export interface ExportSettings {
  format: ExportFormat;
  codec?: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  quality: QualityLevel;
  transparent: boolean;
  background: BackgroundKind;
  backgroundColor?: string;
  /** How the source canvas maps onto the output frame. */
  fit: FitMode;
  alignX: AlignX;
  alignY: AlignY;
  /** Extra object zoom on top of the project scale (per export session). */
  objectScale: number;
  filename: string;
}

export interface EncoderOptions {
  width: number;
  height: number;
  fps: number;
  duration: number;
  quality: QualityLevel;
  transparent: boolean;
  backgroundColor?: string;
}

export type ProgressDelegate = (info: {
  frame: number;
  totalFrames: number;
  percent: number;
  elapsedMs: number;
}) => void;

/**
 * A media encoder that renders deterministically-produced frames into a
 * downloadable video/image asset. Encoders may run inside a dedicated worker
 * or on the main thread depending on the constraints of the underlying API.
 */
export interface VideoEncoderAdapter {
  /** Stable human-readable name, e.g. "WebCodecs MP4 (H.264)". */
  name: string;

  /** Whether the browser/session can realistically run this encoder. Settings
   *  are passed so resolution-aware checks (e.g. H.264 level limits) work. */
  isSupported(settings?: ExportSettings): Promise<boolean>;

  initialize(options: ExportSettings, onProgress?: ProgressDelegate): Promise<void>;

  /**
   * Encode a single frame.
   * For real-time encoders (e.g. MediaRecorder) this call blocks until the
   * frame is consumed by the recording pipeline.
   */
  encode(frame: ImageBitmap | VideoFrame, timestampMs: number, frameIndex: number): Promise<void>;

  /** Produce the final asset as a Blob. */
  finalize(): Promise<Blob>;

  /** Abort the encode and release resources. */
  cancel(): Promise<void>;

  /** Treat the input as not needed anymore after this call. */
  release?(frame: ImageBitmap | VideoFrame): void;
}

export type RenderJobStatus = "queued" | "rendering" | "completed" | "failed" | "cancelled";

export interface RenderJob {
  id: string;
  settings: ExportSettings;
  status: RenderJobStatus;
  progress: number;
  frame: number;
  totalFrames: number;
  error?: string;
  created: Date;
}

export interface RenderCapabilities {
  webCodecs: boolean;
  h264: boolean;
  vp9: boolean;
  mediaRecorder: boolean;
  mediaRecorderVp9: boolean;
  mediaRecorderVp8: boolean;
  offscreenCanvas: boolean;
  webWorker: boolean;
  webAssembly: boolean;
  canvasCaptureStream: boolean;
  ffmpeg: boolean;
}