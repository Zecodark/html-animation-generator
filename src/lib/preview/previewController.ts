import type { PreviewMessage } from "./protocol";
import { isIframeEvent } from "./protocol";

export interface PreviewReadyInfo {
  version: string;
  width: number;
  height: number;
}

export interface WaitOptions {
  timeoutMs?: number;
  frameIndex?: number;
}

/**
 * Owns the postMessage bridge to the sandboxed preview iframe.
 *
 * A single in-flight frame is awaited between successive SET_TIME calls during
 * rendering (the iframe captures automatically while auto-capture is enabled).
 */
export class PreviewController {
  private iframe: HTMLIFrameElement | null = null;
  private readyPromise: Promise<PreviewReadyInfo> | null = null;
  private resolveReady: ((info: PreviewReadyInfo) => void) | null = null;
  private pendingFrame: { resolve: (v: ImageBitmap) => void; reject: (e: Error) => void } | null = null;
  private onMessage = (event: MessageEvent) => this.handleMessage(event);
  private destroyed = false;

  onError: ((message: string) => void) | null = null;

  attach(iframe: HTMLIFrameElement | null): Promise<PreviewReadyInfo> {
    this.detach();
    this.destroyed = false;
    this.iframe = iframe;
    if (!iframe) {
      return Promise.reject(new Error("Preview iframe not available"));
    }

    this.readyPromise = new Promise<PreviewReadyInfo>((resolve, reject) => {
      this.resolveReady = resolve;
      const timeout = setTimeout(() => {
        reject(new Error("Preview did not become ready in time"));
      }, 15_000);
      const originalResolve = resolve;
      this.resolveReady = (info) => {
        clearTimeout(timeout);
        originalResolve(info);
      };
    });

    window.addEventListener("message", this.onMessage);
    return this.readyPromise;
  }

  detach() {
    window.removeEventListener("message", this.onMessage);
    this.restoreIframeAfterRender();
    this.iframe = null;
    if (this.pendingFrame) {
      this.pendingFrame.reject(new Error("Preview controller detached"));
      this.pendingFrame = null;
    }
    this.resolveReady = null;
    this.readyPromise = null;
  }

  destroy() {
    this.detach();
    this.destroyed = true;
  }

  get ready(): Promise<PreviewReadyInfo> {
    return this.readyPromise ?? Promise.reject(new Error("Preview not attached"));
  }

  post(message: PreviewMessage) {
    if (!this.iframe || this.destroyed) return;
    try {
      this.iframe.contentWindow?.postMessage(message, "*");
    } catch {
      /* ignore - iframe might be navigating */
    }
  }

  setTime(time: number) {
    this.post({ type: "SET_TIME", time });
  }

  private lastRenderOptions: any = null;

  startRender(options: {
    width: number;
    height: number;
    fps: number;
    duration: number;
    transparent: boolean;
    backgroundColor?: string | null;
    sourceWidth?: number;
    sourceHeight?: number;
    fit?: string;
    alignX?: string;
    alignY?: string;
    scale?: number;
    panX?: number;
    panY?: number;
  }) {
    this.lastRenderOptions = options;
    // Resize the iframe viewport to the SOURCE canvas during render so
    // viewport-relative units (vw/vh) in user content resolve deterministically.
    this.resizeIframeForRender(options.sourceWidth, options.sourceHeight);
    this.post({
      type: "RENDER_START",
      width: options.width,
      height: options.height,
      fps: options.fps,
      duration: options.duration,
      transparent: options.transparent,
      backgroundColor: options.backgroundColor ?? null,
      sourceWidth: options.sourceWidth ?? null,
      sourceHeight: options.sourceHeight ?? null,
      fit: options.fit ?? "contain",
      alignX: options.alignX ?? "center",
      alignY: options.alignY ?? "center",
      scale: options.scale ?? 1,
      panX: options.panX ?? 0,
      panY: options.panY ?? 0,
    });
  }

  async reloadMemory(): Promise<void> {
    if (!this.iframe || this.destroyed) return;
    
    // Clear any pending frame request
    if (this.pendingFrame) {
      this.pendingFrame.reject(new Error("Iframe reloading to clear memory"));
      this.pendingFrame = null;
      this.resolvePendingFrame = null;
    }

    this.readyPromise = new Promise<PreviewReadyInfo>((resolve, reject) => {
      this.resolveReady = resolve;
      
      const timeout = setTimeout(() => {
        reject(new Error("Preview did not become ready after memory reload"));
      }, 15_000);
      
      const originalResolve = resolve;
      this.resolveReady = (info) => {
        clearTimeout(timeout);
        originalResolve(info);
      };
      
      try {
        // Trigger reload on the iframe. For srcdoc, this reconstructs the document.
        // If contentWindow isn't accessible, we can temporarily reset srcdoc.
        const win = this.iframe?.contentWindow;
        if (win) {
          win.location.reload();
        } else if (this.iframe) {
          const doc = this.iframe.srcdoc;
          this.iframe.srcdoc = "";
          setTimeout(() => {
            if (this.iframe) this.iframe.srcdoc = doc;
          }, 10);
        }
      } catch (e) {
        reject(e);
      }
    });

    await this.readyPromise;

    // Re-apply render mode
    if (this.lastRenderOptions) {
      this.startRender(this.lastRenderOptions);
      // Wait a tiny bit for the new iframe's driver to process RENDER_START
      await new Promise(r => setTimeout(r, 50));
    }
  }

  endRender() {
    this.lastRenderOptions = null;
    this.post({ type: "RENDER_END" });
    this.restoreIframeAfterRender();
  }

  private savedIframeStyle: Record<string, string> | null = null;

  private resizeIframeForRender(sourceWidth?: number, sourceHeight?: number) {
    const iframe = this.iframe;
    if (!iframe || !sourceWidth || !sourceHeight) return;
    this.savedIframeStyle = {
      position: iframe.style.position,
      top: iframe.style.top,
      left: iframe.style.left,
      width: iframe.style.width,
      height: iframe.style.height,
    };
    iframe.style.position = "fixed";
    iframe.style.top = "-20000px";
    iframe.style.left = "0px";
    iframe.style.width = `${sourceWidth}px`;
    iframe.style.height = `${sourceHeight}px`;
  }

  private restoreIframeAfterRender() {
    const iframe = this.iframe;
    const saved = this.savedIframeStyle;
    this.savedIframeStyle = null;
    if (!iframe || !saved) return;
    iframe.style.position = saved.position;
    iframe.style.top = saved.top;
    iframe.style.left = saved.left;
    iframe.style.width = saved.width;
    iframe.style.height = saved.height;
  }

  configure(width: number, height: number, scale?: number, panX?: number, panY?: number, backgroundColor?: string | null) {
    this.post({ type: "CONFIGURE", width, height, scale, panX, panY, backgroundColor });
  }

  previewFrame(config: {
    enabled: boolean;
    width?: number;
    height?: number;
    fit?: string;
    alignX?: string;
    alignY?: string;
    objectScale?: number;
  }) {
    this.post({
      type: "PREVIEW_FRAME",
      enabled: config.enabled,
      width: config.width,
      height: config.height,
      fit: config.fit,
      alignX: config.alignX,
      alignY: config.alignY,
      objectScale: config.objectScale,
    });
  }

  /** Wait for the next captured frame produced by the iframe. */
  waitForFrame(options: WaitOptions = {}): Promise<ImageBitmap> {
    if (this.pendingFrame) {
      this.pendingFrame.reject(new Error("Frame request superseded"));
    }
    return new Promise<ImageBitmap>((resolve, reject) => {
      this.pendingFrame = { resolve, reject };
      const timeout = setTimeout(() => {
        if (this.pendingFrame) {
          this.pendingFrame.reject(
            new Error(
              `Timed out waiting for preview frame${
                options.frameIndex !== undefined ? ` #${options.frameIndex}` : ""
              }`
            )
          );
          this.pendingFrame = null;
        }
      }, options.timeoutMs ?? 20_000);
      const originalResolve = resolve;
      this.resolvePendingFrame = (bitmap) => {
        clearTimeout(timeout);
        this.pendingFrame = null;
        originalResolve(bitmap);
      };
    });
  }

  private resolvePendingFrame: ((v: ImageBitmap) => void) | null = null;

  private handleMessage(event: MessageEvent) {
    if (!this.iframe || this.destroyed) return;
    if (event.source !== (this.iframe.contentWindow ?? null)) return;
    if (!isIframeEvent(event.data)) return;

    const data = event.data;
    switch (data.type) {
      case "READY":
        if (this.resolveReady) {
          this.resolveReady({
            version: data.version,
            width: data.width,
            height: data.height,
          });
          this.resolveReady = null;
        }
        break;

      case "FRAME":
        if (this.resolvePendingFrame) {
          this.resolvePendingFrame(data.bitmap);
        } else {
          // Frame arrived with nobody waiting - close it to avoid leaks.
          data.bitmap.close();
        }
        break;

      case "ERROR":
        this.onError?.(data.message || "Preview error");
        if (this.pendingFrame) {
          this.pendingFrame.reject(new Error(data.message || "Preview error"));
          this.pendingFrame = null;
          this.resolvePendingFrame = null;
        }
        break;
    }
  }
}