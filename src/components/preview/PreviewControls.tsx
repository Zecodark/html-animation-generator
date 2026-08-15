"use client";

import { formatTime } from "@/lib/utils/utils";

export interface PreviewControlsProps {
  playing: boolean;
  loop: boolean;
  currentTime: number;
  duration: number;
  fps: number;
  onToggle: () => void;
  onRestart: () => void;
  onToggleLoop: () => void;
}

export function PreviewControls({
  playing,
  loop,
  currentTime,
  duration,
  fps,
  onToggle,
  onRestart,
  onToggleLoop,
}: PreviewControlsProps) {
  return (
    <div className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-900 px-3 py-1.5">
      <button
        onClick={onToggle}
        title={playing ? "Pause" : "Play"}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-white transition-colors hover:bg-orange-500"
      >
        {playing ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1" y="1" width="3" height="8" rx="0.5" />
            <rect x="6" y="1" width="3" height="8" rx="0.5" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2 1 L9 5 L2 9 Z" />
          </svg>
        )}
      </button>

      <button
        onClick={onRestart}
        title="Restart"
        className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 2 v3 h3" />
          <path d="M10 10 v-3 H7" />
          <path d="M10 5 A4 4 0 1 0 10.5 7" strokeLinecap="round" />
        </svg>
      </button>

      <button
        onClick={onToggleLoop}
        title="Toggle loop"
        className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold transition-colors ${
          loop ? "bg-orange-600/20 text-orange-400" : "text-zinc-500 hover:bg-zinc-800"
        }`}
      >
        ⟳
      </button>

      <span className="ml-1 font-mono text-[11px] text-zinc-400">
        {formatTime(currentTime)} <span className="text-zinc-600">/ {formatTime(duration)}</span>
      </span>

      <span className="ml-auto rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
        {fps} fps
      </span>
    </div>
  );
}