import { degrees, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

import { parseColor } from "../pure/css";
import { bool, num, str, ToolError } from "../types";
import { formatBytes, parsePageRange, stem, type FileOp, type InputFile } from "../file-types";
import { loadPdf, PDF_MIME, requireFiles, saveDocument } from "./document";
import { toPoints } from "@/lib/units";

/**
 * Stamping and framing: page numbers, watermarks, crop boxes, signatures.
 *
 * Everything here draws onto the existing page rather than re-rendering it, so
 * the original text stays selectable and the file stays the same generation.
 */

const FONTS = {
  helvetica: StandardFonts.Helvetica,
  helveticaBold: StandardFonts.HelveticaBold,
  times: StandardFonts.TimesRoman,
  courier: StandardFonts.Courier,
} as const;

function toRgb(hex: string) {
  const colour = parseColor(hex);
  return rgb(colour.r / 255, colour.g / 255, colour.b / 255);
}

/**
 * A page's visible size, taking its rotation into account. A page rotated 90°
 * is displayed landscape even though its media box is portrait, and stamping
 * against the unrotated box puts the text off the edge.
 */
function visibleSize(page: PDFPage) {
  const { width, height } = page.getSize();
  const angle = ((page.getRotation().angle % 360) + 360) % 360;
  return angle === 90 || angle === 270 ? { width: height, height: width } : { width, height };
}

type Position =
  | "bottom-center" | "bottom-left" | "bottom-right"
  | "top-center" | "top-left" | "top-right";

function place(
  position: Position,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  fontSize: number,
  margin: number,
) {
  const x =
    position.endsWith("left")
      ? margin
      : position.endsWith("right")
        ? pageWidth - textWidth - margin
        : (pageWidth - textWidth) / 2;
  const y = position.startsWith("top") ? pageHeight - margin - fontSize : margin;
  return { x, y };
}

export const addPageNumbers: FileOp = async (files, options) => {
  requireFiles(files);
  const document = await loadPdf(files[0]);
  const pages = document.getPages();
  const pageCount = pages.length;

  const font = await document.embedFont(
    FONTS[str(options, "font", "helvetica") as keyof typeof FONTS] ?? StandardFonts.Helvetica,
  );
  const fontSize = num(options, "size", 10);
  const margin = num(options, "margin", 28);
  const position = str(options, "position", "bottom-center") as Position;
  const colour = toRgb(str(options, "color", "#333333"));
  const startAt = num(options, "startAt", 1);
  const format = str(options, "format", "n");
  const selected = new Set(parsePageRange(str(options, "pages", "all"), pageCount));

  let stamped = 0;
  for (const [index, page] of pages.entries()) {
    if (!selected.has(index)) continue;

    const number = index + startAt;
    const label =
      format === "n-of-m"
        ? `${number} of ${pageCount + startAt - 1}`
        : format === "page-n"
          ? `Page ${number}`
          : format === "dashes"
            ? `— ${number} —`
            : String(number);

    const { width, height } = visibleSize(page);
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const { x, y } = place(position, width, height, textWidth, fontSize, margin);

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: colour,
      // Counter-rotate so the number reads upright on a rotated page.
      rotate: degrees(-page.getRotation().angle),
    });
    stamped++;
  }

  const bytes = await saveDocument(document);
  return {
    files: [{ name: `${stem(files[0].name)}-numbered.pdf`, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Pages numbered", value: String(stamped) },
      { label: "Starting at", value: String(startAt) },
    ],
  };
};

export const addWatermark: FileOp = async (files, options) => {
  requireFiles(files);
  const document = await loadPdf(files[0]);
  const pages = document.getPages();

  const text = str(options, "text", "").trim();
  if (!text) throw new ToolError("Enter the watermark text.");

  const font = await document.embedFont(
    FONTS[str(options, "font", "helveticaBold") as keyof typeof FONTS] ?? StandardFonts.HelveticaBold,
  );
  const fontSize = num(options, "size", 48);
  const opacity = Math.min(1, Math.max(0.02, num(options, "opacity", 15) / 100));
  const colour = toRgb(str(options, "color", "#888888"));
  const angle = num(options, "angle", 45);
  const tile = bool(options, "tile");
  const selected = new Set(parsePageRange(str(options, "pages", "all"), pages.length));

  for (const [index, page] of pages.entries()) {
    if (!selected.has(index)) continue;
    const { width, height } = visibleSize(page);
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    if (tile) {
      // Space the tiles by the text's own size so the density looks the same
      // whatever the wording or the page dimensions.
      const stepX = textWidth + fontSize * 3;
      const stepY = fontSize * 4;
      for (let y = -height; y < height * 2; y += stepY) {
        for (let x = -width; x < width * 2; x += stepX) {
          page.drawText(text, { x, y, size: fontSize, font, color: colour, opacity, rotate: degrees(angle) });
        }
      }
    } else {
      const radians = (angle * Math.PI) / 180;
      // Centre the rotated text on the page: the anchor is the baseline start,
      // so half the rotated extent has to be subtracted from the centre point.
      const x = width / 2 - (textWidth / 2) * Math.cos(radians) + (fontSize / 2) * Math.sin(radians);
      const y = height / 2 - (textWidth / 2) * Math.sin(radians) - (fontSize / 2) * Math.cos(radians);
      page.drawText(text, { x, y, size: fontSize, font, color: colour, opacity, rotate: degrees(angle) });
    }
  }

  const bytes = await saveDocument(document);
  return {
    files: [{ name: `${stem(files[0].name)}-watermarked.pdf`, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Pages marked", value: String(selected.size) },
      { label: "Opacity", value: `${Math.round(opacity * 100)}%` },
    ],
    note: "A watermark drawn on top of a page can be removed by anyone with a PDF editor. It marks a document; it does not protect one.",
  };
};

export const cropPdf: FileOp = async (files, options) => {
  requireFiles(files);
  const document = await loadPdf(files[0]);
  const pages = document.getPages();
  const selected = new Set(parsePageRange(str(options, "pages", "all"), pages.length));

  const unit = str(options, "unit", "percent");
  const top = num(options, "top", 0);
  const bottom = num(options, "bottom", 0);
  const left = num(options, "left", 0);
  const right = num(options, "right", 0);

  if ([top, bottom, left, right].every((v) => v === 0)) {
    throw new ToolError("Set at least one margin to trim.");
  }

  for (const [index, page] of pages.entries()) {
    if (!selected.has(index)) continue;
    const box = page.getMediaBox();

    // Percentages are of that page's own size, so a mixed-size document trims
    // proportionally rather than by an absolute amount that suits only page one.
    // Every other unit is a real length, converted to points once here.
    const across = (value: number) => (unit === "percent" ? (box.width * value) / 100 : toPoints(value, unit));
    const down = (value: number) => (unit === "percent" ? (box.height * value) / 100 : toPoints(value, unit));

    const trimLeft = across(left);
    const trimRight = across(right);
    const trimTop = down(top);
    const trimBottom = down(bottom);

    const width = box.width - trimLeft - trimRight;
    const height = box.height - trimTop - trimBottom;
    if (width <= 1 || height <= 1) {
      throw new ToolError(`Those margins leave nothing of page ${index + 1}.`);
    }

    page.setCropBox(box.x + trimLeft, box.y + trimBottom, width, height);
  }

  const bytes = await saveDocument(document);
  return {
    files: [{ name: `${stem(files[0].name)}-cropped.pdf`, bytes, mime: PDF_MIME }],
    stats: [{ label: "Pages cropped", value: String(selected.size) }],
    note: "Cropping sets the visible area. The trimmed content is hidden rather than deleted, and a determined reader can restore it — use Redact PDF if the point is to remove information.",
  };
};

/**
 * Stamps a signature image onto a page.
 *
 * This is a visual signature — a picture of a signature placed on the document.
 * It is not a cryptographic signature and proves nothing about who signed or
 * whether the file changed afterwards. The tool says so, because the difference
 * matters and the word "sign" hides it.
 */
export const signPdf: FileOp = async (files, options) => {
  requireFiles(files, 2);

  const pdfFile = files.find((f) => f.name.toLowerCase().endsWith(".pdf"));
  const imageFile = files.find((f) => f !== pdfFile);
  if (!pdfFile) throw new ToolError("Add the PDF you want to sign.");
  if (!imageFile) throw new ToolError("Add a PNG or JPEG of your signature as the second file.");

  const document = await loadPdf(pdfFile);
  const image = await embedImage(document, imageFile);

  const pages = document.getPages();
  const targetPage = str(options, "page", "last") === "first" ? 0 : pages.length - 1;
  const page = pages[targetPage];
  const { width: pageWidth, height: pageHeight } = visibleSize(page);

  const widthPercent = Math.min(80, Math.max(5, num(options, "width", 25)));
  const drawWidth = (pageWidth * widthPercent) / 100;
  const drawHeight = (image.height / image.width) * drawWidth;

  const margin = num(options, "margin", 40);
  const position = str(options, "position", "bottom-right") as Position;
  const x =
    position.endsWith("left")
      ? margin
      : position.endsWith("right")
        ? pageWidth - drawWidth - margin
        : (pageWidth - drawWidth) / 2;
  const y = position.startsWith("top") ? pageHeight - drawHeight - margin : margin;

  page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });

  if (bool(options, "dateStamp")) {
    const font = await document.embedFont(StandardFonts.Helvetica);
    const stamp = `Signed ${new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}`;
    page.drawText(stamp, { x, y: y - 12, size: 8, font, color: rgb(0.35, 0.35, 0.35) });
  }

  const bytes = await saveDocument(document);
  return {
    files: [{ name: `${stem(pdfFile.name)}-signed.pdf`, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Signed page", value: String(targetPage + 1) },
      { label: "Size", value: formatBytes(bytes.length) },
    ],
    note: "This places a picture of a signature on the page. It is not a digital signature: it carries no certificate, proves nothing about who applied it, and will not show as verified in a PDF reader. For a legally binding signature use a service that issues certificates.",
  };
};

async function embedImage(document: Awaited<ReturnType<typeof loadPdf>>, file: InputFile) {
  const isPng = file.bytes[0] === 0x89 && file.bytes[1] === 0x50;
  const isJpeg = file.bytes[0] === 0xff && file.bytes[1] === 0xd8;

  if (isPng) return await document.embedPng(file.bytes);
  if (isJpeg) return await document.embedJpg(file.bytes);
  throw new ToolError(
    `“${file.name}” must be a PNG or a JPEG. A PNG with a transparent background looks best on a signature.`,
  );
}

export { embedImage, visibleSize };
export type { PDFFont };
