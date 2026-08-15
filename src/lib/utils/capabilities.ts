import type { RenderCapabilities } from "@/types/encoder";

/**
 * Detect which browser APIs are available. This must run client-side only.
 */
export async function detectCapabilities(): Promise<RenderCapabilities> {
  const has = (name: string): boolean =>
    typeof window !== "undefined" && name in window;

  const hasH264 = async (): Promise<boolean> => {
    if (!has("VideoEncoder")) return false;
    try {
      const config = {
        codec: "avc1.42E01E",
        width: 1280,
        height: 720,
        bitrate: 4_000_000,
        framerate: 30,
      };
      const support = await (
        window.VideoEncoder as unknown as {
          isConfigSupported: (
            c: unknown
          ) => Promise<{ supported: boolean }>;
        }
      ).isConfigSupported(config);
      return support.supported;
    } catch {
      return false;
    }
  };

  const hasVp9 = async (): Promise<boolean> => {
    if (!has("VideoEncoder")) return false;
    try {
      const support = await (
        window.VideoEncoder as unknown as {
          isConfigSupported: (
            c: unknown
          ) => Promise<{ supported: boolean }>;
        }
      ).isConfigSupported({
        codec: "vp09.00.10.08",
        width: 1280,
        height: 720,
        bitrate: 4_000_000,
        framerate: 30,
      });
      return support.supported;
    } catch {
      return false;
    }
  };

  let mediaRecorderVp9 = false;
  let mediaRecorderVp8 = false;
  if (has("MediaRecorder") && typeof MediaRecorder.isTypeSupported === "function") {
    mediaRecorderVp9 = MediaRecorder.isTypeSupported("video/webm;codecs=vp9");
    mediaRecorderVp8 = MediaRecorder.isTypeSupported("video/webm;codecs=vp8");
  }

  return {
    webCodecs: has("VideoEncoder") && has("VideoFrame"),
    h264: await hasH264(),
    vp9: await hasVp9(),
    mediaRecorder: has("MediaRecorder"),
    mediaRecorderVp9,
    mediaRecorderVp8,
    offscreenCanvas: has("OffscreenCanvas"),
    webWorker: typeof Worker !== "undefined",
    webAssembly: typeof WebAssembly !== "undefined",
    canvasCaptureStream:
      has("HTMLCanvasElement") &&
      typeof HTMLCanvasElement.prototype.captureStream === "function",
    ffmpeg: typeof WebAssembly !== "undefined",
  };
}

export const defaultCapabilities: RenderCapabilities = {
  webCodecs: false,
  h264: false,
  vp9: false,
  mediaRecorder: false,
  mediaRecorderVp9: false,
  mediaRecorderVp8: false,
  offscreenCanvas: false,
  webWorker: false,
  webAssembly: false,
  canvasCaptureStream: false,
  ffmpeg: false,
};