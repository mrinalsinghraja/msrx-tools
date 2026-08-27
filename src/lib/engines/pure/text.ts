import { diffChars, diffLines, diffWords, type Change } from "diff";
import { marked } from "marked";
import TurndownService from "turndown";

import { bool, num, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Text shaping — case, counting, sorting, replacing, wrapping, diffing —
 * plus the Markdown/HTML round trip.
 */

/* ------------------------------------------------------------------ */
/* Case                                                                 */
/* ------------------------------------------------------------------ */

/** Split on the boundaries every naming convention agrees on. */
function words(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

/** Words that stay lowercase inside a title unless they lead or trail it. */
const TITLE_MINOR = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "nor", "of", "on",
  "onto", "or", "over", "per", "so", "the", "to", "up", "via", "with", "yet",
]);

function titleCase(text: string): string {
  return text.replace(/[^\s]+/g, (word, offset: number) => {
    const lower = word.toLowerCase();
    const isEdge = offset === 0 || offset + word.length >= text.trimEnd().length;
    if (!isEdge && TITLE_MINOR.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

function sentenceCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase());
}

export const caseConvert: PureOp = (input, options): OpResult => {
  if (!input) return { output: "" };
  const target = str(options, "target", "title");
  const parts = words(input);

  switch (target) {
    case "lower":
      return { output: input.toLowerCase() };
    case "upper":
      return { output: input.toUpperCase() };
    case "sentence":
      return { output: sentenceCase(input) };
    case "title":
      return { output: titleCase(input) };
    case "camel":
      return {
        output: parts
          .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
          .join(""),
      };
    case "pascal":
      return {
        output: parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(""),
      };
    case "snake":
      return { output: parts.map((w) => w.toLowerCase()).join("_") };
    case "constant":
      return { output: parts.map((w) => w.toUpperCase()).join("_") };
    case "kebab":
      return { output: parts.map((w) => w.toLowerCase()).join("-") };
    case "alternating":
      return {
        output: Array.from(input)
          .map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase()))
          .join(""),
      };
    default:
      return { output: input };
  }
};

/* ------------------------------------------------------------------ */
/* Counting                                                             */
/* ------------------------------------------------------------------ */

/** Words that carry no meaning in a frequency list. */
const STOP_WORDS = new Set([
  "the", "and", "a", "an", "of", "to", "in", "is", "it", "that", "for", "on", "with", "as", "was",
  "at", "by", "be", "this", "are", "or", "from", "but", "not", "have", "has", "had", "you", "we",
  "they", "he", "she", "i", "his", "her", "their", "its", "our", "your", "if", "then", "than",
  "so", "no", "do", "does", "did", "will", "would", "can", "could", "there", "been", "were",
]);

export const wordCount: PureOp = (input, options): OpResult => {
  const text = input;
  const wordList = text.match(/[\p{L}\p{N}'’-]+/gu) ?? [];
  const sentences = (text.match(/[^.!?…]+[.!?…]+(\s|$)/g) ?? []).length || (text.trim() ? 1 : 0);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const lines = text ? text.split("\n").length : 0;
  const charsNoSpaces = text.replace(/\s/g, "").length;
  const wpm = Math.max(1, num(options, "wpm", 225));
  const minutes = wordList.length / wpm;

  const readingTime =
    minutes < 1 ? `${Math.max(1, Math.round(minutes * 60))} sec` : `${Math.round(minutes)} min`;

  const lines_out = [
    `Words                 ${wordList.length}`,
    `Characters            ${text.length}`,
    `Characters (no spaces) ${charsNoSpaces}`,
    `Sentences             ${sentences}`,
    `Paragraphs            ${paragraphs}`,
    `Lines                 ${lines}`,
    `Reading time          ${readingTime} at ${wpm} wpm`,
    `Speaking time         ${Math.max(1, Math.round(wordList.length / 130))} min at 130 wpm`,
  ];

  if (bool(options, "topWords", true) && wordList.length) {
    const counts = new Map<string, number>();
    for (const w of wordList) {
      const key = w.toLowerCase();
      if (STOP_WORDS.has(key) || key.length < 3) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const top = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10);
    if (top.length) {
      lines_out.push("", "Most frequent words (common words excluded)");
      const width = Math.max(...top.map(([w]) => w.length));
      for (const [w, n] of top) lines_out.push(`  ${w.padEnd(width)}  ${n}`);
    }
  }

  return {
    output: lines_out.join("\n"),
    stats: [
      { label: "Words", value: String(wordList.length) },
      { label: "Characters", value: String(text.length) },
      { label: "Reading time", value: readingTime },
    ],
  };
};

/* ------------------------------------------------------------------ */
/* Lines                                                                */
/* ------------------------------------------------------------------ */

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export const sortLines: PureOp = (input, options): OpResult => {
  const lines = input.split("\n");
  const order = str(options, "order", "asc");
  const natural = bool(options, "natural", true);
  const ignoreCase = bool(options, "ignoreCase", true);

  let sorted = [...lines];
  if (order === "random") {
    // Fisher–Yates. Math.random is fine here: shuffling lines is not a security decision.
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  } else if (order === "length") {
    sorted.sort((a, b) => a.length - b.length || collator.compare(a, b));
  } else {
    const compare = natural
      ? collator.compare
      : (a: string, b: string) => {
          const x = ignoreCase ? a.toLowerCase() : a;
          const y = ignoreCase ? b.toLowerCase() : b;
          return x < y ? -1 : x > y ? 1 : 0;
        };
    sorted.sort(compare);
    if (order === "desc") sorted.reverse();
  }

  if (bool(options, "dedupe")) {
    const seen = new Set<string>();
    sorted = sorted.filter((l) => {
      const key = ignoreCase ? l.toLowerCase() : l;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return {
    output: sorted.join("\n"),
    stats: [
      { label: "Lines in", value: String(lines.length) },
      { label: "Lines out", value: String(sorted.length) },
    ],
  };
};

export const dedupeLines: PureOp = (input, options): OpResult => {
  const lines = input.split("\n");
  const ignoreCase = bool(options, "ignoreCase");
  const trim = bool(options, "trim", true);
  const keepEmpty = bool(options, "keepEmpty");
  const keep = str(options, "keep", "first");

  const keyOf = (line: string) => {
    let k = trim ? line.trim() : line;
    if (ignoreCase) k = k.toLowerCase();
    return k;
  };

  const counts = new Map<string, number>();
  for (const line of lines) {
    if (!keepEmpty && !line.trim()) continue;
    const k = keyOf(line);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const seen = new Set<string>();
  let out: string[];

  if (keep === "unique") {
    out = lines.filter((line) => {
      if (!line.trim()) return keepEmpty;
      return counts.get(keyOf(line)) === 1;
    });
  } else if (keep === "last") {
    const lastIndex = new Map<string, number>();
    lines.forEach((line, i) => {
      if (!line.trim() && !keepEmpty) return;
      lastIndex.set(keyOf(line), i);
    });
    out = lines.filter((line, i) => {
      if (!line.trim()) return keepEmpty;
      return lastIndex.get(keyOf(line)) === i;
    });
  } else {
    out = lines.filter((line) => {
      if (!line.trim()) return keepEmpty;
      const k = keyOf(line);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  const removed = lines.length - out.length;
  return {
    output: out.join("\n"),
    stats: [
      { label: "Lines in", value: String(lines.length) },
      { label: "Lines out", value: String(out.length) },
      { label: "Removed", value: String(removed) },
    ],
  };
};

export const removeLineBreaks: PureOp = (input, options): OpResult => {
  const mode = str(options, "mode", "single");
  const joiner = str(options, "joiner", " ");
  const trimLines = bool(options, "trimLines", true);

  const normalised = input.replace(/\r\n?/g, "\n");
  let out: string;

  if (mode === "all") {
    out = normalised
      .split("\n")
      .map((l) => (trimLines ? l.trim() : l))
      .filter(Boolean)
      .join(joiner);
  } else if (mode === "extra") {
    out = normalised.replace(/\n{3,}/g, "\n\n");
  } else {
    // Collapse single breaks inside a paragraph, keep the blank line between them.
    out = normalised
      .split(/\n\s*\n/)
      .map((para) =>
        para
          .split("\n")
          .map((l) => (trimLines ? l.trim() : l))
          .filter(Boolean)
          .join(joiner),
      )
      .filter(Boolean)
      .join("\n\n");
  }

  return {
    output: out,
    stats: [
      { label: "Breaks before", value: String((normalised.match(/\n/g) ?? []).length) },
      { label: "Breaks after", value: String((out.match(/\n/g) ?? []).length) },
    ],
  };
};

/* ------------------------------------------------------------------ */
/* Search & replace                                                     */
/* ------------------------------------------------------------------ */

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const findReplace: PureOp = (input, options): OpResult => {
  const find = str(options, "find");
  if (!find) return { output: input, note: "Enter something to find and the replacement runs straight away." };

  const replace = str(options, "replace");
  const flags = bool(options, "caseSensitive") ? "g" : "gi";

  let pattern: RegExp;
  if (bool(options, "regex")) {
    try {
      pattern = new RegExp(find, flags);
    } catch (error) {
      throw new ToolError(
        `That regular expression won't compile: ${error instanceof Error ? error.message : "invalid pattern"}`,
      );
    }
  } else {
    const body = escapeRegExp(find);
    pattern = new RegExp(bool(options, "wholeWord") ? `\\b${body}\\b` : body, flags);
  }

  const matches = input.match(pattern)?.length ?? 0;
  return {
    output: input.replace(pattern, replace),
    stats: [{ label: "Replacements", value: String(matches) }],
  };
};

export const regexTest: PureOp = (input, options): OpResult => {
  const patternText = str(options, "pattern");
  if (!patternText) return { output: "", note: "Enter a pattern to see its matches." };

  const flagText = str(options, "flags", "g");
  let pattern: RegExp;
  try {
    pattern = new RegExp(patternText, flagText);
  } catch (error) {
    throw new ToolError(
      `That regular expression won't compile: ${error instanceof Error ? error.message : "invalid pattern"}`,
    );
  }

  const output = str(options, "output", "matches");
  if (output === "replace") {
    const replaced = input.replace(pattern, str(options, "replacement"));
    return { output: replaced };
  }

  // Force the global flag for enumeration; without it matchAll throws.
  const scanner = new RegExp(patternText, flagText.includes("g") ? flagText : `${flagText}g`);
  const found = Array.from(input.matchAll(scanner));

  if (found.length === 0) {
    return { output: "", note: "No matches.", stats: [{ label: "Matches", value: "0" }] };
  }

  const lines = found.map((m) => {
    if (output === "groups" && m.length > 1) {
      const groups = m.slice(1).map((g, i) => `    $${i + 1} = ${g ?? "(no match)"}`);
      const named = m.groups
        ? Object.entries(m.groups).map(([k, v]) => `    ${k} = ${v ?? "(no match)"}`)
        : [];
      return [`@${m.index}  ${m[0]}`, ...groups, ...named].join("\n");
    }
    return m[0];
  });

  return {
    output: lines.join("\n"),
    stats: [
      { label: "Matches", value: String(found.length) },
      { label: "Flags", value: flagText || "none" },
    ],
  };
};

/* ------------------------------------------------------------------ */
/* Diff                                                                 */
/* ------------------------------------------------------------------ */

export interface DiffPayload {
  changes: { value: string; added?: boolean; removed?: boolean }[];
  added: number;
  removed: number;
  granularity: string;
}

/**
 * Input arrives as the two sides joined by a sentinel — the diff tool's custom
 * panel owns two editors but the op contract is a single string.
 */
export const DIFF_SEPARATOR = " ---msrx-diff--- ";

export const textDiff: PureOp = (input, options): OpResult => {
  const [left = "", right = ""] = input.split(DIFF_SEPARATOR);
  const granularity = str(options, "granularity", "line");
  const config = {
    ignoreCase: bool(options, "ignoreCase"),
    ignoreWhitespace: bool(options, "ignoreWhitespace"),
  };

  let changes: Change[];
  if (granularity === "word") changes = diffWords(left, right, config);
  else if (granularity === "char") changes = diffChars(left, right, config);
  else {
    // In line mode a missing trailing newline makes the last line of one side
    // differ from the identical last line of the other, which drags an unchanged
    // line into the changed block. Nobody pastes a trailing newline on purpose.
    const withNewline = (text: string) => (text.endsWith("\n") || text === "" ? text : `${text}\n`);
    changes = diffLines(withNewline(left), withNewline(right), config);
  }

  let added = 0;
  let removed = 0;
  for (const c of changes) {
    const units = granularity === "line" ? (c.count ?? 0) : c.value.length;
    if (c.added) added += units;
    else if (c.removed) removed += units;
  }

  const unit = granularity === "line" ? "lines" : granularity === "word" ? "words" : "characters";
  const payload: DiffPayload = {
    changes: changes.map((c) => ({ value: c.value, added: c.added, removed: c.removed })),
    added,
    removed,
    granularity,
  };

  const text = changes
    .map((c) => {
      const prefix = c.added ? "+ " : c.removed ? "- " : "  ";
      return c.value
        .split("\n")
        .filter((l, i, arr) => !(i === arr.length - 1 && l === ""))
        .map((l) => prefix + l)
        .join("\n");
    })
    .join("\n");

  return {
    output: text,
    extra: payload,
    stats: [
      { label: `Added ${unit}`, value: String(added) },
      { label: `Removed ${unit}`, value: String(removed) },
      { label: "Identical", value: added === 0 && removed === 0 ? "Yes" : "No" },
    ],
  };
};

/* ------------------------------------------------------------------ */
/* Markdown <-> HTML                                                    */
/* ------------------------------------------------------------------ */

export const markdownToHtml: PureOp = async (input, options): Promise<OpResult> => {
  const html = await marked.parse(input, {
    gfm: bool(options, "gfm", true),
    breaks: bool(options, "breaks"),
  });
  return { output: html, format: "html" };
};

export const htmlToMarkdown: PureOp = (input, options): OpResult => {
  const service = new TurndownService({
    headingStyle: str(options, "headingStyle", "atx") === "setext" ? "setext" : "atx",
    bulletListMarker: (str(options, "bulletMarker", "-") || "-") as "-" | "*" | "+",
    codeBlockStyle: "fenced",
  });
  return { output: service.turndown(input), format: "markdown" };
};

/* ------------------------------------------------------------------ */
/* Slug & lorem                                                         */
/* ------------------------------------------------------------------ */

const SLUG_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "is", "are",
]);

export const slugify: PureOp = (input, options): OpResult => {
  const separator = str(options, "separator", "-").slice(0, 1) || "-";
  const maxLength = num(options, "maxLength", 0);

  let out = input
    .normalize("NFKD")
    // Strip combining marks so "café" becomes "cafe" rather than losing the e.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  if (bool(options, "lowercase", true)) out = out.toLowerCase();

  let parts = out.split(/\s+/).filter(Boolean);
  if (bool(options, "stripStopWords")) {
    const kept = parts.filter((w) => !SLUG_STOP_WORDS.has(w.toLowerCase()));
    if (kept.length) parts = kept;
  }

  let slug = parts.join(separator);
  if (maxLength > 0 && slug.length > maxLength) {
    slug = slug.slice(0, maxLength);
    const lastSep = slug.lastIndexOf(separator);
    if (lastSep > maxLength * 0.5) slug = slug.slice(0, lastSep);
  }

  return { output: slug, stats: [{ label: "Length", value: `${slug.length} chars` }] };
};

const LOREM_WORDS =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(
    " ",
  );

function loremWords(count: number, startClassic: boolean): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(startClassic && i < 8 ? LOREM_WORDS[i] : LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
  }
  return out;
}

function loremSentence(startClassic: boolean): string {
  const length = 8 + Math.floor(Math.random() * 12);
  const parts = loremWords(length, startClassic);
  const sentence = parts.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

export const loremIpsum: PureOp = (_input, options): OpResult => {
  const unit = str(options, "unit", "paragraphs");
  const count = Math.max(1, num(options, "count", 3));
  const classic = bool(options, "classic", true);
  const html = bool(options, "html");

  let blocks: string[];
  if (unit === "words") {
    blocks = [loremWords(count, classic).join(" ")];
  } else if (unit === "sentences") {
    blocks = [Array.from({ length: count }, (_, i) => loremSentence(classic && i === 0)).join(" ")];
  } else {
    blocks = Array.from({ length: count }, (_, p) =>
      Array.from({ length: 3 + Math.floor(Math.random() * 3) }, (_, s) =>
        loremSentence(classic && p === 0 && s === 0),
      ).join(" "),
    );
  }

  const output = html ? blocks.map((b) => `<p>${b}</p>`).join("\n") : blocks.join("\n\n");
  const wordTotal = output.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;

  return {
    output,
    format: html ? "html" : "text",
    stats: [
      { label: "Words", value: String(wordTotal) },
      { label: "Characters", value: String(output.length) },
    ],
  };
};
