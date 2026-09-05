import { createCanvas, decodeImage, encodeCanvas, release } from "../image/decode";
import type { FileOp, OutputFile } from "../file-types";
import { stem } from "../file-types";
import { ToolError, num, str } from "../types";

import {
  MODEL_SIZE,
  applyMatte,
  applyTightness,
  featherMask,
  normaliseMask,
  resampleMask,
  toModelInput,
  type Rgb,
} from "./matte";
import { loadSession } from "./u2net";

/**
 * Subject cut-out with U²-Net, running on this device.
 *
 * The other background remover on this site keys out one flat colour, which is
 * the right tool for a logo on white and useless on a photograph of a person in
 * a room. This one asks a segmentation model what the subject is, so it works on
 * the photographs the colour version cannot, at the cost of a one-off 4.4 MB
 * download and a second or two of arithmetic per image.
 *
 * The model runs here, in the tab. Nothing is uploaded, which is the part the
 * hosted services cannot offer.
 */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseHex(input: string, fallback: Rgb): Rgb {
  const match = HEX.exec(input.trim());
  if (!match) return fallback;
  let hex = match[1];
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function backgroundFor(choice: string, custom: string): Rgb | undefined {
  if (choice === "white") return { r: 255, g: 255, b: 255 };
  if (choice === "black") return { r: 0, g: 0, b: 0 };
  if (choice === "colour") return parseHex(custom, { r: 255, g: 255, b: 255 });
  return undefined;
}

export const removeBackgroundAi: FileOp = async (files, options, onProgress) => {
  const choice = str(options, "background", "transparent");
  const custom = str(options, "backgroundColor", "#ffffff");
  const tightness = num(options, "tightness", 0);
  const softness = num(options, "edgeSoftness", 1);
  const background = backgroundFor(choice, custom);

  // Loading is reported as the first slice of the bar because on a cold cache it
  // genuinely is most of the wait, and on a warm one it passes instantly.
  const session = await loadSession((fraction, label) => onProgress?.(fraction * 0.4, label));

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  if (!inputName || !outputName) {
    throw new ToolError("The background-removal model loaded without the inputs it should have.");
  }

  // Same wasm-only build the session was created from — importing the default
  // entry here would pull a second copy of the runtime into the bundle.
  const ort = await import("onnxruntime-web/wasm");
  const outputs: OutputFile[] = [];
  const kept: number[] = [];

  for (const [index, file] of files.entries()) {
    const share = (step: number) => onProgress?.(0.4 + ((index + step) / files.length) * 0.6, file.name);
    const image = await decodeImage(file);

    try {
      // Down to the square the model wants. The browser's own high-quality
      // resample is used rather than a hand-written one: it is better, and it
      // runs on the GPU.
      const small = createCanvas(MODEL_SIZE, MODEL_SIZE);
      small.context.drawImage(image.bitmap, 0, 0, MODEL_SIZE, MODEL_SIZE);
      const smallPixels = small.context.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;
      share(0.2);

      const tensor = new ort.Tensor("float32", toModelInput(smallPixels), [1, 3, MODEL_SIZE, MODEL_SIZE]);
      const result = await session.run({ [inputName]: tensor });
      const raw = result[outputName]?.data as Float32Array | undefined;
      if (!raw || raw.length !== MODEL_SIZE * MODEL_SIZE) {
        throw new ToolError("The model returned a mask of an unexpected size.");
      }
      share(0.7);

      // Everything from here on happens at the image's real resolution, so the
      // output is the original photograph with an alpha channel — not a 320px
      // thumbnail scaled back up.
      const full = createCanvas(image.width, image.height);
      full.context.drawImage(image.bitmap, 0, 0);
      const frame = full.context.getImageData(0, 0, image.width, image.height);

      let alpha = resampleMask(normaliseMask(raw), MODEL_SIZE, image.width, image.height);
      alpha = applyTightness(alpha, tightness);
      alpha = featherMask(alpha, image.width, image.height, softness);

      const { keptShare } = applyMatte(frame.data, alpha, background);
      kept.push(keptShare);
      full.context.putImageData(frame, 0, 0);

      // Always PNG: JPEG has no alpha, and a transparent cut-out saved as JPEG
      // silently gains a black background.
      const bytes = await encodeCanvas(full.canvas, "image/png");
      outputs.push({ name: `${stem(file.name)}.png`, bytes, mime: "image/png" });
      share(1);
    } finally {
      release(image);
    }
  }

  const average = kept.length ? kept.reduce((a, b) => a + b, 0) / kept.length : 0;
  const percent = Math.round(average * 100);

  return {
    files: outputs,
    stats: [{ label: "Subject kept", value: `${percent}% of the frame` }],
    note:
      percent >= 97
        ? "Almost nothing was removed, which usually means the subject fills the frame — or that the model could not tell subject from background. Try the tightness slider."
        : undefined,
  };
};

export const SEGMENT_OPS: Record<string, FileOp> = {
  removeBackgroundAi,
};

export function getSegmentOp(name: string): FileOp | undefined {
  return SEGMENT_OPS[name];
}
