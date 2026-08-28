import { bool, num, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Inspection and sanitising: what is really in this string, what is really in
 * this SVG, and what has to come out of this log before it can be shared.
 */

/* ------------------------------------------------------------------ */
/* Unicode inspector                                                    */
/* ------------------------------------------------------------------ */

/**
 * Characters that render as nothing, or as something other than themselves.
 *
 * There is no Unicode name database here on purpose — UnicodeData.txt is over a
 * megabyte and this site refuses to ship a megabyte to name a character. What
 * matters in practice is the short list below: the codepoints that get pasted
 * in by accident and then break a comparison, a filename or a password field.
 */
const NOTORIOUS: Record<number, string> = {
  0x00a0: "No-break space — looks like a space, is not one",
  0x00ad: "Soft hyphen — invisible until the line wraps",
  0x200b: "Zero-width space — invisible",
  0x200c: "Zero-width non-joiner — invisible",
  0x200d: "Zero-width joiner — invisible, glues emoji together",
  0x200e: "Left-to-right mark — invisible",
  0x200f: "Right-to-left mark — invisible",
  0x2028: "Line separator — breaks JSON parsers",
  0x2029: "Paragraph separator — breaks JSON parsers",
  0x202a: "Left-to-right embedding — bidi control",
  0x202b: "Right-to-left embedding — bidi control",
  0x202c: "Pop directional formatting — bidi control",
  0x202d: "Left-to-right override — bidi control, used in filename spoofing",
  0x202e: "Right-to-left override — bidi control, used in filename spoofing",
  0x2060: "Word joiner — invisible",
  0xfeff: "Byte-order mark — invisible, a classic first-character bug",
  0x2013: "En dash — not a hyphen",
  0x2014: "Em dash — not a hyphen",
  0x2018: "Left single quote — not an apostrophe",
  0x2019: "Right single quote — not an apostrophe",
  0x201c: "Left double quote — not a straight quote",
  0x201d: "Right double quote — not a straight quote",
  0x00b4: "Acute accent — not an apostrophe",
  0x0430: "Cyrillic small a — looks identical to Latin a",
  0x0435: "Cyrillic small ie — looks identical to Latin e",
  0x043e: "Cyrillic small o — looks identical to Latin o",
  0x0440: "Cyrillic small er — looks identical to Latin p",
  0x0441: "Cyrillic small es — looks identical to Latin c",
};

const BLOCKS: [number, number, string][] = [
  [0x0000, 0x007f, "Basic Latin"],
  [0x0080, 0x00ff, "Latin-1 Supplement"],
  [0x0100, 0x017f, "Latin Extended-A"],
  [0x0180, 0x024f, "Latin Extended-B"],
  [0x0370, 0x03ff, "Greek"],
  [0x0400, 0x04ff, "Cyrillic"],
  [0x0590, 0x05ff, "Hebrew"],
  [0x0600, 0x06ff, "Arabic"],
  [0x0900, 0x097f, "Devanagari"],
  [0x0980, 0x09ff, "Bengali"],
  [0x0a80, 0x0aff, "Gujarati"],
  [0x0b80, 0x0bff, "Tamil"],
  [0x0c00, 0x0c7f, "Telugu"],
  [0x0c80, 0x0cff, "Kannada"],
  [0x0d00, 0x0d7f, "Malayalam"],
  [0x0e00, 0x0e7f, "Thai"],
  [0x2000, 0x206f, "General Punctuation"],
  [0x20a0, 0x20cf, "Currency Symbols"],
  [0x2190, 0x21ff, "Arrows"],
  [0x2200, 0x22ff, "Mathematical Operators"],
  [0x2500, 0x257f, "Box Drawing"],
  [0x2600, 0x26ff, "Miscellaneous Symbols"],
  [0x2700, 0x27bf, "Dingbats"],
  [0x3040, 0x309f, "Hiragana"],
  [0x30a0, 0x30ff, "Katakana"],
  [0x4e00, 0x9fff, "CJK Unified Ideographs"],
  [0xac00, 0xd7af, "Hangul Syllables"],
  [0xfe00, 0xfe0f, "Variation Selectors"],
  [0x1f300, 0x1f5ff, "Miscellaneous Symbols and Pictographs"],
  [0x1f600, 0x1f64f, "Emoticons"],
  [0x1f680, 0x1f6ff, "Transport and Map Symbols"],
  [0x1f900, 0x1f9ff, "Supplemental Symbols and Pictographs"],
];

function blockOf(codePoint: number): string {
  for (const [from, to, name] of BLOCKS) if (codePoint >= from && codePoint <= to) return name;
  if (codePoint >= 0xe000 && codePoint <= 0xf8ff) return "Private Use Area";
  return "Unassigned or uncommon block";
}

function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function printable(char: string, codePoint: number): string {
  if (codePoint === 0x0a) return "\\n";
  if (codePoint === 0x0d) return "\\r";
  if (codePoint === 0x09) return "\\t";
  if (codePoint < 0x20 || codePoint === 0x7f) return `\\x${codePoint.toString(16).padStart(2, "0")}`;
  if (NOTORIOUS[codePoint]?.includes("invisible") || codePoint === 0xfeff || codePoint === 0x200b) {
    return "␀";
  }
  return char;
}

export const unicodeInspect: PureOp = (input, options): OpResult => {
  if (!input) return { output: "" };

  const format = str(options, "format", "table");
  const byGrapheme = bool(options, "graphemes", false);
  const suspiciousOnly = bool(options, "suspiciousOnly", false);

  const units: { text: string; codePoints: number[] }[] = [];

  if (byGrapheme && typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    for (const { segment } of segmenter.segment(input)) {
      units.push({ text: segment, codePoints: [...segment].map((c) => c.codePointAt(0) ?? 0) });
    }
  } else {
    for (const char of input) units.push({ text: char, codePoints: [char.codePointAt(0) ?? 0] });
  }

  const rows = units
    .map((unit) => {
      const first = unit.codePoints[0];
      const bytes = utf8Bytes(unit.text);
      const warning = unit.codePoints.map((cp) => NOTORIOUS[cp]).find(Boolean);
      return {
        glyph: unit.codePoints.map((cp, i) => printable([...unit.text][i] ?? "", cp)).join(""),
        codes: unit.codePoints.map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`).join(" "),
        block: blockOf(first),
        bytes: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" "),
        byteCount: bytes.length,
        warning,
      };
    })
    .filter((row) => !suspiciousOnly || row.warning);

  if (rows.length === 0) {
    return {
      output: "Nothing suspicious. Every character in that text is what it appears to be.",
      stats: [
        { label: "Characters", value: String(units.length) },
        { label: "UTF-8 bytes", value: String(utf8Bytes(input).length) },
      ],
    };
  }

  const totalBytes = utf8Bytes(input).length;
  const suspicious = units.filter((unit) => unit.codePoints.some((cp) => NOTORIOUS[cp])).length;

  if (format === "json") {
    return {
      output: JSON.stringify(rows, null, 2),
      format: "json",
      stats: [
        { label: "Characters", value: String(units.length) },
        { label: "UTF-8 bytes", value: String(totalBytes) },
        { label: "Flagged", value: String(suspicious) },
      ],
    };
  }

  const widths = {
    glyph: Math.max(5, ...rows.map((r) => [...r.glyph].length)),
    codes: Math.max(4, ...rows.map((r) => r.codes.length)),
    block: Math.max(5, ...rows.map((r) => r.block.length)),
    bytes: Math.max(5, ...rows.map((r) => r.bytes.length)),
  };

  const lines = [
    `${"CHAR".padEnd(widths.glyph)}  ${"CODE".padEnd(widths.codes)}  ${"BLOCK".padEnd(widths.block)}  ${"UTF-8".padEnd(widths.bytes)}  BYTES`,
    `${"-".repeat(widths.glyph)}  ${"-".repeat(widths.codes)}  ${"-".repeat(widths.block)}  ${"-".repeat(widths.bytes)}  -----`,
  ];

  for (const row of rows) {
    lines.push(
      `${row.glyph.padEnd(widths.glyph)}  ${row.codes.padEnd(widths.codes)}  ${row.block.padEnd(widths.block)}  ${row.bytes.padEnd(widths.bytes)}  ${row.byteCount}`,
    );
    if (row.warning) lines.push(`${" ".repeat(widths.glyph)}  ⚠ ${row.warning}`);
  }

  return {
    output: lines.join("\n"),
    format: "code",
    stats: [
      { label: "Characters", value: String(units.length) },
      { label: "UTF-8 bytes", value: String(totalBytes) },
      { label: "Flagged", value: String(suspicious) },
    ],
    note:
      suspicious > 0
        ? `${suspicious} character${suspicious === 1 ? " is" : "s are"} flagged above. Invisible and look-alike characters are the usual reason a string that looks correct fails a comparison.`
        : undefined,
  };
};

/* ------------------------------------------------------------------ */
/* SVG optimiser                                                        */
/* ------------------------------------------------------------------ */

/** Editor droppings: elements that carry no rendered output. */
const JUNK_ELEMENTS = ["metadata", "title", "desc", "sodipodi:namedview", "inkscape:path-effect"];

/** Attributes that only mean something to the program that wrote the file. */
const JUNK_ATTR = /\s(?:inkscape|sodipodi|sketch|figma|adobe|illustrator|xmlns:(?:inkscape|sodipodi|dc|cc|rdf|sketch|serif))[:\w-]*="[^"]*"/gi;

function roundNumbers(text: string, precision: number): string {
  return text.replace(/-?\d*\.\d+(?:e-?\d+)?/g, (match) => {
    const value = Number(match);
    if (!Number.isFinite(value)) return match;
    const rounded = Number(value.toFixed(precision));
    // Drop the leading zero: "0.5" and ".5" are the same path command, and one
    // of them is a byte shorter on every occurrence.
    return String(rounded).replace(/^(-?)0\./, "$1.");
  });
}

export const svgOptimize: PureOp = (input, options): OpResult => {
  const source = input.trim();
  if (!source) return { output: "" };
  if (!/<svg[\s>]/i.test(source)) {
    throw new ToolError("That doesn't look like an SVG — paste the file's contents, starting at the <svg> tag.");
  }

  const precision = Math.max(0, Math.min(8, num(options, "precision", 2)));
  const dropComments = bool(options, "comments", true);
  const dropMetadata = bool(options, "metadata", true);
  const dropIds = bool(options, "ids", false);
  const minify = bool(options, "minify", true);

  let svg = source;

  if (dropComments) svg = svg.replace(/<!--[\s\S]*?-->/g, "");
  svg = svg.replace(/<\?xml[\s\S]*?\?>/g, "").replace(/<!DOCTYPE[\s\S]*?>/gi, "");

  if (dropMetadata) {
    for (const element of JUNK_ELEMENTS) {
      const escaped = element.replace(/:/g, "\\:");
      svg = svg.replace(new RegExp(`<${escaped}[\\s\\S]*?</${escaped}>`, "gi"), "");
      svg = svg.replace(new RegExp(`<${escaped}[^>]*/>`, "gi"), "");
    }
    svg = svg.replace(JUNK_ATTR, "");
  }

  if (dropIds) {
    // Only ids nothing points at. An id referenced by url(#x), href="#x" or an
    // animation target is load-bearing, and removing it silently breaks the file.
    const referenced = new Set<string>();
    for (const match of svg.matchAll(/(?:url\(#|href="#|xlink:href="#|begin=")([\w.:-]+)/g)) {
      referenced.add(match[1].split(".")[0]);
    }
    svg = svg.replace(/\sid="([\w.:-]+)"/g, (match, id: string) => (referenced.has(id) ? match : ""));
  }

  svg = roundNumbers(svg, precision);

  if (minify) {
    svg = svg
      .replace(/>\s+</g, "><")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+\/>/g, "/>")
      .replace(/\s+>/g, ">")
      // Path data: a comma or a minus already separates two numbers, so the
      // space beside it is dead weight.
      .replace(/([\d.])\s*,\s*([-\d.])/g, "$1,$2")
      .trim();
  } else {
    svg = svg.replace(/\n{3,}/g, "\n\n").trim();
  }

  const before = new TextEncoder().encode(source).length;
  const after = new TextEncoder().encode(svg).length;
  const saved = before - after;

  return {
    output: svg,
    format: "code",
    stats: [
      { label: "Before", value: `${(before / 1024).toFixed(1)} KB` },
      { label: "After", value: `${(after / 1024).toFixed(1)} KB` },
      { label: "Saved", value: `${saved > 0 ? Math.round((saved / before) * 100) : 0}%` },
    ],
    note:
      precision <= 1
        ? "At this precision, coordinates move by a visible amount. Check the result against the original before shipping it."
        : "Rounding changes coordinates slightly. Compare the two if the artwork has fine detail or hairline strokes.",
  };
};

/* ------------------------------------------------------------------ */
/* Log anonymiser                                                       */
/* ------------------------------------------------------------------ */

/** Luhn check, so a build number or an order id is not mistaken for a card. */
function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

interface Replacer {
  id: string;
  label: string;
  pattern: RegExp;
  accept?: (match: string) => boolean;
}

const REPLACERS: Replacer[] = [
  {
    id: "email",
    label: "EMAIL",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    id: "ipv4",
    label: "IP",
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    accept: (match) => match.split(".").every((part) => Number(part) <= 255),
  },
  {
    id: "ipv6",
    label: "IPV6",
    pattern: /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi,
  },
  {
    id: "card",
    label: "CARD",
    pattern: /\b(?:\d[ -]?){13,19}\b/g,
    accept: (match) => {
      const digits = match.replace(/\D/g, "");
      return digits.length >= 13 && digits.length <= 19 && passesLuhn(digits);
    },
  },
  {
    id: "phone",
    label: "PHONE",
    pattern: /(?:\+\d{1,3}[\s-]?)?\b\d{5}[\s-]?\d{5}\b|\+\d{1,3}[\s-]?\d{6,12}\b/g,
  },
  {
    id: "uuid",
    label: "UUID",
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  },
  {
    id: "token",
    label: "TOKEN",
    // JWTs, and the long opaque strings that follow "Bearer", "api_key=" and friends.
    pattern:
      /\beyJ[\w-]+\.[\w-]+\.[\w-]+\b|\b(?:sk|pk|ghp|gho|xox[baprs])[-_][A-Za-z0-9]{16,}\b|(?<=(?:bearer|token|api[_-]?key|secret|password)["'\s:=]{1,4})[A-Za-z0-9/+_-]{16,}/gi,
  },
  {
    id: "mac",
    label: "MAC",
    pattern: /\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi,
  },
  {
    id: "path",
    label: "HOME",
    // Just the user's name out of a home directory — the rest of the path is
    // usually the point of the log line.
    pattern: /(?:\/(?:home|Users)\/|[A-Z]:\\Users\\)([^/\\\s"']+)/g,
  },
];

export const logAnonymize: PureOp = (input, options): OpResult => {
  const text = input;
  if (!text.trim()) return { output: "" };

  const style = str(options, "style", "numbered");
  const filter = str(options, "filter").trim();
  const invert = bool(options, "invert", false);
  const caseSensitive = bool(options, "filterCase", false);
  const enabled = new Set(
    REPLACERS.filter((replacer) => bool(options, replacer.id, replacer.id !== "path")).map((r) => r.id),
  );

  let lines = text.split("\n");
  const totalLines = lines.length;

  if (filter) {
    const needle = caseSensitive ? filter : filter.toLowerCase();
    lines = lines.filter((line) => {
      const hay = caseSensitive ? line : line.toLowerCase();
      return hay.includes(needle) !== invert;
    });
  }

  const counters = new Map<string, Map<string, number>>();
  const counts = new Map<string, number>();

  const substitute = (label: string, original: string): string => {
    counts.set(label, (counts.get(label) ?? 0) + 1);
    if (style === "redact") return `[${label} REDACTED]`;
    if (style === "fixed") return `<${label}>`;

    // Numbered: the same value keeps the same token everywhere, so you can still
    // see that three requests came from one address without knowing which.
    let seen = counters.get(label);
    if (!seen) {
      seen = new Map();
      counters.set(label, seen);
    }
    let index = seen.get(original);
    if (index === undefined) {
      index = seen.size + 1;
      seen.set(original, index);
    }
    return `<${label}_${index}>`;
  };

  let output = lines.join("\n");

  for (const replacer of REPLACERS) {
    if (!enabled.has(replacer.id)) continue;
    output = output.replace(replacer.pattern, (match, group1?: string) => {
      if (replacer.accept && !replacer.accept(match)) return match;
      if (replacer.id === "path" && group1) {
        return match.replace(group1, substitute(replacer.label, group1));
      }
      return substitute(replacer.label, match);
    });
  }

  const removed = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const distinct = [...counters.values()].reduce((sum, map) => sum + map.size, 0);

  return {
    output,
    format: "text",
    stats: [
      { label: "Lines", value: filter ? `${lines.length} of ${totalLines}` : String(totalLines) },
      { label: "Masked", value: String([...counts.values()].reduce((a, b) => a + b, 0)) },
      { label: "Distinct values", value: style === "numbered" ? String(distinct) : "—" },
    ],
    note: removed.length
      ? `Masked: ${removed.map(([label, count]) => `${count} ${label.toLowerCase()}`).join(", ")}. Read the result before sharing it — pattern matching finds the shapes it knows, not every secret a log can contain.`
      : "Nothing matched. That is not proof the log is clean — check it by eye before sharing.",
  };
};
