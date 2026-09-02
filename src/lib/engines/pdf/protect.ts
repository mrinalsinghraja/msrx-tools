import { bool, str, ToolError } from "../types";
import { formatBytes, stem, type FileOp, type InputFile, type OutputFile } from "../file-types";

import { isPasswordFailure, runQpdf, type QpdfRun } from "./qpdf";

/**
 * Adding and removing PDF encryption.
 *
 * These two are the only tools here that do not touch pdf-lib. A PDF's
 * encryption covers the strings and streams inside it, so a library that cannot
 * decrypt cannot read the document at all — pdf-lib's `ignoreEncryption` gets
 * you a parse, not the contents. qpdf does the real thing in both directions.
 *
 * What this cannot do, and will not pretend to: open a document whose password
 * nobody knows. There is no recovery mode, no word list, no "try harder"
 * button. AES-256 is not guessable, and a tool that implied otherwise would be
 * lying to the person who needs the answer most.
 */

const PDF_MIME = "application/pdf";

/** qpdf's exit statuses. 3 means it finished but had something to say. */
const EXIT_WARNING = 3;

function passwordArgs(password: string): string[] {
  return password ? [`--password=${password}`] : [];
}

/** Turns a failed run into a sentence about this file rather than an exit code. */
function reportFailure(file: InputFile, run: QpdfRun, password: string): never {
  if (isPasswordFailure(run)) {
    throw new ToolError(
      password
        ? `That password did not open “${file.name}”. PDFs can carry two passwords — one to open the file and one to change its permissions — and only the opening password will do here.`
        : `“${file.name}” needs its password before it can be opened. Type it in the box above and run the tool again.`,
    );
  }
  throw new ToolError(
    `“${file.name}” could not be read${run.output ? `: ${run.output.split("\n")[0]}` : "."}`,
  );
}

/**
 * Removes a PDF's password and encryption, given the password that opens it.
 *
 * Files carrying only an owner password — the kind that open without being
 * asked but refuse to print or copy — need no password here, because the
 * document is already readable and the restriction is a flag the reader is
 * asked to honour rather than a lock. Removing that flag is the whole point of
 * every "unlock" tool on the web, and it is done in the open here.
 */
export const unlockPdf: FileOp = async (files, options, onProgress) => {
  const password = str(options, "password", "");
  const outputs: OutputFile[] = [];

  let alreadyOpen = 0;
  let hadPassword = 0;
  let restrictionsOnly = 0;

  for (const [index, file] of files.entries()) {
    // Ask what the document is before doing anything to it, and ask WITHOUT the
    // password. That is what separates the two cases: a file that opens on its
    // own carries restrictions, a file that refuses carries a real password.
    // Rewriting a document that was never encrypted would hand back a
    // "successfully unlocked" file and quietly teach the wrong lesson.
    const state = await runQpdf(["{INPUT}", "--show-encryption"], file.bytes);
    const locked = isPasswordFailure(state);

    if (!locked && state.code !== 0) reportFailure(file, state, password);

    if (!locked && /not encrypted/i.test(state.output)) {
      alreadyOpen++;
      outputs.push({ name: `${stem(file.name)}.pdf`, bytes: file.bytes, mime: PDF_MIME });
      onProgress?.((index + 1) / files.length, file.name);
      continue;
    }

    if (locked && !password) reportFailure(file, state, password);

    const run = await runQpdf(
      [...passwordArgs(locked ? password : ""), "{INPUT}", "--decrypt", "--", "{OUTPUT}"],
      file.bytes,
    );
    if (!run.bytes || (run.code !== 0 && run.code !== EXIT_WARNING)) reportFailure(file, run, password);

    if (locked) hadPassword++;
    else restrictionsOnly++;

    outputs.push({ name: `${stem(file.name)}-unlocked.pdf`, bytes: run.bytes, mime: PDF_MIME });
    onProgress?.((index + 1) / files.length, file.name);
  }

  const notes: string[] = [];
  if (hadPassword) {
    notes.push(
      `${hadPassword === 1 ? "The file" : `${hadPassword} files`} opened with the password you gave and ${hadPassword === 1 ? "its" : "their"} encryption is gone — the result will open for anyone who has it.`,
    );
  }
  if (restrictionsOnly) {
    notes.push(
      `${restrictionsOnly === 1 ? "One file carried" : `${restrictionsOnly} files carried`} usage restrictions rather than an opening password, so no password was needed to lift them.`,
    );
  }
  if (alreadyOpen) {
    notes.push(
      `${alreadyOpen === 1 ? "One file was" : `${alreadyOpen} files were`} not encrypted at all and came back untouched.`,
    );
  }

  return {
    files: outputs,
    stats: [
      { label: "Files", value: String(outputs.length) },
      { label: "Unlocked", value: String(hadPassword + restrictionsOnly) },
      { label: "Size", value: formatBytes(outputs.reduce((sum, f) => sum + f.bytes.length, 0)) },
    ],
    note: notes.join(" ") || undefined,
  };
};

/**
 * Encrypts a PDF with AES-256, so it cannot be opened without the password.
 *
 * The permission switches are a weaker promise than the password and are
 * labelled that way on the page: they are entries in the document that readers
 * are asked to respect, and a reader that ignores them is not breaking
 * anything. The password is the part that actually holds.
 */
export const protectPdf: FileOp = async (files, options, onProgress) => {
  const password = str(options, "password", "");
  if (!password) {
    throw new ToolError("Type the password the file should ask for. Without one there is nothing to protect it with.");
  }

  // An owner password left empty would let any reader lift the permissions
  // without knowing anything, which makes the switches below decorative.
  const owner = str(options, "ownerPassword", "") || password;
  const allowPrinting = bool(options, "allowPrinting", true);
  const allowCopying = bool(options, "allowCopying", true);
  const allowEditing = bool(options, "allowEditing", false);

  const outputs: OutputFile[] = [];

  for (const [index, file] of files.entries()) {
    const state = await runQpdf(["{INPUT}", "--show-encryption"], file.bytes);
    if (isPasswordFailure(state) || (state.code === 0 && !/not encrypted/i.test(state.output))) {
      throw new ToolError(
        `“${file.name}” is already encrypted. Remove the existing protection with Unlock PDF first, then set the new password here.`,
      );
    }

    const run = await runQpdf(
      [
        "{INPUT}",
        "--encrypt",
        `--user-password=${password}`,
        `--owner-password=${owner}`,
        // qpdf's encryption grammar is positional: passwords, then --bits,
        // then the permission flags. Any other order and it rejects the
        // argument it has not reached yet.
        "--bits=256",
        `--print=${allowPrinting ? "full" : "none"}`,
        `--modify=${allowEditing ? "all" : "none"}`,
        `--extract=${allowCopying ? "y" : "n"}`,
        "--",
        "{OUTPUT}",
      ],
      file.bytes,
    );

    if (!run.bytes || (run.code !== 0 && run.code !== EXIT_WARNING)) {
      throw new ToolError(
        `“${file.name}” could not be encrypted${run.output ? `: ${run.output.split("\n")[0]}` : "."}`,
      );
    }

    outputs.push({ name: `${stem(file.name)}-protected.pdf`, bytes: run.bytes, mime: PDF_MIME });
    onProgress?.((index + 1) / files.length, file.name);
  }

  const restricted = [
    allowPrinting ? null : "printing",
    allowCopying ? null : "copying text",
    allowEditing ? null : "editing",
  ].filter(Boolean);

  return {
    files: outputs,
    stats: [
      { label: "Files", value: String(outputs.length) },
      { label: "Encryption", value: "AES-256" },
      { label: "Size", value: formatBytes(outputs.reduce((sum, f) => sum + f.bytes.length, 0)) },
    ],
    note: `Keep the password somewhere safe: AES-256 has no back door and nobody — including this site — can open the file without it.${restricted.length ? ` The bar on ${restricted.join(" and ")} is a request recorded in the document, which well-behaved readers honour and determined ones can ignore; the password is the part that holds.` : ""}`,
  };
};
