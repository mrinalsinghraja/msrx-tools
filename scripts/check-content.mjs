#!/usr/bin/env node
/**
 * The thin-content gate.
 *
 * Writing prose for a hundred tool pages is the point at which a site starts
 * generating filler without meaning to: the twentieth intro borrows a sentence
 * from the fifth, and by the sixtieth every page opens the same way. Google's
 * helpful-content system reads that pattern site-wide, so a hundred padded
 * pages would put the good ones at risk rather than joining them.
 *
 * Word counts alone cannot catch it — filler is long by nature. So the check
 * that matters here is the reuse check: no sentence, and no distinctive phrase,
 * may appear on two different tool pages. That is a fact about the corpus, not
 * an opinion about the writing, and it fails the build.
 *
 * Run with `npm run check:content`. `--strict` also fails on missing content,
 * which is what the launch gate will use once every tool has an entry.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// `.pathname` would percent-encode the space in this repository's parent
// directory and every path built from it would then miss.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONTENT_DIR = join(ROOT, "src/content/tools");
const CATALOG_DIR = join(ROOT, "src/lib/tools/catalog");

const MIN_INTRO_WORDS = 200;
const MIN_STEPS = 3;
const MIN_FAQ = 3;
/** Shorter than this and a repeated run of words is a turn of phrase, not reuse. */
const PHRASE_LENGTH = 8;

const strict = process.argv.includes("--strict");

/* ------------------------------------------------------------------ */
/* Reading the sources                                                  */
/* ------------------------------------------------------------------ */

function readSlugs(dir, pattern) {
  const slugs = new Set();
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".ts") || name === "index.ts" || name === "types.ts") continue;
    const source = readFileSync(join(dir, name), "utf8");
    for (const match of source.matchAll(pattern)) slugs.add(match[1]);
  }
  return slugs;
}

const registered = readSlugs(CATALOG_DIR, /^\s{4}slug: "([a-z0-9-]+)"/gm);
const written = readSlugs(CONTENT_DIR, /^\s{2}"([a-z0-9-]+)": \{/gm);

/**
 * The prose itself, pulled out of the TypeScript by structure rather than by
 * importing it — a script that has to compile the app to lint its copy is a
 * script nobody runs.
 */
function readEntries() {
  const entries = new Map();

  for (const name of readdirSync(CONTENT_DIR)) {
    if (!name.endsWith(".ts") || name === "index.ts") continue;
    const source = readFileSync(join(CONTENT_DIR, name), "utf8");

    // Each entry runs from its slug key to the start of the next one.
    const starts = [...source.matchAll(/^ {2}"([a-z0-9-]+)": \{$/gm)];
    for (const [index, start] of starts.entries()) {
      const from = start.index;
      const to = index + 1 < starts.length ? starts[index + 1].index : source.length;
      const block = source.slice(from, to);

      const intro = /intro: `([\s\S]*?)`,\n/.exec(block)?.[1] ?? "";
      const steps = [...block.matchAll(/^ {6}"((?:[^"\\]|\\.)*)",$/gm)].map((m) => m[1]);
      const faq = [...block.matchAll(/q: "((?:[^"\\]|\\.)*)",\s*\n\s*a:\s*\n?\s*"((?:[^"\\]|\\.)*)"/gm)];

      entries.set(start[1], { file: name, intro, steps, faq, block });
    }
  }

  return entries;
}

const entries = readEntries();

/* ------------------------------------------------------------------ */
/* Checks                                                               */
/* ------------------------------------------------------------------ */

const problems = [];
const words = (text) => text.split(/\s+/).filter(Boolean).length;

/** Sentences, normalised so punctuation and casing cannot hide a reuse. */
function sentencesOf(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim())
    .filter((s) => words(s) >= 6);
}

function phrasesOf(text) {
  const tokens = text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i + PHRASE_LENGTH <= tokens.length; i++) {
    out.add(tokens.slice(i, i + PHRASE_LENGTH).join(" "));
  }
  return out;
}

const sentenceOwners = new Map();
const phraseOwners = new Map();

for (const [slug, entry] of entries) {
  const introWords = words(entry.intro);

  if (introWords < MIN_INTRO_WORDS) {
    problems.push(`${slug}: intro is ${introWords} words, needs ${MIN_INTRO_WORDS}`);
  }
  if (entry.steps.length < MIN_STEPS) {
    problems.push(`${slug}: ${entry.steps.length} steps, needs ${MIN_STEPS}`);
  }
  if (entry.faq.length < MIN_FAQ) {
    problems.push(`${slug}: ${entry.faq.length} FAQ entries, needs ${MIN_FAQ}`);
  }
  if (!registered.has(slug)) {
    problems.push(`${slug}: has content but is not a tool in the registry`);
  }

  // The intro renders as plain paragraphs, so a backtick meant as inline code
  // prints as a backtick — and inside the template literal it holds, it does
  // not compile at all. Caught here because the failure looks like a syntax
  // error a hundred lines away from the sentence that caused it.
  if (entry.intro.includes("`")) {
    problems.push(`${slug}: intro contains a backtick — use quotes, the prose is not markdown`);
  }

  // Every distinctive word of the slug should appear somewhere in the prose.
  // A page about the CIDR calculator that never says "subnet" is about nothing.
  // Role nouns are excluded: a page about the CIDR calculator must say
  // "subnet", but insisting it says "calculator" tests nothing about whether
  // it is about anything.
  const ROLE_WORDS = new Set([
    "tool", "online", "free", "generator", "converter", "calculator", "checker",
    "parser", "viewer", "formatter", "editor", "maker", "builder", "inspector",
    "optimizer", "extractor", "tester", "counter", "encode", "decode", "from", "with", "into",
  ]);
  const terms = slug.split("-").filter((term) => term.length > 3 && !ROLE_WORDS.has(term));
  // Slugs are spelled the way people search, which is American. The prose is
  // British. Fold the difference rather than making the house voice lose to
  // the keyword.
  // -ise/-ize, and the nouns built on them: "equaliser" and "equalizer" are one
  // word, and a page should not be accused of ducking its own subject over a
  // spelling convention.
  const fold = (text) => text.toLowerCase().replace(/is(e|ed|es|er|ers|ing|ation)\b/g, "iz$1");
  const haystack = fold(`${entry.intro} ${entry.steps.join(" ")} ${entry.faq.map((f) => f[1]).join(" ")}`);
  const missing = terms.filter((term) => !haystack.includes(fold(term).slice(0, Math.max(4, term.length - 2))));
  if (missing.length) {
    problems.push(`${slug}: never mentions ${missing.join(", ")} — is this page about its own tool?`);
  }

  // Steps are excluded from the reuse checks on purpose. They describe the
  // same interface — a drop tray, an options panel, a result to copy — so two
  // tools telling you to paste text into the input box are not duplicating
  // content, they are describing the same box. The prose is where thin content
  // actually hides, and the prose is intro and answers.
  const body = `${entry.intro}\n${entry.faq.map((f) => f[1]).join("\n")}`;

  for (const sentence of sentencesOf(body)) {
    const owner = sentenceOwners.get(sentence);
    if (owner && owner !== slug) {
      problems.push(`${slug}: reuses a whole sentence from ${owner} — "${sentence.slice(0, 70)}…"`);
    } else {
      sentenceOwners.set(sentence, slug);
    }
  }

  for (const phrase of phrasesOf(body)) {
    const owner = phraseOwners.get(phrase);
    if (owner && owner !== slug) {
      problems.push(`${slug}: shares a ${PHRASE_LENGTH}-word phrase with ${owner} — "${phrase}"`);
    } else {
      phraseOwners.set(phrase, slug);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const missingContent = [...registered].filter((slug) => !written.has(slug)).sort();
const covered = registered.size - missingContent.length;
const percent = Math.round((covered / registered.size) * 100);

console.log(`Tool pages with prose: ${covered} of ${registered.size} (${percent}%)`);

if (missingContent.length) {
  console.log(`\nStill to write (${missingContent.length}):`);
  for (const slug of missingContent) console.log(`  ${slug}`);
}

if (problems.length) {
  console.log(`\n${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  // One line per problem, deduplicated: a phrase shared across a whole batch
  // would otherwise print hundreds of near-identical lines.
  for (const problem of [...new Set(problems)].slice(0, 60)) console.log(`  ${problem}`);
  if (new Set(problems).size > 60) console.log(`  … and ${new Set(problems).size - 60} more`);
  process.exit(1);
}

if (strict && missingContent.length) {
  console.log("\nStrict mode: every tool needs an entry before this passes.");
  process.exit(1);
}

console.log("\nNo repeated sentences or phrases across pages. Everything written is its own page.");
