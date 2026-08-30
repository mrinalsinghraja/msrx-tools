import { parseColor } from "../pure/css";
import { bool, num, str, ToolError } from "../types";
import { formatBytes, stem, type FileOp, type OutputFile } from "../file-types";
import {
  canvasToOutput,
  createCanvas,
  decodeImage,
  type DecodedImage,
  encodeCanvas,
  EXTENSION_BY_FORMAT,
  flattenIfOpaque,
  MIME_BY_FORMAT,
  release,
} from "./decode";
import {
  computeResize,
  coverRect,
  FAVICON_SIZES,
  MIN_SEARCH_QUALITY,
  normaliseCrop,
  planShrink,
  searchQualityForSize,
  type ResizeMode,
  type Size,
} from "./geometry";

/**
 * Image tools, all on the browser's own canvas.
 *
 * Every op follows the same shape: decode, draw onto a canvas, encode. That is
 * what lets them batch over many files without any of them holding more than
 * one decoded image at a time.
 */

/** Runs an op over every input file, releasing each bitmap as it goes. */
async function eachFile(
  files: Parameters<FileOp>[0],
  onProgress: Parameters<FileOp>[2],
  handle: (image: Awaited<ReturnType<typeof decodeImage>>, name: string) => Promise<OutputFile>,
): Promise<OutputFile[]> {
  const outputs: OutputFile[] = [];
  for (const [index, file] of files.entries()) {
    const image = await decodeImage(file);
    try {
      outputs.push(await handle(image, stem(file.name)));
    } finally {
      release(image);
    }
    onProgress?.((index + 1) / files.length, file.name);
  }
  return outputs;
}

function totalBytes(files: { bytes: Uint8Array }[]) {
  return files.reduce((sum, file) => sum + file.bytes.length, 0);
}

/* ------------------------------------------------------------------ */
/* Resize                                                              */
/* ------------------------------------------------------------------ */

export const resizeImage: FileOp = async (files, options, onProgress) => {
  const mode = str(options, "mode", "fit") as ResizeMode;
  const format = str(options, "format", "same");
  const quality = num(options, "quality", 85) / 100;
  const allowUpscale = bool(options, "allowUpscale");

  let skipped = 0;

  const outputs = await eachFile(files, onProgress, async (image, name) => {
    const target = computeResize(image, mode, {
      width: num(options, "width", 1920),
      height: num(options, "height", 1080),
      percent: num(options, "percent", 50),
      allowUpscale,
    });

    if (target.width === image.width && target.height === image.height) skipped++;

    const { canvas, context } = createCanvas(target.width, target.height);

    if (mode === "cover") {
      const source = coverRect(image, target);
      context.drawImage(
        image.bitmap,
        source.x, source.y, source.width, source.height,
        0, 0, target.width, target.height,
      );
    } else {
      context.drawImage(image.bitmap, 0, 0, target.width, target.height);
    }

    const outFormat = format === "same" ? formatKeyOf(image.format) : format;
    flattenIfOpaque(context, MIME_BY_FORMAT[outFormat] ?? image.format);
    return canvasToOutput(canvas, `${name}-${target.width}x${target.height}`, outFormat, quality);
  });

  return {
    files: outputs,
    stats: [
      { label: "Images", value: String(outputs.length) },
      { label: "Total size", value: formatBytes(totalBytes(outputs)) },
      { label: "Change", value: sizeChange(totalBytes(files), totalBytes(outputs)) },
    ],
    note: skipped
      ? `${skipped} image${skipped === 1 ? " was" : "s were"} already smaller than the target and ${skipped === 1 ? "was" : "were"} left alone. Turn on “Allow enlarging” to stretch them, though that invents detail the photo never had.`
      : undefined,
  };
};

function formatKeyOf(mime: string): string {
  const key = mime.replace("image/", "");
  return MIME_BY_FORMAT[key] ? key : "png";
}

function sizeChange(before: number, after: number): string {
  if (before === 0) return "—";
  const delta = ((after - before) / before) * 100;
  return `${delta > 0 ? "+" : ""}${delta.toFixed(0)}%`;
}

/* ------------------------------------------------------------------ */
/* Compress                                                            */
/* ------------------------------------------------------------------ */

/** How many times a target-size compression may redraw the image smaller. */
const MAX_SHRINK_PASSES = 5;

interface SizedAttempt {
  bytes: Uint8Array;
  size: Size;
  hitTarget: boolean;
}

/** Draws the image at one size and returns the best encoding that fits the target. */
async function encodeAtSize(
  image: DecodedImage,
  size: Size,
  mime: string,
  targetBytes: number,
): Promise<SizedAttempt> {
  const { canvas, context } = createCanvas(size.width, size.height);
  context.drawImage(image.bitmap, 0, 0, size.width, size.height);
  flattenIfOpaque(context, mime);

  // Probe the quality floor first. When even that overshoots there is no point
  // running the full search — the caller wants a smaller canvas, not a worse
  // one — and this way a failed pass costs a single encode.
  const floor = await encodeCanvas(canvas, mime, MIN_SEARCH_QUALITY);
  if (floor.length > targetBytes) return { bytes: floor, size, hitTarget: false };

  const search = await searchQualityForSize(targetBytes, async (quality) => {
    const bytes = await encodeCanvas(canvas, mime, quality);
    return bytes.length;
  });

  return { bytes: await encodeCanvas(canvas, mime, search.quality), size, hitTarget: true };
}

/**
 * Compresses to a target file size, shrinking the dimensions when quality alone
 * cannot get there.
 *
 * A 36-megapixel phone photograph cannot be squeezed into 100 KB by quality: at
 * the point the artefacts are unbearable it is still several hundred KB, because
 * the file is carrying eight thousand pixels of width. Asking for a size and
 * being handed something five times larger is not an answer, so the target wins
 * and the dimensions give way — reported, never silently.
 */
async function compressToTargetSize(
  image: DecodedImage,
  start: Size,
  mime: string,
  targetBytes: number,
  allowResize: boolean,
): Promise<SizedAttempt> {
  let size = start;
  let pass = 0;

  while (true) {
    const attempt = await encodeAtSize(image, size, mime, targetBytes);
    if (attempt.hitTarget || !allowResize) return attempt;

    const next = pass++ < MAX_SHRINK_PASSES ? planShrink(size, attempt.bytes.length, targetBytes) : null;
    if (!next) return attempt;
    size = next;
  }
}

export const compressImage: FileOp = async (files, options, onProgress) => {
  const mode = str(options, "mode", "quality");
  const format = str(options, "format", "jpeg");
  const mime = MIME_BY_FORMAT[format] ?? "image/jpeg";
  const maxWidth = num(options, "maxWidth", 0);
  const allowResize = bool(options, "allowResize", true);

  let missedTarget = 0;
  const shrunk: string[] = [];

  const outputs = await eachFile(files, onProgress, async (image, name) => {
    // Resizing first is the single biggest saving on a phone photograph: a
    // 4000px image displayed at 1200px is carrying four times the pixels it
    // needs, and no amount of quality reduction recovers that.
    const target =
      maxWidth > 0 && image.width > maxWidth
        ? computeResize(image, "width", { width: maxWidth })
        : { width: image.width, height: image.height };

    if (mode === "size") {
      const targetBytes = num(options, "targetKb", 200) * 1024;
      const attempt = await compressToTargetSize(image, target, mime, targetBytes, allowResize);

      if (!attempt.hitTarget) missedTarget++;
      else if (attempt.size.width !== target.width) {
        shrunk.push(`${attempt.size.width}\u00d7${attempt.size.height}`);
      }

      return {
        name: `${name}.${EXTENSION_BY_FORMAT[format] ?? "jpg"}`,
        bytes: attempt.bytes,
        mime,
      };
    }

    const { canvas, context } = createCanvas(target.width, target.height);
    context.drawImage(image.bitmap, 0, 0, target.width, target.height);
    flattenIfOpaque(context, mime);
    return canvasToOutput(canvas, name, format, num(options, "quality", 75) / 100);
  });

  const before = totalBytes(files);
  const after = totalBytes(outputs);

  return {
    files: outputs,
    stats: [
      { label: "Before", value: formatBytes(before) },
      { label: "After", value: formatBytes(after) },
      { label: "Saved", value: before > after ? `${Math.round((1 - after / before) * 100)}%` : "nothing" },
    ],
    note: missedTarget
      ? allowResize
        ? `${missedTarget} image${missedTarget === 1 ? "" : "s"} could not reach the target even at the smallest size worth producing. Ask for a larger target, or try WebP, which holds detail at sizes JPEG cannot.`
        : `${missedTarget} image${missedTarget === 1 ? "" : "s"} could not reach the target on quality alone. Turn on \u201cResize to reach the target\u201d, or set a maximum width \u2014 dimensions matter more than quality.`
      : shrunk.length
        ? `Quality alone could not reach the target, so ${shrunk.length === 1 ? `the image was resized to ${shrunk[0]}` : `${shrunk.length} images were resized`}. Set a maximum width to control that yourself.`
        : after >= before
          ? "The result is no smaller than the original. That usually means the file was already well compressed, or PNG was chosen for a photograph \u2014 JPEG or WebP will do far better there."
          : undefined,
  };
};

/* ------------------------------------------------------------------ */
/* Convert                                                             */
/* ------------------------------------------------------------------ */

export const convertImage: FileOp = async (files, options, onProgress) => {
  const format = str(options, "format", "jpeg");
  const mime = MIME_BY_FORMAT[format] ?? "image/jpeg";
  const quality = num(options, "quality", 90) / 100;
  const background = str(options, "background", "#ffffff");

  let hadAlpha = false;

  const outputs = await eachFile(files, onProgress, async (image, name) => {
    const { canvas, context } = createCanvas(image.width, image.height);
    context.drawImage(image.bitmap, 0, 0);

    if (mime === "image/jpeg" && image.format === "image/png") hadAlpha = true;
    flattenIfOpaque(context, mime, background);

    return canvasToOutput(canvas, name, format, quality);
  });

  return {
    files: outputs,
    stats: [
      { label: "Converted", value: String(outputs.length) },
      { label: "Format", value: format.toUpperCase() },
      { label: "Total size", value: formatBytes(totalBytes(outputs)) },
    ],
    note: hadAlpha
      ? `JPEG has no transparency, so any transparent areas were filled with ${background}. Convert to PNG or WebP to keep them.`
      : undefined,
  };
};

/* ------------------------------------------------------------------ */
/* Crop, rotate, flip                                                  */
/* ------------------------------------------------------------------ */

export const cropImage: FileOp = async (files, options, onProgress) => {
  const aspectKey = str(options, "aspect", "free");
  const unit = str(options, "unit", "percent");

  const outputs = await eachFile(files, onProgress, async (image, name) => {
    const toPixels = (value: number, extent: number) =>
      unit === "percent" ? (extent * value) / 100 : value;

    const requested = {
      x: toPixels(num(options, "x", 0), image.width),
      y: toPixels(num(options, "y", 0), image.height),
      width: toPixels(num(options, "width", 100), image.width),
      height: toPixels(num(options, "height", 100), image.height),
    };

    const aspect = aspectKey === "free" ? null : ratioOf(aspectKey);
    const crop = normaliseCrop(image, requested, aspect);

    const { canvas, context } = createCanvas(crop.width, crop.height);
    context.drawImage(
      image.bitmap,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, crop.width, crop.height,
    );

    const format = str(options, "format", "same") === "same" ? formatKeyOf(image.format) : str(options, "format");
    flattenIfOpaque(context, MIME_BY_FORMAT[format] ?? image.format);
    return canvasToOutput(canvas, `${name}-cropped`, format, num(options, "quality", 90) / 100);
  });

  return {
    files: outputs,
    stats: [
      { label: "Cropped", value: String(outputs.length) },
      { label: "Total size", value: formatBytes(totalBytes(outputs)) },
    ],
  };
};

function ratioOf(key: string): number | null {
  const [w, h] = key.split(":").map(Number);
  return w && h ? w / h : null;
}

export const rotateImage: FileOp = async (files, options, onProgress) => {
  const angle = ((num(options, "angle", 90) % 360) + 360) % 360;
  const flipH = bool(options, "flipHorizontal");
  const flipV = bool(options, "flipVertical");

  const outputs = await eachFile(files, onProgress, async (image, name) => {
    const quarterTurn = angle === 90 || angle === 270;
    const width = quarterTurn ? image.height : image.width;
    const height = quarterTurn ? image.width : image.height;

    const { canvas, context } = createCanvas(width, height);

    // Rotate about the centre of the NEW canvas, then draw the image centred on
    // the origin — the only ordering that works for both square and oblong images.
    context.translate(width / 2, height / 2);
    context.rotate((angle * Math.PI) / 180);
    context.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    context.drawImage(image.bitmap, -image.width / 2, -image.height / 2);
    context.setTransform(1, 0, 0, 1, 0, 0);

    const format = str(options, "format", "same") === "same" ? formatKeyOf(image.format) : str(options, "format");
    flattenIfOpaque(context, MIME_BY_FORMAT[format] ?? image.format);
    return canvasToOutput(canvas, `${name}-rotated`, format, num(options, "quality", 92) / 100);
  });

  return {
    files: outputs,
    stats: [
      { label: "Images", value: String(outputs.length) },
      { label: "Rotated by", value: `${angle}°` },
    ],
  };
};

/* ------------------------------------------------------------------ */
/* Watermark                                                           */
/* ------------------------------------------------------------------ */

export const watermarkImage: FileOp = async (files, options, onProgress) => {
  const text = str(options, "text", "").trim();
  if (!text) throw new ToolError("Enter the watermark text.");

  const colour = parseColor(str(options, "color", "#ffffff"));
  const opacity = Math.min(1, Math.max(0.02, num(options, "opacity", 45) / 100));
  const position = str(options, "position", "bottom-right");
  const tile = bool(options, "tile");
  const sizePercent = num(options, "size", 5);
  const angle = num(options, "angle", 0);

  const outputs = await eachFile(files, onProgress, async (image, name) => {
    const { canvas, context } = createCanvas(image.width, image.height);
    context.drawImage(image.bitmap, 0, 0);

    // Size the text as a fraction of the image's smaller side, so the mark looks
    // the same weight on a thumbnail and on a 4000px photograph.
    const fontSize = Math.max(10, (Math.min(image.width, image.height) * sizePercent) / 100);
    context.font = `600 ${fontSize}px ${str(options, "font", "sans-serif")}`;
    context.fillStyle = `rgb(${Math.round(colour.r)} ${Math.round(colour.g)} ${Math.round(colour.b)} / ${opacity})`;
    context.textBaseline = "middle";

    if (bool(options, "shadow", true)) {
      // A watermark on a light photograph vanishes without one.
      context.shadowColor = "rgb(0 0 0 / 0.45)";
      context.shadowBlur = fontSize * 0.18;
    }

    const metrics = context.measureText(text);
    const margin = fontSize * 0.8;

    if (tile) {
      const stepX = metrics.width + fontSize * 2.5;
      const stepY = fontSize * 3;
      context.save();
      context.rotate((angle * Math.PI) / 180);
      for (let y = -image.height; y < image.height * 2; y += stepY) {
        for (let x = -image.width; x < image.width * 2; x += stepX) {
          context.fillText(text, x, y);
        }
      }
      context.restore();
    } else {
      const x =
        position.endsWith("left")
          ? margin
          : position.endsWith("right")
            ? image.width - metrics.width - margin
            : (image.width - metrics.width) / 2;
      const y =
        position.startsWith("top")
          ? margin + fontSize / 2
          : position.startsWith("middle")
            ? image.height / 2
            : image.height - margin;

      context.save();
      context.translate(x + metrics.width / 2, y);
      context.rotate((angle * Math.PI) / 180);
      context.fillText(text, -metrics.width / 2, 0);
      context.restore();
    }

    const format = str(options, "format", "same") === "same" ? formatKeyOf(image.format) : str(options, "format");
    flattenIfOpaque(context, MIME_BY_FORMAT[format] ?? image.format);
    return canvasToOutput(canvas, `${name}-watermarked`, format, num(options, "quality", 92) / 100);
  });

  return {
    files: outputs,
    stats: [{ label: "Watermarked", value: String(outputs.length) }],
    note: "A watermark drawn onto a picture can be cropped or painted out. It discourages casual reuse; it does not prevent it.",
  };
};

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export const filterImage: FileOp = async (files, options, onProgress) => {
  const parts: string[] = [];
  const add = (name: string, value: number, unit: string, neutral: number) => {
    if (value !== neutral) parts.push(`${name}(${value}${unit})`);
  };

  add("brightness", num(options, "brightness", 100), "%", 100);
  add("contrast", num(options, "contrast", 100), "%", 100);
  add("saturate", num(options, "saturate", 100), "%", 100);
  add("grayscale", num(options, "grayscale", 0), "%", 0);
  add("sepia", num(options, "sepia", 0), "%", 0);
  add("hue-rotate", num(options, "hueRotate", 0), "deg", 0);
  add("blur", num(options, "blur", 0), "px", 0);
  if (bool(options, "invert")) parts.push("invert(100%)");

  if (parts.length === 0) {
    throw new ToolError("Every adjustment is at its neutral value — move one to see a change.");
  }

  const filter = parts.join(" ");

  const outputs = await eachFile(files, onProgress, async (image, name) => {
    const { canvas, context } = createCanvas(image.width, image.height);
    // Canvas filters are the same engine as CSS filters, so what the browser
    // shows in a preview is exactly what gets encoded.
    context.filter = filter;
    context.drawImage(image.bitmap, 0, 0);
    context.filter = "none";

    const format = str(options, "format", "same") === "same" ? formatKeyOf(image.format) : str(options, "format");
    flattenIfOpaque(context, MIME_BY_FORMAT[format] ?? image.format);
    return canvasToOutput(canvas, `${name}-edited`, format, num(options, "quality", 92) / 100);
  });

  return {
    files: outputs,
    stats: [
      { label: "Images", value: String(outputs.length) },
      { label: "Applied", value: filter },
    ],
  };
};

/* ------------------------------------------------------------------ */
/* Blur a region                                                       */
/* ------------------------------------------------------------------ */

export const blurRegion: FileOp = async (files, options, onProgress) => {
  const unit = str(options, "unit", "percent");
  const strength = num(options, "strength", 20);
  const mode = str(options, "mode", "blur");

  const outputs = await eachFile(files, onProgress, async (image, name) => {
    const toPixels = (value: number, extent: number) =>
      unit === "percent" ? (extent * value) / 100 : value;

    const region = {
      x: toPixels(num(options, "x", 25), image.width),
      y: toPixels(num(options, "y", 25), image.height),
      width: toPixels(num(options, "width", 50), image.width),
      height: toPixels(num(options, "height", 50), image.height),
    };

    const { canvas, context } = createCanvas(image.width, image.height);
    context.drawImage(image.bitmap, 0, 0);

    context.save();
    context.beginPath();
    context.rect(region.x, region.y, region.width, region.height);
    context.clip();

    if (mode === "pixelate") {
      // Draw the region tiny, then blow it back up with smoothing off. The
      // detail is genuinely discarded rather than merely obscured.
      const blocks = Math.max(2, Math.round(100 / Math.max(1, strength)));
      const { canvas: small, context: smallContext } = createCanvas(blocks, blocks);
      smallContext.drawImage(
        image.bitmap,
        region.x, region.y, region.width, region.height,
        0, 0, blocks, blocks,
      );
      context.imageSmoothingEnabled = false;
      context.drawImage(small, 0, 0, blocks, blocks, region.x, region.y, region.width, region.height);
    } else if (mode === "solid") {
      context.fillStyle = str(options, "color", "#000000");
      context.fillRect(region.x, region.y, region.width, region.height);
    } else {
      context.filter = `blur(${strength}px)`;
      context.drawImage(image.bitmap, 0, 0);
      context.filter = "none";
    }

    context.restore();

    const format = str(options, "format", "same") === "same" ? formatKeyOf(image.format) : str(options, "format");
    flattenIfOpaque(context, MIME_BY_FORMAT[format] ?? image.format);
    return canvasToOutput(canvas, `${name}-blurred`, format, num(options, "quality", 92) / 100);
  });

  return {
    files: outputs,
    stats: [
      { label: "Images", value: String(outputs.length) },
      { label: "Method", value: mode === "pixelate" ? "Pixelate" : mode === "solid" ? "Solid block" : "Blur" },
    ],
    note:
      mode === "blur"
        ? "A blur can sometimes be partially reversed. For a face, a number or an address you actually need hidden, choose Pixelate or Solid block — both discard the detail rather than smearing it."
        : "The covered pixels are gone from the output, not merely hidden.",
  };
};

/* ------------------------------------------------------------------ */
/* Meme                                                                */
/* ------------------------------------------------------------------ */

export const memeGenerator: FileOp = async (files, options, onProgress) => {
  const top = str(options, "top", "").trim();
  const bottom = str(options, "bottom", "").trim();
  if (!top && !bottom) throw new ToolError("Enter some text for the top or the bottom.");

  const uppercase = bool(options, "uppercase", true);
  const sizePercent = num(options, "size", 10);

  const outputs = await eachFile(files, onProgress, async (image, name) => {
    const { canvas, context } = createCanvas(image.width, image.height);
    context.drawImage(image.bitmap, 0, 0);

    const fontSize = Math.max(16, (image.height * sizePercent) / 100);
    context.font = `700 ${fontSize}px Impact, "Haettenschweiler", "Arial Narrow Bold", sans-serif`;
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#000000";
    context.lineWidth = Math.max(2, fontSize / 12);
    context.lineJoin = "round";

    const margin = fontSize * 0.4;

    /** Wraps to the image width, because a long line silently runs off the edge. */
    function wrap(text: string): string[] {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width > image.width - margin * 2 && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    const draw = (text: string, anchor: "top" | "bottom") => {
      const lines = wrap(uppercase ? text.toUpperCase() : text);
      lines.forEach((line, index) => {
        const y =
          anchor === "top"
            ? margin + fontSize * (index + 0.85)
            : image.height - margin - fontSize * (lines.length - index - 1) - fontSize * 0.25;
        context.strokeText(line, image.width / 2, y);
        context.fillText(line, image.width / 2, y);
      });
    };

    if (top) draw(top, "top");
    if (bottom) draw(bottom, "bottom");

    return canvasToOutput(canvas, `${name}-meme`, "png");
  });

  return {
    files: outputs,
    stats: [{ label: "Memes", value: String(outputs.length) }],
    note: "Impact is used when your device has it — Windows and macOS both do. Elsewhere the nearest condensed bold face is substituted.",
  };
};

/* ------------------------------------------------------------------ */
/* Background removal (solid colour)                                   */
/* ------------------------------------------------------------------ */

export const removeSolidBackground: FileOp = async (files, options, onProgress) => {
  const tolerance = num(options, "tolerance", 12);
  const explicit = str(options, "color", "").trim();
  const feather = bool(options, "feather", true);
  const clearedShare: number[] = [];

  const outputs = await eachFile(files, onProgress, async (image, name) => {
    const { canvas, context } = createCanvas(image.width, image.height);
    context.drawImage(image.bitmap, 0, 0);

    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = data.data;

    // Sample the four corners unless a colour was given: on a product shot or a
    // logo the corners are the background by definition.
    let target: { r: number; g: number; b: number };
    if (explicit) {
      const parsed = parseColor(explicit);
      target = { r: parsed.r, g: parsed.g, b: parsed.b };
    } else {
      const corners = [
        0,
        (canvas.width - 1) * 4,
        (canvas.height - 1) * canvas.width * 4,
        ((canvas.height - 1) * canvas.width + canvas.width - 1) * 4,
      ];
      target = corners.reduce(
        (acc, offset) => ({
          r: acc.r + pixels[offset] / 4,
          g: acc.g + pixels[offset + 1] / 4,
          b: acc.b + pixels[offset + 2] / 4,
        }),
        { r: 0, g: 0, b: 0 },
      );
    }

    // Distance in RGB as a percentage of the maximum possible distance, so the
    // tolerance slider means the same thing whatever the colour.
    const maxDistance = Math.sqrt(3 * 255 * 255);
    const cutoff = (tolerance / 100) * maxDistance;
    const softEdge = feather ? cutoff * 0.5 : 0;
    let cleared = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const distance = Math.sqrt(
        (pixels[i] - target.r) ** 2 + (pixels[i + 1] - target.g) ** 2 + (pixels[i + 2] - target.b) ** 2,
      );
      if (distance <= cutoff - softEdge) {
        pixels[i + 3] = 0;
        cleared++;
      } else if (softEdge > 0 && distance < cutoff) {
        // Ramp the alpha through the soft band so edges do not come out jagged.
        pixels[i + 3] = Math.round(pixels[i + 3] * ((distance - (cutoff - softEdge)) / softEdge));
      }
    }

    context.putImageData(data, 0, 0);
    // How much vanished is the number that tells you whether the tolerance was
    // right: near zero means it found nothing, near 100 means it ate the subject.
    clearedShare.push((cleared / (canvas.width * canvas.height)) * 100);

    // PNG always: the whole point is the alpha channel.
    return canvasToOutput(canvas, `${name}-no-background`, "png");
  });

  const averageCleared =
    clearedShare.reduce((sum, share) => sum + share, 0) / Math.max(1, clearedShare.length);

  const guidance =
    averageCleared < 1
      ? "Almost nothing was removed — the background probably isn't a flat colour, or the tolerance is too low. Try raising it, or name the colour explicitly."
      : averageCleared > 92
        ? "Nearly the whole image was removed, which means the tolerance is too high and it has eaten the subject too. Lower it."
        : null;

  return {
    files: outputs,
    stats: [
      { label: "Images", value: String(outputs.length) },
      { label: "Removed", value: `${averageCleared.toFixed(0)}% of pixels` },
      { label: "Tolerance", value: `${tolerance}%` },
    ],
    note:
      guidance ??
      "This removes one flat background colour, which works on logos, product shots and screenshots. It is not an AI cut-out: a photograph with a busy or gradient background needs a tool that understands what the subject is.",
  };
};

/* ------------------------------------------------------------------ */
/* Favicon set                                                         */
/* ------------------------------------------------------------------ */

export const faviconSet: FileOp = async (files, options, onProgress) => {
  if (files.length !== 1) throw new ToolError("Add one square image — a logo works best.");

  const image = await decodeImage(files[0]);
  const outputs: OutputFile[] = [];
  const background = str(options, "background", "").trim();

  try {
    for (const [index, size] of FAVICON_SIZES.entries()) {
      const { canvas, context } = createCanvas(size, size);

      if (background) {
        context.fillStyle = background;
        context.fillRect(0, 0, size, size);
      }

      // Centre-crop to square first: a wide logo squashed into a square icon
      // looks broken at 16px, where there is no room to forgive it.
      const source = coverRect(image, { width: size, height: size });
      context.drawImage(image.bitmap, source.x, source.y, source.width, source.height, 0, 0, size, size);

      outputs.push(await canvasToOutput(canvas, `favicon-${size}x${size}`, "png"));
      onProgress?.((index + 1) / FAVICON_SIZES.length, `${size}×${size}`);
    }
  } finally {
    release(image);
  }

  const manifest = {
    icons: FAVICON_SIZES.map((size) => ({
      src: `/favicon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
    })),
  };
  outputs.push({
    name: "site.webmanifest",
    bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
    mime: "application/manifest+json",
  });

  return {
    files: outputs,
    stats: [
      { label: "Sizes", value: String(FAVICON_SIZES.length) },
      { label: "Largest", value: `${FAVICON_SIZES[FAVICON_SIZES.length - 1]}px` },
    ],
    note: "PNG icons plus a starter web manifest. Modern browsers prefer PNG and SVG; a .ico file is only needed for Internet Explorer and very old Safari.",
  };
};

/* ------------------------------------------------------------------ */
/* Metadata                                                            */
/* ------------------------------------------------------------------ */

export const stripMetadata: FileOp = async (files, options, onProgress) => {
  const format = str(options, "format", "same");
  let jpegCount = 0;

  const outputs = await eachFile(files, onProgress, async (image, name) => {
    // Redrawing through a canvas is what strips the metadata: the encoder writes
    // a fresh file from pixels alone, so EXIF, GPS and the camera serial number
    // simply have nowhere to survive.
    const { canvas, context } = createCanvas(image.width, image.height);
    context.drawImage(image.bitmap, 0, 0);

    if (image.format === "image/jpeg") jpegCount++;

    const outFormat = format === "same" ? formatKeyOf(image.format) : format;
    flattenIfOpaque(context, MIME_BY_FORMAT[outFormat] ?? image.format);
    return canvasToOutput(canvas, `${name}-clean`, outFormat, num(options, "quality", 92) / 100);
  });

  const before = totalBytes(files);
  const after = totalBytes(outputs);

  return {
    files: outputs,
    stats: [
      { label: "Images", value: String(outputs.length) },
      { label: "Before", value: formatBytes(before) },
      { label: "After", value: formatBytes(after) },
    ],
    note: jpegCount
      ? "EXIF is gone, including any GPS coordinates, camera serial number and timestamp. The pixels were re-encoded to do it, so a JPEG loses a little quality — keep the original if you need it."
      : "The image was rewritten from its pixels, so no metadata carried over.",
  };
};
