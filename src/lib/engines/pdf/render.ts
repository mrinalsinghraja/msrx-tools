import { PDFDocument } from "pdf-lib";

import { diffLines } from "diff";

import { bool, num, str, ToolError } from "../types";
import { formatBytes, parsePageRange, stem, type FileOp } from "../file-types";
import { loadPdf, PDF_MIME, requireFiles, saveDocument } from "./document";
import { extractLines, extractPlainText, openDocument } from "./pdfjs";

/** The half of pdf.js's text-item union that carries actual glyphs. */
interface PositionedText {
  str: string;
  transform: number[];
  width?: number;
}

/**
 * Everything that needs the page painted or read: rasterising, compressing,
 * text extraction, comparison, redaction.
 */

/** Renders one page to a canvas at the given scale. */
async function renderPage(
  document: Awaited<ReturnType<typeof openDocument>>,
  pageNumber: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = window.document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const context = canvas.getContext("2d");
  if (!context) throw new ToolError("This browser wouldn't provide a drawing surface.");

  // White first: PDF pages are transparent, and a JPEG has no alpha channel, so
  // without this every rasterised page comes out with a black background.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  /**
   * `intent: "print"` is not about printing. It is the only way to stop pdf.js
   * driving its render loop with requestAnimationFrame.
   *
   * With the default display intent, each chunk of the page is scheduled with
   * `requestAnimationFrame` — and a browser does not run animation frames in a
   * tab that is not visible. Anyone who starts a conversion and switches tab
   * while it works, which is the natural thing to do, comes back to a spinner
   * that will never finish: no error, no failed request, nothing in the console.
   * Print intent schedules on microtasks instead and runs to completion whether
   * the tab is watched or not.
   *
   * It is also the more accurate description of what is happening here. This is
   * a page being rasterised for export, not painted progressively on screen, and
   * print intent renders annotations in their print appearance, which is what
   * somebody exporting a page expects to get.
   */
  await page.render({ canvas, canvasContext: context, viewport, intent: "print" }).promise;
  return canvas;
}

async function canvasToBytes(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
  if (!blob) throw new ToolError("The page couldn't be encoded as an image.");
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Rasterises page one of a PDF so a result can be shown on screen.
 *
 * A browser cannot display a PDF blob usefully inside a panel — an embed or an
 * iframe brings its own viewer, its own toolbar and its own scrollbars, and
 * fights the layout around it. Turning the first page into an image gives a
 * plain picture that behaves like every other preview on the site.
 *
 * The document is destroyed afterwards, which matters more here than in the
 * tools: a live preview re-runs on every change, and each parsed document is
 * held in the worker until it is told otherwise.
 */
export async function renderFirstPage(
  bytes: Uint8Array,
  maxWidth = 900,
): Promise<{ bytes: Uint8Array; mime: string; pages: number }> {
  const document = await openDocument({ name: "preview.pdf", bytes });
  try {
    const page = await document.getPage(1);
    const unscaled = page.getViewport({ scale: 1 });
    // Enough to read, never more than the panel can show. Two is the ceiling so
    // a business card sized PDF does not render at ten times its size.
    const scale = Math.min(2, Math.max(0.1, maxWidth / unscaled.width));

    const canvas = await renderPage(document, 1, scale);
    return {
      bytes: await canvasToBytes(canvas, "image/png", 1),
      mime: "image/png",
      pages: document.numPages,
    };
  } finally {
    // `destroy` lives on the loading task rather than the document, and it is
    // the call that actually releases the parsed document inside the worker.
    await document.loadingTask.destroy();
  }
}

export const pdfToJpg: FileOp = async (files, options, onProgress) => {
  requireFiles(files);
  // Say something before opening the document: the first call in a session
  // downloads the pdf.js worker, its wasm decoders and its font data, which on
  // a cold cache is several seconds of apparent nothing.
  onProgress?.(0, "Starting the PDF engine…");
  const document = await openDocument(files[0]);
  const pageCount = document.numPages;
  const indices = parsePageRange(str(options, "pages", "all"), pageCount);

  const format = str(options, "format", "jpeg");
  const mime = format === "png" ? "image/png" : "image/jpeg";
  const extension = format === "png" ? "png" : "jpg";
  const quality = num(options, "quality", 85) / 100;
  // 72 dpi is the PDF's own unit, so the scale factor is simply dpi / 72.
  const scale = num(options, "dpi", 150) / 72;

  const base = stem(files[0].name);
  const width = String(pageCount).length;
  const outputs = [];

  for (const [position, index] of indices.entries()) {
    const canvas = await renderPage(document, index + 1, scale);
    outputs.push({
      name: `${base}-page-${String(index + 1).padStart(width, "0")}.${extension}`,
      bytes: await canvasToBytes(canvas, mime, quality),
      mime,
    });
    onProgress?.((position + 1) / indices.length, `Rendered page ${index + 1}`);
  }

  return {
    files: outputs,
    stats: [
      { label: "Pages", value: String(outputs.length) },
      { label: "Resolution", value: `${num(options, "dpi", 150)} dpi` },
      { label: "Total size", value: formatBytes(outputs.reduce((sum, f) => sum + f.bytes.length, 0)) },
    ],
  };
};

/**
 * Two honest compression strategies, because there is no single one.
 *
 * "Structure" rewrites the file with object streams and drops unreferenced
 * objects. It is lossless and keeps text selectable, but on a document whose
 * bulk is scanned images it saves almost nothing.
 *
 * "Rasterise" renders every page to a JPEG and rebuilds the PDF from those.
 * It shrinks scan-heavy documents dramatically and **destroys the text layer** —
 * the result is a picture of a document. That trade is stated in the options and
 * repeated in the result, because it is not reversible.
 */
export const compressPdf: FileOp = async (files, options, onProgress) => {
  requireFiles(files);
  const original = files[0].bytes.length;
  const mode = str(options, "mode", "structure");

  if (mode === "structure") {
    const source = await loadPdf(files[0]);
    const target = await PDFDocument.create();
    const pages = await target.copyPages(source, source.getPageIndices());
    for (const page of pages) target.addPage(page);

    if (bool(options, "stripMetadata", true)) {
      target.setTitle("");
      target.setAuthor("");
      target.setSubject("");
      target.setKeywords([]);
      target.setProducer("");
      target.setCreator("");
    }

    const bytes = await saveDocument(target);
    const saved = original - bytes.length;

    return {
      files: [{ name: `${stem(files[0].name)}-compressed.pdf`, bytes, mime: PDF_MIME }],
      stats: [
        { label: "Before", value: formatBytes(original) },
        { label: "After", value: formatBytes(bytes.length) },
        { label: "Saved", value: saved > 0 ? `${Math.round((saved / original) * 100)}%` : "0%" },
      ],
      note:
        saved <= original * 0.02
          ? "Barely any saving, which means this file's size is in its images rather than its structure. The rasterise mode will shrink it, at the cost of the text layer."
          : "Lossless: text stays selectable and nothing was re-encoded.",
    };
  }

  onProgress?.(0, "Starting the PDF engine…");
  const source = await openDocument(files[0]);
  const target = await PDFDocument.create();
  const scale = num(options, "dpi", 120) / 72;
  const quality = num(options, "quality", 70) / 100;

  for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber++) {
    const canvas = await renderPage(source, pageNumber, scale);
    const jpeg = await canvasToBytes(canvas, "image/jpeg", quality);
    const image = await target.embedJpg(jpeg);

    // Keep the page at its original point size so the document still prints at
    // the right dimensions; only the pixel density behind it has changed.
    const page = await source.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const pdfPage = target.addPage([viewport.width, viewport.height]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: viewport.width, height: viewport.height });

    onProgress?.(pageNumber / source.numPages, `Page ${pageNumber} of ${source.numPages}`);
  }

  const bytes = await saveDocument(target);
  const saved = original - bytes.length;

  return {
    files: [{ name: `${stem(files[0].name)}-compressed.pdf`, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Before", value: formatBytes(original) },
      { label: "After", value: formatBytes(bytes.length) },
      { label: "Saved", value: saved > 0 ? `${Math.round((saved / original) * 100)}%` : "nothing" },
    ],
    note: "Every page is now an image. The text is no longer selectable or searchable, and this cannot be undone — keep the original.",
  };
};

export const pdfToMarkdown: FileOp = async (files, options, onProgress) => {
  requireFiles(files);
  onProgress?.(0, "Starting the PDF engine…");
  const document = await openDocument(files[0]);
  const pageBreaks = bool(options, "pageBreaks", true);
  const detectHeadings = bool(options, "headings", true);

  // Body size is the most common line size in the document. Anything markedly
  // larger is a heading — a far more reliable signal than absolute point sizes,
  // which vary with every template.
  const sizeCounts = new Map<number, number>();
  const pages: Awaited<ReturnType<typeof extractLines>>[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const lines = await extractLines(document, pageNumber);
    pages.push(lines);
    for (const line of lines) {
      const bucket = Math.round(line.size);
      sizeCounts.set(bucket, (sizeCounts.get(bucket) ?? 0) + line.text.length);
    }
    onProgress?.(pageNumber / document.numPages);
  }

  const bodySize =
    Array.from(sizeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12;

  const out: string[] = [];
  for (const [index, lines] of pages.entries()) {
    if (pageBreaks && index > 0) out.push("\n---\n");

    for (const line of lines) {
      if (detectHeadings) {
        const ratio = line.size / bodySize;
        if (ratio >= 1.6) {
          out.push(`# ${line.text}`);
          continue;
        }
        if (ratio >= 1.3) {
          out.push(`## ${line.text}`);
          continue;
        }
        if (ratio >= 1.12 || (line.bold && line.text.length < 80)) {
          out.push(`### ${line.text}`);
          continue;
        }
      }

      // A leading bullet glyph or "1." is a list item in every document that
      // has one, and Markdown has a direct equivalent.
      const bullet = /^[•·▪◦‣-]\s+(.*)$/.exec(line.text);
      if (bullet) {
        out.push(`- ${bullet[1]}`);
        continue;
      }
      const numbered = /^(\d+)[.)]\s+(.*)$/.exec(line.text);
      if (numbered) {
        out.push(`${numbered[1]}. ${numbered[2]}`);
        continue;
      }

      out.push(line.text);
    }
  }

  // Collapse the runs of blank lines that paragraph joining leaves behind.
  const markdown = out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  const bytes = new TextEncoder().encode(markdown);

  return {
    files: [{ name: `${stem(files[0].name)}.md`, bytes, mime: "text/markdown" }],
    stats: [
      { label: "Pages read", value: String(document.numPages) },
      { label: "Words", value: String(markdown.split(/\s+/).filter(Boolean).length) },
    ],
    note: markdown.length < 40
      ? "Almost no text came out, which means this PDF is a scan rather than a text document. Run it through OCR first."
      : "Layout is inferred from font sizes and positions. Tables and multi-column pages will need tidying by hand.",
  };
};

export const comparePdf: FileOp = async (files, options, onProgress) => {
  requireFiles(files, 2);

  const [left, right] = files;
  onProgress?.(0, "Starting the PDF engine…");
  const leftDoc = await openDocument(left);
  const rightDoc = await openDocument(right);

  async function readAll(document: Awaited<ReturnType<typeof openDocument>>, label: string) {
    const parts: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      parts.push(await extractPlainText(document, pageNumber));
      onProgress?.(pageNumber / document.numPages, label);
    }
    return parts.join("\n");
  }

  const leftText = await readAll(leftDoc, `Reading ${left.name}`);
  const rightText = await readAll(rightDoc, `Reading ${right.name}`);

  if (!leftText.trim() && !rightText.trim()) {
    throw new ToolError(
      "Neither document contains extractable text — both look like scans. Run them through OCR first, then compare.",
    );
  }

  // diffLines has no ignoreCase option, so the case is folded before comparing.
  const fold = (text: string) => {
    const withNewline = text.endsWith("\n") ? text : `${text}\n`;
    return bool(options, "ignoreCase") ? withNewline.toLowerCase() : withNewline;
  };

  const changes = diffLines(fold(leftText), fold(rightText), {
    ignoreWhitespace: bool(options, "ignoreWhitespace", true),
  });

  let added = 0;
  let removed = 0;
  const report: string[] = [
    `Comparing ${left.name} with ${right.name}`,
    `${leftDoc.numPages} pages vs ${rightDoc.numPages} pages`,
    "",
  ];

  for (const change of changes) {
    const lines = change.value.split("\n").filter((line) => line.trim());
    if (change.added) {
      added += lines.length;
      for (const line of lines) report.push(`+ ${line}`);
    } else if (change.removed) {
      removed += lines.length;
      for (const line of lines) report.push(`- ${line}`);
    }
  }

  if (added === 0 && removed === 0) report.push("The text of these two documents is identical.");

  const text = report.join("\n");
  return {
    files: [{ name: `${stem(left.name)}-vs-${stem(right.name)}.txt`, bytes: new TextEncoder().encode(text), mime: "text/plain" }],
    stats: [
      { label: "Lines added", value: String(added) },
      { label: "Lines removed", value: String(removed) },
      { label: "Identical", value: added === 0 && removed === 0 ? "Yes" : "No" },
    ],
    note: "This compares the text of the two documents. Changes to images, colours, fonts or layout are not detected.",
  };
};

/**
 * True redaction: the marked area is painted out and the page is then rasterised
 * so the underlying text no longer exists in the file.
 *
 * A black rectangle drawn over live text is not redaction — the text is still
 * in the document and any reader can select or extract it. That mistake has
 * leaked real secrets, so this tool does not offer it.
 */
export const redactPdf: FileOp = async (files, options, onProgress) => {
  requireFiles(files);

  const terms = str(options, "terms", "")
    .split("\n")
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) {
    throw new ToolError("Enter the words or phrases to remove, one per line.");
  }

  onProgress?.(0, "Starting the PDF engine…");
  const source = await openDocument(files[0]);
  const target = await PDFDocument.create();
  const caseSensitive = bool(options, "caseSensitive");
  const scale = num(options, "dpi", 150) / 72;
  let hits = 0;

  for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber++) {
    const page = await source.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext("2d");
    if (!context) throw new ToolError("This browser wouldn't provide a drawing surface.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    // Print intent for the same reason as renderPage above: display intent
    // schedules on requestAnimationFrame, which never fires in a hidden tab.
    await page.render({ canvas, canvasContext: context, viewport, intent: "print" }).promise;

    // Paint over each match on the rendered image, then throw the original page
    // away entirely — the text cannot survive because it is never carried over.
    const content = await page.getTextContent();
    context.fillStyle = "#000000";

    for (const raw of content.items as unknown[]) {
      const item = raw as PositionedText;
      if (typeof item.str !== "string" || !item.str.trim()) continue;
      const haystack = caseSensitive ? item.str : item.str.toLowerCase();
      const matched = terms.some((term) => haystack.includes(caseSensitive ? term : term.toLowerCase()));
      if (!matched) continue;

      const transform = item.transform;
      const height = Math.abs(transform[3]) * scale || 10 * scale;
      const x = transform[4] * scale;
      const y = viewport.height - transform[5] * scale - height;
      const width = (item.width ?? item.str.length * 5) * scale;

      // Pad slightly: glyph boxes exclude ascenders and descenders, and a tight
      // box leaves readable slivers at the top and bottom of the line.
      context.fillRect(x - 1, y - height * 0.25, width + 2, height * 1.5);
      hits++;
    }

    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!jpeg) throw new ToolError("The page couldn't be encoded.");
    const image = await target.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));

    const unscaled = page.getViewport({ scale: 1 });
    const pdfPage = target.addPage([unscaled.width, unscaled.height]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: unscaled.width, height: unscaled.height });

    onProgress?.(pageNumber / source.numPages, `Page ${pageNumber} of ${source.numPages}`);
  }

  if (hits === 0) {
    throw new ToolError(
      "None of those terms appear in this document's text. Check the spelling, or note that a scanned page has no text to search until it has been through OCR.",
    );
  }

  const bytes = await saveDocument(target);
  return {
    files: [{ name: `${stem(files[0].name)}-redacted.pdf`, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Redactions", value: String(hits) },
      { label: "Pages", value: String(source.numPages) },
      { label: "Size", value: formatBytes(bytes.length) },
    ],
    note: "The redacted text is gone, not hidden: every page was rebuilt as an image, so nothing underneath the black boxes remains in the file. The trade is that the whole document is no longer selectable or searchable. Check the result before sending it.",
  };
};
