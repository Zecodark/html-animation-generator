"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTsxPreview } from "@/hooks/useTsxPreview";
import { useCompatibility } from "@/hooks/useCompatibility";
import { useRenderer } from "@/hooks/useRenderer";
import { useTsxEditorStore } from "@/stores/tsxEditorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useRenderStore } from "@/stores/renderStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { TSX_DEMO_CODE, TSX_DEMO_CSS } from "@/lib/tsx-preview/demoTsxProject";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { TsxEditorTabs } from "@/components/tsx-editor/TsxEditorTabs";
import { TsxEditorToolbar } from "@/components/tsx-editor/TsxEditorToolbar";
import { PreviewViewport } from "@/components/preview/PreviewViewport";
import { Timeline } from "@/components/timeline/Timeline";
import { ExportModal } from "@/components/export/ExportModal";
import { RenderProgress } from "@/components/export/RenderProgress";
import { RenderQueue } from "@/components/export/RenderQueue";
import { PropertiesPanel } from "@/components/properties/PropertiesPanel";
import { CompatibilityPanel } from "@/components/system/CompatibilityPanel";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { UserMenu } from "@/components/auth/UserMenu";

export default function TsxToolPage() {
  const preview = useTsxPreview();
  const { capabilities, detected } = useCompatibility();
  const { renderSingle, processRenderQueue, cancelRender } = useRenderer(preview.frameCapture);

  const [showCompatibility, setShowCompatibility] = useState(false);

  const activeTab = useTsxEditorStore((state) => state.activeTab);
  const tsx = useTsxEditorStore((state) => state.tsx);
  const css = useTsxEditorStore((state) => state.css);
  const setCode = useTsxEditorStore((state) => state.setCode);

  const openSettings = useRenderStore((state) => state.openSettings);
  const playing = useTimelineStore((state) => state.playing);
  const loop = useTimelineStore((state) => state.loop);
  const currentTime = useTimelineStore((state) => state.currentTime);
  const duration = useTimelineStore((state) => state.duration);
  const fps = useTimelineStore((state) => state.fps);

  // Load TSX demo on first paint
  useEffect(() => {
    const store = useTsxEditorStore.getState();
    if (!store.tsx) {
      store.replace(TSX_DEMO_CODE, TSX_DEMO_CSS);
    }
  }, []);

  const editorValue = activeTab === "tsx" ? tsx : css;
  const editorLanguage = activeTab === "tsx" ? "javascript" : "css";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-zinc-950 text-zinc-200">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-zinc-900 bg-zinc-950 px-3">
        <Link
          href="/beranda"
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
          title="Back to Beranda"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 3L5 7l4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div className="flex items-center gap-3 pr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900/50 p-1.5 shadow-sm">
            <img src="/logo/logo-zcd.svg" alt="ZCD Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[13px] font-black tracking-widest text-zinc-100 uppercase leading-none">
              ZCD Studio
            </span>
            <span className="text-[9px] font-semibold tracking-wide text-violet-400 mt-1 uppercase">
              TSX to Video Generator
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-zinc-800/50 mx-1" />

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400">
            React TSX
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setShowCompatibility(true)}
            className="rounded-lg bg-zinc-900/50 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150 cursor-pointer"
          >
            System
          </button>
          <button
            onClick={openSettings}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-violet-600/10 hover:bg-violet-500 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            EXPORT
          </button>
          <UserMenu />
        </div>
      </header>

      {/* Main workspace */}
      <main className="flex min-h-0 flex-1">
        {/* Editor */}
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-zinc-900 bg-zinc-950">
          <TsxEditorTabs />
          <div className="min-h-0 flex-1" key={activeTab}>
            <CodeEditor
              value={editorValue}
              language={editorLanguage}
              onChange={(value) => setCode(activeTab, value)}
            />
          </div>
          <TsxEditorToolbar
            onRun={() => {
              preview.restart();
              preview.play();
            }}
            onRestart={preview.restart}
          />
        </aside>

        {/* Preview + timeline */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 p-2">
            <PreviewViewport
              iframeRef={preview.iframeRef}
              documentSrc={preview.documentSrc}
              ready={Boolean(preview.readyInfo)}
              error={preview.previewError}
              controls={{
                playing,
                loop,
                currentTime,
                duration,
                fps,
                onToggle: preview.toggle,
                onRestart: preview.restart,
                onToggleLoop: preview.toggleLoop,
              }}
            />
          </div>
          <div className="h-28 shrink-0 border-t border-zinc-900">
            <Timeline onSeek={preview.seek} />
          </div>
        </section>

        {/* Properties */}
        <aside className="hidden w-[240px] shrink-0 flex-col border-l border-zinc-900 bg-zinc-950 lg:flex">
          <div className="border-b border-zinc-900 bg-zinc-950/40 px-3 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Properties
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PropertiesPanel />
          </div>
        </aside>
      </main>

      {/* Status bar */}
      <footer className="h-9 shrink-0 border-t border-zinc-900 bg-zinc-950">
        <RenderQueue onRenderAll={() => void processRenderQueue()} />
      </footer>

      {/* Overlays */}
      <ErrorBoundary>
        <ExportModal capabilities={detected ? capabilities : null} onRender={(settings) => void renderSingle(settings)} />
        <RenderProgress onCancel={cancelRender} />
        {showCompatibility && (
          <CompatibilityPanel
            capabilities={capabilities}
            detected={detected}
            onClose={() => setShowCompatibility(false)}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}
