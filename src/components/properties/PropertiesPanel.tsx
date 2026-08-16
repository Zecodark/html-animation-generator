"use client";

import { useMemo } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";
import {
  DURATION_PRESETS,
  FPS_PRESETS,
  RESOLUTION_PRESETS,
} from "@/types/project";
import { detectExternalAssets } from "@/lib/project/projectManager";
import { useEditorStore } from "@/stores/editorStore";

export function PropertiesPanel() {
  const settings = useProjectStore((state) => state.settings);
  const setSettings = useProjectStore((state) => state.setSettings);
  const html = useEditorStore((state) => state.html);
  const css = useEditorStore((state) => state.css);
  const js = useEditorStore((state) => state.js);

  const externalAssets = useMemo(
    () =>
      detectExternalAssets({
        html,
        css,
        javascript: js,
        name: "",
        version: "1.0.0",
        settings,
      }),
    [html, css, js, settings]
  );

  const update = (patch: Parameters<typeof setSettings>[0]) => {
    setSettings(patch);
    const next = { ...settings, ...patch };
    if (patch.fps !== undefined || patch.duration !== undefined) {
      useTimelineStore.getState().setTimeline(next.fps, next.duration);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto p-3">
      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Resolution
        </label>
        <div className="flex flex-col gap-1">
          {RESOLUTION_PRESETS.map((preset) => {
            const active = settings.width === preset.width && settings.height === preset.height;
            return (
              <button
                key={preset.label}
                onClick={() => update({ width: preset.width, height: preset.height })}
                className={`rounded border px-2 py-1 text-left font-mono text-[10px] transition-colors ${
                  active
                    ? "border-orange-500 bg-orange-500/10 text-orange-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="number"
            min={16}
            max={8192}
            value={settings.width}
            onChange={(e) => update({ width: Number(e.target.value) || 0 })}
            className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-200 focus:border-orange-500 focus:outline-none"
          />
          <span className="text-zinc-600">×</span>
          <input
            type="number"
            min={16}
            max={8192}
            value={settings.height}
            onChange={(e) => update({ height: Number(e.target.value) || 0 })}
            className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-200 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          FPS
        </label>
        <div className="flex flex-wrap gap-1">
          {FPS_PRESETS.map((fps) => (
            <button
              key={fps}
              onClick={() => update({ fps })}
              className={`rounded border px-2 py-1 font-mono text-[10px] transition-colors ${
                settings.fps === fps
                  ? "border-orange-500 bg-orange-500/10 text-orange-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {fps}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Duration
        </label>
        <div className="flex flex-wrap gap-1">
          {DURATION_PRESETS.map((dur) => (
            <button
              key={dur}
              onClick={() => update({ duration: dur })}
              className={`rounded border px-2 py-1 font-mono text-[10px] transition-colors ${
                settings.duration === dur
                  ? "border-orange-500 bg-orange-500/10 text-orange-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {dur}s
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Background
        </label>
        <div className="flex gap-1">
          {(
            [
              ["transparent", "Transparent"],
              ["solid", "Solid"],
              ["gradient", "Gradient"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() =>
                update({
                  background: value,
                  ...(value === "solid" ? { backgroundColor: settings.backgroundColor ?? "#FF6B00" } : {}),
                })
              }
              className={`flex-1 rounded border px-2 py-1 text-[10px] transition-colors ${
                settings.background === value
                  ? "border-orange-500 bg-orange-500/10 text-orange-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Scale
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.1}
            max={4}
            step={0.05}
            value={settings.scale}
            onChange={(e) => update({ scale: Number(e.target.value) })}
            className="min-w-0 flex-1 cursor-pointer accent-orange-500"
          />
          <span className="w-14 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-center font-mono text-[10px] text-zinc-200">
            {settings.scale.toFixed(2)}×
          </span>
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-zinc-600">
          <span>Kecil</span>
          <span>Besar</span>
        </div>
        <button
          onClick={() => update({ scale: 1 })}
          className="mt-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
        >
          Reset 1.00×
        </button>
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Position
        </label>
        <div className="flex flex-col gap-2">
          {(
            [
              ["panX", Math.round(settings.panX)],
              ["panY", Math.round(settings.panY)],
            ] as Array<["panX" | "panY", number]>
          ).map(([key, display]) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={settings[key]}
                onChange={(e) => update({ [key]: Number(e.target.value) } as Partial<typeof settings>)}
                className="min-w-0 flex-1 cursor-pointer accent-orange-500"
              />
              <span className="w-10 rounded border border-zinc-800 bg-zinc-900 px-1 py-0.5 text-center font-mono text-[10px] text-zinc-200">
                {display}%
              </span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[9px] leading-snug text-zinc-600">
          Geser objek agar tetap di dalam frame saat diperbesar (objek kembali
          ke tengah otomatis saat sangkarnya dipusatkan).
        </p>
        <button
          onClick={() => update({ panX: 0, panY: 0 })}
          className="mt-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
        >
          Center 0%, 0%
        </button>
      </div>

      {externalAssets.length > 0 && (
        <div className="rounded border border-amber-900/60 bg-amber-950/40 p-2">
          <p className="mb-1 text-[10px] font-semibold text-amber-200">
            External resources detected — may fail during rendering because of CORS.
          </p>
          <ul className="flex flex-col gap-0.5">
            {externalAssets.map((url) => (
              <li key={url} className="break-all font-mono text-[9px] text-amber-300/70">
                {url}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}