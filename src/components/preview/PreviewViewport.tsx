"use client";

import type { RefObject } from "react";
import { PreviewFrame } from "./PreviewFrame";
import { PreviewControls, type PreviewControlsProps } from "./PreviewControls";

interface PreviewViewportProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  documentSrc: string;
  ready: boolean;
  error: string | null;
  controls: PreviewControlsProps;
}

export function PreviewViewport({ iframeRef, documentSrc, ready, error, controls }: PreviewViewportProps) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
        <PreviewFrame iframeRef={iframeRef} documentSrc={documentSrc} ready={ready} error={error} />
      </div>
      <PreviewControls {...controls} />
    </div>
  );
}