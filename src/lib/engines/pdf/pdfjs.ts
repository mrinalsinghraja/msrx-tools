import type { PDFDocumentProxy } from "pdfjs-dist";

import { ToolError } from "../types";
import type { InputFile } from "../file-types";

/**
 * pdf.js loader.
 *
 * Kept apart from the pdf-lib work because the two libraries do different jobs:
 * pdf-lib rearranges a document's structure, pdf.js renders and reads it. Tools
 * that only rearrange never pay for pdf.js, which is the larger of the two.
 */

type PdfJs = typeof import("pdfjs-dist");

let pdfjs: PdfJs | null = null;

async function getPdfJs(): Promise<PdfJs> {
  if (pdfjs) return pdfjs;

  const library = await import("pdfjs-dist");
  // Hand pdf.js a worker we constructed ourselves, from a local wrapper module.
  // `new URL` with a relative specifier is the only form the bundler rewrites
  // into a real asset URL; a bare package path yields one that never resolves,
  // and pdf.js then waits forever on a worker that never starts.
  library.GlobalWorkerOptions.workerPort = new Worker(
    new URL("./pdf.worker.ts", import.meta.url),
    { type: "module" },
  );

  pdfjs = library;
  return library;
}

/**
 * Where pdf.js finds its runtime assets. Copied into public/ at build time by
 * scripts/copy-pdf-assets.mjs — without them `getDocument` still resolves but
 * `page.render()` waits forever on font data that never arrives.
 */
const ASSET_BASE = "/vendor/pdfjs";

export async function openDocument(file: InputFile): Promise<PDFDocumentProxy> {
  const library = await getPdfJs();
  try {
    // pdf.js takes ownership of the buffer it is given and detaches it, so a
    // copy is passed — otherwise a second tool run on the same dropped file
    // fails with a zero-length array.
    return await library.getDocument({
      data: new Uint8Array(file.bytes),
      standardFontDataUrl: `${ASSET_BASE}/standard_fonts/`,
      cMapUrl: `${ASSET_BASE}/cmaps/`,
      cMapPacked: true,
      wasmUrl: `${ASSET_BASE}/wasm/`,
    }).promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/password/i.test(message)) {
      throw new ToolError(`“${file.name}” is password-protected, so its pages can't be read.`);
    }
    throw new ToolError(`“${file.name}” couldn't be read: ${message}`);
  }
}

export interface TextLine {
  text: string;
  /** Font size in page units — the signal used to guess headings. */
  size: number;
  /** Distance from the top of the page, for ordering and paragraph breaks. */
  top: number;
  left: number;
  bold: boolean;
}

/**
 * Extracts text as lines rather than as one run-together string.
 *
 * pdf.js hands back positioned fragments with no notion of a line, so items are
 * grouped by their vertical position. Without that, a two-column page comes out
 * interleaved and a heading merges into the paragraph beneath it.
 */
export async function extractLines(document: PDFDocumentProxy, pageNumber: number): Promise<TextLine[]> {
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });

  const rows = new Map<number, TextLine[]>();

  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim()) continue;

    const transform = item.transform as number[];
    const size = Math.abs(transform[3]) || Math.abs(transform[0]) || 10;
    const left = transform[4];
    const top = viewport.height - transform[5];

    // Round to the nearest couple of units: glyphs on one line rarely share an
    // exact baseline once kerning and superscripts are involved.
    const key = Math.round(top / 2) * 2;
    const fontName = "fontName" in item ? String(item.fontName) : "";

    const line: TextLine = {
      text: item.str,
      size,
      top,
      left,
      bold: /bold|black|heavy/i.test(fontName),
    };

    const existing = rows.get(key);
    if (existing) existing.push(line);
    else rows.set(key, [line]);
  }

  return Array.from(rows.entries())
    .sort(([a], [b]) => a - b)
    .map(([, fragments]) => {
      const ordered = fragments.sort((a, b) => a.left - b.left);
      return {
        text: ordered.map((f) => f.text).join("").replace(/\s+/g, " ").trim(),
        size: Math.max(...ordered.map((f) => f.size)),
        top: ordered[0].top,
        left: ordered[0].left,
        bold: ordered.some((f) => f.bold),
      };
    })
    .filter((line) => line.text.length > 0);
}

export async function extractPlainText(document: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const lines = await extractLines(document, pageNumber);
  return lines.map((line) => line.text).join("\n");
}
