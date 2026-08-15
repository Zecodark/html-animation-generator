import type { PreviewController } from "@/lib/preview/previewController";

/**
 * Drives live preview playback. Time is always advanced by the parent (never
 * by the sandbox), which keeps preview and deterministic render consistent.
 */
export class AnimationController {
  private controller: PreviewController;
  private rafId = 0;
  private playing = false;
  private startWall = 0;
  private startTime = 0;
  private duration = 5;
  private loop = true;
  currentTime = 0;

  onTimeChange: ((time: number) => void) | null = null;

  constructor(controller: PreviewController) {
    this.controller = controller;
  }

  configure(options: { duration: number; loop: boolean }) {
    this.duration = options.duration;
    this.loop = options.loop;
    if (this.currentTime > this.duration) {
      this.currentTime = this.duration;
      this.controller.setTime(this.currentTime);
      this.onTimeChange?.(this.currentTime);
    }
  }

  get isPlaying() {
    return this.playing;
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.startWall = performance.now();
    this.startTime = this.currentTime;
    this.tick();
  }

  pause(): void {
    this.playing = false;
    cancelAnimationFrame(this.rafId);
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.duration));
    this.controller.setTime(this.currentTime);
    this.onTimeChange?.(this.currentTime);
  }

  restart(): void {
    this.pause();
    this.seek(0);
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  private tick = (): void => {
    if (!this.playing) return;
    const elapsed = (performance.now() - this.startWall) / 1000;
    let time = this.startTime + elapsed;

    if (this.duration > 0 && this.loop && time > this.duration) {
      time = time % this.duration;
      this.startWall = performance.now();
      this.startTime = time;
    }

    if (!this.loop && time >= this.duration) {
      time = this.duration;
      this.controller.setTime(time);
      this.currentTime = time;
      this.onTimeChange?.(time);
      this.playing = false;
      return;
    }

    this.currentTime = time;
    this.controller.setTime(time);
    this.onTimeChange?.(time);
    this.rafId = requestAnimationFrame(this.tick);
  };
}