"use client";

import { useRef } from "react";
import { useTimelineStore } from "@/stores/timelineStore";
import { TimeRuler } from "./TimeRuler";
import { Playhead } from "./Playhead";
import { formatTime } from "@/lib/utils/utils";

interface TimelineProps {
  onSeek: (time: number) => void;
}

export function Timeline({ onSeek }: TimelineProps) {
  const currentTime = useTimelineStore((state) => state.currentTime);
  const duration = useTimelineStore((state) => state.duration);
  const zoom = useTimelineStore((state) => state.zoom);
  const fps = useTimelineStore((state) => state.fps);
  const setZoom = useTimelineStore((state) => state.setZoom);

  const pxPerSecond = 60 * zoom;
  const width = Math.max(duration * pxPerSecond, 120);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const seekFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel = clientX - rect.left + el.scrollLeft;
    const t = rel / pxPerSecond;
    onSeek(Math.max(0, Math.min(t, duration)));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Timeline
        </span>
        <span className="font-mono text-[10px] text-zinc-500">
          {formatTime(currentTime)} <span className="text-zinc-600">/ {formatTime(duration)}</span>
        </span>
        <span className="rounded bg-zinc-900 px-1.5 font-mono text-[10px] text-zinc-500">
          {Math.min(Math.round(currentTime * fps), Math.round(duration * fps))}/{Math.round(duration * fps)}f
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.max(0.25, zoom / 2))}
            className="h-5 w-5 rounded text-zinc-400 transition-colors hover:bg-zinc-800"
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={() => setZoom(Math.min(16, zoom * 2))}
            className="h-5 w-5 rounded text-zinc-400 transition-colors hover:bg-zinc-800"
            title="Zoom in"
          >
            +
          </button>
          <span className="ml-1 font-mono text-[10px] text-zinc-600">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <div
        ref={trackRef}
        className="min-h-0 flex-1 cursor-ew-resize overflow-x-auto overflow-y-hidden"
        onPointerDown={(event) => {
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          seekFromEvent(event.clientX);
        }}
        onPointerMove={(event) => {
          if (draggingRef.current) seekFromEvent(event.clientX);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
      >
        <div className="relative h-full" style={{ width }}>
          <TimeRuler duration={duration} pxPerSecond={pxPerSecond} />
          <div className="absolute right-0 bottom-0 left-0 top-8">
            <div
              className="h-full w-full"
              style={{
                background: `repeating-linear-gradient(
                  90deg,
                  #111318 0px,
                  #111318 ${60 * zoom - 1}px,
                  #16181f ${60 * zoom - 1}px,
                  #16181f ${60 * zoom}px
                )`,
              }}
            />
          </div>
          <Playhead x={currentTime * pxPerSecond} />
        </div>
      </div>
    </div>
  );
}