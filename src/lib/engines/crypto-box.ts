import { ToolError } from "./types";

/**
 * The encryption envelope shared by the text and file tools.
 *
 * A ciphertext is useless without the salt, the IV and the iteration count that
 * produced its key, so all three travel with it. Writing them into the file is
 * what lets someone decrypt it next year without remembering which settings
 * this page happened to default to.
 *
 * Layout, all big-endian:
 *
 *   0  ..  7   magic "MSRXENC1"
 *   8  ..  8   KDF hash: 1 = SHA-256, 2 = SHA-512
 *   9  .. 12   PBKDF2 iterations, uint32
 *  13  .. 28   salt, 16 bytes
 *  29 ..  40   IV, 12 bytes
 *  41 ..       AES-256-GCM ciphertext, including its 16-byte tag
 *
 * AES-GCM is authenticated, so a wrong password, a truncated download or a
 * flipped bit all fail the same way: the browser refuses to decrypt rather than
 * handing back plausible rubbish.
 */

const MAGIC = new Uint8Array([0x4d, 0x53, 0x52, 0x58, 0x45, 0x4e, 0x43, 0x31]); // MSRXENC1
const SALT_BYTES = 16;
const IV_BYTES = 12;
export const HEADER_BYTES = MAGIC.length + 1 + 4 + SALT_BYTES + IV_BYTES;

export type KdfHash = "SHA-256" | "SHA-512";

const HASH_CODE: Record<KdfHash, number> = { "SHA-256": 1, "SHA-512": 2 };
const HASH_BY_CODE: Record<number, KdfHash> = { 1: "SHA-256", 2: "SHA-512" };

/** OWASP's 2023 floor for PBKDF2-HMAC-SHA256. Roughly a second on a mid phone. */
export const DEFAULT_ITERATIONS = 600_000;

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
  hash: KdfHash,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface SealOptions {
  iterations?: number;
  hash?: KdfHash;
}

export async function seal(
  plaintext: Uint8Array,
  password: string,
  options: SealOptions = {},
): Promise<Uint8Array> {
  if (!password) throw new ToolError("Enter a password. Without one there is nothing to derive a key from.");

  const iterations = Math.max(100_000, Math.floor(options.iterations ?? DEFAULT_ITERATIONS));
  const hash = options.hash ?? "SHA-256";
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const key = await deriveKey(password, salt, iterations, hash);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plaintext as BufferSource),
  );

  const out = new Uint8Array(HEADER_BYTES + ciphertext.length);
  out.set(MAGIC, 0);
  out[MAGIC.length] = HASH_CODE[hash];
  new DataView(out.buffer).setUint32(MAGIC.length + 1, iterations, false);
  out.set(salt, MAGIC.length + 5);
  out.set(iv, MAGIC.length + 5 + SALT_BYTES);
  out.set(ciphertext, HEADER_BYTES);
  return out;
}

export interface OpenedBox {
  plaintext: Uint8Array;
  iterations: number;
  hash: KdfHash;
}

export async function open(box: Uint8Array, password: string): Promise<OpenedBox> {
  if (!password) throw new ToolError("Enter the password this was encrypted with.");
  if (box.length < HEADER_BYTES + 16) {
    throw new ToolError("That is too short to be an encrypted file — the header alone is 41 bytes.");
  }
  for (const [index, byte] of MAGIC.entries()) {
    if (box[index] !== byte) {
      throw new ToolError(
        "This wasn't produced by this tool. It expects a file starting with the marker MSRXENC1; other tools use their own formats and are not interchangeable.",
      );
    }
  }

  const hash = HASH_BY_CODE[box[MAGIC.length]];
  if (!hash) throw new ToolError("This file names a key-derivation hash this version doesn't know.");

  const view = new DataView(box.buffer, box.byteOffset, box.byteLength);
  const iterations = view.getUint32(MAGIC.length + 1, false);
  const salt = box.subarray(MAGIC.length + 5, MAGIC.length + 5 + SALT_BYTES);
  const iv = box.subarray(MAGIC.length + 5 + SALT_BYTES, HEADER_BYTES);
  const ciphertext = box.subarray(HEADER_BYTES);

  const key = await deriveKey(password, salt, iterations, hash);
  try {
    const plaintext = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ciphertext as BufferSource),
    );
    return { plaintext, iterations, hash };
  } catch {
    // GCM cannot tell a wrong password from a damaged file: both fail the
    // authentication tag. Saying so is more useful than guessing.
    throw new ToolError(
      "That didn't decrypt. Either the password is wrong or the file has been altered since it was encrypted — AES-GCM cannot tell those apart, which is the point of it.",
    );
  }
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  const cleaned = text.replace(/[\s\n\r]/g, "").replace(/-/g, "+").replace(/_/g, "/");
  try {
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    throw new ToolError("That isn't valid Base64 — check nothing was lost when it was copied.");
  }
}
