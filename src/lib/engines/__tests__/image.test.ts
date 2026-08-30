import { describe, expect, it } from "vitest";

import {
  ASPECT_PRESETS,
  computeResize,
  coverRect,
  FAVICON_SIZES,
  MIN_TARGET_WIDTH,
  normaliseCrop,
  planShrink,
  searchQualityForSize,
} from "@/lib/engines/image/geometry";

/**
 * The canvas work is verified in a browser; jsdom has no canvas. What is worth
 * testing here is the arithmetic, which is where the bugs that reach users live:
 * wrong dimensions, crops that fall off the edge, a target-size search that
 * never converges.
 */

const LANDSCAPE = { width: 4000, height: 3000 }; // 4:3
const PORTRAIT = { width: 1080, height: 1920 }; // 9:16

describe("resize", () => {
  it("fits inside a box without changing the shape", () => {
    const out = computeResize(LANDSCAPE, "fit", { width: 1000, height: 1000 });
    expect(out).toEqual({ width: 1000, height: 750 });
  });

  it("fits a portrait image by its height", () => {
    const out = computeResize(PORTRAIT, "fit", { width: 1000, height: 1000 });
    expect(out).toEqual({ width: 563, height: 1000 });
  });

  it("derives the height from a target width", () => {
    expect(computeResize(LANDSCAPE, "width", { width: 800 })).toEqual({ width: 800, height: 600 });
  });

  it("derives the width from a target height", () => {
    expect(computeResize(LANDSCAPE, "height", { height: 600 })).toEqual({ width: 800, height: 600 });
  });

  it("scales by percentage", () => {
    expect(computeResize(LANDSCAPE, "percent", { percent: 25 })).toEqual({ width: 1000, height: 750 });
  });

  it("ignores the aspect ratio in exact mode, because that is what was asked for", () => {
    expect(computeResize(LANDSCAPE, "exact", { width: 500, height: 500 })).toEqual({
      width: 500,
      height: 500,
    });
  });

  it("fills the box in cover mode", () => {
    expect(computeResize(LANDSCAPE, "cover", { width: 500, height: 500 })).toEqual({
      width: 500,
      height: 500,
    });
  });

  it("refuses to enlarge by default", () => {
    const small = { width: 200, height: 150 };
    expect(computeResize(small, "fit", { width: 4000, height: 4000 })).toEqual(small);
  });

  it("enlarges when explicitly allowed", () => {
    const small = { width: 200, height: 150 };
    const out = computeResize(small, "fit", { width: 4000, height: 4000, allowUpscale: true });
    expect(out.width).toBeGreaterThan(small.width);
  });

  it("never returns a zero dimension", () => {
    const out = computeResize(LANDSCAPE, "percent", { percent: 0.001 });
    expect(out.width).toBeGreaterThanOrEqual(1);
    expect(out.height).toBeGreaterThanOrEqual(1);
  });
});

describe("cover crop", () => {
  it("centres the crop on a landscape source", () => {
    const rect = coverRect(LANDSCAPE, { width: 500, height: 500 });
    expect(rect.width).toBeCloseTo(3000, 5);
    expect(rect.height).toBeCloseTo(3000, 5);
    expect(rect.x).toBeCloseTo(500, 5);
    expect(rect.y).toBeCloseTo(0, 5);
  });

  it("stays inside the source", () => {
    const rect = coverRect(PORTRAIT, { width: 800, height: 400 });
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(PORTRAIT.width + 0.001);
    expect(rect.y + rect.height).toBeLessThanOrEqual(PORTRAIT.height + 0.001);
  });
});

describe("crop normalisation", () => {
  it("clamps a rectangle that runs off the right edge", () => {
    const crop = normaliseCrop(LANDSCAPE, { x: 3900, y: 0, width: 500, height: 500 }, null);
    expect(crop.x + crop.width).toBeLessThanOrEqual(LANDSCAPE.width);
  });

  it("clamps a negative origin", () => {
    const crop = normaliseCrop(LANDSCAPE, { x: -50, y: -50, width: 100, height: 100 }, null);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
  });

  it("shrinks to meet an aspect ratio rather than growing past the edge", () => {
    const crop = normaliseCrop(LANDSCAPE, { x: 0, y: 0, width: 1000, height: 1000 }, 16 / 9);
    expect(crop.width / crop.height).toBeCloseTo(16 / 9, 1);
    expect(crop.width).toBeLessThanOrEqual(1000);
    expect(crop.height).toBeLessThanOrEqual(1000);
  });

  it("caps a crop larger than the image", () => {
    const crop = normaliseCrop(LANDSCAPE, { x: 0, y: 0, width: 99999, height: 99999 }, null);
    expect(crop.width).toBe(LANDSCAPE.width);
    expect(crop.height).toBe(LANDSCAPE.height);
  });

  it("offers a free option and real ratios", () => {
    expect(ASPECT_PRESETS.free).toBeNull();
    expect(ASPECT_PRESETS["16:9"]).toBeCloseTo(16 / 9, 6);
  });
});

describe("target size search", () => {
  /** A stand-in encoder: bytes rise steeply with quality, as they really do. */
  const encoder = (scale: number) => async (quality: number) => Math.round(scale * quality ** 3);

  it("finds a quality that fits the target", async () => {
    const result = await searchQualityForSize(50_000, encoder(200_000));
    expect(result.hitTarget).toBe(true);
    expect(result.bytes).toBeLessThanOrEqual(50_000);
  });

  it("returns the best quality that still fits, not the lowest", async () => {
    const result = await searchQualityForSize(50_000, encoder(200_000));
    // A lazy implementation returns the floor; this should land close to target.
    expect(result.bytes).toBeGreaterThan(30_000);
  });

  it("takes the maximum quality when even that fits", async () => {
    const result = await searchQualityForSize(10_000_000, encoder(200_000));
    expect(result.quality).toBeCloseTo(0.95, 5);
    expect(result.hitTarget).toBe(true);
  });

  it("reports failure rather than pretending when the target is unreachable", async () => {
    const result = await searchQualityForSize(10, encoder(200_000));
    expect(result.hitTarget).toBe(false);
    expect(result.bytes).toBeGreaterThan(10);
  });

  it("converges in a bounded number of encodes", async () => {
    let calls = 0;
    await searchQualityForSize(50_000, async (q) => {
      calls++;
      return Math.round(200_000 * q ** 3);
    });
    // Two probes plus the search steps: encoding is the expensive part.
    expect(calls).toBeLessThanOrEqual(10);
  });
});

describe("favicon sizes", () => {
  it("covers the sizes browsers and manifests ask for", () => {
    for (const size of [16, 32, 180, 192, 512]) expect(FAVICON_SIZES).toContain(size);
  });

  it("is sorted ascending", () => {
    expect([...FAVICON_SIZES].sort((a, b) => a - b)).toEqual(FAVICON_SIZES);
  });
});

describe("planShrink", () => {
  // The bug this exists for: a 4536x8064 phone photo asked to fit in 100 KB came
  // back at 474 KB, because quality was the only lever being pulled.
  const PHONE = { width: 4536, height: 8064 };
  const TARGET = 100 * 1024;

  it("stops once the encoding already fits", () => {
    expect(planShrink(PHONE, TARGET - 1, TARGET)).toBeNull();
  });

  it("keeps the aspect ratio", () => {
    const next = planShrink(PHONE, 474 * 1024, TARGET);
    expect(next).not.toBeNull();
    expect(next!.width / next!.height).toBeCloseTo(PHONE.width / PHONE.height, 3);
  });

  it("always makes real progress, so a pass is never wasted", () => {
    // A near miss would otherwise plan a scale of ~0.99 and re-encode for nothing.
    const next = planShrink(PHONE, TARGET + 1, TARGET);
    expect(next!.width).toBeLessThanOrEqual(Math.floor(PHONE.width * 0.85));
  });

  it("converges on the target within the passes the op allows", () => {
    // Bytes track pixel count at a fixed quality, which is the assumption the
    // planner is built on; model that and count how many passes it takes.
    const bytesFor = (size: { width: number; height: number }) =>
      (size.width * size.height) / (PHONE.width * PHONE.height) * 474 * 1024;

    let size = PHONE;
    let passes = 0;
    while (bytesFor(size) > TARGET) {
      const next = planShrink(size, bytesFor(size), TARGET);
      expect(next).not.toBeNull();
      size = next!;
      passes++;
    }
    expect(passes).toBeLessThanOrEqual(5); // MAX_SHRINK_PASSES in ops.ts
    expect(size.width).toBeLessThan(PHONE.width);
  });

  it("refuses to shrink past the point the picture is still the picture", () => {
    const tiny = { width: MIN_TARGET_WIDTH, height: 100 };
    expect(planShrink(tiny, 10_000_000, 1024)).toBeNull();
  });

  it("clamps to the floor rather than stepping below it", () => {
    const next = planShrink({ width: 100, height: 100 }, 10_000_000, 1024);
    expect(next).toEqual({ width: MIN_TARGET_WIDTH, height: MIN_TARGET_WIDTH });
  });
});
