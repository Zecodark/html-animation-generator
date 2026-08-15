"use client";

import { useRenderStore } from "@/stores/renderStore";
import { formatTime } from "@/lib/utils/utils";
import { FORMAT_LABELS } from "@/lib/encoders/EncoderManager";

interface RenderProgressProps {
  onCancel: () => void;
}

export function RenderProgress({ onCancel }: RenderProgressProps) {
  const isRendering = useRenderStore((state) => state.isRendering);
  const progress = useRenderStore((state) => state.progress);
  const queue = useRenderStore((state) => state.queue);
  const currentJobId = useRenderStore((state) => state.currentJobId);
  const warnings = useRenderStore((state) => state.warnings);

  if (!isRendering || !progress) return null;

  const job = queue.find((item) => item.id === currentJobId);
  const label = job ? FORMAT_LABELS[job.settings.format] : "Render";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-widest text-zinc-100">
            Rendering {label}…
          </h3>
          <span className="font-mono text-xs text-orange-400">
            {progress.frame} / {progress.totalFrames}
          </span>
        </div>

        <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all duration-150"
            style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
          />
        </div>

        <div className="mb-3 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{progress.percent.toFixed(1)}%</span>
          <span>
            Elapsed {formatTime(progress.elapsedMs / 1000)} · Est. remaining{" "}
            {formatTime(progress.remainingMs / 1000)}
          </span>
        </div>

        {warnings.length > 0 && (
          <div className="mb-3 flex flex-col gap-1 rounded border border-amber-900/60 bg-amber-950/40 p-2">
            {warnings.map((warning, index) => (
              <p key={index} className="text-[10px] leading-snug text-amber-200">
                {warning}
              </p>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="rounded border border-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Cancel Render
          </button>
        </div>
      </div>
    </div>
  );
}