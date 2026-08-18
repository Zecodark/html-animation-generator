"use client";

import { useEffect, useState } from "react";
import { usePreview } from "@/hooks/usePreview";
import { useCompatibility } from "@/hooks/useCompatibility";
import { useRenderer } from "@/hooks/useRenderer";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useRenderStore } from "@/stores/renderStore";
import { useTimelineStore } from "@/stores/timelineStore";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { EditorTabs } from "@/components/editor/EditorTabs";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { PreviewViewport } from "@/components/preview/PreviewViewport";
import { Timeline } from "@/components/timeline/Timeline";
import { ExportModal } from "@/components/export/ExportModal";
import { RenderProgress } from "@/components/export/RenderProgress";
import { RenderQueue } from "@/components/export/RenderQueue";
import { ProjectMenu } from "@/components/project/ProjectMenu";
import { PropertiesPanel } from "@/components/properties/PropertiesPanel";
import { CompatibilityPanel } from "@/components/system/CompatibilityPanel";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { UserMenu } from "@/components/auth/UserMenu";

export default function Home() {
  const preview = usePreview();
  const { capabilities, detected } = useCompatibility();
  const { renderSingle, processRenderQueue, cancelRender } = useRenderer(preview.frameCapture);

  const [showCompatibility, setShowCompatibility] = useState(false);

  const activeTab = useEditorStore((state) => state.activeTab);
  const html = useEditorStore((state) => state.html);
  const css = useEditorStore((state) => state.css);
  const js = useEditorStore((state) => state.js);
  const setCode = useEditorStore((state) => state.setCode);

  const projectName = useProjectStore((state) => state.name);
  const setName = useProjectStore((state) => state.setName);

  const openSettings = useRenderStore((state) => state.openSettings);
  const playing = useTimelineStore((state) => state.playing);
  const loop = useTimelineStore((state) => state.loop);
  const currentTime = useTimelineStore((state) => state.currentTime);
  const duration = useTimelineStore((state) => state.duration);
  const fps = useTimelineStore((state) => state.fps);

  // Bootstrap with the Halloween Pumpkin Loader demo on first paint.
  useEffect(() => {
    useProjectStore.getState().loadDemo();
  }, []);

  const editorValue = activeTab === "html" ? html : activeTab === "css" ? css : js;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-zinc-950 text-zinc-200">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-zinc-900 bg-zinc-950 px-3">
        <div className="flex items-center gap-3 pr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900/50 p-1.5 shadow-sm">
            <img src="/logo/logo-zcd.svg" alt="ZCD Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[13px] font-black tracking-widest text-zinc-100 uppercase leading-none">
              ZCD Studio
            </span>
            <span className="text-[9px] font-semibold tracking-wide text-zinc-500 mt-1 uppercase">
              HTML to Video Generator
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-zinc-800/50 mx-1" />

        <ProjectMenu
          projectName={projectName}
          onNameChange={(name) => setName(name)}
        />

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setShowCompatibility(true)}
            className="rounded-lg bg-zinc-900/50 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150 cursor-pointer"
          >
            System
          </button>
          <button
            onClick={openSettings}
            className="rounded-lg bg-orange-600 px-4 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-orange-600/10 hover:bg-orange-500 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
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
          <EditorTabs />
          <div className="min-h-0 flex-1" key={activeTab}>
            <CodeEditor
              value={editorValue}
              language={activeTab === "html" ? "html" : activeTab === "css" ? "css" : "javascript"}
              onChange={(value) => setCode(activeTab, value)}
            />
          </div>
          <EditorToolbar
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