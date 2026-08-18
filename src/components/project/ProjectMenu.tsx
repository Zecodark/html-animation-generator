"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useProjectStore } from "@/stores/projectStore";

interface ProjectMenuProps {
  projectName: string;
  onNameChange: (name: string) => void;
}

export function ProjectMenu({ projectName, onNameChange }: ProjectMenuProps) {
  const loadFromFile = useProjectStore((state) => state.loadFromFile);
  const importHtml = useProjectStore((state) => state.importHtml);
  const newProject = useProjectStore((state) => state.newProject);
  const loadDemo = useProjectStore((state) => state.loadDemo);
  const saveProject = useProjectStore((state) => state.saveProject);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleLoad = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await loadFromFile(file);
      setError(null);
    } catch (err) {
      setError(`Could not load project: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      importHtml(text, file.name.replace(/\.html?$/i, ""));
      setError(null);
    } catch (err) {
      setError(`Could not import HTML: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        value={projectName}
        onChange={(e) => onNameChange(e.target.value)}
        className="w-44 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none placeholder-zinc-500"
        placeholder="Project name"
      />

      <div className="flex bg-zinc-900/50 p-1 rounded-lg gap-1">
        <button
          onClick={newProject}
          title="New project"
          className="rounded-md px-3 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150"
        >
          New
        </button>
        <button
          onClick={loadDemo}
          title="Load Halloween Pumpkin Loader demo"
          className="rounded-md px-3 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150"
        >
          Demo
        </button>
        <label
          title="Load .htmlmotion project"
          className="cursor-pointer rounded-md px-3 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150"
        >
          Load
          <input type="file" accept=".htmlmotion,application/json" className="hidden" onChange={handleLoad} />
        </label>
        <button
          onClick={saveProject}
          title="Download .htmlmotion project"
          className="rounded-md px-3 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150"
        >
          Save
        </button>
        <label
          title="Import an HTML file"
          className="cursor-pointer rounded-md px-3 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150"
        >
          Import
          <input type="file" accept=".html,.htm,text/html" className="hidden" onChange={handleImport} />
        </label>
      </div>

      {error && (
        <div className="pointer-events-none fixed top-14 left-1/2 z-50 -translate-x-1/2 rounded border border-red-800 bg-red-950/90 px-4 py-2 text-xs text-red-200 shadow-xl">
          {error}
        </div>
      )}
    </div>
  );
}