/**
 * The arithmetic behind the image tools, kept free of any canvas so it can be
 * tested. Everything here is a pure function of numbers.
 */

export interface Size {
  width: number;
  height: number;
}

export type ResizeMode = "fit" | "cover" | "exact" | "percent" | "width" | "height";

/**
 * Works out the output size.
 *
 * `fit` never enlarges beyond the box and never crops; `cover` fills the box and
 * accepts cropping; `exact` ignores the aspect ratio entirely, which is what a
 * person asking for exact dimensions has asked for.
 */
export function computeResize(
  source: Size,
  mode: ResizeMode,
  options: { width?: number; height?: number; percent?: number; allowUpscale?: boolean },
): Size {
  const { width = 0, height = 0, percent = 100, allowUpscale = false } = options;

  const clamp = (value: number) => Math.max(1, Math.round(value));
  const ratio = source.width / source.height;

  let result: Size;
  switch (mode) {
    case "percent":
      result = { width: clamp((source.width * percent) / 100), height: clamp((source.height * percent) / 100) };
      break;
    case "width":
      result = { width: clamp(width), height: clamp(width / ratio) };
      break;
    case "height":
      result = { width: clamp(height * ratio), height: clamp(height) };
      break;
    case "exact":
      result = { width: clamp(width), height: clamp(height) };
      break;
    case "cover":
      // The box is filled exactly; `coverRect` decides what gets cropped.
      result = { width: clamp(width), height: clamp(height) };
      break;
    case "fit":
    default: {
      const scale = Math.min(width / source.width, height / source.height);
      result = { width: clamp(source.width * scale), height: clamp(source.height * scale) };
      break;
    }
  }

  // Enlarging a photograph invents detail that was never captured. Off by
  // default, and the tools that do it say what they are doing.
  if (!allowUpscale && mode !== "exact" && mode !== "cover") {
    if (result.width > source.width || result.height > source.height) {
      return { width: source.width, height: source.height };
    }
  }

  return result;
}

/**
 * The source rectangle to sample when filling a box of a different shape —
 * a centre crop, which is what "cover" means.
 */
export function coverRect(source: Size, target: Size) {
  const scale = Math.max(target.width / source.width, target.height / source.height);
  const width = target.width / scale;
  const height = target.height / scale;
  return {
    x: (source.width - width) / 2,
    y: (source.height - height) / 2,
    width,
    height,
  };
}

export const ASPECT_PRESETS: Record<string, number | null> = {
  free: null,
  "1:1": 1,
  "4:3": 4 / 3,
  "3:2": 3 / 2,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "3:4": 3 / 4,
  "2:3": 2 / 3,
};

/**
 * Clamps a crop rectangle to the image and, when an aspect ratio is required,
 * shrinks it to match rather than growing it past the edge.
 */
export function normaliseCrop(
  source: Size,
  crop: { x: number; y: number; width: number; height: number },
  aspect: number | null,
) {
  let { x, y, width, height } = crop;

  width = Math.min(Math.max(1, Math.round(width)), source.width);
  height = Math.min(Math.max(1, Math.round(height)), source.height);

  if (aspect) {
    if (width / height > aspect) width = Math.round(height * aspect);
    else height = Math.round(width / aspect);
  }

  x = Math.min(Math.max(0, Math.round(x)), source.width - width);
  y = Math.min(Math.max(0, Math.round(y)), source.height - height);

  return { x, y, width, height };
}

/**
 * Picks the JPEG/WebP quality that lands nearest a target file size.
 *
 * A binary search over quality, because the relationship between quality and
 * bytes is monotonic but wildly non-linear and differs per image — there is no
 * formula, only measurement. `encode` does the measuring.
 */
/**
 * The lowest quality the size search will accept. Below this a photograph is
 * visibly broken, and shrinking its dimensions is the better trade every time.
 */
export const MIN_SEARCH_QUALITY = 0.2;

export async function searchQualityForSize(
  targetBytes: number,
  encode: (quality: number) => Promise<number>,
  options: { minQuality?: number; maxQuality?: number; steps?: number } = {},
): Promise<{ quality: number; bytes: number; hitTarget: boolean }> {
  const { minQuality = MIN_SEARCH_QUALITY, maxQuality = 0.95, steps = 7 } = options;

  let low = minQuality;
  let high = maxQuality;
  let best = { quality: minQuality, bytes: await encode(minQuality) };

  // If even the lowest quality overshoots, say so rather than pretending.
  if (best.bytes > targetBytes) {
    return { quality: minQuality, bytes: best.bytes, hitTarget: false };
  }

  const topBytes = await encode(maxQuality);
  if (topBytes <= targetBytes) {
    return { quality: maxQuality, bytes: topBytes, hitTarget: true };
  }

  for (let i = 0; i < steps; i++) {
    const mid = (low + high) / 2;
    const bytes = await encode(mid);
    if (bytes <= targetBytes) {
      // Keep the largest result that still fits: that is the best quality.
      if (bytes > best.bytes) best = { quality: mid, bytes };
      low = mid;
    } else {
      high = mid;
    }
  }

  return { ...best, hitTarget: true };
}

/** Sizes a favicon set covers. Chosen to match what browsers and manifests ask for. */
export const FAVICON_SIZES = [16, 32, 48, 64, 128, 180, 192, 256, 512];

/**
 * Smallest width we will shrink an image to while chasing a target file size.
 * Below this the picture has stopped being the thing the user uploaded.
 */
export const MIN_TARGET_WIDTH = 96;

/**
 * The next size to try when quality alone could not reach a target file size.
 *
 * Encoded bytes track pixel count closely at a fixed quality, so the square
 * root of the overshoot is a good first guess at the scale factor. It is
 * deliberately pessimistic and always makes real progress: a pass that came
 * back at nearly the same size would spend a full re-encode for nothing.
 *
 * Returns null when there is nothing useful left to try.
 */
export function planShrink(
  size: Size,
  bytes: number,
  targetBytes: number,
  minWidth: number = MIN_TARGET_WIDTH,
): Size | null {
  if (bytes <= targetBytes || size.width <= minWidth) return null;

  const guess = Math.sqrt(targetBytes / bytes) * 0.9;
  const width = Math.max(minWidth, Math.floor(size.width * Math.min(guess, 0.85)));
  if (width >= size.width) return null;

  return { width, height: Math.max(1, Math.round((width / size.width) * size.height)) };
}
