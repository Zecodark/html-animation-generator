"use client";

import type { RenderCapabilities } from "@/types/encoder";

interface CompatibilityPanelProps {
  capabilities: RenderCapabilities;
  detected: boolean;
  onClose: () => void;
}

const CHECKS: Array<{
  key: keyof RenderCapabilities;
  label: string;
  note: string;
}> = [
  { key: "webCodecs", label: "WebCodecs", note: "Hardware/SW video encode via VideoEncoder" },
  { key: "h264", label: "H.264", note: "avc1.42E01E encode (fast MP4 pipeline)" },
  { key: "vp9", label: "VP9", note: "vp09 encode (WebM pipeline)" },
  { key: "mediaRecorder", label: "MediaRecorder", note: "WebM capture — real-time fallback" },
  { key: "offscreenCanvas", label: "OffscreenCanvas", note: "Worker-side frame processing" },
  { key: "webWorker", label: "Web Worker", note: "Off-main-thread rendering" },
  { key: "webAssembly", label: "WebAssembly", note: "Required by FFmpeg.wasm (MOV)" },
  { key: "canvasCaptureStream", label: "Canvas CaptureStream", note: "MediaRecorder WebM input" },
];

export function CompatibilityPanel({ capabilities, detected, onClose }: CompatibilityPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-widest text-zinc-100">
            System Compatibility
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1 l10 10 M11 1 L1 11" />
            </svg>
          </button>
        </div>

        {!detected && (
          <p className="mb-3 text-xs text-zinc-500">Testing capabilities…</p>
        )}

        <div className="flex flex-col gap-1">
          {CHECKS.map((check) => {
            const ok = capabilities[check.key];
            return (
              <div
                key={check.key}
                className="flex items-center justify-between rounded border border-zinc-800/60 bg-zinc-900/40 px-3 py-1.5"
              >
                <div>
                  <span className="text-xs font-medium text-zinc-200">{check.label}</span>
                  <p className="text-[10px] text-zinc-600">{check.note}</p>
                </div>
                <span
                  className={`text-sm font-bold ${
                    ok ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {ok ? "✓" : "✕"}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-3 rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[10px] leading-snug text-zinc-500">
          Missing capabilities degrade gracefully: MP4 falls back to FFmpeg.wasm, WebM to
          MediaRecorder/FFmpeg, and PNG Sequence always works.
        </p>
      </div>
    </div>
  );
}