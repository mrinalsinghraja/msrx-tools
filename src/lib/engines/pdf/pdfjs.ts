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

/**
 * Where pdf.js finds its runtime assets, all served from this origin.
 *
 * `standard_fonts` are the substitutes for Helvetica, Times and Courier, needed
 * by almost every PDF ever made; `cmaps` are the character maps for CJK and
 * other multi-byte encodings; `wasm` holds the optional image decoders. Without
 * them `getDocument` still resolves and `page.render()` waits for ever on font
 * data that never arrives.
 *
 * Serving them ourselves is also what keeps the site offline-capable: pdf.js
 * would otherwise want a CDN, and this site makes no third-party requests.
 */
const ASSET_BASE = "/vendor/pdfjs";

/**
 * The worker script.
 *
 * This is a path to a file copied into public/ by scripts/copy-pdf-assets.mjs,
 * NOT a module the bundler resolves. The previous version handed Turbopack a
 * wrapper module and `new URL("./pdf.worker.ts", import.meta.url)`, which looks
 * like the modern approach and quietly is not: Turbopack published the raw
 * TypeScript source as a static asset, the browser served it as `video/mp2t`
 * and refused to run it, the Worker fired an error event carrying no message,
 * and pdf.js sat waiting for a handshake that could never arrive. Five tools
 * showed a spinner that never stopped, with an empty console.
 *
 * Keep this in step with the copy script. A test fails if they disagree.
 */
const WORKER_SRC = `${ASSET_BASE}/pdf.worker.min.mjs`;

/** Long enough for a slow phone on a big document; short enough to be an answer. */
const OPEN_TIMEOUT_MS = 30_000;

let pdfjs: PdfJs | null = null;

async function getPdfJs(): Promise<PdfJs> {
  if (pdfjs) return pdfjs;

  const library = await import("pdfjs-dist");
  library.GlobalWorkerOptions.workerSrc = WORKER_SRC;

  pdfjs = library;
  return library;
}

/**
 * Rejects rather than hanging.
 *
 * Every way the worker can fail to start — blocked, missing, wrong media type —
 * looks identical from here: pdf.js waits for a message that never comes, with
 * no error to catch. A promise that never settles is the worst failure a tool
 * can have, because the person watching it has no idea whether to keep waiting.
 * This turns it into a sentence.
 */
function withTimeout<T>(work: Promise<T>, name: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new ToolError(
          `The PDF engine did not start within ${OPEN_TIMEOUT_MS / 1000} seconds, so “${name}” could not be opened. Reload the page and try again; if it keeps happening, the browser is blocking the engine's worker script.`,
        ),
      );
    }, OPEN_TIMEOUT_MS);

    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function openDocument(file: InputFile): Promise<PDFDocumentProxy> {
  const library = await getPdfJs();
  try {
    // pdf.js takes ownership of the buffer it is given and detaches it, so a
    // copy is passed — otherwise a second tool run on the same dropped file
    // fails with a zero-length array.
    return await withTimeout(
      library.getDocument({
        data: new Uint8Array(file.bytes),
        standardFontDataUrl: `${ASSET_BASE}/standard_fonts/`,
        cMapUrl: `${ASSET_BASE}/cmaps/`,
        cMapPacked: true,
        wasmUrl: `${ASSET_BASE}/wasm/`,
      }).promise,
      file.name,
    );
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
