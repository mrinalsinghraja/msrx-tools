import type { OutputFormat } from "@/lib/engines/types";

/**
 * What an AI tool's workspace looks like, and how much it will take.
 *
 * Split out of `recipes.ts` so the browser can have it. The recipes hold the
 * prompts, which run to some fifteen kilobytes and are of no use to a page —
 * shipping them would be dead weight in every bundle and would put the working
 * instructions of every tool in view. These six fields are the part the input
 * box genuinely needs.
 *
 * It is also the single definition of `maxChars`: the textarea counts against
 * it as you type and the server refuses above it, and a site that disagrees
 * with itself about a limit lets you fill a box and then rejects the paste.
 */

export interface AiField {
  /** Cap on pasted input, in characters. Enforced on both sides of the wire. */
  maxChars: number;
  /** Heading above the input box. */
  inputLabel: string;
  placeholder: string;
  /** Verb on the run button. */
  runLabel: string;
  /** Drives the download extension on the result. */
  format?: OutputFormat;
  /** A standing caveat about this tool's output, shown under every result. */
  note?: string;
  /**
   * Measure each line of the finished answer and show the figure.
   *
   * Here because a language model cannot count. Asked to, this one counts
   * characters one at a time for thousands of tokens and still gets it wrong —
   * on the meta description tool it spent its entire budget deliberating and
   * returned an empty answer. The browser can count a string exactly, for free,
   * so it does, and the recipe is told not to try.
   *
   * `min` and `max` are the range that matters for this tool, and each line is
   * marked against them. Leave them out to show the count alone.
   */
  lineMetric?: { min?: number; max?: number };
}

export const AI_FIELDS: Record<string, AiField> = {
  "ai-prompt-generator": {
    maxChars: 4000,
    inputLabel: "What do you want the model to do?",
    placeholder: "Write weekly LinkedIn posts about warehouse safety for a mid-sized logistics firm. Serious tone, real incidents, no hype.",
    runLabel: "Generate the prompt",
  },
  "improve-prompt": {
    maxChars: 6000,
    inputLabel: "The prompt you are using now",
    placeholder: "write me a blog post about cybersecurity",
    runLabel: "Improve it",
  },
  "grammar-checker": {
    maxChars: 14000,
    inputLabel: "Text to check",
    placeholder: "Paste the paragraph, email or article you want checked…",
    runLabel: "Check it",
    note: "A language model is not a grammar engine — it can miss an error and it can occasionally change a word it should have left alone. Read the result before you send it.",
  },
  "paraphrase-text": {
    maxChars: 12000,
    inputLabel: "Text to reword",
    placeholder: "Paste the sentences you want said differently…",
    runLabel: "Reword it",
    note: "Rewording is not a way to pass someone else's work off as your own. If the ideas came from a source, cite the source — the words changing does not change that.",
  },
  "summarize-text": {
    maxChars: 24000,
    inputLabel: "Text to summarise",
    placeholder: "Paste the article, report, transcript or thread…",
    runLabel: "Summarise it",
  },
  "change-tone": {
    maxChars: 10000,
    inputLabel: "Text to re-pitch",
    placeholder: "Paste the message whose tone you want to change…",
    runLabel: "Change the tone",
  },
  "simplify-text": {
    maxChars: 12000,
    inputLabel: "Text to simplify",
    placeholder: "Paste the dense paragraph, policy, contract clause or abstract…",
    runLabel: "Simplify it",
  },
  "expand-text": {
    maxChars: 8000,
    inputLabel: "Your notes",
    placeholder: "- q3 revenue up 12%\n- two new clients, one churned\n- hiring freeze lifted in march",
    runLabel: "Write it up",
  },
  "bullet-points": {
    maxChars: 20000,
    inputLabel: "Text to break down",
    placeholder: "Paste the paragraphs, meeting notes or transcript…",
    runLabel: "Make the points",
  },
  "translate-text": {
    maxChars: 12000,
    inputLabel: "Text to translate",
    placeholder: "Paste the text in any language…",
    runLabel: "Translate it",
    note: "Machine translation is good enough to understand and to be understood. It is not good enough for a contract, a medical instruction or anything where a mistranslation costs something — have those checked by a person.",
  },
  "write-email": {
    maxChars: 8000,
    inputLabel: "What the email needs to say",
    placeholder: "Ask the vendor for a revised quote — the last one missed installation. Need it by Friday. We have worked with them twice before.",
    runLabel: "Write the email",
  },
  "title-generator": {
    // No fixed range: the limit depends on the platform chosen, from about 45
    // characters for an email subject to 60 for a blog title. The count alone
    // is what the writer needs.
    lineMetric: {},
    maxChars: 8000,
    inputLabel: "What the piece is about",
    placeholder: "An article explaining why browser-based file tools are faster than uploading to a server",
    runLabel: "Generate titles",
  },
  "meta-description-generator": {
    // Google truncates a description on pixel width; this range survives it on
    // both desktop and mobile for ordinary sentence case.
    lineMetric: { min: 140, max: 158 },
    maxChars: 12000,
    inputLabel: "The page, or what it is about",
    placeholder: "Paste the page's text, or describe it in a line or two…",
    runLabel: "Write the descriptions",
  },
  "blog-outline-generator": {
    maxChars: 6000,
    inputLabel: "The topic, and who it is for",
    placeholder: "How small clinics should choose a practice management system. For clinic owners, not IT staff.",
    runLabel: "Build the outline",
  },
  "social-post-generator": {
    maxChars: 8000,
    inputLabel: "What you want to post about",
    placeholder: "We rebuilt our video tools to run in the browser instead of uploading. Cut processing time from 40s to 6s.",
    runLabel: "Write the post",
  },
  "keyword-extractor": {
    maxChars: 24000,
    inputLabel: "Text to read",
    placeholder: "Paste an article, a page, or a set of customer messages…",
    runLabel: "Extract keywords",
    format: "text",
  },
  "sentiment-analysis": {
    maxChars: 24000,
    inputLabel: "Text to analyse",
    placeholder: "Paste reviews, survey answers, support messages — one per line works well…",
    runLabel: "Analyse it",
    note: "This is a reading of tone, not a measurement of it. Sarcasm, cultural register and mixed feelings all defeat sentiment analysis, and a percentage here should never be treated as data.",
  },
  "text-to-table": {
    maxChars: 20000,
    inputLabel: "Text to pull rows from",
    placeholder: "Paste emails, notes, a printed list, a copied web page — anything with repeating records…",
    runLabel: "Extract the table",
    format: "csv",
  },
  "regex-generator": {
    maxChars: 4000,
    inputLabel: "What should it match?",
    placeholder: "An Indian mobile number, optionally with +91 or 0 in front, with or without a space or dash after the country code",
    runLabel: "Build the regex",
    format: "code",
    note: "Test any expression before you ship it. A regex that matches your examples can still match things you never thought of — that is how validation bugs get written.",
  },
  "sql-generator": {
    maxChars: 4000,
    inputLabel: "What do you want to know?",
    placeholder: "The ten customers who spent the most last quarter, with how many orders each of them placed",
    runLabel: "Write the query",
    format: "code",
    note: "Read the query before you run it, and run it on a copy first. A model cannot know about your indexes, your row counts or a column that means something other than its name suggests.",
  },
  "explain-code": {
    maxChars: 16000,
    inputLabel: "Code to explain",
    placeholder: "Paste a function, a file, a config, a shell one-liner…",
    runLabel: "Explain it",
  },
  "commit-message-generator": {
    maxChars: 20000,
    inputLabel: "Your diff, or a description of the change",
    placeholder: "Paste the output of git diff --staged…",
    runLabel: "Write the message",
  },
  "citation-generator": {
    maxChars: 4000,
    inputLabel: "The source details",
    placeholder: "Paste the details you have: title, author, publication, year, URL, DOI, publisher, page numbers — in any order.",
    runLabel: "Format the citation",
    note: "The reference is only as good as the details you paste in. This tool cannot open a URL or look a work up, so it will format what you give it and tell you what is missing.",
  },
};

export function aiField(slug: string): AiField | undefined {
  return AI_FIELDS[slug];
}
