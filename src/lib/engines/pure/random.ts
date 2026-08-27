import { bool, num, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Generators. Everything draws from `crypto.getRandomValues` rather than
 * Math.random — a password generator that uses a predictable PRNG is worse than
 * useless, because it looks fine.
 */

/**
 * Uniform index into an alphabet, without modulo bias. Values that fall in the
 * ragged tail above the largest whole multiple of the alphabet size are thrown
 * away and redrawn.
 */
function randomIndex(limit: number): number {
  if (limit <= 0) throw new ToolError("Pick at least one character set.");
  const ceiling = Math.floor(0xffffffff / limit) * limit;
  const buffer = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= ceiling);
  return value % limit;
}

function pick(alphabet: string): string {
  return alphabet[randomIndex(alphabet.length)];
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* UUID                                                                 */
/* ------------------------------------------------------------------ */

function uuidV4(): string {
  // crypto.randomUUID is v4 and is available everywhere this site runs.
  return crypto.randomUUID();
}

let lastV7Millis = -1;
let v7Counter = 0;

/**
 * UUID v7: 48-bit big-endian Unix milliseconds, then version and variant bits,
 * then random. The point is that string sorting matches creation order, which
 * makes them far better than v4 as database keys.
 *
 * The 12 bits after the version nibble hold a monotonic counter (RFC 9562's
 * "method 1"). Without it, a batch generated inside the same millisecond shares
 * a timestamp and orders by its random tail — which is to say, not at all, and
 * the one property v7 exists to provide would be silently missing.
 */
function uuidV7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const now = Date.now();
  if (now === lastV7Millis) {
    v7Counter = (v7Counter + 1) & 0x0fff;
  } else {
    lastV7Millis = now;
    // Seed below the halfway mark so a busy millisecond has room to count up
    // without wrapping back past an id it has already issued.
    v7Counter = ((bytes[6] << 8) | bytes[7]) & 0x07ff;
  }

  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;

  bytes[6] = 0x70 | ((v7Counter >> 8) & 0x0f); // version 7 + counter high nibble
  bytes[7] = v7Counter & 0xff; // counter low byte
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 9562 variant

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const uuidGenerate: PureOp = (_input, options): OpResult => {
  const version = str(options, "version", "v4");
  const count = Math.min(1000, Math.max(1, num(options, "count", 10)));

  const ids = Array.from({ length: count }, () => {
    if (version === "nil") return "00000000-0000-0000-0000-000000000000";
    return version === "v7" ? uuidV7() : uuidV4();
  }).map((id) => {
    let out = id;
    if (!bool(options, "hyphens", true)) out = out.replace(/-/g, "");
    if (bool(options, "uppercase")) out = out.toUpperCase();
    if (bool(options, "braces")) out = `{${out}}`;
    return out;
  });

  return {
    output: ids.join("\n"),
    format: "code",
    stats: [
      { label: "Generated", value: String(count) },
      { label: "Version", value: version === "nil" ? "Nil" : version },
    ],
    note:
      version === "v7"
        ? "v7 embeds the creation time, so these sort chronologically as plain strings — handy as primary keys, but it does reveal when the row was made."
        : undefined,
  };
};

/* ------------------------------------------------------------------ */
/* Passwords                                                            */
/* ------------------------------------------------------------------ */

const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/~",
};

const AMBIGUOUS = /[0O1lI|`'"]/g;

export const passwordGenerate: PureOp = (_input, options): OpResult => {
  const length = Math.min(128, Math.max(6, num(options, "length", 20)));
  const count = Math.min(100, Math.max(1, num(options, "count", 5)));
  const excludeAmbiguous = bool(options, "excludeAmbiguous");

  const chosen: string[] = [];
  for (const key of ["lower", "upper", "digits", "symbols"] as const) {
    if (bool(options, key, true)) {
      const set = excludeAmbiguous ? SETS[key].replace(AMBIGUOUS, "") : SETS[key];
      if (set) chosen.push(set);
    }
  }

  if (chosen.length === 0) {
    throw new ToolError("Turn on at least one character set — a password needs something to draw from.");
  }

  const pool = chosen.join("");
  const passwords = Array.from({ length: count }, () => {
    // Guarantee one character from every enabled set, then fill and shuffle, so
    // "must contain a digit" rules are satisfied without weakening randomness.
    const required = chosen.map((set) => pick(set));
    const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pick(pool));
    return shuffle([...required, ...rest]).join("").slice(0, length);
  });

  const entropy = length * Math.log2(pool.length);
  return {
    output: passwords.join("\n"),
    format: "code",
    stats: [
      { label: "Length", value: `${length} characters` },
      { label: "Pool", value: `${pool.length} characters` },
      { label: "Entropy", value: `${entropy.toFixed(0)} bits each` },
    ],
    note: "Generated with your browser's cryptographic random source. Nothing is logged, stored or sent.",
  };
};

const ALPHABETS: Record<string, string> = {
  alnum: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  hex: "0123456789abcdef",
  base58: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
};

export const randomString: PureOp = (_input, options): OpResult => {
  const length = Math.min(256, Math.max(1, num(options, "length", 32)));
  const count = Math.min(200, Math.max(1, num(options, "count", 5)));
  const which = str(options, "alphabet", "alnum");
  const alphabet = which === "custom" ? Array.from(new Set(str(options, "custom"))).join("") : ALPHABETS[which];

  if (!alphabet) throw new ToolError("That alphabet is empty — enter the characters to draw from.");

  const prefix = str(options, "prefix");
  const strings = Array.from({ length: count }, () => {
    const body = Array.from({ length }, () => pick(alphabet)).join("");
    return prefix + body;
  });

  return {
    output: strings.join("\n"),
    format: "code",
    stats: [
      { label: "Generated", value: String(count) },
      { label: "Entropy", value: `${(length * Math.log2(alphabet.length)).toFixed(0)} bits each` },
    ],
  };
};
