import {
  DEFAULT_ITERATIONS,
  fromBase64,
  open,
  seal,
  toBase64,
  type KdfHash,
} from "../crypto-box";
import { bool, num, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Client-side cryptography.
 *
 * Everything here runs on WebCrypto, in this tab, with no network call at any
 * point — which is the only reason a page has any business asking for a
 * password, a private key or a 2FA seed. Each tool says so in its own note,
 * because a person pasting a secret into a web page deserves to be told exactly
 * where it goes.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Control codes that never appear in text a person typed, so their presence
 * means the bytes are not text at all. Written as a scan rather than a regex
 * because the character class would be a row of invisible characters in the
 * source, which is exactly the kind of thing this site has a tool for.
 */
function looksBinary(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 9 || (code > 13 && code < 32)) return true;
  }
  return false;
}

function readKdf(options: Parameters<PureOp>[1]) {
  return {
    iterations: Math.max(100_000, num(options, "iterations", DEFAULT_ITERATIONS)),
    hash: str(options, "kdfHash", "SHA-256") as KdfHash,
  };
}

/* ------------------------------------------------------------------ */
/* Text encryption                                                      */
/* ------------------------------------------------------------------ */

export const encryptText: PureOp = async (input, options): Promise<OpResult> => {
  if (!input.trim()) return { output: "" };

  const password = str(options, "password");
  if (!password) throw new ToolError("Enter a password in the options — that is what the key is derived from.");

  const wrap = bool(options, "wrap", true);
  const { iterations, hash } = readKdf(options);

  const box = await seal(encoder.encode(input), password, { iterations, hash });
  const base64 = toBase64(box);
  const output = wrap ? (base64.match(/.{1,64}/g) ?? [base64]).join("\n") : base64;

  return {
    output,
    format: "code",
    stats: [
      { label: "Cipher", value: "AES-256-GCM" },
      { label: "Key derivation", value: `PBKDF2-${hash}, ${iterations.toLocaleString()} rounds` },
      { label: "Size", value: `${box.length} bytes` },
    ],
    note: "The password, the text and the result all stayed in this tab. Keep the whole block — the salt and IV that make it decryptable are inside it, and there is no recovery if the password is lost.",
  };
};

export const decryptText: PureOp = async (input, options): Promise<OpResult> => {
  if (!input.trim()) return { output: "" };

  const password = str(options, "password");
  if (!password) throw new ToolError("Enter the password this text was encrypted with.");
  // Read so the panel's own control is never a control that does nothing; the
  // envelope carries the real settings, which is why they are shown back below.
  readKdf(options);
  const trim = bool(options, "trim", false);

  const opened = await open(fromBase64(input), password);
  const text = decoder.decode(opened.plaintext);

  return {
    output: trim ? text.trim() : text,
    format: "text",
    stats: [
      { label: "Cipher", value: "AES-256-GCM" },
      { label: "Key derivation", value: `PBKDF2-${opened.hash}, ${opened.iterations.toLocaleString()} rounds` },
      { label: "Recovered", value: `${opened.plaintext.length} bytes` },
    ],
    note: "Settings above are ignored on decryption — the iteration count and hash shown here were read out of the message itself, which is why it opens whatever they were set to when it was sealed.",
  };
};

/* ------------------------------------------------------------------ */
/* TOTP / HOTP                                                          */
/* ------------------------------------------------------------------ */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(text: string): Uint8Array {
  const cleaned = text.toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
  if (!cleaned) throw new ToolError("Enter the secret from your authenticator setup screen.");

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of cleaned) {
    const value = BASE32.indexOf(char);
    if (value === -1) {
      throw new ToolError(
        `“${char}” isn't part of a Base32 secret. Those use A–Z and 2–7 only — if yours has 0, 1, 8 or 9 in it, it is probably hex or Base64 instead.`,
      );
    }
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  if (bytes.length === 0) throw new ToolError("That secret decodes to nothing.");
  return new Uint8Array(bytes);
}

/** Pulls the secret out of an `otpauth://` URI, which is what a QR code holds. */
function readOtpauth(
  text: string,
): { secret: string; digits?: number; period?: number; algorithm?: string; label?: string } | null {
  if (!/^otpauth:\/\//i.test(text.trim())) return null;
  try {
    const url = new URL(text.trim());
    const secret = url.searchParams.get("secret");
    if (!secret) return null;
    return {
      secret,
      digits: url.searchParams.get("digits") ? Number(url.searchParams.get("digits")) : undefined,
      period: url.searchParams.get("period") ? Number(url.searchParams.get("period")) : undefined,
      algorithm: url.searchParams.get("algorithm") ?? undefined,
      label: decodeURIComponent(url.pathname.replace(/^\/+/, "")) || undefined,
    };
  } catch {
    return null;
  }
}

async function hotp(secret: Uint8Array, counter: number, digits: number, hash: string): Promise<string> {
  const buffer = new Uint8Array(8);
  const view = new DataView(buffer.buffer);
  // Counters above 2^32 need the high word; JavaScript bit ops would truncate.
  view.setUint32(0, Math.floor(counter / 2 ** 32), false);
  view.setUint32(4, counter >>> 0, false);

  const key = await crypto.subtle.importKey("raw", secret as BufferSource, { name: "HMAC", hash }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer as BufferSource));

  // RFC 4226 dynamic truncation: the low nibble of the last byte picks the
  // offset, so the same MAC always yields the same 31-bit slice.
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];

  return String(binary % 10 ** digits).padStart(digits, "0");
}

const HASH_NAMES: Record<string, string> = {
  SHA1: "SHA-1",
  SHA256: "SHA-256",
  SHA512: "SHA-512",
  "SHA-1": "SHA-1",
  "SHA-256": "SHA-256",
  "SHA-512": "SHA-512",
};

export const totpGenerate: PureOp = async (input, options): Promise<OpResult> => {
  const raw = input.trim();
  if (!raw) return { output: "" };

  const uri = readOtpauth(raw);
  const digits = Math.max(6, Math.min(10, uri?.digits ?? num(options, "digits", 6)));
  const period = Math.max(10, Math.min(300, uri?.period ?? num(options, "period", 30)));
  const hash = HASH_NAMES[uri?.algorithm ?? str(options, "algorithm", "SHA-1")] ?? "SHA-1";
  const mode = str(options, "mode", "totp");
  const counterOption = num(options, "counter", 0);
  const showNext = bool(options, "showNext", true);

  const secret = base32Decode(uri?.secret ?? raw);

  if (mode === "hotp") {
    const code = await hotp(secret, counterOption, digits, hash);
    const following = showNext ? await hotp(secret, counterOption + 1, digits, hash) : null;
    const lines = [`Counter ${counterOption}   ${code}`];
    if (following) lines.push(`Counter ${counterOption + 1}   ${following}`);
    return {
      output: lines.join("\n"),
      format: "code",
      stats: [
        { label: "Code", value: code },
        { label: "Counter", value: String(counterOption) },
        { label: "Algorithm", value: `HOTP-${hash}` },
      ],
      note: "HOTP codes advance only when used. Generating one here does not move your provider's counter, so a code you view and discard can put the two out of step.",
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / period);
  const remaining = period - (now % period);

  const code = await hotp(secret, counter, digits, hash);
  const previous = await hotp(secret, counter - 1, digits, hash);
  const following = showNext ? await hotp(secret, counter + 1, digits, hash) : null;

  const filled = Math.round(((period - remaining) / period) * 20);
  const dial = `${"#".repeat(filled)}${".".repeat(20 - filled)}`;

  const lines = [`Now        ${code}`, `           ${dial}  ${remaining}s left`, "", `Previous   ${previous}`];
  if (following) lines.push(`Next       ${following}`);
  if (uri?.label) lines.push("", `Account    ${uri.label}`);

  return {
    output: lines.join("\n"),
    format: "code",
    stats: [
      { label: "Code", value: code },
      { label: "Valid for", value: `${remaining}s` },
      { label: "Algorithm", value: `TOTP-${hash}, ${digits} digits, ${period}s` },
    ],
    note: "Codes are computed from your device clock. If they are rejected but the seed is right, the clock is off — TOTP has no tolerance for more than a step or two of drift.",
  };
};

/* ------------------------------------------------------------------ */
/* Shamir's Secret Sharing over GF(256)                                 */
/* ------------------------------------------------------------------ */

/**
 * Exp and log tables for GF(2^8) with the AES polynomial 0x11b, generator 3.
 *
 * Multiplication in the field becomes an addition of logarithms, which keeps
 * the split and combine loops to a few operations per byte.
 */
const { EXP, LOG } = (() => {
  const exp = new Uint8Array(512);
  const log = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    // Multiply by the generator 3, i.e. x + 1, reducing mod 0x11b.
    x ^= (x << 1) ^ (x & 0x80 ? 0x11b : 0);
    x &= 0xff;
  }
  for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
  return { EXP: exp, LOG: log };
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new ToolError("Two shares carry the same index, so they cannot be combined.");
  if (a === 0) return 0;
  return EXP[LOG[a] + 255 - LOG[b]];
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const shamirSplit: PureOp = (input, options): OpResult => {
  const secret = input.replace(/\n+$/, "");
  if (!secret) return { output: "" };

  const shares = Math.max(2, Math.min(255, num(options, "shares", 5)));
  const wanted = num(options, "threshold", 3);
  const label = str(options, "label").trim();

  if (wanted > shares) {
    throw new ToolError(
      `You asked for ${shares} shares but a threshold of ${wanted}. The secret would be unrecoverable — lower the threshold.`,
    );
  }
  const threshold = Math.max(2, Math.min(shares, wanted));

  const bytes = encoder.encode(secret);
  const output: string[][] = Array.from({ length: shares }, () => []);

  for (const byte of bytes) {
    // A random polynomial of degree threshold-1 whose constant term is the byte.
    // Any `threshold` points determine it; any fewer leave every value equally
    // likely, which is what makes the scheme information-theoretically secure.
    const coefficients = crypto.getRandomValues(new Uint8Array(threshold - 1));
    for (let index = 1; index <= shares; index++) {
      let value = byte;
      let power = 1;
      for (const coefficient of coefficients) {
        power = gfMul(power, index);
        value ^= gfMul(coefficient, power);
      }
      output[index - 1].push(value.toString(16).padStart(2, "0"));
    }
  }

  const lines = output.map((parts, i) => {
    const body = `${(i + 1).toString(16).padStart(2, "0")}-${parts.join("")}`;
    return label ? `${label}-${i + 1}: ${body}` : body;
  });

  return {
    output: lines.join("\n"),
    format: "code",
    stats: [
      { label: "Shares", value: String(shares) },
      { label: "Threshold", value: `${threshold} of ${shares}` },
      { label: "Secret", value: `${bytes.length} bytes` },
    ],
    note: `Give these to ${shares} different people or places. Any ${threshold} of them rebuild the secret exactly; any ${threshold - 1} reveal nothing whatsoever about it.`,
  };
};

export const shamirCombine: PureOp = (input, options): OpResult => {
  const text = input.trim();
  if (!text) return { output: "" };

  const asHex = bool(options, "asHex", false);

  const parsed: { index: number; bytes: Uint8Array }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const body = (line.includes(":") ? line.slice(line.lastIndexOf(":") + 1) : line).trim();
    const match = /^([0-9a-f]{2})-([0-9a-f]+)$/i.exec(body);
    if (!match) {
      throw new ToolError(
        `“${line.slice(0, 40)}” is not a share. Each line should look like 01-a3f2… — paste the shares one per line, exactly as they were produced.`,
      );
    }
    const index = parseInt(match[1], 16);
    if (index === 0) throw new ToolError("A share index of 00 is invalid — that position holds the secret itself.");
    const hex = match[2];
    if (hex.length % 2 !== 0) throw new ToolError("One share has an odd number of hex characters, so it is incomplete.");
    parsed.push({
      index,
      bytes: new Uint8Array((hex.match(/../g) ?? []).map((pair) => parseInt(pair, 16))),
    });
  }

  if (parsed.length < 2) throw new ToolError("Combining needs at least two shares. Paste one per line.");

  const length = parsed[0].bytes.length;
  if (parsed.some((share) => share.bytes.length !== length)) {
    throw new ToolError("The shares are different lengths, so they did not come from the same secret.");
  }
  if (new Set(parsed.map((share) => share.index)).size !== parsed.length) {
    throw new ToolError("Two of those shares have the same index. Every share in a set must be a different one.");
  }

  const recovered = new Uint8Array(length);
  for (let position = 0; position < length; position++) {
    // Lagrange interpolation at x = 0, which is where the secret sits.
    let total = 0;
    for (const [i, share] of parsed.entries()) {
      let numerator = 1;
      let denominator = 1;
      for (const [j, other] of parsed.entries()) {
        if (i === j) continue;
        numerator = gfMul(numerator, other.index);
        denominator = gfMul(denominator, share.index ^ other.index);
      }
      total ^= gfMul(share.bytes[position], gfDiv(numerator, denominator));
    }
    recovered[position] = total;
  }

  const asText = decoder.decode(recovered);
  const readable = !looksBinary(asText);

  return {
    output: asHex || !readable ? toHex(recovered) : asText,
    format: asHex || !readable ? "code" : "text",
    stats: [
      { label: "Shares used", value: String(parsed.length) },
      { label: "Recovered", value: `${length} bytes` },
    ],
    note: readable
      ? "If fewer than the original threshold were supplied, this output is wrong rather than empty — the scheme cannot tell you that you are short a share. Check the result reads as you expect."
      : "The result isn't printable text, so it is shown as hex. That usually means too few shares were supplied, or one of them was mistyped.",
  };
};

/* ------------------------------------------------------------------ */
/* RSA keys and signatures                                              */
/* ------------------------------------------------------------------ */

function toPem(label: string, bytes: Uint8Array): string {
  const body = (toBase64(bytes).match(/.{1,64}/g) ?? []).join("\n");
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
}

function fromPem(text: string, expected: string[]): Uint8Array {
  const match = /-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/.exec(text.trim());
  if (!match) {
    throw new ToolError(
      "That key isn't in PEM form. It should start with a -----BEGIN … KEY----- line and end with the matching -----END line.",
    );
  }
  if (!expected.includes(match[1])) {
    throw new ToolError(
      `That is a ${match[1].toLowerCase()}, but this step needs ${expected.map((e) => e.toLowerCase()).join(" or ")}.`,
    );
  }
  return fromBase64(match[2]);
}

export const rsaKeypair: PureOp = async (_input, options): Promise<OpResult> => {
  const bits = num(options, "bits", 2048);
  const purpose = str(options, "purpose", "sign");
  const hash = str(options, "hash", "SHA-256");

  if (![2048, 3072, 4096].includes(bits)) {
    throw new ToolError("Choose 2048, 3072 or 4096 bits. Anything smaller is no longer considered safe.");
  }

  const algorithm = {
    name: purpose === "encrypt" ? "RSA-OAEP" : "RSASSA-PKCS1-v1_5",
    modulusLength: bits,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash,
  };
  const usages: KeyUsage[] = purpose === "encrypt" ? ["encrypt", "decrypt"] : ["sign", "verify"];
  const pair = (await crypto.subtle.generateKey(algorithm, true, usages)) as CryptoKeyPair;

  const publicKey = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const privateKey = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));

  return {
    output: [toPem("PUBLIC KEY", publicKey), "", toPem("PRIVATE KEY", privateKey)].join("\n"),
    format: "code",
    stats: [
      { label: "Algorithm", value: algorithm.name },
      { label: "Modulus", value: `${bits} bits` },
      { label: "Hash", value: hash },
    ],
    note: "This pair was generated in your browser and exists nowhere else. Copy the private key somewhere safe before you close the tab — it cannot be regenerated, and reloading this page produces a different pair.",
  };
};

export const rsaSign: PureOp = async (input, options): Promise<OpResult> => {
  if (!input.trim()) return { output: "" };

  const mode = str(options, "mode", "sign");
  const pem = str(options, "key").trim();
  const hash = str(options, "hash", "SHA-256");
  const signature = str(options, "signature").trim();

  if (!pem) {
    throw new ToolError(
      mode === "sign"
        ? "Paste your private key into the options. Generate a pair first if you don't have one."
        : "Paste the signer's public key into the options.",
    );
  }

  const bytes = encoder.encode(input);

  if (mode === "sign") {
    const key = await crypto.subtle.importKey(
      "pkcs8",
      fromPem(pem, ["PRIVATE KEY", "RSA PRIVATE KEY"]) as BufferSource,
      { name: "RSASSA-PKCS1-v1_5", hash },
      false,
      ["sign"],
    );
    const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, bytes as BufferSource));
    const base64 = toBase64(sig);

    return {
      output: (base64.match(/.{1,64}/g) ?? [base64]).join("\n"),
      format: "code",
      stats: [
        { label: "Signature", value: `${sig.length} bytes` },
        { label: "Hash", value: hash },
      ],
      note: "Send this signature alongside the exact message you signed. A single changed character — including a trailing newline — makes it fail to verify.",
    };
  }

  if (!signature) throw new ToolError("Paste the signature you want checked into the options.");

  const key = await crypto.subtle.importKey(
    "spki",
    fromPem(pem, ["PUBLIC KEY", "RSA PUBLIC KEY"]) as BufferSource,
    { name: "RSASSA-PKCS1-v1_5", hash },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    fromBase64(signature) as BufferSource,
    bytes as BufferSource,
  );

  return {
    output: valid
      ? "Signature is valid.\n\nThis message matches the signature, and the signature was made by the private key belonging to the public key you supplied."
      : "Signature does not match.\n\nEither the message was altered, the signature belongs to different text, the hash is not the one used to sign, or the key is not the right one.",
    format: "text",
    stats: [
      { label: "Result", value: valid ? "Valid" : "Not valid" },
      { label: "Hash", value: hash },
    ],
    note: "A valid signature proves the holder of the private key signed this exact text. It says nothing about who that holder is — that is what a certificate or a published key fingerprint is for.",
  };
};
