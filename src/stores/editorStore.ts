import { create } from "zustand";
import type { MotionProject } from "@/types/project";

export type EditorTab = "html" | "css" | "js";

interface EditorState {
  html: string;
  css: string;
  js: string;
  activeTab: EditorTab;
  setActiveTab: (tab: EditorTab) => void;
  setCode: (tab: EditorTab, value: string) => void;
  replace: (project: Pick<MotionProject, "html" | "css" | "javascript">) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  html: "",
  css: "",
  js: "",
  activeTab: "html",

  setActiveTab: (activeTab) => set({ activeTab }),

  setCode: (tab, value) =>
    set((state) => ({
      ...state,
      html: tab === "html" ? value : state.html,
      css: tab === "css" ? value : state.css,
      js: tab === "js" ? value : state.js,
    })),

  replace: (project) =>
    set({
      html: project.html,
      css: project.css,
      js: project.javascript,
      activeTab: "html",
    }),

  reset: () => set({ html: "", css: "", js: "", activeTab: "html" }),
}));