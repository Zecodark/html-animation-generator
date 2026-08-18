"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useRenderStore } from "@/stores/renderStore";
import { buildDocument } from "@/lib/preview/documentBuilder";
import { PreviewController, type PreviewReadyInfo } from "@/lib/preview/previewController";
import { AnimationController } from "@/lib/renderer/AnimationController";
import { PreviewFrameCapture } from "@/lib/renderer/FrameCapture";

export function usePreview() {
  const html = useEditorStore((state) => state.html);
  const css = useEditorStore((state) => state.css);
  const js = useEditorStore((state) => state.js);
  const projectSettings = useProjectStore((state) => state.settings);
  const exportFrameWidth = useRenderStore((state) => state.exportSettings.width);
  const exportFrameHeight = useRenderStore((state) => state.exportSettings.height);
  const exportFrameFit = useRenderStore((state) => state.exportSettings.fit);
  const exportFrameAlignX = useRenderStore((state) => state.exportSettings.alignX);
  const exportFrameAlignY = useRenderStore((state) => state.exportSettings.alignY);
  const exportFrameObjectScale = useRenderStore((state) => state.exportSettings.objectScale);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const controllerRef = useRef<PreviewController | null>(null);
  const frameCaptureRef = useRef<PreviewFrameCapture | null>(null);
  const animationRef = useRef<AnimationController | null>(null);

  const [readyInfo, setReadyInfo] = useState<PreviewReadyInfo | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const isClient = typeof window !== "undefined";

  const documentSrc = useMemo(
    () =>
      buildDocument({
        html,
        css,
        javascript: js,
        width: projectSettings.width,
        height: projectSettings.height,
      }),
    [html, css, js, projectSettings.width, projectSettings.height]
  );

  // Create long-lived controller objects once.
  useEffect(() => {
    const controller = new PreviewController();
    controller.onError = (message) => setPreviewError(message);
    const frameCapture = new PreviewFrameCapture();
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
    // width/height are baked into documentSrc; scale is not, so it is kept in
    // sync by the dedicated geometry effect below without reloading the frame.
  }, [documentSrc, isClient]);

  // Reconfigure canvas geometry (size + object scale) in place so the preview
  // updates live without re-attaching (a re-attach waits for a READY that has
  // already been sent and would time out).
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

  // Live WYSIWYG: preview frames the canvas using the CURRENT export settings
  // if the modal is open, otherwise it uses the base project settings.
  // This ensures that when changing resolution in the Properties panel, the
  // preview shape updates immediately.
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

  // Size the preview iframe to the SOURCE canvas and scale it down to fit the
  // panel via a CSS transform. The transform only changes the visual output —
  // the iframe's internal viewport stays at the source size, so vw/vh inside
  // the document resolve exactly like during render. Without this, viewport
  // units (and any layout that depends on the window size) would lay out
  // against the small preview panel and the export would not match the preview.
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

  // Keep the preview clock configuration in sync with the project settings.
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

  // Create the animation (playback) controller once preview is ready.
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