"use client";

import type { RefObject } from "react";
import { useProjectStore } from "@/stores/projectStore";

interface PreviewFrameProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  documentSrc: string;
  ready: boolean;
  error: string | null;
}

export function PreviewFrame({ iframeRef, documentSrc, ready, error }: PreviewFrameProps) {
  const background = useProjectStore((state) => state.settings.background);

  // Transparent preview uses a checkerboard — a pure UI layer behind the
  // sandbox iframe. It is NEVER part of the captured/exported image.
  const checkerboard =
    background === "transparent"
      ? {
          backgroundColor: "#14171c",
          backgroundImage:
            "conic-gradient(#24282f 25%, #15181d 0 50%, #24282f 0 75%, #15181d 0)",
          backgroundSize: "18px 18px",
        }
      : undefined;

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${
        background === "transparent"
          ? ""
          : "bg-[radial-gradient(circle_at_50%_40%,#1a1d24_0%,#0b0d11_75%)]"
      }`}
      style={checkerboard}
    >
      <iframe
        ref={iframeRef}
        title="Motion preview sandbox"
        sandbox="allow-scripts allow-same-origin"
        className="absolute top-0 left-0 border-0"
        srcDoc={documentSrc}
      />

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-orange-400" />
            <span className="text-xs">Loading preview…</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6">
          <div className="max-w-md rounded border border-red-800 bg-red-950/50 p-4 text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-400">
              Preview Error
            </p>
            <p className="break-words text-xs text-red-200">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}