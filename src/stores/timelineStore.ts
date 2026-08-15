import { create } from "zustand";

interface TimelineState {
  currentTime: number;
  duration: number;
  fps: number;
  playing: boolean;
  loop: boolean;
  zoom: number;
  setTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setFps: (fps: number) => void;
  setPlaying: (playing: boolean) => void;
  setLoop: (loop: boolean) => void;
  setZoom: (zoom: number) => void;
  setTimeline: (fps: number, duration: number) => void;
  restart: () => void;
}

export const useTimelineStore = create<TimelineState>()((set) => ({
  currentTime: 0,
  duration: 5,
  fps: 30,
  playing: false,
  loop: false,
  zoom: 1,

  setTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setFps: (fps) => set({ fps }),
  setPlaying: (playing) => set({ playing }),
  setLoop: (loop) => set({ loop }),
  setZoom: (zoom) => set({ zoom }),

  setTimeline: (fps, duration) => set({ fps, duration }),

  restart: () => set({ currentTime: 0 }),
}));