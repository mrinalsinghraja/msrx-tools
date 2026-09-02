import { CanvasSink } from "mediabunny";

import { formatBytes, stem, type FileOp, type InputFile, type OutputFile } from "../file-types";
import { parseTimecode } from "../timecode";
import { bool, num, str, ToolError } from "../types";

import { containerOf, convert, makeOutput, openVideo, outputFile, pickCodecs, qualityOf, requireVideoTrack, takeBytes } from "./core";

/**
 * The tools that work on the picture itself: pulling frames out of a video, and
 * drawing something onto every frame before it goes back in.
 *
 * All of it is 2D canvas work. A frame arrives as something drawable, the tool
 * draws it and then draws over it, and the canvas goes back to the encoder.
 */

/* ------------------------------------------------------------------ */
/* Frame grabs                                                         */
/* ------------------------------------------------------------------ */

export const videoThumbnail: FileOp = async (files, options, onProgress) => {
  const format = str(options, "format", "png") === "jpg" ? "jpg" : "png";
  const quality = num(options, "quality", 90) / 100;
  const widthOption = num(options, "width", 0);
  const outputs: OutputFile[] = [];

  for (const [index, file] of files.entries()) {
    const input = await openVideo(file);
    try {
      const facts = await requireVideoTrack(input, file.name);
      const at = parseTimecode(str(options, "at"), 0);
      if (at > facts.duration) {
        throw new ToolError(
          `There is no frame at ${at.toFixed(1)} seconds — “${file.name}” runs for ${facts.duration.toFixed(1)}.`,
        );
      }

      const track = await input.getPrimaryVideoTrack();
      if (!track) throw new ToolError(`“${file.name}” has no video track.`);

      const sink = new CanvasSink(track, widthOption > 0 ? { width: Math.round(widthOption) } : {});
      const frame = await sink.getCanvas(at);
      if (!frame) {
        throw new ToolError(
          `No frame could be read at ${at.toFixed(1)} seconds. Try a moment slightly later — a video sometimes has nothing before its first key frame.`,
        );
      }

      const blob = await canvasBlob(frame.canvas, format, quality);
      outputs.push({
        name: `${stem(file.name)}.${format}`,
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mime: format === "jpg" ? "image/jpeg" : "image/png",
      });
      onProgress?.((index + 1) / files.length, file.name);
    } finally {
      input.dispose();
    }
  }

  return {
    files: outputs,
    stats: [{ label: "Frames", value: String(outputs.length) }],
    note:
      format === "png"
        ? "PNG keeps the frame exactly as the decoder produced it. JPEG is a fraction of the size and is the better choice for a thumbnail nobody will edit."
        : undefined,
  };
};

async function canvasBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: "png" | "jpg",
  quality: number,
): Promise<Blob> {
  const type = format === "jpg" ? "image/jpeg" : "image/png";
  if (canvas instanceof OffscreenCanvas) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ToolError("The frame could not be saved as an image."))),
      type,
      quality,
    );
  });
}

/* ------------------------------------------------------------------ */
/* Animated GIF                                                        */
/* ------------------------------------------------------------------ */

export const videoToGif: FileOp = async (files, options, onProgress) => {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");

  const file = files[0];
  const input = await openVideo(file);

  try {
    const facts = await requireVideoTrack(input, file.name);
    const start = parseTimecode(str(options, "start"), 0);
    const end = Math.min(parseTimecode(str(options, "end"), Math.min(facts.duration, start + 10)), facts.duration);
    if (end <= start) throw new ToolError("The end time has to come after the start time.");

    const fps = Math.max(1, Math.min(30, num(options, "fps", 12)));
    const width = Math.max(16, Math.round(num(options, "width", 480)));
    const height = Math.max(2, Math.round((width / facts.width) * facts.height));

    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new ToolError(`“${file.name}” has no video track.`);

    const sink = new CanvasSink(track, { width, height, fit: "fill", poolSize: 2 });
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new ToolError("This browser would not give the tool a drawing surface, so the GIF cannot be built.");

    const encoder = GIFEncoder();
    const delay = Math.round(1000 / fps);
    // GIF stores delays in hundredths of a second, so 12 and 25 frames per
    // second land on whole numbers and 24 does not. Rounding here rather than
    // in the file keeps the timing honest about what the format can express.
    const wanted: number[] = [];
    for (let t = start; t < end; t += 1 / fps) wanted.push(t);

    let count = 0;
    for await (const frame of sink.canvasesAtTimestamps(wanted)) {
      if (!frame) continue;
      context.drawImage(frame.canvas as CanvasImageSource, 0, 0, width, height);
      const { data } = context.getImageData(0, 0, width, height);

      // A GIF holds at most 256 colours per frame. Quantising each frame on its
      // own tracks a changing scene far better than one palette for the whole
      // clip, at the cost of a slightly larger file.
      const palette = quantize(data, 256);
      encoder.writeFrame(applyPalette(data, palette), width, height, { palette, delay });

      count++;
      onProgress?.(count / wanted.length, "Building the GIF");
    }

    if (count === 0) throw new ToolError("No frames were found between those two times.");
    encoder.finish();
    const bytes = encoder.bytes();

    return {
      files: [{ name: `${stem(file.name)}.gif`, bytes, mime: "image/gif" }],
      stats: [
        { label: "Frames", value: String(count) },
        { label: "Size", value: `${width} × ${height}` },
        { label: "GIF", value: formatBytes(bytes.length) },
      ],
      note:
        "GIF has no compression between frames and no sound: every frame is stored whole, in at most 256 colours. Ten seconds of video makes a file measured in megabytes, which is why the width and frame rate default low.",
    };
  } finally {
    input.dispose();
  }
};

/* ------------------------------------------------------------------ */
/* Drawing onto every frame                                            */
/* ------------------------------------------------------------------ */

type Painter = (
  context: OffscreenCanvasRenderingContext2D,
  size: { width: number; height: number },
  timestamp: number,
) => void;

/**
 * The shared body of the three overlay tools.
 *
 * Each frame is drawn to a canvas at the video's own size, the painter draws
 * over it, and the canvas goes to the encoder. There is no cheaper route: a
 * pixel that changes has to be encoded again.
 */
async function paintOverFrames(
  files: InputFile[],
  options: Parameters<FileOp>[1],
  onProgress: Parameters<FileOp>[2],
  makePainter: (
    size: { width: number; height: number },
    file: InputFile,
  ) => Promise<{ paint: Painter; stats: { label: string; value: string }[]; note?: string }>,
) {
  const container = containerOf(str(options, "format", "mp4"));
  const file = files[0];
  const input = await openVideo(file);

  try {
    const facts = await requireVideoTrack(input, file.name);
    const width = Math.max(2, Math.round(facts.width / 2) * 2);
    const height = Math.max(2, Math.round(facts.height / 2) * 2);

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) throw new ToolError("This browser would not give the tool a drawing surface.");

    const { paint, stats, note } = await makePainter({ width, height }, file);
    const { video, audio } = await pickCodecs(container, true, facts.hasAudio, { width, height });
    const { output, target } = makeOutput(container);

    await convert(
      {
        input,
        output,
        video: {
          ...(video ? { codec: video } : {}),
          quality: qualityOf(str(options, "quality", "high")),
          processedWidth: width,
          processedHeight: height,
          process: (sample) => {
            sample.draw(context, 0, 0, width, height);
            paint(context, { width, height }, sample.timestamp);
            return canvas;
          },
        },
        audio: audio ? { codec: audio } : {},
      },
      onProgress,
    );

    const bytes = takeBytes(target);
    return {
      files: [outputFile(stem(file.name), container, bytes)],
      stats: [...stats, { label: "Size", value: formatBytes(bytes.length) }],
      note,
    };
  } finally {
    input.dispose();
  }
}

/** Nine anchor points, given as a fraction of the frame. */
function anchorOf(position: string, size: { width: number; height: number }, box: { width: number; height: number }, margin: number) {
  const left = { left: margin, center: (size.width - box.width) / 2, right: size.width - box.width - margin };
  const top = { top: margin, middle: (size.height - box.height) / 2, bottom: size.height - box.height - margin };
  const [vertical, horizontal] = position.split("-");
  return {
    x: left[(horizontal ?? "right") as keyof typeof left] ?? left.right,
    y: top[(vertical ?? "bottom") as keyof typeof top] ?? top.bottom,
  };
}

export const addImageToVideo: FileOp = async (files, options, onProgress) => {
  const [video, image] = files;
  if (!image) {
    throw new ToolError("Two files are needed: the video, and the image to place on it. Drop them both in.");
  }

  return paintOverFrames([video], options, onProgress, async (size) => {
    const bitmap = await createImageBitmap(new Blob([image.bytes.slice().buffer as ArrayBuffer]));
    const scale = num(options, "scale", 20) / 100;
    const drawWidth = Math.max(1, size.width * scale);
    const drawHeight = Math.max(1, (bitmap.height / bitmap.width) * drawWidth);
    const margin = (num(options, "margin", 3) / 100) * size.width;
    const opacity = num(options, "opacity", 85) / 100;
    const { x, y } = anchorOf(str(options, "position", "bottom-right"), size, { width: drawWidth, height: drawHeight }, margin);

    return {
      paint: (context) => {
        context.save();
        context.globalAlpha = opacity;
        context.drawImage(bitmap, x, y, drawWidth, drawHeight);
        context.restore();
      },
      stats: [
        { label: "Watermark", value: image.name },
        { label: "Width", value: `${Math.round(drawWidth)}px` },
      ],
      note: "The mark is drawn into the pixels, so it survives being re-uploaded, re-compressed and screen-recorded. It cannot be switched off afterwards, which is the point.",
    };
  });
};

export const addTextToVideo: FileOp = async (files, options, onProgress) =>
  paintOverFrames(files, options, onProgress, async (size) => {
    const text = str(options, "text").trim();
    if (!text) throw new ToolError("Type the words you want on the video.");

    const fontSize = Math.max(8, (num(options, "size", 6) / 100) * size.height);
    const colour = str(options, "colour", "#ffffff");
    const shadow = bool(options, "shadow", true);
    const margin = (num(options, "margin", 4) / 100) * size.height;
    const position = str(options, "position", "bottom-center");

    const lines = text.split("\n");
    const box = { width: 0, height: lines.length * fontSize * 1.25 };

    return {
      paint: (context) => {
        context.save();
        context.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        context.textBaseline = "top";
        box.width = Math.max(...lines.map((line) => context.measureText(line).width));
        const { x, y } = anchorOf(position, size, box, margin);

        // White text over a bright frame is unreadable, and a video's frames
        // are not one colour. A shadow costs nothing and works over both.
        if (shadow) {
          context.shadowColor = "rgba(0,0,0,0.75)";
          context.shadowBlur = fontSize / 4;
          context.shadowOffsetY = fontSize / 16;
        }
        context.fillStyle = colour;
        lines.forEach((line, index) => {
          const lineX = position.endsWith("center") ? x + (box.width - context.measureText(line).width) / 2 : x;
          context.fillText(line, lineX, y + index * fontSize * 1.25);
        });
        context.restore();
      },
      stats: [
        { label: "Text", value: lines[0].slice(0, 24) + (text.length > 24 ? "…" : "") },
        { label: "Size", value: `${Math.round(fontSize)}px` },
      ],
    };
  });

export const hideVideoRegion: FileOp = async (files, options, onProgress) =>
  paintOverFrames(files, options, onProgress, async (size) => {
    const percent = (id: string, fallback: number) => Math.min(100, Math.max(0, num(options, id, fallback))) / 100;
    const x = size.width * percent("x", 60);
    const y = size.height * percent("y", 5);
    const width = Math.max(2, size.width * percent("width", 30));
    const height = Math.max(2, size.height * percent("height", 15));
    const method = str(options, "method", "blur");
    const strength = Math.max(1, num(options, "strength", 20));

    // The scratch canvas holds the region alone. Blurring is done by scaling
    // the region down and back up — a box blur that cannot be undone, unlike a
    // CSS filter, which merely hides what is still there.
    const scratch = new OffscreenCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
    const scratchContext = scratch.getContext("2d");
    if (!scratchContext) throw new ToolError("This browser would not give the tool a second drawing surface.");

    return {
      paint: (context) => {
        if (method === "black") {
          context.save();
          context.fillStyle = "#000000";
          context.fillRect(x, y, width, height);
          context.restore();
          return;
        }

        const blocks = Math.max(1, Math.round(Math.min(width, height) / strength));
        const smallWidth = Math.max(1, Math.round((width / Math.max(width, height)) * blocks));
        const smallHeight = Math.max(1, Math.round((height / Math.max(width, height)) * blocks));

        scratchContext.imageSmoothingEnabled = method === "blur";
        scratchContext.clearRect(0, 0, scratch.width, scratch.height);
        scratchContext.drawImage(context.canvas, x, y, width, height, 0, 0, smallWidth, smallHeight);

        context.save();
        context.imageSmoothingEnabled = method === "blur";
        context.drawImage(scratch, 0, 0, smallWidth, smallHeight, x, y, width, height);
        context.restore();
      },
      stats: [
        { label: "Covered", value: `${Math.round(width)} × ${Math.round(height)}` },
        { label: "Method", value: method === "black" ? "solid black" : method },
      ],
      note:
        "The pixels underneath are replaced, not covered over, so nothing can be recovered from the result. What it cannot do is follow a logo that moves — the region stays where you put it for the whole clip.",
    };
  });
