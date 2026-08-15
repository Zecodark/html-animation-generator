"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useProjectStore } from "@/stores/projectStore";

/**
 * Project management logic: New / Demo / Save / Load (.htmlmotion) / Import
 * HTML. File inputs are hidden and triggered by menu buttons.
 */
export function useProjectManager() {
  const loadFromFile = useProjectStore((state) => state.loadFromFile);
  const importHtml = useProjectStore((state) => state.importHtml);
  const newProject = useProjectStore((state) => state.newProject);
  const loadDemo = useProjectStore((state) => state.loadDemo);
  const saveProject = useProjectStore((state) => state.saveProject);

  const [error, setError] = useState<string | null>(null);

  const loadFileRef = useRef<HTMLInputElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const handleLoad = async (file: File | undefined) => {
    if (!file) return;
    try {
      await loadFromFile(file);
      setError(null);
    } catch (err) {
      setError(`Could not load project: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      importHtml(text, file.name.replace(/\.html?$/i, ""));
      setError(null);
    } catch (err) {
      setError(`Could not import HTML: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return {
    error,
    setError,
    loadFileRef,
    importFileRef,
    newProject,
    loadDemo,
    saveProject,
    onLoadChange: (event: ChangeEvent<HTMLInputElement>) =>
      void handleLoad(event.target.files?.[0]),
    onImportChange: (event: ChangeEvent<HTMLInputElement>) =>
      void handleImport(event.target.files?.[0]),
    triggerLoad: () => loadFileRef.current?.click(),
    triggerImport: () => importFileRef.current?.click(),
  };
}