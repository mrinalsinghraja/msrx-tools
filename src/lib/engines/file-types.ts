import type { OptionValues } from "@/lib/tools/types";

import type { OpStat } from "./types";

/**
 * The contract for file-in / file-out tools.
 *
 * Deliberately plain bytes rather than `File` objects: an op should be testable
 * from a fixture on disk without a DOM, and the same op will run unchanged when
 * these move into a worker.
 */

export interface InputFile {
  name: string;
  bytes: Uint8Array;
}

export interface OutputFile {
  name: string;
  bytes: Uint8Array;
  mime: string;
}

export interface FileOpResult {
  files: OutputFile[];
  stats?: OpStat[];
  /** A caveat worth reading — what was lost, what was approximated. */
  note?: string;
}

export type ProgressReporter = (fraction: number, label?: string) => void;

export type FileOp = (
  files: InputFile[],
  options: OptionValues,
  onProgress?: ProgressReporter,
) => Promise<FileOpResult>;

/** Strips the extension so outputs can be named after their input. */
export function stem(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Parses a page selection such as `1-3, 7, 12-` against a known page count.
 *
 * Returns zero-based indices in the order written, so `3,1` really does mean
 * page three then page one — which is what the reordering tools rely on.
 * Duplicates are preserved for the same reason.
 */
export function parsePageRange(input: string, pageCount: number): number[] {
  const text = input.trim();
  if (!text || text.toLowerCase() === "all") {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const pages: number[] = [];
  for (const rawPart of text.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;

    const range = /^(\d*)\s*-\s*(\d*)$/.exec(part);
    if (range) {
      const from = range[1] ? Number(range[1]) : 1;
      const to = range[2] ? Number(range[2]) : pageCount;
      if (from < 1 || to > pageCount || from > to) {
        throw new Error(
          `“${part}” is outside this document, which has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
        );
      }
      for (let p = from; p <= to; p++) pages.push(p - 1);
      continue;
    }

    const single = Number(part);
    if (!Number.isInteger(single) || single < 1 || single > pageCount) {
      throw new Error(
        `“${part}” is not a page in this document, which has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
      );
    }
    pages.push(single - 1);
  }

  if (pages.length === 0) throw new Error("That selection matches no pages.");
  return pages;
}
