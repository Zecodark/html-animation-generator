"use client";

interface TsxEditorToolbarProps {
  onRun: () => void;
  onRestart: () => void;
}

export function TsxEditorToolbar({ onRun, onRestart }: TsxEditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-t border-zinc-900 bg-zinc-950 px-3 py-1.5">
      <button
        onClick={onRun}
        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-violet-600/10 hover:bg-violet-500 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M2 1 L9 5 L2 9 Z" />
        </svg>
        Run
      </button>
      <button
        onClick={onRestart}
        className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 2 v3 h3" />
          <path d="M10 10 v-3 H7" />
          <path d="M10 5 A4 4 0 1 0 10.5 7" strokeLinecap="round" />
        </svg>
        Restart
      </button>
    </div>
  );
}
