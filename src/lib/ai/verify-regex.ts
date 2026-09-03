/**
 * Checks a generated regular expression against the examples it came with.
 *
 * The regex tool lists strings its expression matches and strings it rejects,
 * and a browser sweep caught it getting one wrong: a UK postcode pattern filed
 * "SW1 1AA" under DOES NOT MATCH, when it plainly does. That is not a prompt
 * problem and no amount of instruction fixes it — the model is asserting the
 * result of running a program it has not run.
 *
 * So the page runs it. A regular expression is executable, the engine is
 * already here, and the answer is exact. Same division of labour as counting
 * characters: the model writes, the browser computes.
 *
 * What this reports is an *inconsistency* between an expression and its own
 * example list. It cannot know which half is wrong — the pattern may be right
 * and the label mistaken, or the reverse — so the wording says that.
 */

/**
 * Constructs that JavaScript either cannot parse or, worse, parses into
 * something else. The second kind is the dangerous one: `\A` is a start-of-
 * string anchor in Python and PCRE, and in JavaScript it is just the letter A,
 * so the expression would run and quietly give the wrong verdict. Anything on
 * this list means we decline to check rather than risk contradicting a correct
 * answer.
 */
const NOT_PORTABLE = [
  "[[:", // POSIX character classes
  "(?P", // Python named groups
  "(?#", // comments
  "(?>", // atomic groups
  "\\A",
  "\\Z",
  "\\z",
  "\\h",
  "\\R",
  "\\K",
  "\\G",
];

/** POSIX bracket expressions differ throughout, so that flavour is never run. */
const UNCHECKABLE_FLAVOURS = new Set(["posix"]);

export interface RegexClaim {
  example: string;
  /** What the answer claimed, and what the engine actually did. */
  claimedMatch: boolean;
}

export interface RegexCheck {
  /** False when the expression could not be run here — no verdict either way. */
  checked: boolean;
  /** How many examples were tested. */
  total: number;
  /** The ones where the engine disagreed with the list. */
  wrong: RegexClaim[];
  pattern?: string;
}

const NOT_CHECKED: RegexCheck = { checked: false, total: 0, wrong: [] };

/** Pulls the expression off the first line, in whichever wrapper it arrived. */
export function parsePattern(line: string): { source: string; flags: string } | null {
  const text = line.trim();
  if (!text) return null;

  // /pattern/flags — JavaScript and PCRE both print it this way.
  const delimited = /^\/(.*)\/([a-z]*)$/s.exec(text);
  if (delimited) return { source: delimited[1], flags: delimited[2] };

  // r"pattern" or r'pattern' — Python. Also plain quotes, which Java uses.
  const quoted = /^r?["'](.*)["']$/s.exec(text);
  if (quoted) return { source: quoted[1], flags: "" };

  return { source: text, flags: "" };
}

/**
 * Reads the example lists out of the answer.
 *
 * The recipe asks for a MATCHES heading and a DOES NOT MATCH heading, so those
 * are what we look for. A heading we do not recognise ends the current list
 * rather than being swallowed into it.
 */
export function parseExamples(output: string): { matches: string[]; rejects: string[] } {
  const matches: string[] = [];
  const rejects: string[] = [];
  let bucket: string[] | null = null;

  for (const raw of output.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const heading = line.replace(/[:.]$/, "").toUpperCase();
    if (heading === "DOES NOT MATCH" || heading === "DOES NOT MATCH:") {
      bucket = rejects;
      continue;
    }
    if (heading === "MATCHES") {
      bucket = matches;
      continue;
    }
    // Any other all-capitals heading ends the list — HOW IT WORKS, NOTES.
    if (/^[A-Z][A-Z \t]{3,}$/.test(heading) && heading === line.toUpperCase() && !/[a-z]/.test(line)) {
      bucket = null;
      continue;
    }
    if (!bucket) continue;

    // Strip list markers and surrounding quotes or backticks, which are
    // presentation rather than part of the string being tested.
    const example = line
      .replace(/^[-*•]\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .replace(/^[`"'“‘]+/, "")
      .replace(/[`"'”’]+$/, "")
      .trim();

    if (example) bucket.push(example);
  }

  return { matches, rejects };
}

export function checkRegexAnswer(output: string, flavour: string): RegexCheck {
  if (UNCHECKABLE_FLAVOURS.has(flavour)) return NOT_CHECKED;

  const firstLine = output.split("\n").find((line) => line.trim());
  if (!firstLine) return NOT_CHECKED;

  const parsed = parsePattern(firstLine);
  if (!parsed) return NOT_CHECKED;
  if (NOT_PORTABLE.some((token) => parsed.source.includes(token))) return NOT_CHECKED;
  // Extended mode changes what whitespace means, and JavaScript has no such flag.
  if (parsed.flags.includes("x")) return NOT_CHECKED;

  const flags = [...new Set([...parsed.flags.replace(/[^imsuy]/g, ""), ...(parsed.source.includes("\\p{") ? "u" : "")])].join("");

  let regex: RegExp;
  try {
    regex = new RegExp(parsed.source, flags);
  } catch {
    // The expression uses something this engine cannot parse, which means it
    // belongs to the target flavour and not to us. No verdict.
    return NOT_CHECKED;
  }

  const { matches, rejects } = parseExamples(output);
  if (matches.length === 0 && rejects.length === 0) return NOT_CHECKED;

  const wrong: RegexClaim[] = [];
  const test = (example: string) => {
    regex.lastIndex = 0;
    try {
      return regex.test(example);
    } catch {
      return null;
    }
  };

  for (const example of matches) {
    if (test(example) === false) wrong.push({ example, claimedMatch: true });
  }
  for (const example of rejects) {
    if (test(example) === true) wrong.push({ example, claimedMatch: false });
  }

  return { checked: true, total: matches.length + rejects.length, wrong, pattern: parsed.source };
}

/** The sentence shown under the result. Null when there is nothing to say. */
export function describeRegexCheck(check: RegexCheck): { tone: "info" | "warn"; text: string } | null {
  if (!check.checked || check.total === 0) return null;

  if (check.wrong.length === 0) {
    return {
      tone: "info",
      text: `All ${check.total} example${check.total === 1 ? "" : "s"} were run against this expression in your browser and behaved as the list says. That checks the expression against its own examples — it cannot tell you the expression is the one you wanted.`,
    };
  }

  const listed = check.wrong
    .map((claim) => `"${claim.example}" is listed as ${claim.claimedMatch ? "a match but is not" : "a non-match but does match"}`)
    .join("; ");

  return {
    tone: "warn",
    text: `Ran all ${check.total} examples in your browser: ${check.wrong.length} disagree${check.wrong.length === 1 ? "s" : ""} with the expression. ${listed}. One of the two is wrong and it may be the expression rather than the label, so check the pattern against your real data before using it.`,
  };
}
