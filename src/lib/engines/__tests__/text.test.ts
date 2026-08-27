import { describe, expect, it } from "vitest";

import {
  caseConvert,
  dedupeLines,
  DIFF_SEPARATOR,
  findReplace,
  htmlToMarkdown,
  loremIpsum,
  markdownToHtml,
  regexTest,
  removeLineBreaks,
  slugify,
  sortLines,
  textDiff,
  wordCount,
  type DiffPayload,
} from "@/lib/engines/pure/text";
import { ToolError, type PureOp } from "@/lib/engines/types";

async function run(op: PureOp, input: string, options: Record<string, unknown> = {}) {
  return await op(input, options as never);
}

describe("case conversion", () => {
  const sample = "the quick brown fox jumps";

  it("keeps minor words lowercase in title case but capitalises the first", async () => {
    const result = await run(caseConvert, "the lord of the rings", { target: "title" });
    expect(result.output).toBe("The Lord of the Rings");
  });

  it("produces camelCase from spaced words", async () => {
    expect((await run(caseConvert, sample, { target: "camel" })).output).toBe("theQuickBrownFox" + "Jumps");
  });

  it("splits an existing camelCase identifier correctly", async () => {
    expect((await run(caseConvert, "getHTTPResponseCode", { target: "kebab" })).output).toBe(
      "get-http-response-code",
    );
  });

  it("capitalises after each sentence in sentence case", async () => {
    expect((await run(caseConvert, "one thing. another thing", { target: "sentence" })).output).toBe(
      "One thing. Another thing",
    );
  });

  it("makes CONSTANT_CASE", async () => {
    expect((await run(caseConvert, "max retry count", { target: "constant" })).output).toBe("MAX_RETRY_COUNT");
  });
});

describe("word counting", () => {
  it("counts words, sentences and paragraphs", async () => {
    const result = await run(wordCount, "One two three. Four five!\n\nSecond paragraph here.");
    expect(result.output).toContain("Words                 8");
    expect(result.output).toContain("Sentences             3");
    expect(result.output).toContain("Paragraphs            2");
  });

  it("counts words with apostrophes and hyphens as one word", async () => {
    const result = await run(wordCount, "don't well-known");
    expect(result.output).toContain("Words                 2");
  });

  it("scales reading time with the chosen speed", async () => {
    const text = Array.from({ length: 450 }, () => "word").join(" ");
    const slow = await run(wordCount, text, { wpm: 225 });
    expect(slow.stats?.find((s) => s.label === "Reading time")?.value).toBe("2 min");
  });
});

describe("line operations", () => {
  it("sorts numerically when natural order is on", async () => {
    const result = await run(sortLines, "item10\nitem2\nitem1", { natural: true });
    expect(result.output.split("\n")).toEqual(["item1", "item2", "item10"]);
  });

  it("sorts lexically when natural order is off", async () => {
    const result = await run(sortLines, "item10\nitem2\nitem1", { natural: false });
    expect(result.output.split("\n")).toEqual(["item1", "item10", "item2"]);
  });

  it("reverses for descending", async () => {
    const result = await run(sortLines, "b\na\nc", { order: "desc" });
    expect(result.output.split("\n")).toEqual(["c", "b", "a"]);
  });

  it("keeps the first occurrence by default", async () => {
    const result = await run(dedupeLines, "a\nb\na\nc\nb");
    expect(result.output.split("\n")).toEqual(["a", "b", "c"]);
  });

  it("keeps only lines that appear exactly once", async () => {
    const result = await run(dedupeLines, "a\nb\na\nc", { keep: "unique" });
    expect(result.output.split("\n")).toEqual(["b", "c"]);
  });

  it("keeps the last occurrence when asked", async () => {
    const result = await run(dedupeLines, "a1\nb\na1", { keep: "last" });
    expect(result.output.split("\n")).toEqual(["b", "a1"]);
  });

  it("reports how many lines it removed", async () => {
    const result = await run(dedupeLines, "a\na\na");
    expect(result.stats).toEqual(expect.arrayContaining([{ label: "Removed", value: "2" }]));
  });
});

describe("line breaks", () => {
  it("unwraps within a paragraph but keeps the paragraph break", async () => {
    const result = await run(removeLineBreaks, "one\ntwo\n\nthree\nfour", { mode: "single" });
    expect(result.output).toBe("one two\n\nthree four");
  });

  it("flattens everything in all mode", async () => {
    const result = await run(removeLineBreaks, "one\ntwo\n\nthree", { mode: "all" });
    expect(result.output).toBe("one two three");
  });

  it("collapses runs of blank lines in extra mode", async () => {
    const result = await run(removeLineBreaks, "a\n\n\n\nb", { mode: "extra" });
    expect(result.output).toBe("a\n\nb");
  });
});

describe("find and replace", () => {
  it("replaces every occurrence and counts them", async () => {
    const result = await run(findReplace, "cat cat cat", { find: "cat", replace: "dog" });
    expect(result.output).toBe("dog dog dog");
    expect(result.stats).toEqual(expect.arrayContaining([{ label: "Replacements", value: "3" }]));
  });

  it("treats the needle literally unless regex is on", async () => {
    const result = await run(findReplace, "a.b axb", { find: "a.b", replace: "X" });
    expect(result.output).toBe("X axb");
  });

  it("honours whole-word matching", async () => {
    const result = await run(findReplace, "cat catalogue", { find: "cat", replace: "dog", wholeWord: true });
    expect(result.output).toBe("dog catalogue");
  });

  it("explains an invalid regex instead of crashing", async () => {
    await expect(run(findReplace, "x", { find: "([", replace: "", regex: true })).rejects.toBeInstanceOf(
      ToolError,
    );
  });
});

describe("regex tester", () => {
  it("lists every match", async () => {
    const result = await run(regexTest, "a1 b2 c3", { pattern: "[a-z]\\d", flags: "g" });
    expect(result.output.split("\n")).toEqual(["a1", "b2", "c3"]);
  });

  it("enumerates matches even without the g flag", async () => {
    const result = await run(regexTest, "a1 b2", { pattern: "[a-z]\\d", flags: "" });
    expect(result.stats).toEqual(expect.arrayContaining([{ label: "Matches", value: "2" }]));
  });

  it("shows capture groups when asked", async () => {
    const result = await run(regexTest, "2026-08-27", {
      pattern: "(\\d{4})-(\\d{2})",
      flags: "g",
      output: "groups",
    });
    expect(result.output).toContain("$1 = 2026");
    expect(result.output).toContain("$2 = 08");
  });

  it("applies a replacement with backreferences", async () => {
    const result = await run(regexTest, "John Smith", {
      pattern: "(\\w+) (\\w+)",
      flags: "",
      output: "replace",
      replacement: "$2, $1",
    });
    expect(result.output).toBe("Smith, John");
  });
});

describe("diff", () => {
  it("counts added and removed lines", async () => {
    const result = await run(textDiff, `one\ntwo\n${DIFF_SEPARATOR}one\ntwo\nthree\n`, {
      granularity: "line",
    });
    const payload = result.extra as DiffPayload;
    expect(payload.added).toBe(1);
    expect(payload.removed).toBe(0);
  });

  it("reports identical inputs as identical", async () => {
    const result = await run(textDiff, `same${DIFF_SEPARATOR}same`);
    expect(result.stats).toEqual(expect.arrayContaining([{ label: "Identical", value: "Yes" }]));
  });

  it("does not drag an unchanged last line into the change block", async () => {
    // Neither side ends with a newline; only the middle line differs.
    const result = await run(textDiff, `alpha\nbeta\ngamma${DIFF_SEPARATOR}alpha\nBETA\ngamma`, {
      granularity: "line",
    });
    const payload = result.extra as DiffPayload;
    expect(payload.added).toBe(1);
    expect(payload.removed).toBe(1);
  });

  it("ignores case when told to", async () => {
    const result = await run(textDiff, `Hello${DIFF_SEPARATOR}hello`, { ignoreCase: true });
    expect(result.stats).toEqual(expect.arrayContaining([{ label: "Identical", value: "Yes" }]));
  });
});

describe("markdown", () => {
  it("renders headings and emphasis", async () => {
    const result = await run(markdownToHtml, "# Title\n\nSome **bold** text.");
    expect(result.output).toContain("<h1>Title</h1>");
    expect(result.output).toContain("<strong>bold</strong>");
  });

  it("renders GFM tables when enabled", async () => {
    const result = await run(markdownToHtml, "| a | b |\n| - | - |\n| 1 | 2 |", { gfm: true });
    expect(result.output).toContain("<table>");
  });

  it("converts HTML back to markdown", async () => {
    const result = await run(htmlToMarkdown, "<h2>Heading</h2><p>Text with <em>emphasis</em>.</p>");
    expect(result.output).toContain("## Heading");
    expect(result.output).toContain("_emphasis_");
  });

  it("honours the chosen bullet marker", async () => {
    const result = await run(htmlToMarkdown, "<ul><li>one</li></ul>", { bulletMarker: "*" });
    expect(result.output.trim().startsWith("*")).toBe(true);
  });
});

describe("slug", () => {
  it("strips accents rather than dropping the letter", async () => {
    expect((await run(slugify, "Café Crème")).output).toBe("cafe-creme");
  });

  it("collapses punctuation into the separator", async () => {
    expect((await run(slugify, "Hello, World! -- Again")).output).toBe("hello-world-again");
  });

  it("uses a custom separator", async () => {
    expect((await run(slugify, "one two", { separator: "_" })).output).toBe("one_two");
  });

  it("drops stop words on request", async () => {
    expect((await run(slugify, "the state of the art", { stripStopWords: true })).output).toBe("state-art");
  });

  it("truncates on a separator boundary, not mid-word", async () => {
    const result = await run(slugify, "one two three four five", { maxLength: 12 });
    expect(result.output.endsWith("-")).toBe(false);
    expect(result.output.length).toBeLessThanOrEqual(12);
  });
});

describe("lorem ipsum", () => {
  it("produces the requested number of paragraphs", async () => {
    const result = await run(loremIpsum, "", { unit: "paragraphs", count: 3 });
    expect(result.output.split("\n\n")).toHaveLength(3);
  });

  it("starts with the classic opening when asked", async () => {
    const result = await run(loremIpsum, "", { classic: true });
    expect(result.output.toLowerCase().startsWith("lorem ipsum dolor sit amet")).toBe(true);
  });

  it("wraps in paragraph tags for HTML output", async () => {
    const result = await run(loremIpsum, "", { html: true, count: 2 });
    expect(result.output.match(/<p>/g)).toHaveLength(2);
  });

  it("returns exactly the requested word count", async () => {
    const result = await run(loremIpsum, "", { unit: "words", count: 12 });
    expect(result.output.split(/\s+/)).toHaveLength(12);
  });
});
