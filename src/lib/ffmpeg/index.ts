/**
 * FFmpeg.wasm loading notes.
 *
 * FFmpeg is never loaded eagerly. It is loaded lazily inside a dedicated
 * worker (see `src/workers/ffmpeg.worker.ts`) the first time a job needs it
 * (MOV, or MP4/WebM when WebCodecs/MediaRecorder are unavailable). The core
 * is fetched from a CDN at runtime, so it requires a network connection.
 *
 * For production, the fallback architecture is:
 *
 *   Next.js -> Render API -> Docker -> native FFmpeg -> Object Storage
 */
export const FFMPEG_UNAVAILABLE_MESSAGE =
  "MOV encoder unavailable: FFmpeg.wasm could not be loaded (a network connection is required to fetch the core). Fallbacks: MP4, WebM, PNG Sequence.";

export const FFMPEG_FALLBACK_LABEL = "FFmpeg.wasm (network required)";