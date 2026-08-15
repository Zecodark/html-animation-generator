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
    <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        Code
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onRun}
          className="rounded bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          Run
        </button>
        <button
          onClick={() => {
            restart();
          }}
          className="rounded border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          Restart
        </button>
        <button
          onClick={loadDemo}
          className="rounded border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          Reset
        </button>
      </div>
    </div>
  );
}