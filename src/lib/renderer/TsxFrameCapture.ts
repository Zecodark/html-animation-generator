import type { PreviewController } from "@/lib/preview/previewController";
import type { RenderOptions } from "./RenderEngine";
import type { TsxFrameCaptureInterface } from "./TsxRenderEngine";

/**
 * TSX-specific FrameCapture that supports periodic iframe memory purging.
 *
 * This is SEPARATE from the HTML FrameCapture (FrameCapture.ts) so that
 * changes to the TSX pipeline never risk breaking the HTML pipeline.
 */
export class TsxFrameCapture implements TsxFrameCaptureInterface {
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
      scale: options.scale,
      panX: options.panX,
      panY: options.panY,
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

  /**
   * Reload the iframe to purge accumulated memory from React Virtual DOM
   * + html-to-image DOM clones. This is the key TSX-specific optimization.
   */
  async reloadMemory(): Promise<void> {
    if (!this.controller) return;
    await this.controller.reloadMemory();
  }
}
