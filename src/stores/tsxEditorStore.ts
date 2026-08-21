import { create } from "zustand";

export type TsxEditorTab = "tsx" | "css";

interface TsxEditorState {
  tsx: string;
  css: string;
  activeTab: TsxEditorTab;
  /** Last compilation error (null = clean). */
  compileError: string | null;
  setActiveTab: (tab: TsxEditorTab) => void;
  setCode: (tab: TsxEditorTab, value: string) => void;
  setCompileError: (error: string | null) => void;
  replace: (tsx: string, css: string) => void;
  reset: () => void;
}

export const useTsxEditorStore = create<TsxEditorState>()((set) => ({
  tsx: "",
  css: "",
  activeTab: "tsx",
  compileError: null,

  setActiveTab: (activeTab) => set({ activeTab }),

  setCode: (tab, value) =>
    set((state) => ({
      ...state,
      tsx: tab === "tsx" ? value : state.tsx,
      css: tab === "css" ? value : state.css,
    })),

  setCompileError: (compileError) => set({ compileError }),

  replace: (tsx, css) =>
    set({
      tsx,
      css,
      activeTab: "tsx",
      compileError: null,
    }),

  reset: () => set({ tsx: "", css: "", activeTab: "tsx", compileError: null }),
}));
