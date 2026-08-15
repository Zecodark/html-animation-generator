"use client";

import { useState } from "react";
import type { ExportSettings, RenderCapabilities } from "@/types/encoder";
import { useRenderStore } from "@/stores/renderStore";
import { FormatSelector } from "./FormatSelector";
import { ExportSettings as ExportSettingsForm } from "./ExportSettings";

interface ExportModalProps {
  capabilities: RenderCapabilities | null;
  onRender: (settings: ExportSettings) => void;
}

export function ExportModal({ capabilities, onRender }: ExportModalProps) {
  const isOpen = useRenderStore((state) => state.isSettingsOpen);
  const settings = useRenderStore((state) => state.exportSettings);
  const setSettings = useRenderStore((state) => state.setExportSettings);
  const closeSettings = useRenderStore((state) => state.closeSettings);
  const [stockMode, setStockMode] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5 py-3">
          <h2 className="text-sm font-bold tracking-widest text-zinc-100">EXPORT</h2>
          <button
            onClick={closeSettings}
            className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1 l10 10 M11 1 L1 11" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <FormatSelector
            format={settings.format}
            transparent={settings.transparent}
            onChange={(format) => setSettings({ format })}
            capabilities={capabilities}
          />
          <ExportSettingsForm
            settings={settings}
            onChange={setSettings}
            stockMode={stockMode}
            onStockModeChange={setStockMode}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-900/50 px-5 py-3">
          <button
            onClick={closeSettings}
            className="rounded border border-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              closeSettings();
              onRender(settings);
            }}
            className="rounded bg-orange-600 px-5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-500"
          >
            Render
          </button>
        </div>
      </div>
    </div>
  );
}