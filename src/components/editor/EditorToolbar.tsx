"use client";

import { usePreview } from "@/hooks/usePreview";
import { useProjectStore } from "@/stores/projectStore";

interface EditorToolbarProps {
  onRun: () => void;
}

export function EditorToolbar({ onRun }: EditorToolbarProps) {
  const loadDemo = useProjectStore((state) => state.loadDemo);
  const { restart } = usePreview();

  return (
    <div className="flex items-center gap-2 border-t border-zinc-900 bg-zinc-950 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Code
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onRun}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold px-3 py-1.5 transition-all shadow-sm"
        >
          Run
        </button>
        <div className="flex bg-zinc-900/50 p-1 rounded-lg gap-1">
          <button
            onClick={() => {
              restart();
            }}
            className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Restart
          </button>
          <button
            onClick={loadDemo}
            className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}