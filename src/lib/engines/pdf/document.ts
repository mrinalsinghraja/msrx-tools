import { PDFDocument } from "pdf-lib";

import { ToolError } from "../types";
import type { InputFile } from "../file-types";

/**
 * Shared loading for every PDF op.
 *
 * pdf-lib throws a variety of low-level errors on damaged or encrypted input.
 * They are unreadable to a person, so each is translated once, here, rather
 * than in fifteen tools.
 */

export const PDF_MIME = "application/pdf";

export interface LoadOptions {
  /**
   * Loads a password-protected file far enough to read its pages. pdf-lib does
   * not decrypt, so this only helps with documents that carry an owner password
   * (restrictions) rather than a user password (which actually encrypts the
   * content). Anything genuinely encrypted still fails, and says so.
   */
  ignoreEncryption?: boolean;
}

export async function loadPdf(file: InputFile, options: LoadOptions = {}): Promise<PDFDocument> {
  if (file.bytes.length === 0) {
    throw new ToolError(`“${file.name}” is empty.`);
  }

  // A PDF always begins with %PDF-. Checking here gives a clear message instead
  // of a parser error when someone drops a .docx that was renamed.
  const header = new TextDecoder("latin1").decode(file.bytes.subarray(0, 5));
  if (header !== "%PDF-") {
    throw new ToolError(`“${file.name}” doesn't look like a PDF — its contents don't start with %PDF-.`);
  }

  try {
    return await PDFDocument.load(file.bytes, {
      ignoreEncryption: options.ignoreEncryption ?? false,
      updateMetadata: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/encrypted/i.test(message)) {
      throw new ToolError(
        `“${file.name}” is password-protected. Remove the password with the Unlock PDF tool first, or open it in a reader and re-save it without one.`,
      );
    }
    if (/Failed to parse|Expected instance|No PDF header/i.test(message)) {
      throw new ToolError(
        `“${file.name}” is damaged and can't be read. The Repair PDF tool can sometimes recover a file in this state.`,
      );
    }
    throw new ToolError(`“${file.name}” couldn't be opened: ${message}`);
  }
}

export function requireFiles(files: InputFile[], minimum = 1): void {
  if (files.length < minimum) {
    throw new ToolError(
      minimum === 1
        ? "Add a PDF to get started."
        : `This tool needs at least ${minimum} files — add another.`,
    );
  }
}

/** pdf-lib returns its own Uint8Array; callers only ever want the bytes. */
export async function saveDocument(document: PDFDocument): Promise<Uint8Array> {
  return await document.save({ useObjectStreams: true });
}
