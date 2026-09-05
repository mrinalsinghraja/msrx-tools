import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MEAN,
  MODEL_SIZE,
  STD,
  applyMatte,
  applyTightness,
  featherMask,
  normaliseMask,
  resampleMask,
  toModelInput,
} from "../segment/matte";
import { MODEL_BYTES } from "../segment/u2net";

/** A solid RGBA block, for building inputs by hand. */
function fill(size: number, r: number, g: number, b: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  }
  return out;
}

describe("toModelInput", () => {
  it("lays the tensor out channel by channel, not pixel by pixel", () => {
    const rgba = fill(2, 255, 0, 0);
    const tensor = toModelInput(rgba, 2);

    expect(tensor.length).toBe(3 * 4);
    // NCHW: all four reds, then all four greens, then all four blues. Getting
    // this wrong produces a mask that looks vaguely subject-shaped and is wrong.
    const red = (1 - MEAN[0]) / STD[0];
    const green = (0 - MEAN[1]) / STD[1];
    for (let i = 0; i < 4; i++) {
      expect(tensor[i]).toBeCloseTo(red, 5);
      expect(tensor[4 + i]).toBeCloseTo(green, 5);
    }
  });

  it("scales by the brightest sample present, as the reference implementation does", () => {
    // Peak is 200, so 200 must normalise to 1.0 before the ImageNet shift — not
    // to 200/255. Dividing by 255 here is the subtle version of this bug.
    const tensor = toModelInput(fill(1, 200, 100, 50), 1);
    expect(tensor[0]).toBeCloseTo((1 - MEAN[0]) / STD[0], 5);
    expect(tensor[1]).toBeCloseTo((0.5 - MEAN[1]) / STD[1], 5);
  });

  it("does not divide by zero on an all-black image", () => {
    const tensor = toModelInput(fill(2, 0, 0, 0), 2);
    expect([...tensor].every(Number.isFinite)).toBe(true);
  });

  it("refuses input smaller than the size it was told", () => {
    expect(() => toModelInput(fill(2, 1, 1, 1), 4)).toThrow(/Expected/);
  });
});

describe("normaliseMask", () => {
  it("stretches a timid mask to the full range", () => {
    const out = normaliseMask([0.2, 0.45, 0.7]);
    expect(out[0]).toBeCloseTo(0, 6);
    expect(out[2]).toBeCloseTo(1, 6);
  });

  it("keeps the whole image when the mask says nothing", () => {
    // A flat mask means the model found no subject. Returning zeroes means
    // "erase everything", which hands back a blank PNG — the worse failure.
    const out = normaliseMask([0.5, 0.5, 0.5]);
    expect([...out]).toEqual([0, 0, 0]);
  });

  it("survives NaN without poisoning the rest of the mask", () => {
    const out = normaliseMask([0, Number.NaN, 1]);
    expect(out[1]).toBe(0);
    expect(out[2]).toBeCloseTo(1, 6);
  });
});

describe("resampleMask", () => {
  it("keeps a mask the right way up", () => {
    // Row-major: this is the TOP row dark and the BOTTOM row light. Reading it
    // as left/right is how a mask ends up transposed, which looks convincingly
    // like a bad model rather than a bad index.
    const mask = new Float32Array([0, 0, 1, 1]);
    const out = resampleMask(mask, 2, 4, 4);
    expect(out[0]).toBeLessThan(0.5); // top-left
    expect(out[3]).toBeLessThan(0.5); // top-right, still the dark row
    expect(out[12]).toBeGreaterThan(0.5); // bottom-left
    expect(out[15]).toBeGreaterThan(0.5); // bottom-right
  });

  it("does not shift the mask half a pixel", () => {
    // Sampling on centres rather than on the naive x/width ratio. The bug this
    // pins shows up as a bright fringe down one edge of every cut-out.
    const mask = new Float32Array([1, 0, 1, 0]);
    const out = resampleMask(mask, 2, 2, 2);
    expect(out[0]).toBeCloseTo(1, 5);
    expect(out[1]).toBeCloseTo(0, 5);
  });
});

describe("applyTightness", () => {
  const ramp = () => Float32Array.from({ length: 11 }, (_, i) => i / 10);

  it("is a no-op at zero", () => {
    const input = ramp();
    expect(applyTightness(input, 0)).toBe(input);
  });

  it("keeps less of the frame as it rises", () => {
    const sum = (a: Float32Array) => a.reduce((t, v) => t + v, 0);
    expect(sum(applyTightness(ramp(), 40))).toBeLessThan(sum(applyTightness(ramp(), -40)));
  });

  it("stays within 0 and 1 at the extremes", () => {
    for (const t of [-50, -25, 25, 50]) {
      for (const v of applyTightness(ramp(), t)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("featherMask", () => {
  it("returns the same array when there is nothing to do", () => {
    const input = new Float32Array([0, 1, 0, 1]);
    expect(featherMask(input, 2, 2, 0)).toBe(input);
  });

  it("softens a hard edge without moving it", () => {
    const width = 8;
    const mask = new Float32Array(width * 1);
    for (let x = 0; x < width; x++) mask[x] = x < 4 ? 0 : 1;

    const soft = featherMask(mask, width, 1, 1);
    expect(soft[3]).toBeGreaterThan(0);
    expect(soft[4]).toBeLessThan(1);
    expect(soft[0]).toBeCloseTo(0, 2);
    expect(soft[7]).toBeCloseTo(1, 2);
  });
});

describe("applyMatte", () => {
  it("writes the mask into the alpha channel and leaves colour alone", () => {
    const rgba = fill(1, 10, 20, 30);
    const { keptShare } = applyMatte(rgba, new Float32Array([0.5]));
    expect([...rgba]).toEqual([10, 20, 30, 128]);
    expect(keptShare).toBeCloseTo(0.5, 5);
  });

  it("blends a half-transparent edge into the new backdrop rather than over it", () => {
    // Painting a rectangle behind the cut-out would leave this pixel at 0 with
    // half alpha; the edge has to actually mix, or every composite gets a dark
    // halo where the subject meets the new colour.
    const rgba = fill(1, 0, 0, 0);
    applyMatte(rgba, new Float32Array([0.5]), { r: 255, g: 255, b: 255 });
    expect([...rgba]).toEqual([128, 128, 128, 255]);
  });

  it("clamps a mask that strayed outside 0..1", () => {
    const rgba = fill(2, 9, 9, 9);
    applyMatte(rgba, new Float32Array([-2, 5, 0, 1]));
    expect(rgba[3]).toBe(0);
    expect(rgba[7]).toBe(255);
  });

  it("refuses a mask that does not match the image", () => {
    expect(() => applyMatte(fill(1, 0, 0, 0), new Float32Array(4))).toThrow(/Mask covers/);
  });
});

describe("the model file itself", () => {
  const modelPath = join(process.cwd(), "public", "models", "u2netp.onnx");

  it("is present at the size and hash the loader expects", async () => {
    // The loader hardcodes a byte count for its progress bar, and the README
    // records the hash. If the file is ever replaced or truncated in transit,
    // this is where that surfaces — rather than as a mysteriously worse cut-out.
    const info = await stat(modelPath);
    expect(info.size).toBe(MODEL_BYTES);

    const digest = createHash("sha256").update(await readFile(modelPath)).digest("hex");
    expect(digest).toBe("309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8");
  });

  it("is an ONNX graph, not an HTML error page saved with the wrong name", async () => {
    const head = (await readFile(modelPath)).subarray(0, 64).toString("latin1");
    expect(head).toContain("pytorch");
    expect(head.startsWith("<")).toBe(false);
  });

  it("agrees with the size the maths module was written for", () => {
    expect(MODEL_SIZE).toBe(320);
  });
});
