export type PreviewMessage =
  | { type: "SET_TIME"; time: number }
  | {
      type: "RENDER_START";
      width: number;
      height: number;
      fps: number;
      duration: number;
      transparent: boolean;
      backgroundColor?: string | null;
      sourceWidth?: number | null;
      sourceHeight?: number | null;
      fit?: string;
      alignX?: string;
      alignY?: string;
    }
  | { type: "RENDER_END" }
  | { type: "CONFIGURE"; width: number; height: number }
  | { type: "SET_BACKGROUND"; color: string | null };

export type FrameMessage = {
  type: "FRAME";
  hmr: string;
  index: number;
  bitmap: ImageBitmap;
};

export type ReadyMessage = {
  type: "READY";
  hmr: string;
  version: string;
  width: number;
  height: number;
};

export type ErrorMessage = { type: "ERROR"; hmr: string; message: string };

export type IframeEvent = FrameMessage | ReadyMessage | ErrorMessage;

export function isIframeEvent(data: unknown): data is IframeEvent {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    d.type === "FRAME" ||
    d.type === "READY" ||
    d.type === "ERROR"
  );
}