import { describe, expect, it } from "vitest";

import { checkRegexAnswer, describeRegexCheck, parseExamples, parsePattern } from "@/lib/ai/verify-regex";

/**
 * The case that prompted this: a browser sweep produced a UK postcode pattern
 * that filed "SW1 1AA" under DOES NOT MATCH. The expression matches it.
 */
const UK_POSTCODE_ANSWER = `/^[A-Z]{1,2}[0-9][0-9A-Z]?\\s?[0-9][A-Z]{2}$/i
Anchored: yes, validates whole string

HOW IT WORKS
^               – start of string anchor
[A-Z]{1,2}      – one or two letters

MATCHES
SW1A1AA
SW1A 1AA
EC1A1BB
W1A 0AX

DOES NOT MATCH
SW1A1A
SW1A 1A
SW1 1AA
SW1A1AAA`;

describe("parsing the answer", () => {
  it("reads a delimited expression with its flags", () => {
    expect(parsePattern("/^ab+c$/i")).toEqual({ source: "^ab+c$", flags: "i" });
  });

  it("reads a Python raw string", () => {
    expect(parsePattern('r"^\\d{4}$"')).toEqual({ source: "^\\d{4}$", flags: "" });
  });

  it("reads a bare expression", () => {
    expect(parsePattern("^[0-9]+$")).toEqual({ source: "^[0-9]+$", flags: "" });
  });

  it("collects both example lists and stops at the next heading", () => {
    const { matches, rejects } = parseExamples(UK_POSTCODE_ANSWER);
    expect(matches).toEqual(["SW1A1AA", "SW1A 1AA", "EC1A1BB", "W1A 0AX"]);
    expect(rejects).toEqual(["SW1A1A", "SW1A 1A", "SW1 1AA", "SW1A1AAA"]);
    // "HOW IT WORKS" sits above MATCHES and must not leak into either list.
    expect(matches.join(" ")).not.toMatch(/anchor/i);
  });

  it("strips list markers and quotes from an example", () => {
    const { matches } = parseExamples('MATCHES\n- "hello"\n2) `world`');
    expect(matches).toEqual(["hello", "world"]);
  });
});

describe("checking the expression against its own examples", () => {
  it("catches the real mistake from the browser sweep", () => {
    const check = checkRegexAnswer(UK_POSTCODE_ANSWER, "pcre");
    expect(check.checked).toBe(true);
    expect(check.total).toBe(8);
    expect(check.wrong).toEqual([{ example: "SW1 1AA", claimedMatch: false }]);
  });

  it("says so plainly, and does not claim to know which half is wrong", () => {
    const described = describeRegexCheck(checkRegexAnswer(UK_POSTCODE_ANSWER, "pcre"));
    expect(described?.tone).toBe("warn");
    expect(described?.text).toContain("SW1 1AA");
    expect(described?.text).toMatch(/does match/);
    expect(described?.text).toMatch(/may be the expression rather than the label/);
  });

  it("confirms an answer whose examples all hold", () => {
    const good = "/^[0-9]{6}$/\n\nMATCHES\n560001\n110002\n\nDOES NOT MATCH\n56001\nABC123";
    const check = checkRegexAnswer(good, "javascript");
    expect(check.wrong).toHaveLength(0);
    const described = describeRegexCheck(check);
    expect(described?.tone).toBe("info");
    // It must not overclaim: a consistent answer is not a correct one.
    expect(described?.text).toMatch(/cannot tell you the expression is the one you wanted/);
  });

  it("catches a string claimed to match that does not", () => {
    const check = checkRegexAnswer("/^a+$/\n\nMATCHES\naaa\nbbb", "javascript");
    expect(check.wrong).toEqual([{ example: "bbb", claimedMatch: true }]);
  });
});

describe("declining rather than giving a wrong verdict", () => {
  it("never runs POSIX, whose bracket expressions mean something else here", () => {
    expect(checkRegexAnswer("[[:digit:]]+\n\nMATCHES\n123", "posix").checked).toBe(false);
  });

  it("declines a pattern JavaScript would silently misread", () => {
    // \A is a start anchor in PCRE and the letter A in JavaScript, so this
    // would run and give a confidently wrong answer.
    expect(checkRegexAnswer("/\\A[0-9]+/\n\nMATCHES\n123", "pcre").checked).toBe(false);
    expect(checkRegexAnswer("/(?P<n>x)/\n\nMATCHES\nx", "python").checked).toBe(false);
  });

  it("declines a pattern this engine cannot compile at all", () => {
    expect(checkRegexAnswer("/(?>a+)b/\n\nMATCHES\naab", "pcre").checked).toBe(false);
  });

  it("declines extended mode, where whitespace means something different", () => {
    expect(checkRegexAnswer("/^ a b $/x\n\nMATCHES\nab", "pcre").checked).toBe(false);
  });

  it("says nothing at all when there were no examples to check", () => {
    expect(describeRegexCheck(checkRegexAnswer("/^a$/\n\nHOW IT WORKS\n^ start", "javascript"))).toBeNull();
  });
});
