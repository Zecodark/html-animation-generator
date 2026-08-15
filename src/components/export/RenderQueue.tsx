"use client";

import { useRenderStore } from "@/stores/renderStore";
import { downloadBlob, formatBytes } from "@/lib/utils/utils";
import { FORMAT_LABELS } from "@/lib/encoders/EncoderManager";
import type { RenderJobStatus } from "@/types/encoder";

interface RenderQueueProps {
  onRenderAll: () => void;
}

const STATUS_STYLES: Record<RenderJobStatus, string> = {
  queued: "bg-zinc-700 text-zinc-300",
  rendering: "bg-orange-600 text-white",
  completed: "bg-emerald-700 text-emerald-100",
  failed: "bg-red-700 text-red-100",
  cancelled: "bg-zinc-700/60 text-zinc-400",
};

export function RenderQueue({ onRenderAll }: RenderQueueProps) {
  const queue = useRenderStore((state) => state.queue);
  const clearQueue = useRenderStore((state) => state.clearQueue);
  const dequeue = useRenderStore((state) => state.dequeue);
  const isRendering = useRenderStore((state) => state.isRendering);
  const output = useRenderStore((state) => state.output);

  const hasQueued = queue.some((job) => job.status === "queued");

  if (queue.length === 0) {
    return (
      <div className="flex h-full items-center gap-2 px-3 text-[11px] text-zinc-600">
        <span>Render Queue empty — press EXPORT to queue a job.</span>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center gap-2 overflow-x-auto px-3">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        Queue
      </span>

      <div className="flex items-center gap-2">
        {queue.map((job) => (
          <div
            key={job.id}
            className="flex shrink-0 items-center gap-2 rounded border border-zinc-800 bg-zinc-900 px-2 py-1"
            title={job.status === "failed" ? job.error : undefined}
          >
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[job.status]}`}>
              {job.status}
            </span>
            <span className="font-mono text-[10px] text-zinc-300">
              {FORMAT_LABELS[job.settings.format]}
            </span>
            <span className="font-mono text-[9px] text-zinc-500">
              {job.settings.width}×{job.settings.height} · {job.settings.fps}fps
            </span>
            {job.status === "failed" && job.error && (
              <span className="max-w-[220px] truncate text-[9px] text-red-400">{job.error}</span>
            )}
            {job.status === "queued" && (
              <button
                onClick={() => dequeue(job.id)}
                className="text-zinc-600 transition-colors hover:text-red-400"
                title="Remove from queue"
              >
                ✕
              </button>
            )}
            {job.status === "completed" && job.progress >= 100 && (
              <span className="text-[9px] text-emerald-400">done</span>
            )}
          </div>
        ))}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {output && (
          <button
            onClick={() => downloadBlob(output.blob, output.filename)}
            className="rounded border border-emerald-800 bg-emerald-950/50 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-900/50"
          >
            Download {output.filename} ({formatBytes(output.blob.size)})
          </button>
        )}
        {!isRendering && hasQueued && (
          <button
            onClick={onRenderAll}
            className="rounded bg-orange-600 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-orange-500"
          >
            Render All
          </button>
        )}
        {!isRendering && (
          <button
            onClick={clearQueue}
            className="rounded border border-zinc-700 px-2.5 py-1 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}