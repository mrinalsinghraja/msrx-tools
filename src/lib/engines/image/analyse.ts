import { stem, type FileOp, type OutputFile } from "../file-types";
import { bool, num, str, ToolError } from "../types";
import { createCanvas, decodeImage, encodeCanvas, release } from "./decode";
import { readExif, requireJpegOrTiff } from "./exif";

/**
 * Tools that read a picture and answer in words: what metadata it carries, what
 * colours it is made of, and what it looks like as text.
 */

const encoder = new TextEncoder();

/** Pixels of the decoded image, at a size that keeps analysis quick. */
function samplePixels(bitmap: ImageBitmap, maxSide: number): ImageData {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const { canvas, context } = createCanvas(width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

/* ------------------------------------------------------------------ */
/* EXIF viewer                                                          */
/* ------------------------------------------------------------------ */

export const exifView: FileOp = async (files, options, onProgress) => {
  const format = str(options, "format", "report");
  const revealLocation = bool(options, "location", true);
  const countUnknown = bool(options, "unknown", true);

  const outputs: OutputFile[] = [];
  let withLocation = 0;
  let totalTags = 0;

  for (const [index, file] of files.entries()) {
    requireJpegOrTiff(file.name, file.bytes);
    const exif = readExif(file.bytes);
    totalTags += exif.entries.length;
    if (exif.location) withLocation++;

    let body: string;

    if (format === "json") {
      body = JSON.stringify(
        {
          file: file.name,
          location: exif.location && revealLocation ? exif.location : null,
          tags: exif.entries.map((entry) => ({ name: entry.name, group: entry.group, value: entry.value })),
          ...(countUnknown ? { unnamedTags: exif.unknownCount } : {}),
        },
        null,
        2,
      );
    } else if (format === "csv") {
      body = [
        "group,tag,value",
        ...exif.entries.map((entry) => `${entry.group},${entry.name},"${entry.value.replace(/"/g, '""')}"`),
      ].join("\n");
    } else {
      const lines: string[] = [file.name, "=".repeat(file.name.length), ""];

      if (exif.entries.length === 0) {
        lines.push("No EXIF data. This file carries no camera settings, no timestamps and no location.");
      } else {
        for (const group of ["Image", "Camera", "Location", "Other"] as const) {
          const rows = exif.entries.filter((entry) => entry.group === group);
          if (rows.length === 0) continue;
          const width = Math.max(...rows.map((row) => row.name.length));
          lines.push(group, "-".repeat(group.length));
          for (const row of rows) {
            const value =
              group === "Location" && !revealLocation ? "[hidden — switch on to show]" : row.value;
            lines.push(`  ${row.name.padEnd(width)}  ${value}`);
          }
          lines.push("");
        }

        if (exif.location) {
          lines.push("Position");
          lines.push("--------");
          if (revealLocation) {
            lines.push(`  Coordinates  ${exif.location.latitude}, ${exif.location.longitude}`);
            lines.push("  This photo records where it was taken, to a few metres.");
          } else {
            lines.push("  This photo records where it was taken. Switch on the location option to see it.");
          }
          lines.push("");
        }

        if (countUnknown && exif.unknownCount > 0) {
          lines.push(`${exif.unknownCount} further tags are present but not named by this tool.`);
        }
      }

      body = lines.join("\n");
    }

    outputs.push({
      name: `${stem(file.name)}-exif.${format === "json" ? "json" : format === "csv" ? "csv" : "txt"}`,
      bytes: encoder.encode(body),
      mime: format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/plain",
    });
    onProgress?.((index + 1) / files.length, file.name);
  }

  return {
    files: outputs,
    stats: [
      { label: "Files", value: String(files.length) },
      { label: "Tags found", value: String(totalTags) },
      { label: "With location", value: String(withLocation) },
    ],
    note:
      withLocation > 0
        ? `${withLocation} of these ${files.length === 1 ? "file records" : "files record"} the exact position the photo was taken at. Run Remove Image Metadata before posting them anywhere public.`
        : "None of these files carries a GPS position. They may still carry a serial number and a timestamp, which are shown above.",
  };
};

/* ------------------------------------------------------------------ */
/* Colour palette                                                       */
/* ------------------------------------------------------------------ */

interface Box {
  pixels: [number, number, number][];
}

/**
 * Median cut.
 *
 * K-means gives slightly better centroids but needs several passes and a
 * starting guess; median cut is one pass of sorting and always terminates,
 * which is what a page that must not freeze a phone needs. The result is the
 * colours the image is actually built from rather than an average of them.
 */
function medianCut(pixels: [number, number, number][], count: number): [number, number, number][] {
  let boxes: Box[] = [{ pixels }];

  while (boxes.length < count) {
    // Split the box with the widest spread on its widest channel — that is the
    // box contributing most of the error.
    let target = -1;
    let widest = -1;
    let channel = 0;

    for (const [index, box] of boxes.entries()) {
      if (box.pixels.length < 2) continue;
      for (let c = 0; c < 3; c++) {
        let min = 255;
        let max = 0;
        for (const pixel of box.pixels) {
          if (pixel[c] < min) min = pixel[c];
          if (pixel[c] > max) max = pixel[c];
        }
        if (max - min > widest) {
          widest = max - min;
          target = index;
          channel = c;
        }
      }
    }

    if (target === -1 || widest <= 0) break;

    const box = boxes[target];
    box.pixels.sort((a, b) => a[channel] - b[channel]);
    const middle = Math.floor(box.pixels.length / 2);
    boxes = [
      ...boxes.slice(0, target),
      { pixels: box.pixels.slice(0, middle) },
      { pixels: box.pixels.slice(middle) },
      ...boxes.slice(target + 1),
    ];
  }

  return boxes
    .filter((box) => box.pixels.length > 0)
    .map((box) => {
      const total = box.pixels.reduce(
        (acc, pixel) => [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]],
        [0, 0, 0],
      );
      const n = box.pixels.length;
      return [Math.round(total[0] / n), Math.round(total[1] / n), Math.round(total[2] / n)] as [
        number,
        number,
        number,
      ];
    });
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function toHsl(rgb: [number, number, number]): string {
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return `hsl(${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%)`;
}

/** Relative luminance, for the contrast note. */
function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const colorPalette: FileOp = async (files, options, onProgress) => {
  const count = Math.max(2, Math.min(16, num(options, "colors", 6)));
  const format = str(options, "format", "hex");
  const swatch = bool(options, "swatch", true);
  const ignoreFlat = bool(options, "ignoreFlat", true);

  const outputs: OutputFile[] = [];

  for (const [index, file] of files.entries()) {
    const image = await decodeImage(file);
    try {
      const data = samplePixels(image.bitmap, 320);
      const pixels: [number, number, number][] = [];

      for (let i = 0; i < data.data.length; i += 4) {
        const alpha = data.data[i + 3];
        if (alpha < 128) continue;
        const rgb: [number, number, number] = [data.data[i], data.data[i + 1], data.data[i + 2]];
        // Near-white and near-black dominate most photographs and most screenshots
        // without being the colours anyone means by "the palette".
        if (ignoreFlat) {
          const max = Math.max(...rgb);
          const min = Math.min(...rgb);
          if (max > 244 && max - min < 12) continue;
          if (max < 14) continue;
        }
        pixels.push(rgb);
      }

      if (pixels.length === 0) {
        throw new ToolError(
          `“${file.name}” has nothing to sample — it is a single flat colour, or fully transparent. Switch off the flat-colour filter to include it anyway.`,
        );
      }

      const palette = medianCut(pixels, count).sort((a, b) => luminance(b) - luminance(a));

      const lines = palette.map((rgb) => {
        if (format === "rgb") return `rgb(${rgb.join(" ")})`;
        if (format === "hsl") return toHsl(rgb);
        if (format === "css") return `--color-${palette.indexOf(rgb) + 1}: ${toHex(rgb)};`;
        return toHex(rgb);
      });

      const body = [
        `Palette for ${file.name}`,
        "",
        ...palette.map((rgb, i) => `${String(i + 1).padStart(2)}  ${toHex(rgb)}  ${`rgb(${rgb.join(" ")})`.padEnd(20)}  ${toHsl(rgb)}`),
        "",
        format === "css" ? "CSS custom properties" : `As ${format}`,
        ...lines.map((line) => `  ${line}`),
      ].join("\n");

      outputs.push({
        name: `${stem(file.name)}-palette.txt`,
        bytes: encoder.encode(body),
        mime: "text/plain",
      });

      if (swatch) {
        // A strip of the colours at a usable size, so the palette can be checked
        // by eye rather than by reading hex codes.
        const cell = 120;
        const { canvas, context } = createCanvas(cell * palette.length, cell);
        for (const [i, rgb] of palette.entries()) {
          context.fillStyle = toHex(rgb);
          context.fillRect(i * cell, 0, cell, cell);
        }
        outputs.push({
          name: `${stem(file.name)}-palette.png`,
          bytes: await encodeCanvas(canvas, "image/png"),
          mime: "image/png",
        });
      }
    } finally {
      release(image);
    }
    onProgress?.((index + 1) / files.length, file.name);
  }

  return {
    files: outputs,
    stats: [
      { label: "Images", value: String(files.length) },
      { label: "Colours each", value: String(count) },
      { label: "Method", value: "Median cut" },
    ],
    note: "Colours are sampled from a scaled copy, so the result is the same on a phone as on a desktop. Check any pair you plan to use as text on background against a contrast checker before shipping it.",
  };
};

/* ------------------------------------------------------------------ */
/* ASCII art                                                            */
/* ------------------------------------------------------------------ */

const RAMPS: Record<string, string> = {
  classic: "@%#*+=-:. ",
  detailed: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  blocks: "█▓▒░ ",
  minimal: "#+-. ",
  binary: "10 ",
};

export const imageToAscii: FileOp = async (files, options, onProgress) => {
  const columns = Math.max(20, Math.min(400, num(options, "columns", 100)));
  const rampName = str(options, "charset", "classic");
  const invert = bool(options, "invert", false);
  const aspect = Math.max(0.3, Math.min(1.2, num(options, "aspect", 0.5)));

  const ramp = RAMPS[rampName] ?? RAMPS.classic;
  const outputs: OutputFile[] = [];
  let lineTotal = 0;

  for (const [index, file] of files.entries()) {
    const image = await decodeImage(file);
    try {
      // Terminal characters are roughly twice as tall as they are wide, so the
      // vertical sampling is halved or the picture comes out stretched.
      const rows = Math.max(1, Math.round((columns * image.height * aspect) / image.width));
      const { canvas, context } = createCanvas(columns, rows);
      context.drawImage(image.bitmap, 0, 0, columns, rows);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;

      const lines: string[] = [];
      for (let y = 0; y < rows; y++) {
        let line = "";
        for (let x = 0; x < columns; x++) {
          const i = (y * columns + x) * 4;
          const alpha = data[i + 3] / 255;
          // Transparent areas read as the background, which on a page of text
          // is white — so they take the lightest character, not the darkest.
          const grey =
            (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) * alpha + 255 * (1 - alpha);
          const position = invert ? 1 - grey / 255 : grey / 255;
          const charIndex = Math.min(ramp.length - 1, Math.floor(position * ramp.length));
          line += ramp[charIndex];
        }
        lines.push(line.replace(/\s+$/, ""));
      }

      lineTotal += lines.length;
      outputs.push({
        name: `${stem(file.name)}-ascii.txt`,
        bytes: encoder.encode(lines.join("\n")),
        mime: "text/plain",
      });
    } finally {
      release(image);
    }
    onProgress?.((index + 1) / files.length, file.name);
  }

  return {
    files: outputs,
    stats: [
      { label: "Width", value: `${columns} characters` },
      { label: "Lines", value: String(lineTotal) },
      { label: "Ramp", value: `${ramp.length} characters` },
    ],
    note: "Built for a monospace font. In anything proportional the columns will not line up. High-contrast pictures with a clear silhouette read far better than busy photographs.",
  };
};
