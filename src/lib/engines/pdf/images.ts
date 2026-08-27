import { PDFDocument } from "pdf-lib";

import { bool, num, str, ToolError } from "../types";
import { formatBytes, stem, type FileOp, type InputFile } from "../file-types";
import { PDF_MIME, requireFiles, saveDocument } from "./document";

/**
 * Images into a PDF.
 *
 * Also the engine behind Scan to PDF: photographing pages and converting them
 * is the same operation, differing only in where the images came from.
 */

/** Page sizes in PDF points (72 per inch). */
const PAGE_SIZES: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
  a3: [841.89, 1190.55],
  a5: [419.53, 595.28],
};

function detectFormat(file: InputFile): "png" | "jpeg" {
  const [a, b] = file.bytes;
  if (a === 0x89 && b === 0x50) return "png";
  if (a === 0xff && b === 0xd8) return "jpeg";
  throw new ToolError(
    `“${file.name}” is not a PNG or JPEG. Convert it first — HEIC photos from an iPhone need converting too.`,
  );
}

export const jpgToPdf: FileOp = async (files, options, onProgress) => {
  requireFiles(files);

  const document = await PDFDocument.create();
  const sizeName = str(options, "pageSize", "a4");
  const margin = num(options, "margin", 24);
  const orientation = str(options, "orientation", "auto");

  for (const [index, file] of files.entries()) {
    const format = detectFormat(file);
    const image =
      format === "png" ? await document.embedPng(file.bytes) : await document.embedJpg(file.bytes);

    let pageWidth: number;
    let pageHeight: number;

    if (sizeName === "fit") {
      // One page exactly the size of its image: no margins, no letterboxing.
      // The right choice for screenshots and scanned pages.
      pageWidth = image.width + margin * 2;
      pageHeight = image.height + margin * 2;
    } else {
      const [portraitWidth, portraitHeight] = PAGE_SIZES[sizeName] ?? PAGE_SIZES.a4;
      const landscape =
        orientation === "landscape" ||
        (orientation === "auto" && image.width > image.height);
      pageWidth = landscape ? portraitHeight : portraitWidth;
      pageHeight = landscape ? portraitWidth : portraitHeight;
    }

    const page = document.addPage([pageWidth, pageHeight]);
    const available = { width: pageWidth - margin * 2, height: pageHeight - margin * 2 };

    // Contain rather than cover: never crop someone's photograph to fill a page.
    const scale = Math.min(available.width / image.width, available.height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;

    page.drawImage(image, {
      x: (pageWidth - drawWidth) / 2,
      y: (pageHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });

    onProgress?.((index + 1) / files.length, file.name);
  }

  if (bool(options, "titleFromFirst", true) && files[0]) {
    document.setTitle(stem(files[0].name));
  }

  const bytes = await saveDocument(document);
  const name = files.length === 1 ? `${stem(files[0].name)}.pdf` : "images.pdf";

  return {
    files: [{ name, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Images", value: String(files.length) },
      { label: "Pages", value: String(files.length) },
      { label: "Size", value: formatBytes(bytes.length) },
    ],
    note:
      files.length > 1
        ? "Pages follow the order the files are listed in — use the arrows beside each file to change it."
        : undefined,
  };
};
