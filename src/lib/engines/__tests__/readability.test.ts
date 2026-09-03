import { describe, expect, it } from "vitest";

import { ToolError } from "@/lib/engines/types";
import { countText, readability, scores, splitSentences, syllables } from "@/lib/engines/pure/readability";

/**
 * Reading scores are only as good as the counting under them, and the counting
 * is where these tools normally go wrong. A naive split on full stops flatters
 * every document that contains an abbreviation, which is every document.
 */

function run(input: string, options = {}) {
  const result = readability(input, options);
  if (result instanceof Promise) throw new Error("readability should be synchronous");
  return result;
}

describe("sentence splitting", () => {
  it("does not end a sentence at an abbreviation", () => {
    expect(splitSentences("Dr. Rao arrived at 4 p.m. He was late.")).toHaveLength(2);
  });

  it("does not end a sentence inside a decimal or a version number", () => {
    expect(splitSentences("The rate fell to 3.5 per cent. That is the lowest since 2019.")).toHaveLength(2);
  });

  it("does not end a sentence at an initial", () => {
    expect(splitSentences("J. R. Rao wrote it. Nobody read it.")).toHaveLength(2);
  });

  it("treats a run of terminators as one ending", () => {
    expect(splitSentences("What?! Nobody knew...")).toHaveLength(2);
  });

  it("ends a sentence at a paragraph break even without punctuation", () => {
    expect(splitSentences("A heading with no full stop\n\nThen the body follows here.")).toHaveLength(2);
  });
});

describe("syllable counting", () => {
  it("counts ordinary words the way the formulas assume", () => {
    expect(syllables("cat")).toBe(1);
    expect(syllables("table")).toBe(2);
    expect(syllables("readable")).toBe(3);
    expect(syllables("automatically")).toBeGreaterThanOrEqual(5);
  });

  it("never returns zero for a real word", () => {
    for (const word of ["a", "I", "the", "rhythm", "queue", "strengths"]) {
      expect(syllables(word), word).toBeGreaterThanOrEqual(1);
    }
  });

  it("ignores punctuation attached to a word", () => {
    expect(syllables("word,")).toBe(syllables("word"));
  });
});

describe("the formulas", () => {
  // A short easy passage: one-syllable words, short sentences. Flesch's own
  // scale puts this kind of writing near the top of its range.
  const easy = "The cat sat on the mat. The dog ran to the park. We had a good day.";

  it("scores plain short prose as easy", () => {
    const list = scores(countText(easy));
    const flesch = list.find((score) => score.name === "Flesch Reading Ease")!;
    expect(flesch.value).toBeGreaterThan(85);
  });

  it("scores dense prose harder than plain prose on every measure", () => {
    const dense =
      "The implementation of the aforementioned methodological considerations necessitates a comprehensive reevaluation of the organisational infrastructure, particularly insofar as the interdependencies between administrative subdivisions demonstrably influence operational efficacy.";
    const plainScores = scores(countText(easy));
    const denseScores = scores(countText(dense));

    // Flesch runs backwards — higher is easier — so it moves the other way.
    expect(denseScores[0].value).toBeLessThan(plainScores[0].value);
    for (let i = 1; i < plainScores.length; i++) {
      expect(denseScores[i].value, denseScores[i].name).toBeGreaterThan(plainScores[i].value);
    }
  });

  it("returns all six scores", () => {
    expect(scores(countText(easy))).toHaveLength(6);
  });
});

describe("the op", () => {
  const passage =
    "The council met on Tuesday. It agreed to fund the new library. The vote was eleven to three. " +
    "Work is expected to start in March, and the building should open the following year. " +
    "Residents had asked for the library for a decade.";

  it("refuses a sample too short to average over", () => {
    expect(() => run("Too short.")).toThrow(ToolError);
  });

  it("counts what it says it counts", () => {
    const result = run(passage);
    const words = result.stats!.find((stat) => stat.label === "Words")!;
    expect(Number(words.value.replace(/,/g, ""))).toBe(passage.split(/\s+/).filter(Boolean).length);
  });

  it("flags long sentences above the threshold and stays quiet below it", () => {
    const long = `${passage} ${"and then something else happened that went on rather longer than it needed to ".repeat(2)}.`;
    expect(run(long, { detail: "hard", flag: 15 }).output).toMatch(/Sentences over 15 words/);
    expect(run(passage, { detail: "hard", flag: 60 }).output).toMatch(/No sentence runs longer/);
  });

  it("omits the sentence list when only scores were asked for", () => {
    expect(run(passage, { detail: "scores" }).output).not.toMatch(/Sentences over/);
  });

  it("warns that SMOG is out of its designed range on a short passage", () => {
    expect(run(passage).note).toMatch(/SMOG/);
  });

  it("never sends anything anywhere, which is the point of it being here", () => {
    // The op is a pure function of its input. If it ever grew a fetch, this
    // page would have to stop claiming it works with the network off.
    const source = readability.toString();
    expect(source).not.toMatch(/fetch\(|XMLHttpRequest|navigator\.sendBeacon/);
  });
});
