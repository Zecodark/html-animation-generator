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
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-4 bg-zinc-950/40">
      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Resolution
        </label>
        <div className="flex flex-col gap-1.5">
          {RESOLUTION_PRESETS.map((preset) => {
            const active = settings.width === preset.width && settings.height === preset.height;
            return (
              <button
                key={preset.label}
                onClick={() => update({ width: preset.width, height: preset.height })}
                className={`rounded-lg px-3 py-2 text-left font-mono text-[10px] transition-all duration-200 ${
                  active
                    ? "bg-orange-500/15 text-orange-400 font-bold"
                    : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={16}
            max={8192}
            value={settings.width}
            onChange={(e) => update({ width: Number(e.target.value) || 0 })}
            className="w-full rounded-lg bg-zinc-900/80 px-3 py-2 font-mono text-[10px] text-zinc-200 focus:bg-zinc-800 focus:outline-none"
          />
          <span className="text-zinc-600 text-xs font-bold">×</span>
          <input
            type="number"
            min={16}
            max={8192}
            value={settings.height}
            onChange={(e) => update({ height: Number(e.target.value) || 0 })}
            className="w-full rounded-lg bg-zinc-900/80 px-3 py-2 font-mono text-[10px] text-zinc-200 focus:bg-zinc-800 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          FPS
        </label>
        <div className="flex bg-zinc-900/50 p-1 rounded-lg gap-1">
          {FPS_PRESETS.map((fps) => {
            const active = settings.fps === fps;
            return (
              <button
                key={fps}
                onClick={() => update({ fps })}
                className={`flex-1 rounded-md py-1.5 text-center font-mono text-[10px] transition-all duration-150 ${
                  active
                    ? "bg-zinc-800 text-orange-400 font-bold shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                {fps}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Duration
          </label>
          <span className="font-mono text-[10px] text-zinc-400">
            {settings.duration}s ({Math.round(settings.fps * settings.duration)} frames)
          </span>
        </div>
        <div className="grid grid-cols-4 bg-zinc-900/50 p-1 rounded-lg gap-1">
          {DURATION_PRESETS.map((dur) => {
            const active = settings.duration === dur;
            return (
              <button
                key={dur}
                type="button"
                onClick={() => update({ duration: dur })}
                className={`rounded-md py-1.5 text-center font-mono text-[10px] transition-all duration-150 ${
                  active
                    ? "bg-zinc-800 text-orange-400 font-bold shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                {dur}s
              </button>
            );
          })}
          <button
            type="button"
            className={`rounded-md py-1.5 text-center text-[10px] font-medium transition-all duration-150 ${
              !DURATION_PRESETS.includes(settings.duration as (typeof DURATION_PRESETS)[number])
                ? "bg-zinc-800 text-orange-400 font-bold shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            }`}
          >
            Other
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="number"
              min={0.1}
              max={3600}
              step={0.1}
              value={settings.duration === 0 ? "" : settings.duration}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : Number(e.target.value);
                update({ duration: isNaN(val) ? 0 : val });
              }}
              className="w-full rounded-lg bg-zinc-900/80 px-3 py-2 pr-8 font-mono text-[10px] text-zinc-200 focus:bg-zinc-800 focus:outline-none"
              placeholder="Custom seconds"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-zinc-500">
              sec
            </span>
          </div>
          <button
            type="button"
            title="Decrease 1s"
            onClick={() => update({ duration: Math.max(0.1, Number((settings.duration - 1).toFixed(1))) })}
            className="rounded-lg bg-zinc-900/80 px-2.5 py-2 font-mono text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            -1s
          </button>
          <button
            type="button"
            title="Increase 1s"
            onClick={() => update({ duration: Math.min(3600, Number((settings.duration + 1).toFixed(1))) })}
            className="rounded-lg bg-zinc-900/80 px-2.5 py-2 font-mono text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            +1s
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Background
        </label>
        <div className="flex bg-zinc-900/50 p-1 rounded-lg gap-1">
          {(
            [
              ["transparent", "Transparent"],
              ["solid", "Solid"],
              ["gradient", "Gradient"],
            ] as const
          ).map(([value, label]) => {
            const active = settings.background === value;
            return (
              <button
                key={value}
                onClick={() =>
                  update({
                    background: value,
                    ...(value === "solid" ? { backgroundColor: settings.backgroundColor ?? "#FF6B00" } : {}),
                  })
                }
                className={`flex-1 rounded-md py-1.5 text-[10px] text-center transition-all duration-150 ${
                  active
                    ? "bg-zinc-800 text-orange-400 font-bold shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {settings.background === "solid" && (
          <div className="mt-2 flex flex-col gap-2 bg-zinc-900/30 p-2.5 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.backgroundColor ?? "#000000"}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="h-7 w-10 cursor-pointer rounded-md bg-zinc-900 border-none p-0 overflow-hidden"
              />
              <span className="font-mono text-[10px] text-zinc-400">
                {settings.backgroundColor ?? "#000000"}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => update({ background: "solid", backgroundColor: "#00FF00" })}
                className={`flex-1 rounded-md py-1.5 text-[10px] transition-colors ${
                  settings.backgroundColor === "#00FF00"
                    ? "bg-green-500/20 text-green-400 font-bold"
                    : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                Green Screen
              </button>
              <button
                onClick={() => update({ background: "solid", backgroundColor: "#0000FF" })}
                className={`flex-1 rounded-md py-1.5 text-[10px] transition-colors ${
                  settings.backgroundColor === "#0000FF"
                    ? "bg-blue-500/20 text-blue-400 font-bold"
                    : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                Blue Screen
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Scale
        </label>
        <div className="flex items-center gap-3 bg-zinc-900/30 rounded-xl p-3">
          <input
            type="range"
            min={0.1}
            max={4}
            step={0.05}
            value={settings.scale}
            onChange={(e) => update({ scale: Number(e.target.value) })}
            className="min-w-0 flex-1 cursor-pointer accent-orange-500"
          />
          <span className="w-14 rounded-md bg-zinc-900 py-1.5 text-center font-mono text-[10px] text-zinc-300 font-bold">
            {settings.scale.toFixed(2)}×
          </span>
        </div>
        <div className="mt-1 flex justify-between px-1 text-[9px] text-zinc-600">
          <span>Kecil</span>
          <span>Besar</span>
        </div>
        <button
          onClick={() => update({ scale: 1 })}
          className="mt-2 rounded-lg bg-zinc-900/60 px-4 py-1.5 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          Reset 1.00×
        </button>
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Position
        </label>
        <div className="flex flex-col gap-3 bg-zinc-900/30 rounded-xl p-3">
          {(
            [
              ["panX", Math.round(settings.panX)],
              ["panY", Math.round(settings.panY)],
            ] as Array<["panX" | "panY", number]>
          ).map(([key, display]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[9px] font-bold text-zinc-500 w-4 uppercase">{key === "panX" ? "X" : "Y"}</span>
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={settings[key]}
                onChange={(e) => update({ [key]: Number(e.target.value) } as Partial<typeof settings>)}
                className="min-w-0 flex-1 cursor-pointer accent-orange-500"
              />
              <span className="w-11 rounded-md bg-zinc-900 py-1.5 text-center font-mono text-[10px] text-zinc-300 font-bold">
                {display}%
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 px-1 text-[9px] leading-relaxed text-zinc-600">
          Geser objek agar tetap di dalam frame saat diperbesar.
        </p>
        <button
          onClick={() => update({ panX: 0, panY: 0 })}
          className="mt-2 rounded-lg border border-zinc-850 bg-zinc-900/60 px-3 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
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