import { num, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Reading scores.
 *
 * The one tool in the AI category that never leaves the device, because reading
 * ease is arithmetic and always was. Every formula here was published between
 * 1948 and 1975 and each is a fixed sum over four counts: sentences, words,
 * syllables and letters. Sending a document to a language model to be told its
 * Flesch score would be slower, less repeatable, and would have to be believed
 * rather than checked.
 *
 * Where they disagree is informative rather than a fault: Coleman–Liau and ARI
 * count letters, so they punish long words; Flesch and SMOG count syllables, so
 * they punish polysyllables specifically. A document of short Latinate words
 * scores differently under each, which is why all six are shown at once.
 */

/* ------------------------------------------------------------------ */
/* Counting                                                             */
/* ------------------------------------------------------------------ */

/**
 * Abbreviations whose full stop is not the end of a sentence.
 *
 * Without this a page of "Dr. Rao at 4 p.m." counts four sentences where there
 * is one, and every score built on words-per-sentence comes out wrong in the
 * flattering direction — which is the worst way for a readability tool to fail.
 *
 * Split in two, because the two behave differently. A title is never the end of
 * a sentence. A time or a company suffix frequently is.
 */
const NEVER_ENDS_A_SENTENCE = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "mt", "fr", "rev", "hon", "gen", "col",
  "capt", "lt", "sgt", "vs", "eg", "ie", "cf", "approx", "est", "fig", "no", "vol", "pp", "ed",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
]);

/**
 * Abbreviations that routinely finish a sentence: "... at 4 p.m. He was late."
 *
 * These are not skipped outright. They fall through to the capitalisation test
 * below, which is what decides — "etc. and so on" continues, "etc. Then we
 * left" does not. Treating them like a title would swallow the sentence break
 * whole, which is how a document of times and company names ends up counted as
 * one enormous sentence and scored as unreadable.
 */
const MAY_END_A_SENTENCE = new Set([
  "am", "pm", "etc", "al", "inc", "ltd", "co", "corp", "pvt",
  "us", "uk", "eu", "un", "govt", "dept", "univ",
]);

/**
 * Splits into sentences.
 *
 * A regular expression on `[.!?]` is the obvious approach and is wrong on the
 * first paragraph of most real documents: decimals, ellipses, initials,
 * abbreviations and quoted dialogue all carry a full stop that ends nothing. So
 * this walks the text and asks, at each candidate, whether the thing before it
 * is a word that takes a full stop and whether the thing after it looks like a
 * new sentence.
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char !== "." && char !== "!" && char !== "?" && char !== "\n") continue;

    if (char === "\n") {
      // A paragraph break ends a sentence even without punctuation — headings
      // and list items rarely carry a full stop and are sentences all the same.
      if (text[i + 1] === "\n") {
        const chunk = text.slice(start, i).trim();
        if (chunk) sentences.push(chunk);
        start = i + 1;
      }
      continue;
    }

    // Run past a cluster of terminators: "?!" and "..." each end one sentence.
    let end = i;
    while (end + 1 < text.length && ".!?".includes(text[end + 1])) end++;

    const before = text.slice(Math.max(0, start), i);
    const lastWord = (before.match(/([A-Za-z.]+)$/)?.[1] ?? "").toLowerCase().replace(/\./g, "");

    if (char === ".") {
      // A decimal point, a version number, an IP address: digit either side.
      if (/[0-9]$/.test(before) && /^[0-9]/.test(text.slice(end + 1))) continue;
      // A single letter is an initial — "J. R. Rao".
      if (lastWord.length === 1) continue;
      // A title is never a sentence ending. An abbreviation that can end one
      // is left for the capitalisation test a few lines down to judge.
      if (NEVER_ENDS_A_SENTENCE.has(lastWord)) continue;
      if (MAY_END_A_SENTENCE.has(lastWord) && !/^\s*[A-Z]/.test(text.slice(end + 1))) continue;
    }

    // Whatever follows must look like the start of something, not a lowercase
    // continuation. Closing quotes and brackets are allowed to intervene.
    const after = text.slice(end + 1);
    if (after.trim() && !/^["'”’)\]\s]*[A-Z0-9“"'(\[]/.test(after)) continue;

    const chunk = text.slice(start, end + 1).trim();
    if (chunk) sentences.push(chunk);
    start = end + 1;
  }

  const tail = text.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

/** Words, for counting purposes: anything with a letter or digit in it. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((token) => /[A-Za-z0-9]/.test(token));
}

/**
 * Estimates syllables in an English word.
 *
 * This is a heuristic and is described as one everywhere it surfaces. It counts
 * vowel groups, drops a silent terminal e, and knows a few endings that add a
 * beat. It is right for the great majority of ordinary words and wrong for
 * loanwords, names and anything where English spelling has stopped pretending
 * to be phonetic. Every published readability formula was calibrated against
 * hand-counted syllables, so a shared approximation is the honest thing to use.
 */
export function syllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean) return 0;
  if (clean.length <= 3) return 1;

  const trimmed = clean
    // A terminal "e" is usually silent, but not after "l" ("able") and not when
    // it is the whole vowel of the syllable ("the" is already out on length).
    .replace(/(?:[^laeiouy]e|[^laeiouy]es|ed)$/, "")
    .replace(/^y/, "");

  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  let count = groups ? groups.length : 1;

  return Math.max(1, count);
}

/**
 * A word Gunning Fog calls complex: three syllables or more.
 *
 * Fog explicitly excludes proper nouns, familiar compound words, and words that
 * only reach three syllables through a verb ending. The last of those is the
 * one that changes the number materially — without it every "-ing" in the
 * document inflates the score — so it is applied here, and the other two are
 * not, because deciding what a reader finds familiar is not something a
 * function can do.
 */
function isComplex(word: string): boolean {
  const clean = word.replace(/[^A-Za-z]/g, "");
  if (clean.length < 3) return false;
  if (syllables(clean) < 3) return false;
  const lower = clean.toLowerCase();
  if (/(?:ed|es|ing)$/.test(lower)) {
    const stem = lower.replace(/(?:ed|es|ing)$/, "");
    if (syllables(stem) < 3) return false;
  }
  return true;
}

export interface ReadabilityCounts {
  paragraphs: number;
  sentences: number;
  words: number;
  syllables: number;
  letters: number;
  characters: number;
  complexWords: number;
  polysyllables: number;
  longestSentence: number;
}

export function countText(text: string): ReadabilityCounts & { sentenceList: string[] } {
  const sentenceList = splitSentences(text);
  const words = splitWords(text);

  let syllableTotal = 0;
  let complexWords = 0;
  let polysyllables = 0;
  for (const word of words) {
    const count = syllables(word);
    syllableTotal += count;
    if (count >= 3) polysyllables++;
    if (isComplex(word)) complexWords++;
  }

  let longestSentence = 0;
  for (const sentence of sentenceList) {
    longestSentence = Math.max(longestSentence, splitWords(sentence).length);
  }

  return {
    sentenceList,
    paragraphs: text.split(/\n\s*\n/).filter((block) => block.trim()).length,
    sentences: sentenceList.length,
    words: words.length,
    syllables: syllableTotal,
    letters: (text.match(/[A-Za-z]/g) ?? []).length,
    characters: text.replace(/\s/g, "").length,
    complexWords,
    polysyllables,
    longestSentence,
  };
}

/* ------------------------------------------------------------------ */
/* The formulas                                                         */
/* ------------------------------------------------------------------ */

export interface Score {
  name: string;
  value: number;
  /** What the number means in words, and what it is measured in. */
  reading: string;
}

export function scores(counts: ReadabilityCounts): Score[] {
  const { words, sentences, syllables: sy, letters, complexWords, polysyllables } = counts;
  const perSentence = words / sentences;
  const perWord = sy / words;

  const flesch = 206.835 - 1.015 * perSentence - 84.6 * perWord;
  const fk = 0.39 * perSentence + 11.8 * perWord - 15.59;
  const fog = 0.4 * (perSentence + 100 * (complexWords / words));
  // SMOG is defined over a 30-sentence sample. Scaling to the document's own
  // sentence count is the standard generalisation and is what every calculator
  // does; below about 30 sentences it is noisy, and the note says so.
  const smog = 1.043 * Math.sqrt(polysyllables * (30 / sentences)) + 3.1291;
  const coleman = 0.0588 * ((letters / words) * 100) - 0.296 * ((sentences / words) * 100) - 15.8;
  const ari = 4.71 * (letters / words) + 0.5 * perSentence - 21.43;

  return [
    { name: "Flesch Reading Ease", value: round(flesch), reading: fleschBand(flesch) },
    { name: "Flesch–Kincaid Grade", value: round(fk), reading: gradeBand(fk) },
    { name: "Gunning Fog", value: round(fog), reading: gradeBand(fog) },
    { name: "SMOG Index", value: round(smog), reading: gradeBand(smog) },
    { name: "Coleman–Liau", value: round(coleman), reading: gradeBand(coleman) },
    { name: "Automated Readability", value: round(ari), reading: gradeBand(ari) },
  ];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Flesch's own bands, which run backwards: 100 is easiest. */
function fleschBand(value: number): string {
  if (value >= 90) return "very easy — a young child could read it";
  if (value >= 80) return "easy";
  if (value >= 70) return "fairly easy";
  if (value >= 60) return "plain English, readable by most adults";
  if (value >= 50) return "fairly hard";
  if (value >= 30) return "hard — university level";
  if (value >= 10) return "very hard — professional or academic";
  return "extremely hard — dense legal or technical prose";
}

/** The grade formulas all output US school years, which need translating. */
function gradeBand(value: number): string {
  const grade = Math.round(value);
  if (grade <= 5) return `school year ${Math.max(1, grade)} — around age ${Math.max(6, grade + 5)}`;
  if (grade <= 8) return `school year ${grade} — around age ${grade + 5}, the level most newspapers aim at`;
  if (grade <= 12) return `school year ${grade} — around age ${grade + 5}, upper secondary`;
  if (grade <= 16) return `undergraduate level`;
  return "postgraduate level";
}

/* ------------------------------------------------------------------ */
/* The op                                                               */
/* ------------------------------------------------------------------ */

export const readability: PureOp = (input, options): OpResult => {
  const text = input.trim();
  if (!text) throw new ToolError("Paste some text and the scores appear here.");

  const counts = countText(text);

  if (counts.words < 10) {
    throw new ToolError(
      `Reading scores need a passage, not a phrase — this is ${counts.words} word${counts.words === 1 ? "" : "s"}. Every one of these formulas averages over sentences, so a short sample gives a number that swings wildly. Around a hundred words is the point they settle down.`,
    );
  }
  if (counts.sentences === 0) {
    throw new ToolError("No sentence endings found, so there is nothing to average over. Check the text has full stops.");
  }

  const detail = str(options, "detail", "hard");
  const flagAbove = num(options, "flag", 25);
  const list = scores(counts);

  const lines: string[] = [];
  const width = Math.max(...list.map((score) => score.name.length));
  for (const score of list) {
    lines.push(`${score.name.padEnd(width)}  ${String(score.value).padStart(6)}   ${score.reading}`);
  }

  lines.push("");
  lines.push(
    `Averages: ${round(counts.words / counts.sentences)} words per sentence, ${round(counts.syllables / counts.words)} syllables per word, ${round((counts.complexWords / counts.words) * 100)}% words of three syllables or more.`,
  );

  if (detail === "hard") {
    const hard = counts.sentenceList
      .map((sentence) => ({ sentence, length: splitWords(sentence).length }))
      .filter((entry) => entry.length > flagAbove)
      .sort((a, b) => b.length - a.length)
      .slice(0, 10);

    lines.push("");
    if (hard.length === 0) {
      lines.push(`No sentence runs longer than ${Math.round(flagAbove)} words. Sentence length is not what is holding this back.`);
    } else {
      lines.push(`Sentences over ${Math.round(flagAbove)} words — ${hard.length} shown, longest first:`);
      lines.push("");
      for (const entry of hard) {
        const shown = entry.sentence.length > 220 ? `${entry.sentence.slice(0, 217)}…` : entry.sentence;
        lines.push(`  ${entry.length} words — ${shown.replace(/\s+/g, " ")}`);
        lines.push("");
      }
    }
  }

  const note =
    counts.sentences < 30
      ? "SMOG was designed for samples of thirty sentences or more. This passage has fewer, so read that one row as a rough indication rather than a score."
      : undefined;

  return {
    output: lines.join("\n").trimEnd(),
    format: "text",
    stats: [
      { label: "Words", value: counts.words.toLocaleString("en-IN") },
      { label: "Sentences", value: counts.sentences.toLocaleString("en-IN") },
      { label: "Paragraphs", value: counts.paragraphs.toLocaleString("en-IN") },
      { label: "Reading ease", value: String(list[0].value) },
      { label: "Grade level", value: String(list[1].value) },
      { label: "Longest sentence", value: `${counts.longestSentence} words` },
    ],
    note,
  };
};
