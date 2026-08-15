import { create } from "zustand";
import type { ExportSettings, RenderJobStatus } from "@/types/encoder";
import { useProjectStore } from "./projectStore";

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: "mp4",
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 5,
  quality: "high",
  transparent: false,
  background: "transparent",
  backgroundColor: "#FF6B00",
  fit: "contain",
  alignX: "center",
  alignY: "center",
  filename: "animation",
};

export interface RenderProgressData {
  frame: number;
  totalFrames: number;
  percent: number;
  elapsedMs: number;
  remainingMs: number;
  message: string;
}

export interface RenderJobItem {
  id: string;
  settings: ExportSettings;
  status: RenderJobStatus;
  progress: number;
  frame: number;
  totalFrames: number;
  error?: string;
}

export interface RenderOutput {
  jobId: string;
  blob: Blob;
  filename: string;
}

interface RenderState {
  exportSettings: ExportSettings;
  isSettingsOpen: boolean;
  queue: RenderJobItem[];
  isRendering: boolean;
  currentJobId: string | null;
  progress: RenderProgressData | null;
  output: RenderOutput | null;
  warnings: string[];

  openSettings: () => void;
  closeSettings: () => void;
  setExportSettings: (patch: Partial<ExportSettings>) => void;

  enqueue: (settings: ExportSettings) => string;
  dequeue: (id: string) => void;
  clearQueue: () => void;

  startJob: (id: string) => void;
  updateProgress: (jobId: string, progress: RenderProgressData) => void;
  completeJob: (jobId: string, blob: Blob, filename: string) => void;
  failJob: (jobId: string, message: string) => void;
  cancelJob: (jobId: string) => void;

  setWarnings: (warnings: string[]) => void;
  clearOutput: () => void;
}

let jobCounter = 0;

export function createJobId(): string {
  jobCounter += 1;
  return `job-${Date.now()}-${jobCounter}`;
}

function totalFramesOf(settings: ExportSettings): number {
  return Math.round(settings.fps * settings.duration);
}

export const useRenderStore = create<RenderState>()((set) => ({
  exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
  isSettingsOpen: false,
  queue: [],
  isRendering: false,
  currentJobId: null,
  progress: null,
  output: null,
  warnings: [],

  openSettings: () => {
    const projectSettings = useProjectStore.getState().settings;
    set({
      isSettingsOpen: true,
      exportSettings: {
        ...DEFAULT_EXPORT_SETTINGS,
        width: projectSettings.width,
        height: projectSettings.height,
        fps: projectSettings.fps,
        duration: projectSettings.duration,
        background: projectSettings.background,
        backgroundColor: projectSettings.backgroundColor,
        transparent: projectSettings.background === "transparent",
        filename:
          useProjectStore.getState().name.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
          "animation",
      },
    });
  },

  closeSettings: () => set({ isSettingsOpen: false }),

  setExportSettings: (patch) =>
    set((state) => ({ exportSettings: { ...state.exportSettings, ...patch } })),

  enqueue: (settings) => {
    const id = createJobId();
    set((state) => ({
      queue: [
        ...state.queue,
        {
          id,
          settings,
          status: "queued",
          progress: 0,
          frame: 0,
          totalFrames: totalFramesOf(settings),
        },
      ],
    }));
    return id;
  },

  dequeue: (id) =>
    set((state) => ({ queue: state.queue.filter((job) => job.id !== id) })),

  clearQueue: () => set({ queue: [], progress: null, currentJobId: null, isRendering: false }),

  startJob: (id) =>
    set((state) => ({
      isRendering: true,
      currentJobId: id,
      queue: state.queue.map((job) =>
        job.id === id
          ? { ...job, status: "rendering" as RenderJobStatus, error: undefined, progress: 0, frame: 0 }
          : job
      ),
    })),

  updateProgress: (jobId, progress) =>
    set((state) => ({
      progress,
      queue: state.queue.map((job) =>
        job.id === jobId
          ? {
              ...job,
              progress: progress.percent,
              frame: progress.frame,
              totalFrames: progress.totalFrames,
              status: "rendering" as RenderJobStatus,
            }
          : job
      ),
    })),

  completeJob: (jobId, blob, filename) => {
    set((state) => {
      const nextQueue = state.queue.map((job) =>
        job.id === jobId
          ? { ...job, status: "completed" as RenderJobStatus, progress: 100, frame: job.totalFrames }
          : job
      );
      const remaining = nextQueue.filter((job) => job.status === "queued");
      return {
        output: { jobId, blob, filename },
        queue: nextQueue,
        isRendering: remaining.length > 0,
        currentJobId: remaining.length > 0 ? remaining[0].id : null,
        progress: null,
      };
    });
  },

  failJob: (jobId, message) =>
    set((state) => {
      const nextQueue = state.queue.map((job) =>
        job.id === jobId ? { ...job, status: "failed" as RenderJobStatus, error: message } : job
      );
      const remaining = nextQueue.filter(
        (job) => job.status === "queued" || job.status === "rendering"
      );
      return {
        queue: nextQueue,
        isRendering: remaining.length > 0,
        currentJobId: remaining.length > 0 ? remaining[0].id : null,
        progress: null,
      };
    }),

  cancelJob: (jobId) =>
    set((state) => ({
      queue: state.queue.map((job) =>
        job.id === jobId ? { ...job, status: "cancelled" as RenderJobStatus } : job
      ),
      isRendering: false,
      currentJobId: null,
      progress: null,
    })),

  setWarnings: (warnings) => set({ warnings }),
  clearOutput: () => set({ output: null }),
}));