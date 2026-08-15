import { create } from "zustand";
import type { MotionProject, ProjectSettings } from "@/types/project";
import { useEditorStore } from "./editorStore";
import { createDemoProject } from "@/lib/project/demoProject";
import {
  DEFAULT_SETTINGS,
  downloadProject,
  emptyProject,
  importFromHtml,
  readProjectFile,
} from "@/lib/project/projectManager";
import { useTimelineStore } from "./timelineStore";

interface ProjectState {
  name: string;
  settings: ProjectSettings;
  lastLoadedAt: number | null;
  setName: (name: string) => void;
  setSettings: (patch: Partial<ProjectSettings>) => void;
  applyProject: (project: MotionProject) => void;
  newProject: () => void;
  loadDemo: () => void;
  loadFromFile: (file: File) => Promise<void>;
  importHtml: (rawHtml: string, name?: string) => void;
  saveProject: () => void;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  name: "Untitled Motion",
  settings: { ...DEFAULT_SETTINGS },
  lastLoadedAt: null,

  setName: (name) => set({ name }),

  setSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),

  applyProject: (project) => {
    useEditorStore.getState().replace(project);
    useTimelineStore
      .getState()
      .setTimeline(project.settings.fps, project.settings.duration);
    set({
      name: project.name,
      settings: { ...DEFAULT_SETTINGS, ...project.settings },
      lastLoadedAt: Date.now(),
    });
  },

  newProject: () => {
    get().applyProject(emptyProject());
  },

  loadDemo: () => {
    get().applyProject(createDemoProject());
  },

  loadFromFile: async (file) => {
    const project = await readProjectFile(file);
    get().applyProject(project);
  },

  importHtml: (rawHtml, name) => {
    const extracted = importFromHtml(rawHtml);
    const baseName = name ?? "Imported HTML";
    get().applyProject({
      version: "1.0.0",
      name: baseName,
      html: extracted.html,
      css: extracted.css,
      javascript: extracted.javascript,
      settings: { ...get().settings },
    });
  },

  saveProject: () => {
    const { name, settings } = get();
    const project: MotionProject = {
      version: "1.0.0",
      name,
      html: useEditorStore.getState().html,
      css: useEditorStore.getState().css,
      javascript: useEditorStore.getState().js,
      settings,
    };
    downloadProject(project);
  },
}));