"use client";

import type { ExportFormat, RenderCapabilities } from "@/types/encoder";
import { EncoderManager } from "@/lib/encoders/EncoderManager";

interface FormatSelectorProps {
  format: ExportFormat;
  transparent: boolean;
  onChange: (format: ExportFormat) => void;
  capabilities: RenderCapabilities | null;
}

function availability(
  format: ExportFormat,
  caps: RenderCapabilities | null,
  transparent: boolean
): "ready" | "fallback" | "network" | "unavailable" {
  if (!caps) return "ready";
  switch (format) {
    case "mp4":
      return caps.h264 ? "ready" : "network";
    case "webm":
      return caps.vp9 || caps.mediaRecorderVp9 || caps.mediaRecorderVp8 ? "ready" : "network";
    case "gif":
      return "ready";
    case "mov":
      return "network";
    case "png-sequence":
      return transparent ? "ready" : "ready";
  }
}

const STATUS_LABEL: Record<string, string> = {
  ready: "●",
  fallback: "▲",
  network: "◎",
  unavailable: "✕",
};

const STATUS_COLOR: Record<string, string> = {
  ready: "text-emerald-400",
  fallback: "text-amber-400",
  network: "text-sky-400",
  unavailable: "text-red-400",
};

const OPTIONS: ExportFormat[] = ["mp4", "webm", "gif", "mov", "png-sequence"];

export function FormatSelector({ format, transparent, onChange, capabilities }: FormatSelectorProps) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        Format
      </label>
      <div className="grid grid-cols-5 gap-2">
        {OPTIONS.map((option) => {
          const status = availability(option, capabilities, transparent);
          const active = format === option;
          return (
            <button
              key={option}
              onClick={() => onChange(option)}
              className={`flex flex-col items-center gap-1 rounded border px-2 py-2 text-[11px] font-medium transition-colors ${
                active
                  ? "border-orange-500 bg-orange-500/10 text-orange-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
              title={`${option} — ${EncoderManager.fallbackChain(option)}`}
            >
              <span className="font-mono text-xs font-bold">{option.toUpperCase()}</span>
              <span className={`text-[10px] ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] text-zinc-600">
        Testing: {capabilities ? "done" : "…"} — MP4/WebM lanes fall back to FFmpeg.wasm (network) or
        PNG Sequence.
      </p>
    </div>
  );
}