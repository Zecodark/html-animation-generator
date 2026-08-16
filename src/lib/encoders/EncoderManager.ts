import type {
  ExportFormat,
  ExportSettings,
  VideoEncoderAdapter,
} from "@/types/encoder";
import { WebCodecsMp4Encoder } from "./WebCodecsMp4Encoder";
import { WebCodecsWebmEncoder } from "./WebCodecsWebmEncoder";
import { MediaRecorderEncoder } from "./MediaRecorderEncoder";
import { GifEncoder } from "./GifEncoder";
import { PngSequenceEncoder } from "./PngSequenceEncoder";
import { FFmpegEncoder } from "./FFmpegEncoder";
import { FFMPEG_UNAVAILABLE_MESSAGE } from "@/lib/ffmpeg";

export interface SelectedEncoder {
  adapter: VideoEncoderAdapter;
  warnings: string[];
}

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  mp4: "MP4",
  webm: "WebM",
  gif: "GIF",
  mov: "MOV",
  "png-sequence": "PNG Sequence (ZIP)",
};

export const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  mp4: ".mp4",
  webm: ".webm",
  gif: ".gif",
  mov: ".mov",
  "png-sequence": "_frames.zip",
};

/**
 * Picks the best available encoder for the requested format, based on live
 * capability detection. Never fakes a conversion; if nothing supports a
 * format, a descriptive error with suggested fallbacks is produced instead.
 */
export class EncoderManager {
  static async select(
    format: ExportFormat,
    settings: ExportSettings
  ): Promise<SelectedEncoder> {
    const warnings: string[] = [];

    switch (format) {
      case "mp4": {
        if (settings.transparent) {
          warnings.push(
            "H.264 MP4 does not support alpha transparency. Transparent areas will be filled with the background color. Use PNG Sequence for true transparency."
          );
        }
        const webCodecs = new WebCodecsMp4Encoder();
        if (await webCodecs.isSupported(settings)) {
          return { adapter: webCodecs, warnings };
        }
        warnings.push(
          "WebCodecs H.264 is not available on this browser; falling back to FFmpeg.wasm (requires a network connection to fetch the core)."
        );
        const ffmpeg = new FFmpegEncoder();
        if (!(await ffmpeg.isSupported())) {
          warnings.push(
            "Neither WebCodecs nor WebAssembly is available — MP4 cannot be encoded in this browser. Fallback: PNG Sequence."
          );
        }
        return { adapter: ffmpeg, warnings };
      }

      case "webm": {
        if (settings.transparent) {
          warnings.push(
            "WebM from WebCodecs/MediaRecorder does not expose an alpha channel in this pipeline. Use PNG Sequence for transparency."
          );
        }
        const webCodecs = new WebCodecsWebmEncoder();
        if (await webCodecs.isSupported(settings)) {
          return { adapter: webCodecs, warnings };
        }
        const mediaRecorder = new MediaRecorderEncoder();
        if (await mediaRecorder.isSupported()) {
          warnings.push(
            "Using the MediaRecorder fallback — it is real-time and not deterministic for high resolutions."
          );
          return { adapter: mediaRecorder, warnings };
        }
        warnings.push(
          "WebCodecs VP9 and MediaRecorder are unavailable; falling back to FFmpeg.wasm (requires network)."
        );
        const ffmpeg = new FFmpegEncoder();
        if (!(await ffmpeg.isSupported())) {
          warnings.push(
            "WebM cannot be encoded in this browser. Fallback: PNG Sequence."
          );
        }
        return { adapter: ffmpeg, warnings };
      }

      case "gif": {
        if (settings.transparent) {
          warnings.push(
            "GIF supports 1-bit transparency with up to 256 colors. Very large files are possible at high resolutions."
          );
        }
        if (
          settings.width * settings.height > 1280 * 720 &&
          settings.duration > 3 &&
          settings.fps > 24
        ) {
          warnings.push(
            "High resolution + long duration + high FPS may produce an extremely large GIF file."
          );
        }
        return { adapter: new GifEncoder(), warnings };
      }

      case "png-sequence": {
        return { adapter: new PngSequenceEncoder(), warnings };
      }

      case "mov": {
        if (settings.transparent) {
          warnings.push(
            "MOV alpha enabled — akan di-encode sebagai Apple ProRes 4444 (fallback: QuickTime Animation / PNG in MOV) via FFmpeg. Butuh koneksi internet untuk core FFmpeg; ukuran file besar; area transparan tampil checkerboard (QuickTime) atau hitam di player polos — hasilnya untuk dikomposit."
          );
        }
        const ffmpeg = new FFmpegEncoder();
        if (await ffmpeg.isSupported()) {
          warnings.push(
            "MOV is produced via FFmpeg.wasm (network required to fetch the core). If it is unavailable here, use MP4 / WebM / PNG Sequence."
          );
          return { adapter: ffmpeg, warnings };
        }
        throw new Error(FFMPEG_UNAVAILABLE_MESSAGE);
      }
    }
  }

  static fallbackChain(format: ExportFormat): string {
    switch (format) {
      case "mp4":
        return "WebCodecs H.264 → mp4-muxer → FFmpeg.wasm → PNG Sequence";
      case "webm":
        return "WebCodecs VP9 → MediaRecorder VP9/VP8 → FFmpeg.wasm → PNG Sequence";
      case "gif":
        return "gifenc → FFmpeg.wasm";
      case "mov":
        return "FFmpeg.wasm → Backend/native FFmpeg (production)";
      case "png-sequence":
        return "Canvas.toBlob() → JSZip";
    }
  }
}