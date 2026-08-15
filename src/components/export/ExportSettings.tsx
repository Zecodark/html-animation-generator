"use client";

import type { AlignX, AlignY, ExportSettings, FitMode, QualityLevel } from "@/types/encoder";
import {
  DURATION_PRESETS,
  FPS_PRESETS,
  RESOLUTION_PRESETS,
} from "@/types/project";

interface ExportSettingsProps {
  settings: ExportSettings;
  onChange: (patch: Partial<ExportSettings>) => void;
  stockMode: boolean;
  onStockModeChange: (enabled: boolean) => void;
}

function formatEstimatedFrames(settings: ExportSettings): number {
  return Math.round(settings.fps * settings.duration);
}

function transparencyHint(settings: ExportSettings): string | null {
  if (!settings.transparent) return null;
  switch (settings.format) {
    case "mp4":
      return "H.264 MP4 does not carry an alpha channel — transparent areas will be filled with the background color. Use PNG Sequence for true transparency.";
    case "webm":
      return "WebM via WebCodecs does not expose an alpha channel in this pipeline. Use PNG Sequence for transparency.";
    case "mov":
      return "MOV (MPEG-4) does not support alpha transparency. Use PNG Sequence for transparency.";
    case "gif":
      return "GIF supports 1-bit transparency (max 256 colors).";
    case "png-sequence":
      return "PNG Sequence preserves alpha.";
  }
}

export function ExportSettings({
  settings,
  onChange,
  stockMode,
  onStockModeChange,
}: ExportSettingsProps) {
  const estimatedFrames = formatEstimatedFrames(settings);
  const hint = transparencyHint(settings);

  return (
    <div className="flex flex-col gap-4">
      {/* Stock mode */}
      <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-xs font-semibold text-zinc-200">STOCK MODE</span>
          <button
            onClick={() => {
              const next = !stockMode;
              onStockModeChange(next);
              if (next) {
                onChange({
                  width: 1920,
                  height: 1080,
                  fps: 30,
                  duration: 5,
                  transparent: true,
                  background: "transparent",
                  quality: "very-high",
                });
              }
            }}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              stockMode ? "bg-emerald-600" : "bg-zinc-700"
            }`}
            aria-pressed={stockMode}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                stockMode ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </label>

        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
          {[
            "No watermark",
            "No logo",
            "No audio",
            "No text",
            "Clean background",
            "Seamless loop",
          ].map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> {item}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] leading-snug text-zinc-600">
          Stock mode is a preset — the tool does not guarantee the exported file meets any
          marketplace stock requirements.
        </p>
      </div>

      {/* Resolution */}
      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Resolution
        </label>
        <div className="flex flex-wrap gap-1.5">
          {RESOLUTION_PRESETS.map((preset) => {
            const active = settings.width === preset.width && settings.height === preset.height;
            return (
              <button
                key={preset.label}
                onClick={() => onChange({ width: preset.width, height: preset.height })}
                className={`rounded border px-2 py-1 font-mono text-[10px] transition-colors ${
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
            onChange={(e) => onChange({ width: Number(e.target.value) || 0 })}
            className="w-24 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-200 focus:border-orange-500 focus:outline-none"
          />
          <span className="text-zinc-600">×</span>
          <input
            type="number"
            min={16}
            max={8192}
            value={settings.height}
            onChange={(e) => onChange({ height: Number(e.target.value) || 0 })}
            className="w-24 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-200 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* FPS + Duration */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            FPS
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FPS_PRESETS.map((fps) => (
              <button
                key={fps}
                onClick={() => onChange({ fps })}
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
          <div className="flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((dur) => (
              <button
                key={dur}
                onClick={() => onChange({ duration: dur })}
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
          <input
            type="number"
            min={0.1}
            max={3600}
            step={0.1}
            value={settings.duration}
            onChange={(e) => onChange({ duration: Number(e.target.value) || 0 })}
            className="mt-1.5 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-200 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Quality + Background */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Quality
          </label>
          <select
            value={settings.quality}
            onChange={(e) => onChange({ quality: e.target.value as QualityLevel })}
            className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 focus:border-orange-500 focus:outline-none"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="very-high">Very High</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Background
          </label>
          <div className="flex gap-1.5">
            {(
              [
                ["transparent", "Transparent"],
                ["solid", "Solid Color"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  onChange({
                    background: value,
                    transparent: value === "transparent",
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
          {settings.background === "solid" && (
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={settings.backgroundColor ?? "#000000"}
                onChange={(e) =>
                  onChange({ backgroundColor: e.target.value, transparent: false })
                }
                className="h-7 w-10 cursor-pointer rounded border border-zinc-800 bg-zinc-900"
              />
              <span className="font-mono text-[10px] text-zinc-500">
                {settings.backgroundColor ?? "#000000"}
              </span>
            </div>
          )}
          {settings.background === "gradient" && (
            <p className="mt-1.5 text-[10px] leading-snug text-zinc-600">
              Gradients are defined in your CSS (e.g. `background: linear-gradient(...)` on the stage).
            </p>
          )}
        </div>
      </div>

      {/* Crop / Fit */}
      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Crop / Fit
        </label>
        <div className="flex gap-1.5">
          {(["contain", "cover", "fill"] as FitMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onChange({ fit: mode })}
              className={`flex-1 rounded border px-2 py-1 text-[10px] transition-colors ${
                settings.fit === mode
                  ? "border-orange-500 bg-orange-500/10 text-orange-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {mode === "contain" ? "Fit" : mode === "cover" ? "Crop" : "Fill"}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                ["top", "left"],
                ["top", "center"],
                ["top", "right"],
                ["center", "left"],
                ["center", "center"],
                ["center", "right"],
                ["bottom", "left"],
                ["bottom", "center"],
                ["bottom", "right"],
              ] as Array<[AlignY, AlignX]>
            ).map(([y, x]) => {
              const active = settings.alignX === x && settings.alignY === y;
              return (
                <button
                  key={`${y}-${x}`}
                  onClick={() => onChange({ alignX: x, alignY: y })}
                  className={`flex h-5 w-5 items-center justify-center rounded border text-[9px] transition-colors ${
                    active
                      ? "border-orange-500 bg-orange-500/20 text-orange-200"
                      : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700"
                  }`}
                  title={`Align ${y} / ${x}`}
                >
                  ●
                </button>
              );
            })}
          </div>
          <p className="flex-1 text-[10px] leading-snug text-zinc-600">
            Fit = entire scene visible · Crop = fill frame, edges cut · Fill =
            stretch. Dot places the scene inside the frame.
          </p>
        </div>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-400">Estimated Frames</span>
          <span className="font-mono text-zinc-200">{estimatedFrames}</span>
        </div>
      </div>

      {hint && (
        <p className="rounded border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-[11px] leading-snug text-amber-200">
          <span className="font-semibold">Note:</span> {hint}
        </p>
      )}
    </div>
  );
}