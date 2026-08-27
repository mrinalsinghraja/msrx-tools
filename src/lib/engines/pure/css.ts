import { bool, num, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Colour maths and CSS generators.
 *
 * The OKLab conversion follows Björn Ottosson's published matrices. It matters
 * because OKLCH is what modern CSS reaches for, and converting via HSL — which
 * is not perceptually uniform — gives lightness values that lie.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED_COLORS: Record<string, string> = {
  black: "#000000", white: "#ffffff", red: "#ff0000", lime: "#00ff00", blue: "#0000ff",
  yellow: "#ffff00", cyan: "#00ffff", magenta: "#ff00ff", silver: "#c0c0c0", gray: "#808080",
  grey: "#808080", maroon: "#800000", olive: "#808000", green: "#008000", purple: "#800080",
  teal: "#008080", navy: "#000080", orange: "#ffa500", pink: "#ffc0cb", brown: "#a52a2a",
  gold: "#ffd700", indigo: "#4b0082", violet: "#ee82ee", coral: "#ff7f50", salmon: "#fa8072",
  crimson: "#dc143c", khaki: "#f0e68c", plum: "#dda0dd", turquoise: "#40e0d0", tan: "#d2b48c",
  beige: "#f5f5dc", ivory: "#fffff0", lavender: "#e6e6fa", transparent: "#00000000",
};

export function parseColor(text: string): Rgb {
  const input = text.trim().toLowerCase();
  if (!input) throw new ToolError("Enter a colour — hex, rgb(), hsl() or a CSS colour name.");

  const named = NAMED_COLORS[input];
  const source = named ?? input;

  const hex = /^#?([0-9a-f]{3,8})$/.exec(source);
  if (hex) {
    const digits = hex[1];
    const expand = (s: string) => parseInt(s.length === 1 ? s + s : s, 16);
    if (digits.length === 3 || digits.length === 4) {
      return {
        r: expand(digits[0]),
        g: expand(digits[1]),
        b: expand(digits[2]),
        a: digits.length === 4 ? expand(digits[3]) / 255 : 1,
      };
    }
    if (digits.length === 6 || digits.length === 8) {
      return {
        r: parseInt(digits.slice(0, 2), 16),
        g: parseInt(digits.slice(2, 4), 16),
        b: parseInt(digits.slice(4, 6), 16),
        a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
      };
    }
    throw new ToolError(`“${text}” is a hex colour of ${digits.length} digits. Valid lengths are 3, 4, 6 and 8.`);
  }

  const rgb = /^rgba?\(([^)]+)\)$/.exec(source);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    const channel = (v: string) => (v.endsWith("%") ? (parseFloat(v) / 100) * 255 : parseFloat(v));
    return {
      r: channel(parts[0]),
      g: channel(parts[1]),
      b: channel(parts[2]),
      a: parts[3] ? (parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1,
    };
  }

  const hsl = /^hsla?\(([^)]+)\)$/.exec(source);
  if (hsl) {
    const parts = hsl[1].split(/[\s,/]+/).filter(Boolean);
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const a = parts[3] ? (parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1;
    return { ...hslToRgb(h, s, l), a };
  }

  throw new ToolError(`“${text}” isn't a colour this tool recognises. Try #3b82f6, rgb(59 130 246) or a name like "teal".`);
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = l - c / 2;

  const [r, g, b] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];

  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  return { h: (h * 60 + 360) % 360, s, l };
}

/** sRGB transfer function — the gamma curve, not the 2.2 approximation. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function rgbToOklch({ r, g, b }: Rgb): { l: number; c: number; h: number } {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return {
    l: okL,
    c: Math.sqrt(okA ** 2 + okB ** 2),
    h: (Math.atan2(okB, okA) * (180 / Math.PI) + 360) % 360,
  };
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function toHex({ r, g, b, a }: Rgb): string {
  const part = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}${a < 1 ? part(a * 255) : ""}`;
}

function wcagVerdict(ratio: number): string {
  if (ratio >= 7) return "passes AAA and AA";
  if (ratio >= 4.5) return "passes AA, fails AAA";
  if (ratio >= 3) return "large text only";
  return "fails";
}

export const colorConvert: PureOp = (input, options): OpResult => {
  const colour = parseColor(input);
  const { h, s, l } = rgbToHsl(colour);
  const oklch = rgbToOklch(colour);

  const r = Math.round(colour.r);
  const g = Math.round(colour.g);
  const b = Math.round(colour.b);

  // CMYK here is the naive device conversion — right for a rough print check,
  // wrong for colour-managed output, which needs an ICC profile.
  const k = 1 - Math.max(r, g, b) / 255;
  const cmyk =
    k === 1
      ? [0, 0, 0, 100]
      : [
          ((1 - r / 255 - k) / (1 - k)) * 100,
          ((1 - g / 255 - k) / (1 - k)) * 100,
          ((1 - b / 255 - k) / (1 - k)) * 100,
          k * 100,
        ];

  const lines = [
    `HEX      ${toHex(colour).toUpperCase()}`,
    `RGB      rgb(${r} ${g} ${b}${colour.a < 1 ? ` / ${Math.round(colour.a * 100)}%` : ""})`,
    `HSL      hsl(${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%)`,
    `OKLCH    oklch(${(oklch.l * 100).toFixed(1)}% ${oklch.c.toFixed(4)} ${oklch.h.toFixed(1)})`,
    `CMYK     ${cmyk.map((v) => `${v.toFixed(0)}%`).join(" ")}`,
  ];

  if (bool(options, "contrast", true)) {
    const white: Rgb = { r: 255, g: 255, b: 255, a: 1 };
    const black: Rgb = { r: 0, g: 0, b: 0, a: 1 };
    const onWhite = contrastRatio(colour, white);
    const onBlack = contrastRatio(colour, black);
    lines.push(
      "",
      "Contrast (WCAG 2.2, normal text needs 4.5)",
      `  against white  ${onWhite.toFixed(2)}:1 — ${wcagVerdict(onWhite)}`,
      `  against black  ${onBlack.toFixed(2)}:1 — ${wcagVerdict(onBlack)}`,
    );
  }

  return {
    output: lines.join("\n"),
    format: "code",
    extra: { hex: toHex(colour), rgb: colour },
    stats: [{ label: "Hex", value: toHex(colour).toUpperCase() }],
  };
};

export const cssGradient: PureOp = (_input, options): OpResult => {
  const type = str(options, "type", "linear");
  const from = str(options, "from", "#0ea5e9");
  const to = str(options, "to", "#7c3aed");
  const stops = bool(options, "midpoint") ? [from, str(options, "via", "#22d3ee"), to] : [from, to];

  let value: string;
  if (type === "linear") value = `linear-gradient(${num(options, "angle", 135)}deg, ${stops.join(", ")})`;
  else if (type === "radial") value = `radial-gradient(circle at center, ${stops.join(", ")})`;
  else value = `conic-gradient(from 0deg, ${stops.join(", ")})`;

  return {
    output: [`background: ${value};`, "", "/* Tailwind arbitrary value */", `bg-[${value.replace(/\s+/g, "_")}]`].join("\n"),
    format: "code",
    extra: { css: value },
    stats: [{ label: "Stops", value: String(stops.length) }],
  };
};

export const boxShadow: PureOp = (_input, options): OpResult => {
  const colour = parseColor(str(options, "color", "#0f172a"));
  const opacity = num(options, "opacity", 18) / 100;
  const rgba = `rgb(${Math.round(colour.r)} ${Math.round(colour.g)} ${Math.round(colour.b)} / ${Math.round(opacity * 100)}%)`;

  const parts = [
    bool(options, "inset") ? "inset" : "",
    `${num(options, "x", 0)}px`,
    `${num(options, "y", 8)}px`,
    `${num(options, "blur", 24)}px`,
    `${num(options, "spread", -4)}px`,
    rgba,
  ].filter(Boolean);

  const value = parts.join(" ");
  return {
    output: [`box-shadow: ${value};`, "", "/* Tailwind arbitrary value */", `shadow-[${value.replace(/\s+/g, "_")}]`].join("\n"),
    format: "code",
    extra: { css: value },
  };
};
