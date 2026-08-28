import { describe, expect, it } from "vitest";

import { getPureOp } from "@/lib/engines/pure";
import { isOptionVisible } from "@/lib/engines/run";
import { TOOLS } from "@/lib/tools/registry";
import type { OptionSpec, OptionValues, ToolSpec } from "@/lib/tools/types";

/**
 * The option contract.
 *
 * An exhaustive sweep of all 59 pure tools turned up a class of bug that no
 * per-tool test would have caught: an option can be on screen and have no
 * effect, or a pair of options can quietly mean something different after a
 * neighbouring select changes. The BMI calculator read a metric height as
 * inches when you switched to imperial and reported a BMI of 1.7; the unit
 * converter offered ten quantities but only ever accepted units of length.
 *
 * So the rule is checked rather than remembered:
 *
 *   1. Every option the panel would show for a given set of choices is read by
 *      the engine for those same choices. A control that changes nothing is a
 *      bug whether or not it crashes.
 *   2. A tool's own defaults produce a result. Landing on a page and pressing
 *      the button has to work without editing anything first.
 *
 * Hidden options are exempt from (1) on purpose — that is what `showIf` is for.
 */

/** Input each text tool needs before its engine will reach its options. */
const INPUT: Record<string, string> = {
  "json-formatter": '{"b":2,"a":[1,2,{"c":true}]}',
  "json-validator": '{"b":2,"a":[1,2]}',
  "json-minifier": '{"b": 2, "a": [1, 2]}',
  "json-to-csv": '[{"name":"Ada","age":36},{"name":"Grace","age":45}]',
  "csv-to-json": "name,age\nAda,36\nGrace,45",
  "json-to-yaml": '{"a":1,"b":["x","y"]}',
  "yaml-to-json": "a: 1\nb:\n  - x\n  - y",
  "json-to-xml": '{"a":1,"b":"x"}',
  "xml-to-json": "<r><a x='1'>t</a><a>u</a></r>",
  "toml-to-json": 'title = "demo"\n[owner]\nname = "Ada"\n',
  "json-to-toml": '{"title":"demo","owner":{"name":"Ada"}}',
  "csv-to-xlsx": "name,age\nAda,36",
  "sql-formatter": "select a,b from t where a=1 order by b",
  "json-to-typescript": '{"id":1,"name":"Ada","tags":["x"],"meta":{"ok":true}}',
  "json-to-go": '{"id":1,"name":"Ada","tags":["x"]}',
  "json-path-finder": '{"a":{"b":[{"c":1}]}}',
  "unix-timestamp-converter": "1516239022",
  "cron-expression-parser": "*/5 9-17 * * 1-5",
  "jwt-decoder":
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkFkYSIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "base64-decode": "SGVsbG8sIHdvcmxkIQ==",
  "base64-encode": "Hello, world!",
  "url-decode": "https%3A%2F%2Fexample.com%2Fa%20b%3Fq%3D1",
  "url-encode": "https://example.com/a b?q=1&r=two#frag",
  "html-entity-decode": "&lt;p&gt;caf&amp;eacute;&lt;/p&gt;",
  "html-entity-encode": "<p>café & crème</p>",
  "query-string-parser": "https://example.com/x?q=1&r=two&r=three",
  "markdown-to-html": "# Title\n\nSome **bold** text.\n\n- one\n- two",
  "html-to-markdown": "<h1>Title</h1><p>Some <b>bold</b> text.</p>",
  "color-converter": "#3b82f6",
  "base-converter": "255",
  "roman-numeral-converter": "MMXXIV",
  "number-to-words": "1234",
  "regex-tester": "The quick brown fox jumps over the lazy dog",
  "text-diff": "one\ntwo\nthree",
};

const DEFAULT_INPUT = "The quick brown fox\njumps over the lazy dog\nThe quick brown fox";

/**
 * Values a tool genuinely cannot work without — a secret key, a date, a pattern.
 * Anything listed here is a field the person must fill in, so it is exempt from
 * the "defaults must produce a result" rule and supplied for the read check.
 */
const REQUIRED: Record<string, OptionValues> = {
  "hmac-generator": { key: "s3cret" },
  "find-and-replace": { find: "fox" },
  "regex-tester": { pattern: "\\b(\\w+o\\w*)\\b" },
  "age-calculator": { birth: "1990-06-15" },
  "date-difference-calculator": { start: "2024-01-01", end: "2026-08-28" },
  "text-diff": { compare: "one\n2\nthree" },
  "qr-code-generator": {
    ssid: "MyNet",
    name: "Ada Lovelace",
    phone: "+911234567890",
    email: "a@b.co",
    smsNumber: "+911234567890",
    emailTo: "a@b.co",
  },
};

/** Combinations worth trying: every choice of every select, others at default. */
function scenarios(tool: ToolSpec): OptionValues[] {
  const base: OptionValues = {};
  for (const option of tool.options) base[option.id] = option.default as never;
  Object.assign(base, REQUIRED[tool.slug] ?? {});

  const out: OptionValues[] = [base];
  for (const option of tool.options) {
    if (option.kind === "select") {
      for (const choice of option.choices) out.push({ ...base, [option.id]: choice.value });
    } else if (option.kind === "toggle") {
      out.push({ ...base, [option.id]: !option.default });
    }
  }
  return out;
}

function visibleIds(options: OptionSpec[], values: OptionValues): string[] {
  return options.filter((option) => isOptionVisible(option, values)).map((option) => option.id);
}

const PURE = TOOLS.filter((tool) => tool.engine === "pure");

describe("every pure tool", () => {
  it("has an engine op registered", () => {
    const missing = PURE.filter((tool) => !getPureOp(tool.op)).map((tool) => tool.slug);
    expect(missing).toEqual([]);
  });

  it("produces a result from its own defaults", async () => {
    const broken: string[] = [];
    for (const tool of PURE) {
      const op = getPureOp(tool.op);
      if (!op) continue;
      const values: OptionValues = {};
      for (const option of tool.options) values[option.id] = option.default as never;
      Object.assign(values, REQUIRED[tool.slug] ?? {});
      try {
        const result = await op(INPUT[tool.slug] ?? DEFAULT_INPUT, values);
        if (!result.output && !result.extra) broken.push(`${tool.slug}: empty result`);
      } catch (error) {
        broken.push(`${tool.slug}: ${(error as Error).message}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("reads every option the panel would show", async () => {
    const ignored: string[] = [];

    for (const tool of PURE) {
      const op = getPureOp(tool.op);
      if (!op) continue;
      const input = INPUT[tool.slug] ?? DEFAULT_INPUT;

      for (const values of scenarios(tool)) {
        const read = new Set<string>();
        const spy = new Proxy(values, {
          get(target, key: string) {
            if (typeof key === "string") read.add(key);
            return target[key as keyof typeof target];
          },
        }) as OptionValues;

        try {
          await op(input, spy);
        } catch {
          // A refusal is a legitimate answer; it just tells us nothing about
          // which options matter, so this scenario is skipped rather than failed.
          continue;
        }

        const unread = visibleIds(tool.options, values).filter((id) => !read.has(id));
        if (unread.length) {
          const shown = Object.entries(values)
            .filter(([, v]) => typeof v !== "object")
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(" ");
          ignored.push(`${tool.slug} ignores ${unread.join(", ")} when ${shown}`);
        }
      }
    }

    expect(ignored).toEqual([]);
  });
});

describe("unit-bearing calculators", () => {
  it("converts every quantity from its own default units", async () => {
    const tool = TOOLS.find((t) => t.slug === "unit-converter")!;
    const op = getPureOp(tool.op)!;
    const quantities = (tool.options.find((o) => o.id === "quantity") as { choices: { value: string }[] }).choices;

    for (const { value: quantity } of quantities) {
      const values: OptionValues = {};
      for (const option of tool.options) values[option.id] = option.default as never;
      values.quantity = quantity;
      const result = await op("", values);
      expect(result.output, quantity).toMatch(/=/);
    }
  });

  it("reads an imperial BMI as feet, inches and pounds", async () => {
    const op = getPureOp("bmi")!;
    const metric = await op("", { system: "metric", heightCm: 170, weightKg: 70 });
    const imperial = await op("", {
      system: "imperial",
      heightFt: 5,
      heightIn: 7,
      weightLb: 154,
    });

    // 5'7" and 154 lb is 170 cm and 70 kg give or take a rounding place, so the
    // two readings have to land on each other. Before the fix the imperial one
    // was 1.7, because 170 was being read as inches.
    const bmiOf = (out: string) => Number(out.match(/BMI\s+([\d.]+)/)![1]);
    expect(bmiOf(metric.output!)).toBeCloseTo(24.2, 1);
    expect(bmiOf(imperial.output!)).toBeGreaterThan(23.5);
    expect(bmiOf(imperial.output!)).toBeLessThan(24.5);
    expect(imperial.output).toContain("lb at 5 ft 7 in");
  });
});
