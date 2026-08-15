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
    <div className="flex items-center border-b border-zinc-800 bg-zinc-900">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 border-r border-zinc-800 px-4 py-2 text-xs font-medium tracking-wide transition-colors ${
            activeTab === tab.id
              ? "bg-zinc-950 text-orange-400"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {tab.label}
          <span className="rounded bg-zinc-800 px-1 text-[10px] text-zinc-500">
            {lengths[tab.id]}
          </span>
        </button>
      ))}
    </div>
  );
}