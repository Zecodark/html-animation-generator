"use client";

import { useEditorStore, type EditorTab } from "@/stores/editorStore";

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "js", label: "JS" },
];

export function EditorTabs() {
  const activeTab = useEditorStore((state) => state.activeTab);
  const setActiveTab = useEditorStore((state) => state.setActiveTab);
  const html = useEditorStore((state) => state.html);
  const css = useEditorStore((state) => state.css);
  const js = useEditorStore((state) => state.js);

  const lengths: Record<EditorTab, number> = { html: html.length, css: css.length, js: js.length };

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
                ? "bg-zinc-800/80 text-orange-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
            }`}
          >
            {tab.label}
            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
              active
                ? "bg-orange-500/10 text-orange-500"
                : "bg-zinc-900 text-zinc-600"
            }`}>
              {lengths[tab.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}