"use client";

import { useTsxEditorStore, type TsxEditorTab } from "@/stores/tsxEditorStore";

const TABS: Array<{ id: TsxEditorTab; label: string }> = [
  { id: "tsx", label: "TSX" },
  { id: "css", label: "CSS" },
];

export function TsxEditorTabs() {
  const activeTab = useTsxEditorStore((state) => state.activeTab);
  const setActiveTab = useTsxEditorStore((state) => state.setActiveTab);
  const tsx = useTsxEditorStore((state) => state.tsx);
  const css = useTsxEditorStore((state) => state.css);
  const compileError = useTsxEditorStore((state) => state.compileError);

  const lengths: Record<TsxEditorTab, number> = { tsx: tsx.length, css: css.length };

  return (
    <div className="flex items-center gap-1 border-b border-zinc-900 bg-zinc-950 px-2 py-1.5">
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
              active
                ? "bg-zinc-800/80 text-violet-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
            }`}
          >
            {tab.label}
            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
              active
                ? "bg-violet-500/10 text-violet-500"
                : "bg-zinc-900 text-zinc-600"
            }`}>
              {lengths[tab.id]}
            </span>
          </button>
        );
      })}

      {/* Compile error indicator */}
      {compileError && (
        <div className="ml-auto flex items-center gap-1.5 rounded-md bg-red-950/30 border border-red-900/30 px-2 py-1" title={compileError}>
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Error</span>
        </div>
      )}
    </div>
  );
}
