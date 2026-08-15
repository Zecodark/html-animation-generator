"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { buildDocument } from "@/lib/preview/documentBuilder";
import { PreviewController, type PreviewReadyInfo } from "@/lib/preview/previewController";
import { AnimationController } from "@/lib/renderer/AnimationController";
import { PreviewFrameCapture } from "@/lib/renderer/FrameCapture";

export function usePreview() {
  const html = useEditorStore((state) => state.html);
  const css = useEditorStore((state) => state.css);
  const js = useEditorStore((state) => state.js);
  const projectSettings = useProjectStore((state) => state.settings);

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

  // (Re)attach to the iframe whenever the document (or settings) changes.
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
        controller.configure(projectSettings.width, projectSettings.height);
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
  }, [documentSrc, isClient, projectSettings.width, projectSettings.height]);

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