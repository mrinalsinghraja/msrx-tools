import { degrees, PDFDocument } from "pdf-lib";

import { bool, num, str, ToolError } from "../types";
import { formatBytes, parsePageRange, stem, type FileOp } from "../file-types";
import { loadPdf, PDF_MIME, requireFiles, saveDocument } from "./document";

/**
 * Page-level surgery: combining, cutting apart, dropping, reordering, rotating.
 *
 * All of it is structural — pages are copied between documents with their
 * content streams intact, so nothing is re-rendered and no quality is lost.
 */

export const mergePdf: FileOp = async (files, options, onProgress) => {
  requireFiles(files, 2);

  const merged = await PDFDocument.create();
  let totalPages = 0;

  for (const [index, file] of files.entries()) {
    const source = await loadPdf(file);
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) merged.addPage(page);
    totalPages += pages.length;
    onProgress?.((index + 1) / files.length, `Merged ${file.name}`);
  }

  if (bool(options, "outline", true)) {
    // A reader that opens the merged file should be able to tell where each
    // original document began; the title is the cheapest way to say so.
    merged.setTitle(`${stem(files[0].name)} and ${files.length - 1} more`);
  }

  const bytes = await saveDocument(merged);
  return {
    files: [{ name: `${str(options, "filename", "merged") || "merged"}.pdf`, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Documents", value: String(files.length) },
      { label: "Pages", value: String(totalPages) },
      { label: "Size", value: formatBytes(bytes.length) },
    ],
  };
};

export const splitPdf: FileOp = async (files, options, onProgress) => {
  requireFiles(files);
  const source = await loadPdf(files[0]);
  const pageCount = source.getPageCount();
  const mode = str(options, "mode", "each");
  const base = stem(files[0].name);

  /** Builds one output document from a list of zero-based page indices. */
  async function extract(indices: number[], suffix: string) {
    const target = await PDFDocument.create();
    const pages = await target.copyPages(source, indices);
    for (const page of pages) target.addPage(page);
    return {
      name: `${base}-${suffix}.pdf`,
      bytes: await saveDocument(target),
      mime: PDF_MIME,
    };
  }

  const outputs: { name: string; bytes: Uint8Array; mime: string }[] = [];

  if (mode === "each") {
    const width = String(pageCount).length;
    for (let i = 0; i < pageCount; i++) {
      outputs.push(await extract([i], String(i + 1).padStart(width, "0")));
      onProgress?.((i + 1) / pageCount);
    }
  } else if (mode === "every") {
    const size = Math.max(1, num(options, "size", 1));
    for (let start = 0; start < pageCount; start += size) {
      const indices = Array.from(
        { length: Math.min(size, pageCount - start) },
        (_, k) => start + k,
      );
      const last = indices[indices.length - 1] + 1;
      outputs.push(await extract(indices, `${start + 1}-${last}`));
      onProgress?.(Math.min(1, (start + size) / pageCount));
    }
  } else {
    // Ranges mode: each comma-separated group becomes its own document, so
    // "1-3, 8-10" yields two files rather than one of six pages.
    const groups = str(options, "ranges", "").split(",").map((g) => g.trim()).filter(Boolean);
    if (groups.length === 0) {
      throw new ToolError("Enter the ranges to split at, for example 1-3, 4-8, 9-.");
    }
    for (const [index, group] of groups.entries()) {
      const indices = parsePageRange(group, pageCount);
      outputs.push(await extract(indices, group.replace(/\s+/g, "")));
      onProgress?.((index + 1) / groups.length);
    }
  }

  return {
    files: outputs,
    stats: [
      { label: "Pages in", value: String(pageCount) },
      { label: "Files out", value: String(outputs.length) },
    ],
  };
};

export const removePages: FileOp = async (files, options) => {
  requireFiles(files);
  const source = await loadPdf(files[0]);
  const pageCount = source.getPageCount();

  const doomed = new Set(parsePageRange(str(options, "pages", ""), pageCount));
  const keep = Array.from({ length: pageCount }, (_, i) => i).filter((i) => !doomed.has(i));

  if (keep.length === 0) {
    throw new ToolError("That would remove every page. A PDF needs at least one.");
  }

  const target = await PDFDocument.create();
  const pages = await target.copyPages(source, keep);
  for (const page of pages) target.addPage(page);
  const bytes = await saveDocument(target);

  return {
    files: [{ name: `${stem(files[0].name)}-pages-removed.pdf`, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Removed", value: String(doomed.size) },
      { label: "Remaining", value: String(keep.length) },
      { label: "Size", value: formatBytes(bytes.length) },
    ],
  };
};

export const extractPages: FileOp = async (files, options) => {
  requireFiles(files);
  const source = await loadPdf(files[0]);
  const pageCount = source.getPageCount();
  const indices = parsePageRange(str(options, "pages", ""), pageCount);
  const base = stem(files[0].name);

  if (bool(options, "separate")) {
    const width = String(pageCount).length;
    const outputs = [];
    for (const index of indices) {
      const target = await PDFDocument.create();
      const [page] = await target.copyPages(source, [index]);
      target.addPage(page);
      outputs.push({
        name: `${base}-page-${String(index + 1).padStart(width, "0")}.pdf`,
        bytes: await saveDocument(target),
        mime: PDF_MIME,
      });
    }
    return {
      files: outputs,
      stats: [{ label: "Pages extracted", value: String(indices.length) }],
    };
  }

  const target = await PDFDocument.create();
  const pages = await target.copyPages(source, indices);
  for (const page of pages) target.addPage(page);
  const bytes = await saveDocument(target);

  return {
    files: [{ name: `${base}-extracted.pdf`, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Pages extracted", value: String(indices.length) },
      { label: "Size", value: formatBytes(bytes.length) },
    ],
  };
};

export const organizePdf: FileOp = async (files, options) => {
  requireFiles(files);
  const source = await loadPdf(files[0]);
  const pageCount = source.getPageCount();
  const order = str(options, "order", "").trim();

  let indices: number[];
  if (!order || order.toLowerCase() === "reverse") {
    indices = Array.from({ length: pageCount }, (_, i) => pageCount - 1 - i);
  } else {
    // parsePageRange keeps the written order and any repeats, which is exactly
    // what reordering needs — "3,1,2" must not be sorted back into "1,2,3".
    indices = parsePageRange(order, pageCount);
  }

  const target = await PDFDocument.create();
  const pages = await target.copyPages(source, indices);
  for (const page of pages) target.addPage(page);
  const bytes = await saveDocument(target);

  return {
    files: [{ name: `${stem(files[0].name)}-organised.pdf`, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Pages in", value: String(pageCount) },
      { label: "Pages out", value: String(indices.length) },
    ],
    // Counting alone is not enough: "1,1,2" on a three-page document keeps the
    // count while silently dropping page 3 and duplicating page 1.
    note: describeOrderChange(indices, pageCount),
  };
};

/** Warns when a reordering drops or repeats pages, not merely when the count moves. */
function describeOrderChange(indices: number[], pageCount: number): string | undefined {
  const seen = new Map<number, number>();
  for (const index of indices) seen.set(index, (seen.get(index) ?? 0) + 1);

  const dropped: number[] = [];
  for (let i = 0; i < pageCount; i++) if (!seen.has(i)) dropped.push(i + 1);
  const repeated = [...seen.entries()].filter(([, n]) => n > 1).map(([i]) => i + 1);

  if (dropped.length === 0 && repeated.length === 0) return undefined;

  const parts: string[] = [];
  if (dropped.length) {
    parts.push(`page${dropped.length === 1 ? "" : "s"} ${dropped.join(", ")} ${dropped.length === 1 ? "is" : "are"} not in the new order and ${dropped.length === 1 ? "has" : "have"} been dropped`);
  }
  if (repeated.length) {
    parts.push(`page${repeated.length === 1 ? "" : "s"} ${repeated.join(", ")} appear${repeated.length === 1 ? "s" : ""} more than once`);
  }
  return `Check this is what you meant: ${parts.join(", and ")}.`;
}

export const rotatePdf: FileOp = async (files, options) => {
  requireFiles(files);
  const document = await loadPdf(files[0]);
  const pageCount = document.getPageCount();
  const turn = num(options, "angle", 90);
  const selected = new Set(parsePageRange(str(options, "pages", "all"), pageCount));

  for (const [index, page] of document.getPages().entries()) {
    if (!selected.has(index)) continue;
    // Rotation accumulates: a page that was already landscape stays landscape
    // relative to its neighbours rather than snapping to an absolute angle.
    const current = page.getRotation().angle;
    page.setRotation(degrees((((current + turn) % 360) + 360) % 360));
  }

  const bytes = await saveDocument(document);
  return {
    files: [{ name: `${stem(files[0].name)}-rotated.pdf`, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Pages rotated", value: String(selected.size) },
      { label: "Turned by", value: `${turn}°` },
    ],
  };
};

export const repairPdf: FileOp = async (files) => {
  requireFiles(files);

  // "Repair" here means: parse as leniently as the library allows, then write a
  // clean document from what survived. It rebuilds the cross-reference table and
  // drops unreachable objects, which fixes the common "file is damaged" cases.
  // It cannot invent content that is genuinely missing, and says so.
  let source;
  try {
    source = await loadPdf(files[0], { ignoreEncryption: true });
  } catch {
    throw new ToolError(
      `“${files[0].name}” is damaged beyond what this tool can recover — its structure can't be parsed at all. A file that still opens in a reader usually can be repaired; one that opens nowhere usually cannot.`,
    );
  }

  const target = await PDFDocument.create();
  const salvaged: number[] = [];
  const lost: number[] = [];

  for (let i = 0; i < source.getPageCount(); i++) {
    try {
      const [page] = await target.copyPages(source, [i]);
      target.addPage(page);
      salvaged.push(i + 1);
    } catch {
      // One unreadable page should not cost the whole document.
      lost.push(i + 1);
    }
  }

  if (salvaged.length === 0) {
    throw new ToolError("No pages could be recovered from that file.");
  }

  const bytes = await saveDocument(target);
  return {
    files: [{ name: `${stem(files[0].name)}-repaired.pdf`, bytes, mime: PDF_MIME }],
    stats: [
      { label: "Pages recovered", value: String(salvaged.length) },
      { label: "Pages lost", value: String(lost.length) },
      { label: "Size", value: formatBytes(bytes.length) },
    ],
    note: lost.length
      ? `Page${lost.length === 1 ? "" : "s"} ${lost.join(", ")} could not be read and ${lost.length === 1 ? "is" : "are"} missing from the result. Check the recovered file before discarding the original.`
      : "The file was rebuilt with a fresh cross-reference table. Check it opens correctly before discarding the original.",
  };
};
