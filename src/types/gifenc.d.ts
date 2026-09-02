/**
 * `gifenc` ships no types.
 *
 * Only the three entry points the GIF tool uses are declared, deliberately: a
 * hand-written declaration covering the whole library would be a second,
 * unverified copy of its API, and the parts nobody calls would drift silently.
 */
declare module "gifenc" {
  export interface GifFrameOptions {
    palette?: number[][];
    /** Frame delay in milliseconds. GIF stores it in hundredths of a second. */
    delay?: number;
    transparent?: boolean;
    dispose?: number;
  }

  export interface GifEncoder {
    writeFrame(index: Uint8Array, width: number, height: number, options?: GifFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    reset(): void;
  }

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): GifEncoder;
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: string; oneBitAlpha?: boolean },
  ): number[][];
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    format?: string,
  ): Uint8Array;
}
