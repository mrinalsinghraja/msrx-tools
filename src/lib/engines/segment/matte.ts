/**
 * The arithmetic around U²-Net: what goes into the model, and what to do with
 * the mask that comes out.
 *
 * Kept separate from the session and the canvas so it can be tested from Node
 * against known numbers. The model itself is 4.4 MB and needs a browser to be
 * worth running; none of the maths below needs either.
 */

/** The square the model was trained on. Anything else produces a worse mask. */
export const MODEL_SIZE = 320;

/**
 * ImageNet channel statistics, which is what U²-Net was trained against.
 * Feeding it plain 0–1 pixels produces a mask that looks plausible on a high
 * contrast test image and falls apart on a real photograph, which is a
 * miserable thing to debug — hence these live next to the code that uses them.
 */
export const MEAN = [0.485, 0.456, 0.406] as const;
export const STD = [0.229, 0.224, 0.225] as const;

/**
 * RGBA pixels (already scaled to MODEL_SIZE²) into the NCHW tensor the model wants.
 *
 * The division is by the brightest sample present rather than by 255. That is
 * what the reference implementation does, and it is not the same thing: a photo
 * whose brightest pixel is 200 gets stretched, which measurably changes the
 * mask. Matching the reference matters more here than the tidier constant.
 */
export function toModelInput(rgba: Uint8ClampedArray, size = MODEL_SIZE): Float32Array {
  const pixels = size * size;
  if (rgba.length < pixels * 4) {
    throw new Error(`Expected ${pixels * 4} RGBA samples for ${size}×${size}, got ${rgba.length}.`);
  }

  let peak = 0;
  for (let i = 0; i < pixels; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    if (r > peak) peak = r;
    if (g > peak) peak = g;
    if (b > peak) peak = b;
  }
  // An entirely black image would divide by zero and hand the model NaNs, which
  // it happily turns into a NaN mask and a fully transparent cut-out.
  const scale = peak > 0 ? 1 / peak : 0;

  const tensor = new Float32Array(3 * pixels);
  for (let i = 0; i < pixels; i++) {
    for (let c = 0; c < 3; c++) {
      tensor[c * pixels + i] = (rgba[i * 4 + c] * scale - MEAN[c]) / STD[c];
    }
  }
  return tensor;
}

/**
 * Stretch the raw mask to the full 0–1 range.
 *
 * The model's confidence is relative: on an easy cut-out it may only span
 * 0.02–0.93, and using those numbers directly leaves the subject slightly
 * see-through and the background faintly visible.
 */
export function normaliseMask(mask: Float32Array | number[]): Float32Array {
  let min = Infinity;
  let max = -Infinity;
  for (const value of mask) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const out = new Float32Array(mask.length);
  // A flat mask carries no information about where the subject is. Returning
  // zeroes keeps the whole image rather than deleting all of it, because
  // handing someone a blank PNG is the worse of the two failures.
  if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 1e-6) return out;

  const span = max - min;
  for (let i = 0; i < mask.length; i++) {
    const value = mask[i];
    out[i] = Number.isFinite(value) ? (value - min) / span : 0;
  }
  return out;
}

/** Bilinear resample of a square single-channel mask up to the image's size. */
export function resampleMask(
  mask: Float32Array,
  sourceSize: number,
  width: number,
  height: number,
): Float32Array {
  const out = new Float32Array(width * height);
  if (width === 0 || height === 0) return out;

  // Map destination centres onto source centres. Using the naive x/width ratio
  // instead shifts the mask half a pixel up and left, which shows up as a bright
  // fringe down one side of the subject.
  const scaleX = sourceSize / width;
  const scaleY = sourceSize / height;
  const last = sourceSize - 1;

  for (let y = 0; y < height; y++) {
    const sy = Math.min(last, Math.max(0, (y + 0.5) * scaleY - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(last, y0 + 1);
    const fy = sy - y0;

    for (let x = 0; x < width; x++) {
      const sx = Math.min(last, Math.max(0, (x + 0.5) * scaleX - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(last, x0 + 1);
      const fx = sx - x0;

      const top = mask[y0 * sourceSize + x0] * (1 - fx) + mask[y0 * sourceSize + x1] * fx;
      const bottom = mask[y1 * sourceSize + x0] * (1 - fx) + mask[y1 * sourceSize + x1] * fx;
      out[y * width + x] = top * (1 - fy) + bottom * fy;
    }
  }
  return out;
}

/**
 * Move the point at which a pixel counts as subject rather than background.
 *
 * `tightness` runs -50…50. Positive trims a halo of background that came along
 * with the subject; negative rescues an edge the model cut into. The band around
 * the threshold is kept soft, because a hard step turns hair into a jagged line.
 */
export function applyTightness(alpha: Float32Array, tightness: number): Float32Array {
  const clamped = Math.max(-50, Math.min(50, tightness));
  if (clamped === 0) return alpha;

  const threshold = 0.5 + clamped / 200;
  const band = 0.15;
  const low = threshold - band;
  const span = band * 2;

  const out = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) {
    const t = (alpha[i] - low) / span;
    out[i] = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); // smoothstep
  }
  return out;
}

/**
 * Separable box blur on the mask alone, which softens the cut edge without
 * touching the subject's own pixels. Two passes approximate a Gaussian closely
 * enough at these radii and cost a fraction of one.
 */
export function featherMask(
  alpha: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const r = Math.round(radius);
  if (r <= 0) return alpha;

  let current = alpha;
  for (let pass = 0; pass < 2; pass++) {
    const horizontal = new Float32Array(alpha.length);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let k = -r; k <= r; k++) {
          const sx = x + k;
          if (sx < 0 || sx >= width) continue;
          sum += current[row + sx];
          count++;
        }
        horizontal[row + x] = sum / count;
      }
    }

    const vertical = new Float32Array(alpha.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let k = -r; k <= r; k++) {
          const sy = y + k;
          if (sy < 0 || sy >= height) continue;
          sum += horizontal[sy * width + x];
          count++;
        }
        vertical[y * width + x] = sum / count;
      }
    }
    current = vertical;
  }
  return current;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Write the mask into the image's alpha channel, in place.
 *
 * With a `background` colour the subject is blended onto it and the result is
 * opaque; without one the pixels keep their own colour and only alpha changes.
 * Blending has to happen here rather than by painting a rectangle behind the
 * cut-out, because a half-transparent edge pixel must mix with the new colour,
 * not sit on top of it.
 */
export function applyMatte(
  rgba: Uint8ClampedArray,
  alpha: Float32Array,
  background?: Rgb,
): { keptShare: number } {
  const pixels = alpha.length;
  if (rgba.length < pixels * 4) {
    throw new Error(`Mask covers ${pixels} pixels but the image has ${rgba.length / 4}.`);
  }

  let kept = 0;
  for (let i = 0; i < pixels; i++) {
    const a = alpha[i] <= 0 ? 0 : alpha[i] >= 1 ? 1 : alpha[i];
    kept += a;
    const o = i * 4;

    if (background) {
      rgba[o] = Math.round(rgba[o] * a + background.r * (1 - a));
      rgba[o + 1] = Math.round(rgba[o + 1] * a + background.g * (1 - a));
      rgba[o + 2] = Math.round(rgba[o + 2] * a + background.b * (1 - a));
      rgba[o + 3] = 255;
    } else {
      rgba[o + 3] = Math.round(a * 255);
    }
  }

  return { keptShare: pixels > 0 ? kept / pixels : 0 };
}
