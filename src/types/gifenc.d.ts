declare module "gifenc" {
  export interface WriteFrameOptions {
    palette?: Array<number[] | Uint8Array> | Uint32Array;
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
    repeat?: number;
    colorDepth?: number;
    dispose?: number;
    first?: boolean;
  }

  export interface GifEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: WriteFrameOptions
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
    readonly buffer: ArrayBuffer;
  }

  export type GIFEncoder = GifEncoderInstance;

  export interface QuantizeOptions {
    format?: "rgb565" | "rgb444" | "rgba4444";
    clearAlpha?: boolean;
    clearAlphaColor?: number;
    clearAlphaThreshold?: number;
    oneBitAlpha?: boolean;
    useSqrt?: boolean;
  }

  export function GIFEncoder(options?: {
    initialCapacity?: number;
    auto?: boolean;
  }): GifEncoderInstance;

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions
  ): Array<number[]>;

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Array<number[]>,
    format?: "rgb565" | "rgb444" | "rgba4444"
  ): Uint8Array;

  export function prequantize(
    rgba: Uint8Array | Uint8ClampedArray,
    options?: { roundRGB?: number; roundAlpha?: number; oneBitAlpha?: boolean | number }
  ): void;

  export function snapColorsToPalette(
    colors: Array<number[]>,
    palette: Array<number[]>,
    strength?: number
  ): void;
}