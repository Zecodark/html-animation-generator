"use client";

import { useCallback, useRef } from "react";
import type { RefObject } from "react";
import type { ExportSettings, VideoEncoderAdapter } from "@/types/encoder";
import { useRenderStore } from "@/stores/renderStore";
import { useProjectStore } from "@/stores/projectStore";
import { EncoderManager, FORMAT_EXTENSIONS, FORMAT_LABELS } from "@/lib/encoders/EncoderManager";
import { RenderEngine, RenderCancelledError } from "@/lib/renderer/RenderEngine";
import { Throttled } from "@/lib/renderer/RenderScheduler";
import { downloadBlob } from "@/lib/utils/utils";
import type { PreviewFrameCapture } from "@/lib/renderer/FrameCapture";

/**
 * Orchestrates deterministic rendering of queued jobs against the preview
 * iframe's frame capture + selected encoder.
 */
export function useRenderer(frameCaptureRef: RefObject<PreviewFrameCapture | null>) {
  const abortRef = useRef<AbortController | null>(null);

  const renderJob = useCallback(
    async (jobId: string): Promise<boolean> => {
      const store = useRenderStore.getState();
      const job = store.queue.find((item) => item.id === jobId);
      if (!job) return false;

      store.startJob(jobId);

      const settings = job.settings;
      const frameCapture = frameCaptureRef.current;
      if (!frameCapture) {
        store.failJob(
          jobId,
          "Preview is not ready — wait for the preview to load, then retry."
        );
        return false;
      }

      const abort = new AbortController();
      abortRef.current = abort;

      let adapter: VideoEncoderAdapter | null = null;

      const throttled = new Throttled((info) => {
        const frame = Number((info as { frame?: number }).frame ?? 0);
        const totalFrames = Number(
          (info as { totalFrames?: number }).totalFrames ?? 0
        );
        const percent = Number((info as { percent?: number }).percent ?? 0);
        const elapsedMs = Number((info as { elapsedMs?: number }).elapsedMs ?? 0);
        const remainingMs =
          settings.fps > 0 ? ((totalFrames - frame) / settings.fps) * 1000 : 0;
        store.updateProgress(jobId, {
          frame,
          totalFrames,
          percent,
          elapsedMs,
          remainingMs,
          message: `Rendering ${FORMAT_LABELS[settings.format]} …`,
        });
      }, 100);

      try {
        const selected = await EncoderManager.select(settings.format, settings);
        store.setWarnings(selected.warnings);
        adapter = selected.adapter;

        await selected.adapter.initialize(settings, (info) => {
          if (!abort.signal.aborted) throttled.call(info);
        });

        const engine = new RenderEngine(frameCapture, selected.adapter);
        const projectSettings = useProjectStore.getState().settings;
        const blob = await engine.render(
          {
            width: settings.width,
            height: settings.height,
            fps: settings.fps,
            duration: settings.duration,
            transparent: settings.transparent,
            backgroundColor: settings.backgroundColor ?? null,
            sourceWidth: projectSettings.width,
            sourceHeight: projectSettings.height,
            fit: settings.fit,
            alignX: settings.alignX,
            alignY: settings.alignY,
            scale: (projectSettings.scale ?? 1) * (settings.objectScale ?? 1),
            panX: projectSettings.panX ?? 0,
            panY: projectSettings.panY ?? 0,
          },
          {
            signal: abort.signal,
            onProgress: (info) => {
              if (!abort.signal.aborted) throttled.call(info);
            },
          }
        );

        const filename = `${settings.filename || "animation"}${FORMAT_EXTENSIONS[settings.format]}`;
        throttled.flush();
        store.completeJob(jobId, blob, filename);
        downloadBlob(blob, filename);
        return true;
      } catch (error) {
        await adapter?.cancel().catch(() => undefined);
        if (error instanceof RenderCancelledError) {
          store.cancelJob(jobId);
        } else {
          store.failJob(
            jobId,
            error instanceof Error ? error.message : String(error)
          );
        }
        return false;
      } finally {
        abortRef.current = null;
      }
    },
    [frameCaptureRef]
  );

  const processRenderQueue = useCallback(async () => {
    const store = useRenderStore.getState();
    store.setWarnings([]);

    let job = store.queue.find((item) => item.status === "queued");
    while (job) {
      const worked = await renderJob(job.id);
      if (!worked) break; // fail/cancel halts the queue
      job = useRenderStore.getState().queue.find((item) => item.status === "queued");
    }
  }, [renderJob]);

  const renderSingle = useCallback(
    async (settings: ExportSettings) => {
      const store = useRenderStore.getState();
      store.enqueue(settings);
      await processRenderQueue();
    },
    [processRenderQueue]
  );

  const cancelRender = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { renderSingle, processRenderQueue, cancelRender };
}