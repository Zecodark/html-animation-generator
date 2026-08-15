import type { PreviewController } from "@/lib/preview/previewController";
import type { FrameCapture, RenderOptions } from "./RenderEngine";

/**
 * FrameCapture implementation backed by the sandboxed preview iframe.
 * Frames travel from the iframe to the main thread as transferable
 * ImageBitmaps.
 */
export class PreviewFrameCapture implements FrameCapture {
  private controller: PreviewController | null = null;

  setController(controller: PreviewController) {
    this.controller = controller;
  }

  async beginRender(options: RenderOptions): Promise<void> {
    if (!this.controller) {
      throw new Error("Preview controller not attached");
    }
    this.controller.startRender({
      width: options.width,
      height: options.height,
      fps: options.fps,
      duration: options.duration,
      transparent: options.transparent,
      backgroundColor: options.backgroundColor ?? null,
      sourceWidth: options.sourceWidth,
      sourceHeight: options.sourceHeight,
      fit: options.fit,
      alignX: options.alignX,
      alignY: options.alignY,
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }

  setTime(time: number): void {
    this.controller?.setTime(time);
  }

  async captureFrame(index: number): Promise<ImageBitmap> {
    if (!this.controller) throw new Error("Preview controller not attached");
    return this.controller.waitForFrame({ frameIndex: index });
  }

  endRender(): void {
    this.controller?.endRender();
  }
}