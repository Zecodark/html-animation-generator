"use client";

import type { ReactNode } from "react";

interface TimeRulerProps {
  duration: number;
  pxPerSecond: number;
}

export function TimeRuler({ duration, pxPerSecond }: TimeRulerProps) {
  const width = duration * pxPerSecond;
  const seconds = Math.max(1, Math.ceil(duration));
  const ticks: ReactNode[] = [];

  for (let s = 0; s <= seconds; s += 1) {
    const x = s * pxPerSecond;
    for (let q = 1; q <= 3; q += 1) {
      const xq = s * pxPerSecond + (q * pxPerSecond) / 4;
      if (s * pxPerSecond + (q * pxPerSecond) / 4 > width) continue;
      ticks.push(
        <div
          key={`m-${s}-${q}`}
          className="absolute top-1/2 h-1 w-px bg-zinc-700"
          style={{ left: xq }}
        />
      );
    }
    ticks.push(
      <div key={`t-${s}`} className="absolute top-0 h-2.5 w-px bg-zinc-500" style={{ left: x }} />
    );
    ticks.push(
      <span
        key={`l-${s}`}
        className="absolute top-3.5 -translate-x-1/2 font-mono text-[9px] text-zinc-500"
        style={{ left: x }}
      >
        {s}s
      </span>
    );
  }

  return (
    <div className="relative h-8 shrink-0 border-b border-zinc-800 bg-zinc-900/60">
      <div className="relative h-full" style={{ width }}>
        {ticks}
      </div>
    </div>
  );
}