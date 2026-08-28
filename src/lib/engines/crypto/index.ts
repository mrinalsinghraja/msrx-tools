import { open, seal, type KdfHash } from "../crypto-box";
import { stem, type FileOp } from "../file-types";
import { bool, num, str, ToolError } from "../types";

/**
 * File encryption.
 *
 * The whole file is read into memory and encrypted in one go rather than
 * streamed. AES-GCM has a single authentication tag over the whole message, so
 * chunking would mean inventing a chunk format — and a home-made chunk format
 * is precisely the part of a cryptosystem that goes wrong. The cost is a size
 * ceiling, which the tool states rather than discovering at run time.
 */

/** Above this, the browser tab runs out of room holding plaintext and ciphertext at once. */
const MAX_BYTES = 512 * 1024 * 1024;

export const encryptFile: FileOp = async (files, options, onProgress) => {
  const password = str(options, "password");
  if (!password) throw new ToolError("Enter a password. The key is derived from it, so there is no encrypting without one.");

  const confirm = str(options, "confirm");
  if (confirm && confirm !== password) {
    throw new ToolError("The two passwords don't match. Nothing was encrypted.");
  }

  const iterations = Math.max(100_000, num(options, "iterations", 600_000));
  const hash = str(options, "kdfHash", "SHA-256") as KdfHash;
  const keepName = bool(options, "keepName", true);

  const outputs = [];
  for (const [index, file] of files.entries()) {
    if (file.bytes.length > MAX_BYTES) {
      throw new ToolError(
        `“${file.name}” is ${(file.bytes.length / 1024 / 1024).toFixed(0)} MB. This tool holds the whole file in memory twice over, so it stops at 512 MB.`,
      );
    }
    onProgress?.(index / files.length, `Deriving a key for ${file.name}`);
    const box = await seal(file.bytes, password, { iterations, hash });
    outputs.push({
      // Keeping the extension inside the new name means the person decrypting
      // knows what they are getting back. Dropping it hides that from anyone
      // who sees the file, including them.
      name: `${keepName ? file.name : stem(file.name)}.enc`,
      bytes: box,
      mime: "application/octet-stream",
    });
    onProgress?.((index + 1) / files.length, file.name);
  }

  return {
    files: outputs,
    stats: [
      { label: "Cipher", value: "AES-256-GCM" },
      { label: "Key derivation", value: `PBKDF2-${hash}, ${iterations.toLocaleString()} rounds` },
      { label: "Files", value: String(outputs.length) },
    ],
    note: "Encrypted here, in this tab. There is no key escrow and no recovery: if the password is lost, the file is lost. Store it in a password manager before you close this page.",
  };
};

export const decryptFile: FileOp = async (files, options, onProgress) => {
  const password = str(options, "password");
  if (!password) throw new ToolError("Enter the password these files were encrypted with.");
  const restoreName = bool(options, "restoreName", true);

  const outputs = [];
  let iterations = 0;
  let hash = "";

  for (const [index, file] of files.entries()) {
    onProgress?.(index / files.length, `Deriving a key for ${file.name}`);
    const opened = await open(file.bytes, password);
    iterations = opened.iterations;
    hash = opened.hash;

    // "report.pdf.enc" came from "report.pdf"; anything else keeps a plain
    // .bin, since guessing a type from bytes we cannot read would be a lie.
    const original = file.name.replace(/\.enc$/i, "");
    const name = restoreName && original.includes(".") ? original : `${stem(original)}.bin`;

    outputs.push({ name, bytes: opened.plaintext, mime: "application/octet-stream" });
    onProgress?.((index + 1) / files.length, file.name);
  }

  return {
    files: outputs,
    stats: [
      { label: "Files", value: String(outputs.length) },
      { label: "Key derivation", value: `PBKDF2-${hash}, ${iterations.toLocaleString()} rounds` },
    ],
    note: "Every file decrypted and passed its authentication check, which means none of them has been altered since it was encrypted.",
  };
};

export const CRYPTO_OPS: Record<string, FileOp> = { encryptFile, decryptFile };

export function getCryptoOp(name: string): FileOp | undefined {
  return CRYPTO_OPS[name];
}
