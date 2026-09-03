import { bool, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Unicode text styling — the "fancy font" generators.
 *
 * The single most important thing about these tools, said here because the
 * whole category is built on people not knowing it: **none of this is a font.**
 * There is no styling involved and nothing is being formatted. Each letter is
 * swapped for a different character that happens to look like a bold or italic
 * version of it — MATHEMATICAL BOLD CAPITAL A (U+1D400) instead of A, and so on.
 * Unicode encoded those for mathematical notation, where the weight carries
 * meaning: a bold R is the set of real numbers, and is a different symbol from
 * an italic R.
 *
 * Two consequences follow, and every page in this group states them:
 *
 *  - **A screen reader does not read it as text.** Depending on the reader and
 *    its verbosity, "𝗛𝗲𝗹𝗹𝗼" is announced character by character as
 *    "mathematical bold capital H…", or skipped in silence. A post written this
 *    way is unreadable to a blind reader, which is why it does not belong in
 *    anything that matters.
 *  - **Search does not match it.** These are different codepoints, so a search
 *    for "hello" will not find "𝗵𝗲𝗹𝗹𝗼" on most systems.
 *
 * The tables are built from base codepoints plus a hole map, rather than pasted
 * as literals. The Mathematical Alphanumeric block is not contiguous: letters
 * that already existed as named symbols were left out of it and live back in
 * the Letterlike Symbols block, so script B is at U+212C while script A is at
 * U+1D49C. Every one of those gaps is listed below. Getting one wrong produces
 * a hole in the alphabet that only shows up on the letter nobody tested.
 */

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

interface Alphabet {
  upper?: string;
  lower?: string;
  digits?: string;
}

/** Builds a 26-character run from a base codepoint, patching the known gaps. */
function run(base: number, letters: string, holes: Record<string, string> = {}): string {
  return [...letters].map((letter, i) => holes[letter] ?? String.fromCodePoint(base + i)).join("");
}

function alphabet(
  upperBase?: number | null,
  lowerBase?: number | null,
  digitBase?: number | null,
  holes: Record<string, string> = {},
): Alphabet {
  // Loose comparison on purpose: a style with no digits is written either as an
  // explicit null or by leaving the argument off, and a strict check on one of
  // those silently produced String.fromCodePoint(NaN) for the other.
  return {
    upper: upperBase == null ? undefined : run(upperBase, UPPER, holes),
    lower: lowerBase == null ? undefined : run(lowerBase, LOWER, holes),
    digits: digitBase == null ? undefined : run(digitBase, DIGITS),
  };
}

/* ------------------------------------------------------------------ */
/* The alphabets                                                        */
/* ------------------------------------------------------------------ */

const ALPHABETS: Record<string, Alphabet> = {
  boldSerif: alphabet(0x1d400, 0x1d41a, 0x1d7ce),
  italicSerif: alphabet(0x1d434, 0x1d44e, null, { h: "ℎ" }),
  boldItalicSerif: alphabet(0x1d468, 0x1d482),
  sans: alphabet(0x1d5a0, 0x1d5ba, 0x1d7e2),
  boldSans: alphabet(0x1d5d4, 0x1d5ee, 0x1d7ec),
  italicSans: alphabet(0x1d608, 0x1d622),
  boldItalicSans: alphabet(0x1d63c, 0x1d656),
  monospace: alphabet(0x1d670, 0x1d68a, 0x1d7f6),
  // Script and Fraktur lost the most letters to the Letterlike Symbols block.
  script: alphabet(0x1d49c, 0x1d4b6, null, {
    B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ",
    e: "ℯ", g: "ℊ", o: "ℴ",
  }),
  boldScript: alphabet(0x1d4d0, 0x1d4ea),
  fraktur: alphabet(0x1d504, 0x1d51e, null, { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" }),
  boldFraktur: alphabet(0x1d56c, 0x1d586),
  doubleStruck: alphabet(0x1d538, 0x1d552, 0x1d7d8, {
    C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ",
  }),
  fullwidth: alphabet(0xff21, 0xff41, 0xff10),
  circled: {
    ...alphabet(0x24b6, 0x24d0, null),
    // Circled zero sits on its own at U+24EA; one to nine run from U+2460.
    digits: `⓪${run(0x2460, "123456789")}`,
  },
  negativeCircled: alphabet(0x1f150, 0x1f150, null),
  squared: alphabet(0x1f130, 0x1f130, null),
  negativeSquared: alphabet(0x1f170, 0x1f170, null),
  parenthesised: {
    upper: run(0x1f110, UPPER),
    lower: run(0x249c, LOWER),
    digits: `0${run(0x2474, "123456789")}`,
  },
  /**
   * Small capitals are not a styled alphabet at all — they are phonetic
   * letters borrowed from the IPA extensions, and the set was never completed.
   * There is no small-capital Q or X in Unicode, so those two stay as they are.
   */
  smallCaps: { lower: "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘqʀꜱᴛᴜᴠᴡxʏᴢ" },
  /** Superscript has no q. Subscript is missing most of the alphabet outright. */
  superscript: {
    lower: "ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ",
    digits: "⁰¹²³⁴⁵⁶⁷⁸⁹",
  },
  subscript: {
    lower: "ₐbcdₑfgₕᵢⱼₖₗₘₙₒₚqᵣₛₜᵤᵥwₓyz",
    digits: "₀₁₂₃₄₅₆₇₈₉",
  },
};

/** Combining marks sit *after* the character they decorate and stack on it. */
const COMBINING = {
  strikethrough: "̶",
  underline: "̲",
  slash: "̸",
  overline: "̅",
} as const;

const UPSIDE_DOWN: Record<string, string> = {
  a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ᴉ", j: "ɾ",
  k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ", s: "s", t: "ʇ",
  u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z",
  A: "∀", B: "𐐒", C: "Ɔ", D: "p", E: "Ǝ", F: "Ⅎ", G: "פ", H: "H", I: "I", J: "ſ",
  K: "ʞ", L: "˥", M: "W", N: "N", O: "O", P: "Ԁ", Q: "Q", R: "ɹ", S: "S", T: "┴",
  U: "∩", V: "Λ", W: "M", X: "X", Y: "⅄", Z: "Z",
  "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ", "6": "9", "7": "ㄥ",
  "8": "8", "9": "6",
  ".": "˙", ",": "'", "'": ",", '"': "„", "?": "¿", "!": "¡", "&": "⅋", "_": "‾",
  "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<",
  ";": "؛", "‿": "⁀",
};

/* ------------------------------------------------------------------ */
/* Applying a style                                                     */
/* ------------------------------------------------------------------ */

export interface StyledResult {
  text: string;
  /** Characters that had no equivalent and were passed through unchanged. */
  untouched: number;
}

export function applyAlphabet(input: string, table: Alphabet): StyledResult {
  let untouched = 0;
  let out = "";

  for (const char of input) {
    let mapped: string | undefined;
    const upperIndex = UPPER.indexOf(char);
    const lowerIndex = LOWER.indexOf(char);
    const digitIndex = DIGITS.indexOf(char);

    if (upperIndex >= 0) {
      // A style with only a lowercase run — small caps, superscript — should
      // still do something useful with capitals rather than dropping them.
      mapped = table.upper ? [...table.upper][upperIndex] : table.lower ? [...table.lower][upperIndex] : undefined;
    } else if (lowerIndex >= 0) {
      mapped = table.lower ? [...table.lower][lowerIndex] : table.upper ? [...table.upper][lowerIndex] : undefined;
    } else if (digitIndex >= 0) {
      mapped = table.digits ? [...table.digits][digitIndex] : undefined;
    }

    if (mapped && mapped !== char) {
      out += mapped;
    } else {
      out += char;
      // Whitespace and punctuation are not failures — nobody expects a styled
      // comma. Only letters and digits count as something the style could not do.
      if (/[A-Za-z0-9]/.test(char)) untouched++;
    }
  }

  return { text: out, untouched };
}

export function applyCombining(input: string, mark: string): StyledResult {
  let out = "";
  for (const char of input) {
    out += char;
    // A mark on a space renders as a floating dash on most platforms, which
    // is what makes a struck-through sentence look continuous rather than
    // broken into words.
    if (char !== "\n" && char !== "\r") out += mark;
  }
  return { text: out, untouched: 0 };
}

export function applyUpsideDown(input: string, flip: boolean): StyledResult {
  let untouched = 0;
  const mapped = [...input].map((char) => {
    const swap = UPSIDE_DOWN[char];
    if (!swap) {
      if (/[A-Za-z0-9]/.test(char)) untouched++;
      return char;
    }
    return swap;
  });
  // Turning the page over reverses the reading order as well as the letters.
  // Without this it reads as mirrored text rather than upside-down text.
  return { text: (flip ? mapped.reverse() : mapped).join(""), untouched };
}

/* ------------------------------------------------------------------ */
/* The styles each tool offers                                          */
/* ------------------------------------------------------------------ */

export interface Style {
  name: string;
  apply: (input: string) => StyledResult;
}

const fromAlphabet = (name: string, key: keyof typeof ALPHABETS): Style => ({
  name,
  apply: (input) => applyAlphabet(input, ALPHABETS[key]),
});

const fromCombining = (name: string, mark: string): Style => ({
  name,
  apply: (input) => applyCombining(input, mark),
});

export const STYLE_GROUPS: Record<string, Style[]> = {
  bold: [
    fromAlphabet("Bold", "boldSans"),
    fromAlphabet("Bold serif", "boldSerif"),
    fromAlphabet("Bold italic", "boldItalicSans"),
    fromAlphabet("Bold italic serif", "boldItalicSerif"),
    fromAlphabet("Bold script", "boldScript"),
    fromAlphabet("Bold Fraktur", "boldFraktur"),
  ],
  italic: [
    fromAlphabet("Italic", "italicSans"),
    fromAlphabet("Italic serif", "italicSerif"),
    fromAlphabet("Bold italic", "boldItalicSans"),
    fromAlphabet("Bold italic serif", "boldItalicSerif"),
  ],
  cursive: [
    fromAlphabet("Script", "script"),
    fromAlphabet("Bold script", "boldScript"),
    fromAlphabet("Fraktur", "fraktur"),
    fromAlphabet("Bold Fraktur", "boldFraktur"),
  ],
  smallCaps: [
    fromAlphabet("Small caps", "smallCaps"),
    fromAlphabet("Monospace", "monospace"),
    fromAlphabet("Double-struck", "doubleStruck"),
  ],
  strikethrough: [
    fromCombining("Strikethrough", COMBINING.strikethrough),
    fromCombining("Underline", COMBINING.underline),
    fromCombining("Slash through", COMBINING.slash),
    fromCombining("Overline", COMBINING.overline),
  ],
  upsideDown: [
    { name: "Upside down", apply: (input) => applyUpsideDown(input, true) },
    // Flipped glyphs without the reversal. Not "mirrored" — that name was
    // wrong, since nothing is mirrored — it is for the handful of places that
    // reverse the string for you and would otherwise undo the flip twice.
    { name: "Flipped letters, order kept", apply: (input) => applyUpsideDown(input, false) },
    { name: "Backwards", apply: (input) => ({ text: [...input].reverse().join(""), untouched: 0 }) },
  ],
  superscript: [
    fromAlphabet("Superscript", "superscript"),
    fromAlphabet("Subscript", "subscript"),
  ],
  bubble: [
    fromAlphabet("Bubble", "circled"),
    fromAlphabet("Bubble (filled)", "negativeCircled"),
    fromAlphabet("Square", "squared"),
    fromAlphabet("Square (filled)", "negativeSquared"),
    fromAlphabet("Bracketed", "parenthesised"),
  ],
  fullwidth: [
    fromAlphabet("Fullwidth", "fullwidth"),
    { name: "Spaced out", apply: (input) => ({ text: [...input].join(" "), untouched: 0 }) },
  ],
};

function dedupe(styles: Style[]): Style[] {
  const seen = new Set<string>();
  return styles.filter((style) => {
    if (seen.has(style.name)) return false;
    seen.add(style.name);
    return true;
  });
}

/**
 * Everything, in the order the gallery shows it.
 *
 * Deduplicated by name, because the groups overlap on purpose — bold script
 * belongs in both the bold list and the cursive list — and concatenating them
 * showed it twice, which is both a wasted row and a duplicate React key.
 */
const ALL_STYLES: Style[] = dedupe([
  ...STYLE_GROUPS.bold,
  ...STYLE_GROUPS.italic.slice(0, 2),
  ...STYLE_GROUPS.cursive,
  fromAlphabet("Double-struck", "doubleStruck"),
  fromAlphabet("Monospace", "monospace"),
  fromAlphabet("Sans-serif", "sans"),
  fromAlphabet("Small caps", "smallCaps"),
  ...STYLE_GROUPS.bubble,
  ...STYLE_GROUPS.fullwidth,
  ...STYLE_GROUPS.superscript,
  ...STYLE_GROUPS.strikethrough,
  ...STYLE_GROUPS.upsideDown.slice(0, 1),
]);

/* ------------------------------------------------------------------ */
/* The ops                                                             */
/* ------------------------------------------------------------------ */

const ACCESSIBILITY_NOTE =
  "None of this is a font — each letter is swapped for a different Unicode character that looks like it. Screen readers announce these one symbol at a time or skip them entirely, and search will not match them, so keep them out of anything a person needs to read or find. They are fine for a display name or a one-off flourish.";

function render(input: string, styles: Style[], showUnsupported: boolean): OpResult {
  const text = input.replace(/\n+$/, "");
  if (!text.trim()) throw new ToolError("Type or paste some text and the styled versions appear here.");

  const rows = styles.map((style) => {
    const result = style.apply(text);
    return { name: style.name, text: result.text, untouched: result.untouched };
  });

  const width = Math.max(...rows.map((row) => row.name.length));
  const output = rows.map((row) => `${row.name.padEnd(width)}  ${row.text}`).join("\n");

  const gaps = rows.filter((row) => row.untouched > 0);
  const note = gaps.length
    ? `${ACCESSIBILITY_NOTE} Unicode never finished some of these alphabets, so ${gaps
        .map((row) => `${row.name} left ${row.untouched} character${row.untouched === 1 ? "" : "s"} unchanged`)
        .join(", ")} — those letters simply do not exist.`
    : ACCESSIBILITY_NOTE;

  return {
    output,
    format: "text",
    stats: [
      { label: "Characters in", value: String([...text].length) },
      { label: "Styles", value: String(rows.length) },
      { label: "Characters out", value: String([...rows[0].text].length) },
    ],
    note: showUnsupported ? note : ACCESSIBILITY_NOTE,
    extra: { styles: rows.map(({ name, text: styled }) => ({ name, text: styled })) },
  };
}

/** One op per tool, so the registry stays the description of what exists. */
function group(key: keyof typeof STYLE_GROUPS): PureOp {
  return (input, options) => render(input, STYLE_GROUPS[key], bool(options, "explainGaps", true));
}

export const fancyText: PureOp = (input, options) => {
  const only = str(options, "only", "all");
  const styles = only === "all" ? ALL_STYLES : (STYLE_GROUPS[only] ?? ALL_STYLES);
  return render(input, styles, bool(options, "explainGaps", true));
};

export const boldText = group("bold");
export const italicText = group("italic");
export const cursiveText = group("cursive");
export const smallCapsText = group("smallCaps");
export const strikethroughText = group("strikethrough");
export const upsideDownText = group("upsideDown");
export const superscriptText = group("superscript");
export const bubbleText = group("bubble");
export const fullwidthText = group("fullwidth");
