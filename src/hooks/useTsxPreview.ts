"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTsxEditorStore } from "@/stores/tsxEditorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useRenderStore } from "@/stores/renderStore";
import { compileTsx } from "@/lib/tsx-preview/tsxCompiler";
import { buildTsxDocument } from "@/lib/tsx-preview/tsxDocumentBuilder";
import { PreviewController, type PreviewReadyInfo } from "@/lib/preview/previewController";
import { AnimationController } from "@/lib/renderer/AnimationController";
import { TsxFrameCapture } from "@/lib/renderer/TsxFrameCapture";

export function useTsxPreview() {
  const tsx = useTsxEditorStore((state) => state.tsx);
  const css = useTsxEditorStore((state) => state.css);
  const setCompileError = useTsxEditorStore((state) => state.setCompileError);
  const projectSettings = useProjectStore((state) => state.settings);
  const exportFrameWidth = useRenderStore((state) => state.exportSettings.width);
  const exportFrameHeight = useRenderStore((state) => state.exportSettings.height);
  const exportFrameFit = useRenderStore((state) => state.exportSettings.fit);
  const exportFrameAlignX = useRenderStore((state) => state.exportSettings.alignX);
  const exportFrameAlignY = useRenderStore((state) => state.exportSettings.alignY);
  const exportFrameObjectScale = useRenderStore((state) => state.exportSettings.objectScale);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const controllerRef = useRef<PreviewController | null>(null);
  const frameCaptureRef = useRef<TsxFrameCapture | null>(null);
  const animationRef = useRef<AnimationController | null>(null);

  const [readyInfo, setReadyInfo] = useState<PreviewReadyInfo | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [renderKey, setRenderKey] = useState(0);

  const isClient = typeof window !== "undefined";

  // Compile TSX → JS
  const compileResult = useMemo(() => {
    if (!tsx.trim()) {
      return { success: true as const, code: "// Empty — write some TSX!" };
    }
    return compileTsx(tsx);
  }, [tsx]);

  // Sync compile error to store safely outside of render
  useEffect(() => {
    if (compileResult.success) {
      setCompileError(null);
    } else {
      setCompileError(compileResult.error);
    }
  }, [compileResult, setCompileError]);

  // Build the iframe document
  const documentSrc = useMemo(() => {
    if (!compileResult.success) {
      // Return a document that shows the error visually
      const errorJs = `
        var stage = document.getElementById('tsx-root');
        if (stage) {
          stage.innerHTML = '<div style="padding:24px;color:#f87171;font-family:monospace;font-size:12px;white-space:pre-wrap;background:#1c1917;border-radius:12px;margin:16px;border:1px solid #7f1d1d;">' +
            '<strong style="font-size:13px;">Compile Error</strong>\\n\\n' +
            ${JSON.stringify(compileResult.error).replace(/</g, "\\x3c")} + '</div>';
        }
      `;
      return buildTsxDocument({
        compiledJs: errorJs + `\n// renderKey: ${renderKey}`,
        css,
        width: projectSettings.width,
        height: projectSettings.height,
      });
    }

    return buildTsxDocument({
      compiledJs: compileResult.code + `\n// renderKey: ${renderKey}`,
      css,
      width: projectSettings.width,
      height: projectSettings.height,
    });
  }, [compileResult, css, projectSettings.width, projectSettings.height, renderKey]);

  // Create long-lived controller objects once.
  useEffect(() => {
    const controller = new PreviewController();
    controller.onError = (message) => setPreviewError(message);
    const frameCapture = new TsxFrameCapture();
    frameCapture.setController(controller);
    controllerRef.current = controller;
    frameCaptureRef.current = frameCapture;
    return () => {
      controller.destroy();
      controllerRef.current = null;
      frameCaptureRef.current = null;
    };
  }, []);

  // (Re)attach to the iframe whenever the injected document changes.
  useEffect(() => {
    if (!isClient) return;
    const controller = controllerRef.current;
    if (!controller) return;

    setReadyInfo(null);
    setPreviewError(null);

    let alive = true;
    controller
      .attach(iframeRef.current)
      .then((info) => {
        if (!alive) return;
        setReadyInfo(info);
        const s = useProjectStore.getState().settings;
        controller.configure(
          s.width,
          s.height,
          s.scale,
          s.panX,
          s.panY,
          s.background === "solid" ? s.backgroundColor || null : null
        );
        controller.setTime(useTimelineStore.getState().currentTime);
      })
      .catch((error) => {
        if (!alive) return;
        setPreviewError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      alive = false;
      controller.detach();
    };
  }, [documentSrc, isClient]);

  // Reconfigure canvas geometry live
  useEffect(() => {
    if (!isClient) return;
    const controller = controllerRef.current;
    if (!controller || !readyInfo) return;
    controller.configure(
      projectSettings.width,
      projectSettings.height,
      projectSettings.scale,
      projectSettings.panX,
      projectSettings.panY,
      projectSettings.background === "solid" ? projectSettings.backgroundColor || null : null
    );
  }, [isClient, readyInfo, projectSettings.width, projectSettings.height, projectSettings.scale, projectSettings.panX, projectSettings.panY, projectSettings.background, projectSettings.backgroundColor]);

  const isSettingsOpen = useRenderStore((state) => state.isSettingsOpen);

  // Live WYSIWYG preview framing
  useEffect(() => {
    if (!isClient) return;
    const controller = controllerRef.current;
    if (!controller || !readyInfo) return;

    const w = isSettingsOpen ? exportFrameWidth : projectSettings.width;
    const h = isSettingsOpen ? exportFrameHeight : projectSettings.height;

    controller.previewFrame({
      enabled: true,
      width: w,
      height: h,
      fit: exportFrameFit,
      alignX: exportFrameAlignX,
      alignY: exportFrameAlignY,
      objectScale: exportFrameObjectScale,
    });
  }, [
    isClient,
    readyInfo,
    isSettingsOpen,
    projectSettings.width,
    projectSettings.height,
    exportFrameWidth,
    exportFrameHeight,
    exportFrameFit,
    exportFrameAlignX,
    exportFrameAlignY,
    exportFrameObjectScale,
  ]);

  // Size the preview iframe to the SOURCE canvas
  useEffect(() => {
    if (!isClient) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const container = iframe.parentElement;
    if (!container) return;

    const update = () => {
      const cw = container.clientWidth || 0;
      const ch = container.clientHeight || 0;
      const w = projectSettings.width;
      const h = projectSettings.height;
      if (!cw || !ch || !w || !h) return;
      const s = Math.min(cw / w, ch / h);
      const scale = isFinite(s) && s > 0 ? s : 1;
      iframe.style.width = `${w}px`;
      iframe.style.height = `${h}px`;
      iframe.style.transformOrigin = "0 0";
      iframe.style.transform = `translate(${(cw - w * scale) / 2}px, ${(ch - h * scale) / 2}px) scale(${scale})`;
    };

    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(container);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isClient, projectSettings.width, projectSettings.height]);

  // Keep clock config in sync
  useEffect(() => {
    if (!isClient || !animationRef.current) return;
    animationRef.current.configure({
      duration: projectSettings.duration,
      loop: useTimelineStore.getState().loop,
    });
    useTimelineStore.getState().setTimeline(
      projectSettings.fps,
      projectSettings.duration
    );
  }, [projectSettings.duration, projectSettings.fps, isClient]);

  // Create animation controller once preview is ready
  useEffect(() => {
    if (!isClient || !readyInfo) return;
    const controller = controllerRef.current;
    if (!controller) return;

    const animation = new AnimationController(controller);
    animation.onTimeChange = (time) => {
      useTimelineStore.getState().setTime(time);
    };
    animation.configure({
      duration: useTimelineStore.getState().duration,
      loop: useTimelineStore.getState().loop,
    });
    animationRef.current = animation;

    return () => {
      animation.pause();
      animationRef.current = null;
    };
  }, [readyInfo, isClient]);

  const seek = useCallback((time: number) => {
    animationRef.current?.seek(time);
    useTimelineStore.getState().setTime(time);
  }, []);

  const play = useCallback(() => {
    animationRef.current?.play();
    useTimelineStore.getState().setPlaying(true);
  }, []);

  const pause = useCallback(() => {
    animationRef.current?.pause();
    useTimelineStore.getState().setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const playing = useTimelineStore.getState().playing;
    if (playing) pause();
    else play();
  }, [play, pause]);

  const restart = useCallback(() => {
    animationRef.current?.restart();
    useTimelineStore.getState().setPlaying(false);
    // Force a full iframe reload to completely reset React, CSS animations, and DOM state!
    setRenderKey(k => k + 1);
  }, []);

  const loop = useCallback(() => {
    const next = !useTimelineStore.getState().loop;
    useTimelineStore.getState().setLoop(next);
    animationRef.current?.configure({
      duration: useTimelineStore.getState().duration,
      loop: next,
    });
  }, []);

  return {
    iframeRef,
    documentSrc,
    readyInfo,
    previewError,
    controller: controllerRef,
    frameCapture: frameCaptureRef,
    play,
    pause,
    toggle,
    restart,
    seek,
    toggleLoop: loop,
  };
}
