import { describe, expect, it } from "vitest";

import { ToolError, type OpResult } from "@/lib/engines/types";
import {
  applyAlphabet,
  applyCombining,
  applyUpsideDown,
  boldText,
  bubbleText,
  cursiveText,
  fancyText,
  fullwidthText,
  smallCapsText,
  strikethroughText,
  superscriptText,
  upsideDownText,
} from "@/lib/engines/pure/unicode-style";

/**
 * The Mathematical Alphanumeric block is full of holes — letters that were
 * encoded elsewhere years earlier and skipped when the block was added. A wrong
 * base or an unpatched gap produces one bad letter in the middle of an alphabet
 * nobody notices until it lands in somebody's name.
 */

const run = (op: typeof boldText, input: string, options = {}) => op(input, options) as OpResult;
const rows = (result: OpResult) => (result.extra as { styles: { name: string; text: string }[] }).styles;
const row = (result: OpResult, name: string) => rows(result).find((r) => r.name === name)!.text;

describe("the alphabets have no gaps", () => {
  const ALL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  it("maps every letter in every bold alphabet", () => {
    for (const style of rows(run(boldText, ALL))) {
      // A letter left alone would come back identical to the input.
      const untouched = [...ALL].filter((ch, i) => [...style.text][i] === ch);
      expect(untouched, `${style.name} left ${untouched.join("")}`).toHaveLength(0);
    }
  });

  it("patches the script letters that live outside their own block", () => {
    // Script B, E, F, H, I, L, M, R and lowercase e, g, o were encoded earlier
    // as standalone symbols, so the run skips them.
    const script = row(run(cursiveText, "BEFHILMR ego"), "Script");
    expect(script).toBe("ℬℰℱℋℐℒℳℛ ℯℊℴ");
  });

  it("patches the Fraktur capitals that were encoded separately", () => {
    expect(row(run(cursiveText, "CHIRZ"), "Fraktur")).toBe("ℭℌℑℜℨ");
  });

  it("starts the script lowercase run at the right codepoint", () => {
    // An earlier draft used the capital-U codepoint here, so "a" came out as a
    // script capital U and every lowercase letter was shifted.
    expect(row(run(cursiveText, "a"), "Script")).toBe("𝒶");
  });

  it("keeps the circled zero, which sits apart from one to nine", () => {
    expect(row(run(bubbleText, "0123"), "Bubble")).toBe("⓪①②③");
  });
});

describe("styles with genuine gaps say so", () => {
  it("leaves q alone in superscript and reports it", () => {
    const result = run(superscriptText, "pqr");
    expect(row(result, "Superscript")).toBe("ᵖqʳ");
    expect(result.note).toMatch(/Superscript left 1 character unchanged/);
  });

  it("leaves the many missing subscript letters alone", () => {
    expect(row(run(superscriptText, "abc"), "Subscript")).toBe("ₐbc");
  });

  it("leaves Q and X alone in small caps, which Unicode never encoded", () => {
    const small = row(run(smallCapsText, "pqrwxy"), "Small caps");
    expect(small).toContain("q");
    expect(small).toContain("x");
  });

  it("says nothing about gaps when a style is complete", () => {
    const result = run(fullwidthText, "abc123");
    expect(row(result, "Fullwidth")).toBe("ａｂｃ１２３");
    expect(result.note).not.toMatch(/unchanged/);
  });

  it("never counts punctuation or spaces as a gap", () => {
    // Nobody expects a styled comma; only letters and digits are a real miss.
    expect(run(boldText, "a, b!").note).not.toMatch(/unchanged/);
  });
});

describe("mechanisms that are not substitution", () => {
  it("puts a combining mark after every character, spaces included", () => {
    const struck = applyCombining("ab c", "̶");
    expect([...struck.text]).toHaveLength(8);
    expect(struck.text.startsWith("a̶b̶")).toBe(true);
  });

  it("reverses the reading order as well as flipping the letters", () => {
    // Flipping without reversing reads as scrambled rather than upside down.
    expect(applyUpsideDown("ab", true).text).toBe("qɐ");
    expect(applyUpsideDown("ab", false).text).toBe("ɐq");
  });

  it("offers a plain reversal that changes no characters", () => {
    expect(row(run(upsideDownText, "abc"), "Backwards")).toBe("cba");
  });
});

describe("the ops", () => {
  it("refuses empty input with something a person can act on", () => {
    expect(() => run(boldText, "   ")).toThrow(ToolError);
  });

  it("returns rows for the gallery as well as copyable text", () => {
    const result = run(boldText, "Hi");
    expect(rows(result).length).toBeGreaterThan(3);
    expect(result.output).toContain(row(result, "Bold"));
  });

  it("shows every style on the fancy tool and narrows on request", () => {
    const all = rows(run(fancyText, "Hi", { only: "all" }));
    const bold = rows(run(fancyText, "Hi", { only: "bold" }));
    expect(all.length).toBeGreaterThan(20);
    expect(bold.length).toBeLessThan(all.length);
    expect(bold.every((r) => /bold/i.test(r.name))).toBe(true);
  });

  it("never shows the same style twice", () => {
    // The bold and cursive groups both legitimately contain bold script, so
    // concatenating them listed it twice and collided the React keys.
    const names = rows(run(fancyText, "Hi")).map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("always carries the warning about screen readers and search", () => {
    for (const op of [boldText, cursiveText, bubbleText, fullwidthText, strikethroughText]) {
      expect(run(op, "test").note).toMatch(/screen readers/i);
      expect(run(op, "test").note).toMatch(/search/i);
    }
  });

  it("leaves accented letters and other scripts untouched", () => {
    // The mathematical alphabets contain 26 unaccented letters and nothing else.
    expect(applyAlphabet("é ñ 漢", { lower: "abcdefghijklmnopqrstuvwxyz" }).text).toBe("é ñ 漢");
  });
});
