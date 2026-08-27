import type { FileOp } from "../file-types";

import { addPageNumbers, addWatermark, cropPdf, signPdf } from "./edit";
import { jpgToPdf } from "./images";
import {
  extractPages,
  mergePdf,
  organizePdf,
  removePages,
  repairPdf,
  rotatePdf,
  splitPdf,
} from "./organize";
import { comparePdf, compressPdf, pdfToJpg, pdfToMarkdown, redactPdf } from "./render";

/**
 * Every PDF op, keyed by the `op` name in the tool registry. The registry test
 * checks each pdf tool's op has an entry here, so a typo fails the build.
 *
 * This module is imported dynamically, so a visitor using the JSON formatter
 * never downloads pdf-lib or pdf.js.
 */
export const PDF_OPS: Record<string, FileOp> = {
  mergePdf,
  splitPdf,
  removePages,
  extractPages,
  organizePdf,
  rotatePdf,
  repairPdf,
  addPageNumbers,
  addWatermark,
  cropPdf,
  signPdf,
  jpgToPdf,
  pdfToJpg,
  compressPdf,
  pdfToMarkdown,
  comparePdf,
  redactPdf,
};

export function getPdfOp(name: string): FileOp | undefined {
  return PDF_OPS[name];
}

// Re-exported by name so tests can import an op directly rather than through
// the map, which keeps a failure message pointing at the op that broke.
export {
  addPageNumbers,
  addWatermark,
  comparePdf,
  compressPdf,
  cropPdf,
  extractPages,
  jpgToPdf,
  mergePdf,
  organizePdf,
  pdfToJpg,
  pdfToMarkdown,
  redactPdf,
  removePages,
  repairPdf,
  rotatePdf,
  signPdf,
  splitPdf,
};
