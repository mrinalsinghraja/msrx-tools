import { bool, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Base64, URL and HTML-entity encoding, plus JWT inspection.
 *
 * Everything routes through TextEncoder/TextDecoder rather than btoa/atob on raw
 * strings — btoa throws on any character above U+00FF, which means it fails on
 * the first accent or emoji a user pastes in.
 */

const STANDARD_TO_URL: Record<string, string> = { "+": "-", "/": "_" };
const URL_TO_STANDARD: Record<string, string> = { "-": "+", _: "/" };

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000; // avoid blowing the argument limit on large inputs
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function encodeBase64(text: string, opts: { urlSafe?: boolean; padding?: boolean } = {}): string {
  let b64 = bytesToBase64(new TextEncoder().encode(text));
  if (opts.urlSafe) b64 = b64.replace(/[+/]/g, (c) => STANDARD_TO_URL[c]);
  if (opts.padding === false) b64 = b64.replace(/=+$/, "");
  return b64;
}

export function decodeBase64(b64: string, opts: { urlSafe?: boolean } = {}): string {
  let normalised = b64.replace(/\s+/g, "");
  if (opts.urlSafe !== false) normalised = normalised.replace(/[-_]/g, (c) => URL_TO_STANDARD[c]);
  // atob is strict about padding; Base64 found in the wild often isn't.
  const remainder = normalised.length % 4;
  if (remainder === 1) throw new ToolError("That isn't valid Base64 — its length can't be decoded.");
  if (remainder > 0) normalised += "=".repeat(4 - remainder);

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(normalised);
  } catch {
    throw new ToolError("That isn't valid Base64. Check for stray characters outside A–Z, a–z, 0–9, + and /.");
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export const base64Encode: PureOp = (input, options): OpResult => {
  if (!input) return { output: "" };
  let out = encodeBase64(input, {
    urlSafe: bool(options, "urlSafe"),
    padding: bool(options, "padding", true),
  });
  if (bool(options, "wrap")) out = out.replace(/(.{76})/g, "$1\n");

  const inBytes = new TextEncoder().encode(input).length;
  return {
    output: out,
    stats: [
      { label: "Input", value: `${inBytes} bytes` },
      { label: "Output", value: `${out.replace(/\n/g, "").length} characters` },
      { label: "Overhead", value: `+${Math.round((out.replace(/\n/g, "").length / inBytes - 1) * 100)}%` },
    ],
  };
};

export const base64Decode: PureOp = (input, options): OpResult => {
  if (!input.trim()) return { output: "" };
  const out = decodeBase64(input, { urlSafe: bool(options, "urlSafe", true) });
  return {
    output: out,
    stats: [
      { label: "Decoded", value: `${new TextEncoder().encode(out).length} bytes` },
      { label: "Characters", value: String(out.length) },
    ],
    note: /�/.test(out)
      ? "The result contains replacement characters, which usually means the input was binary rather than text."
      : undefined,
  };
};

export const urlEncode: PureOp = (input, options): OpResult => {
  const mode = str(options, "mode", "component");
  let out: string;
  if (mode === "uri") out = encodeURI(input);
  else if (mode === "form") out = encodeURIComponent(input).replace(/%20/g, "+");
  else out = encodeURIComponent(input);
  return { output: out, stats: [{ label: "Length", value: `${input.length} → ${out.length}` }] };
};

export const urlDecode: PureOp = (input, options): OpResult => {
  const prepared = bool(options, "plusAsSpace", true) ? input.replace(/\+/g, " ") : input;
  try {
    return { output: decodeURIComponent(prepared) };
  } catch {
    throw new ToolError(
      "That text has a broken percent-escape in it — a % that isn't followed by two hex digits.",
    );
  }
};

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const htmlEncode: PureOp = (input, options): OpResult => {
  let out = input.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
  if (bool(options, "nonAscii")) {
    // Iterate by code point so astral characters (emoji) become one entity, not two.
    out = Array.from(out)
      .map((ch) => {
        const cp = ch.codePointAt(0) ?? 0;
        return cp > 127 ? `&#${cp};` : ch;
      })
      .join("");
  }
  return { output: out };
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  deg: "°",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  sect: "§",
  para: "¶",
  middot: "·",
  bull: "•",
  dagger: "†",
  laquo: "«",
  raquo: "»",
  times: "×",
  divide: "÷",
  plusmn: "±",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
};

export const htmlDecode: PureOp = (input): OpResult => {
  const out = input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    return NAMED_ENTITIES[body] ?? whole;
  });
  return { output: out };
};

function decodeJwtSegment(segment: string, which: string): unknown {
  let json: string;
  try {
    json = decodeBase64(segment, { urlSafe: true });
  } catch {
    throw new ToolError(`The ${which} isn't valid Base64URL, so this isn't a well-formed JWT.`);
  }
  try {
    return JSON.parse(json);
  } catch {
    throw new ToolError(`The ${which} decoded, but it isn't JSON. This may not be a JWT.`);
  }
}

const CLAIM_NOTES: Record<string, string> = {
  iss: "issuer",
  sub: "subject",
  aud: "audience",
  exp: "expires at",
  nbf: "not valid before",
  iat: "issued at",
  jti: "token id",
};

export const jwtDecode: PureOp = (input, options): OpResult => {
  const token = input.trim().replace(/^Bearer\s+/i, "");
  if (!token) return { output: "" };

  const parts = token.split(".");
  if (parts.length < 2) {
    throw new ToolError("A JWT has at least two dot-separated parts. This has one.");
  }

  const header = decodeJwtSegment(parts[0], "header");
  const payload = decodeJwtSegment(parts[1], "payload") as Record<string, unknown>;
  const humanDates = bool(options, "humanDates", true);

  const lines: string[] = [
    "// Header",
    JSON.stringify(header, null, 2),
    "",
    "// Payload",
    JSON.stringify(payload, null, 2),
  ];

  const stats: { label: string; value: string }[] = [];
  const alg = (header as Record<string, unknown>)?.alg;
  if (typeof alg === "string") stats.push({ label: "Algorithm", value: alg });

  if (humanDates && payload && typeof payload === "object") {
    const timeClaims = ["exp", "nbf", "iat"] as const;
    const readable = timeClaims
      .filter((c) => typeof payload[c] === "number")
      .map((c) => `${c} (${CLAIM_NOTES[c]}): ${new Date((payload[c] as number) * 1000).toISOString()}`);
    if (readable.length) lines.push("", "// Times", ...readable);

    if (typeof payload.exp === "number") {
      const expired = payload.exp * 1000 < Date.now();
      stats.push({ label: "Status", value: expired ? "Expired" : "Not expired" });
    }
  }

  return {
    output: lines.join("\n"),
    format: "code",
    stats,
    note:
      parts.length === 3 && parts[2]
        ? "The signature is shown but not verified — verifying it needs the issuer's secret or public key, which this page never asks for."
        : "This token has no signature, so nothing vouches for its contents.",
  };
};

export const queryParse: PureOp = (input, options): OpResult => {
  const raw = input.trim();
  if (!raw) return { output: "" };

  const queryPart = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : raw;
  const [beforeHash, hash] = queryPart.split("#");
  const decode = bool(options, "decode", true);

  const pairs: [string, string][] = [];
  for (const chunk of beforeHash.split("&")) {
    if (!chunk) continue;
    const eq = chunk.indexOf("=");
    const rawKey = eq === -1 ? chunk : chunk.slice(0, eq);
    const rawValue = eq === -1 ? "" : chunk.slice(eq + 1);
    const soften = (s: string) => {
      if (!decode) return s;
      try {
        return decodeURIComponent(s.replace(/\+/g, " "));
      } catch {
        return s;
      }
    };
    pairs.push([soften(rawKey), soften(rawValue)]);
  }

  const stats = [{ label: "Parameters", value: String(pairs.length) }];
  if (hash) stats.push({ label: "Fragment", value: `#${hash}` });

  if (str(options, "output", "table") === "json") {
    const obj: Record<string, string | string[]> = {};
    for (const [k, v] of pairs) {
      const existing = obj[k];
      if (existing === undefined) obj[k] = v;
      else if (Array.isArray(existing)) existing.push(v);
      else obj[k] = [existing, v];
    }
    return { output: JSON.stringify(obj, null, 2), format: "json", stats };
  }

  const width = Math.max(0, ...pairs.map(([k]) => k.length));
  return {
    output: pairs.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join("\n"),
    stats,
  };
};
