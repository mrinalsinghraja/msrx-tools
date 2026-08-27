import { bool, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Hashing, HMAC and password strength.
 *
 * SHA family comes from WebCrypto. MD5 is implemented here because WebCrypto
 * deliberately omits it — it is broken for security, but people still need it to
 * check a download against a vendor's published digest. CRC32 is the standard
 * IEEE polynomial, table-driven.
 */

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array, uppercase = false): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return uppercase ? hex.toUpperCase() : hex;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/* ------------------------------------------------------------------ */
/* MD5 — RFC 1321                                                       */
/* ------------------------------------------------------------------ */

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));

function rotl(x: number, c: number): number {
  return (x << c) | (x >>> (32 - c));
}

export function md5(bytes: Uint8Array): Uint8Array {
  const bitLength = bytes.length * 8;
  // Pad to 56 mod 64, then append the 64-bit little-endian length.
  const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLength >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLength / 2 ** 32), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    const m = new Uint32Array(16);
    for (let i = 0; i < 16; i++) m[i] = view.getUint32(chunk + i * 4, true);

    let [a, b, c, d] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const temp = d;
      d = c;
      c = b;
      b = (b + rotl((a + f + MD5_K[i] + m[g]) >>> 0, MD5_S[i])) >>> 0;
      a = temp;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return out;
}

/* ------------------------------------------------------------------ */
/* CRC32 — IEEE 802.3 polynomial                                        */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ */
/* Public hashing API                                                   */
/* ------------------------------------------------------------------ */

export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512" | "MD5" | "CRC32";

export async function hashBytes(algorithm: HashAlgorithm, bytes: Uint8Array): Promise<Uint8Array> {
  if (algorithm === "MD5") return md5(bytes);
  if (algorithm === "CRC32") {
    const value = crc32(bytes);
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value >>> 0, false);
    return out;
  }
  const digest = await crypto.subtle.digest(algorithm, bytes as BufferSource);
  return new Uint8Array(digest);
}

const ALL_ALGORITHMS: HashAlgorithm[] = ["SHA-256", "SHA-384", "SHA-512", "SHA-1", "MD5", "CRC32"];

export const hashText: PureOp = async (input, options): Promise<OpResult> => {
  const bytes = encoder.encode(input);
  const encoding = str(options, "encoding", "hex");
  const uppercase = bool(options, "uppercase");
  const selected = str(options, "algorithm", "all");
  const list = selected === "all" ? ALL_ALGORITHMS : [selected as HashAlgorithm];

  const rendered = await Promise.all(
    list.map(async (algorithm) => {
      const digest = await hashBytes(algorithm, bytes);
      const value = encoding === "base64" ? toBase64(digest) : toHex(digest, uppercase);
      return { algorithm, value };
    }),
  );

  const width = Math.max(...rendered.map((r) => r.algorithm.length));
  const output =
    list.length === 1
      ? rendered[0].value
      : rendered.map((r) => `${r.algorithm.padEnd(width)}  ${r.value}`).join("\n");

  return {
    output,
    format: "code",
    stats: [{ label: "Input", value: `${bytes.length} bytes` }],
    note: list.some((a) => a === "MD5" || a === "SHA-1")
      ? "MD5 and SHA-1 are shown for compatibility with existing checksums. Neither is safe for passwords or signatures — use SHA-256 or better."
      : undefined,
  };
};

export const hmacText: PureOp = async (input, options): Promise<OpResult> => {
  const secret = str(options, "key");
  if (!secret) throw new ToolError("An HMAC needs a secret key — enter one in the options.");

  const algorithm = str(options, "algorithm", "SHA-256");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret) as BufferSource,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(input) as BufferSource),
  );

  return {
    output: str(options, "encoding", "hex") === "base64" ? toBase64(signature) : toHex(signature),
    format: "code",
    stats: [
      { label: "Algorithm", value: `HMAC-${algorithm}` },
      { label: "Length", value: `${signature.length * 8} bits` },
    ],
    note: "The key you typed stays in this tab. Nothing here is sent anywhere.",
  };
};

/* ------------------------------------------------------------------ */
/* Password strength                                                    */
/* ------------------------------------------------------------------ */

/** Passwords so common that any real attack tries them in the first second. */
const COMMON = new Set([
  "password", "123456", "123456789", "qwerty", "12345678", "111111", "1234567890", "1234567",
  "password1", "abc123", "iloveyou", "admin", "welcome", "monkey", "letmein", "dragon", "sunshine",
  "princess", "football", "charlie", "aa123456", "donald", "qwerty123", "passw0rd", "starwars",
]);

function poolSize(password: string): number {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^A-Za-z0-9]/.test(password)) pool += 33;
  return pool || 1;
}

function humanDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "longer than the universe has existed";
  if (seconds < 1) return "instantly";
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [365, "day"],
    [100, "year"],
    [Infinity, "century"],
  ];
  let value = seconds;
  for (const [factor, name] of units) {
    if (value < factor) {
      const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
      return `${rounded.toLocaleString()} ${name}${rounded === 1 ? "" : "s"}`;
    }
    value /= factor;
  }
  return "effectively forever";
}

export const passwordStrength: PureOp = (input, options): OpResult => {
  const password = input.replace(/\n+$/, "");
  if (!password) return { output: "" };

  const pool = poolSize(password);
  const rawEntropy = password.length * Math.log2(pool);

  const lower = password.toLowerCase();
  const penalties: string[] = [];
  let entropy = rawEntropy;

  if (COMMON.has(lower)) {
    entropy = Math.min(entropy, 8);
    penalties.push("This is one of the most-guessed passwords in existence.");
  }
  const uniqueRatio = new Set(password).size / password.length;
  if (uniqueRatio < 0.5) {
    entropy *= 0.7;
    penalties.push("Characters repeat a lot, which shrinks the real search space.");
  }
  if (/^[a-z]+$/.test(password) || /^[0-9]+$/.test(password)) {
    entropy *= 0.8;
    penalties.push("A single character class — mixing in another widens the pool considerably.");
  }
  if (/(.)\1{2,}/.test(password)) {
    entropy *= 0.85;
    penalties.push("It contains a run of the same character.");
  }
  if (/(?:abc|123|qwe|asd|zxc|987)/i.test(password)) {
    entropy *= 0.85;
    penalties.push("It contains a keyboard or counting sequence.");
  }

  const guessesPerSecond = Number(str(options, "attacker", "1e10"));
  const seconds = 2 ** (entropy - 1) / guessesPerSecond;

  const verdict =
    entropy < 28 ? "Very weak" : entropy < 40 ? "Weak" : entropy < 60 ? "Reasonable" : entropy < 80 ? "Strong" : "Very strong";

  const lines = [
    `Verdict          ${verdict}`,
    `Entropy          ${entropy.toFixed(1)} bits`,
    `Length           ${password.length} characters`,
    `Character pool   ${pool} possible characters`,
    `Time to crack    ${humanDuration(seconds)}`,
  ];
  if (penalties.length) lines.push("", "What weakens it", ...penalties.map((p) => `  • ${p}`));

  return {
    output: lines.join("\n"),
    stats: [
      { label: "Verdict", value: verdict },
      { label: "Entropy", value: `${entropy.toFixed(0)} bits` },
      { label: "Cracked in", value: humanDuration(seconds) },
    ],
    note: "The password you typed never leaves this tab — this page has no server to send it to.",
  };
};
