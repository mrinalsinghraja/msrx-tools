import { ToolError } from "../types";
import type { InputFile, OutputFile } from "../file-types";

/**
 * Decoding and encoding, on the browser's own image pipeline.
 *
 * No WASM: every format here is one the browser already decodes natively, which
 * keeps these tools instant and the bundle small. The cost is HEIC, which only
 * Safari decodes — that gets an explicit message rather than a silent failure.
 */

export const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export const EXTENSION_BY_FORMAT: Record<string, string> = {
  jpeg: "jpg",
  jpg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
};

/** Formats that carry no alpha channel, so transparency has to be flattened. */
const OPAQUE_FORMATS = new Set(["image/jpeg"]);

function sniffFormat(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";

  const brand = new TextDecoder("latin1").decode(bytes.subarray(4, 12));
  if (brand.startsWith("ftypavif") || brand.startsWith("ftypavis")) return "image/avif";
  if (brand.startsWith("ftypheic") || brand.startsWith("ftypheix") || brand.startsWith("ftypmif1")) {
    return "image/heic";
  }
  const riff = new TextDecoder("latin1").decode(bytes.subarray(0, 12));
  if (riff.startsWith("RIFF") && riff.includes("WEBP")) return "image/webp";

  return null;
}

export interface DecodedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  /** What the bytes actually were, regardless of the file's extension. */
  format: string;
}

export async function decodeImage(file: InputFile): Promise<DecodedImage> {
  if (file.bytes.length === 0) throw new ToolError(`“${file.name}” is empty.`);

  const format = sniffFormat(file.bytes);
  if (format === "image/heic") {
    throw new ToolError(
      `“${file.name}” is a HEIC photo. Only Safari can read those without extra software — on an iPhone, set Settings → Camera → Formats to “Most Compatible”, or convert to JPEG first.`,
    );
  }
  if (!format) {
    throw new ToolError(
      `“${file.name}” isn't an image this browser recognises. JPEG, PNG, WebP, GIF, BMP and AVIF all work.`,
    );
  }

  const blob = new Blob([file.bytes as unknown as BlobPart], { type: format });

  let bitmap: ImageBitmap;
  try {
    // `from-image` applies the EXIF orientation tag. Without it, every photo
    // taken in portrait on a phone comes out sideways — the single most common
    // complaint about image tools that use a canvas.
    bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    throw new ToolError(`“${file.name}” could not be decoded. The file may be damaged or truncated.`);
  }

  return { bitmap, width: bitmap.width, height: bitmap.height, format };
}

/** A canvas of the given size, with its 2D context. */
export function createCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
} {
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const context = canvas.getContext("2d", { willReadFrequently: false });
  if (!context) throw new ToolError("This browser wouldn't provide a drawing surface.");

  // The browser's default resampling is bilinear; "high" asks for the better
  // filter, which matters visibly when scaling down by more than half.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  return { canvas, context };
}

/** Paints white behind the image when the target format has no alpha channel. */
export function flattenIfOpaque(
  context: CanvasRenderingContext2D,
  mime: string,
  background = "#ffffff",
) {
  if (!OPAQUE_FORMATS.has(mime)) return;
  context.save();
  context.globalCompositeOperation = "destination-over";
  context.fillStyle = background;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  context.restore();
}

export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
  if (!blob) {
    throw new ToolError(
      `This browser could not write ${mime}. Try PNG or JPEG, which every browser supports.`,
    );
  }
  // A browser that cannot encode the requested type silently falls back to PNG,
  // so the result would be a .avif file containing a PNG. Catch that here.
  if (blob.type !== mime) {
    throw new ToolError(
      `This browser can't write ${mime.replace("image/", "").toUpperCase()} — it produced ${blob.type.replace("image/", "").toUpperCase()} instead. Choose a different format.`,
    );
  }
  return new Uint8Array(await blob.arrayBuffer());
}

/** Convenience: encode a canvas straight into an output file entry. */
export async function canvasToOutput(
  canvas: HTMLCanvasElement,
  name: string,
  format: string,
  quality?: number,
): Promise<OutputFile> {
  const mime = MIME_BY_FORMAT[format] ?? "image/png";
  const bytes = await encodeCanvas(canvas, mime, quality);
  return { name: `${name}.${EXTENSION_BY_FORMAT[format] ?? "png"}`, bytes, mime };
}

/** Releases a decoded bitmap. Large photographs hold real memory until closed. */
export function release(image: DecodedImage) {
  image.bitmap.close();
}
