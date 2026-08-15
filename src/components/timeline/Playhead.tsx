"use client";

interface PlayheadProps {
  x: number;
}

export function Playhead({ x }: PlayheadProps) {
  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-10 w-px"
      style={{ left: x, transform: "translateX(-0.5px)" }}
    >
      <div className="absolute top-0 h-0 w-0 border-x-4 border-x-transparent border-t-[7px] border-t-orange-400" />
      <div className="absolute top-[7px] bottom-0 w-px bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
    </div>
  );
}