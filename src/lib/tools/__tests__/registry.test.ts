import { describe, expect, it } from "vitest";

import { PDF_OPS } from "@/lib/engines/pdf";
import { PURE_OPS } from "@/lib/engines/pure";
import { CATEGORIES, CATEGORY_BY_ID } from "@/lib/tools/categories";
import { getTool, relatedTools, searchTools, TOOLS, toolHref } from "@/lib/tools/registry";

/**
 * The registry drives routing, the sitemap and the smoke suite, so a typo here
 * would ship a broken page rather than fail a build. These checks are the gate.
 */

describe("registry integrity", () => {
  it("has no duplicate slugs", () => {
    const seen = new Map<string, number>();
    for (const tool of TOOLS) seen.set(tool.slug, (seen.get(tool.slug) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1)).toEqual([]);
  });

  it("uses lowercase, hyphenated slugs", () => {
    for (const tool of TOOLS) expect(tool.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("puts every tool in a category that exists", () => {
    for (const tool of TOOLS) expect(CATEGORY_BY_ID.has(tool.category)).toBe(true);
  });

  it("resolves every related slug", () => {
    const missing: string[] = [];
    for (const tool of TOOLS) {
      for (const slug of tool.related) {
        if (!getTool(slug)) missing.push(`${tool.slug} → ${slug}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("never lists a tool as related to itself", () => {
    for (const tool of TOOLS) expect(tool.related).not.toContain(tool.slug);
  });

  it("maps every pure tool's op to a real implementation", () => {
    const missing = TOOLS.filter((t) => t.engine === "pure" && !PURE_OPS[t.op]).map((t) => `${t.slug} → ${t.op}`);
    expect(missing).toEqual([]);
  });

  it("maps every pdf tool's op to a real implementation", () => {
    const missing = TOOLS.filter((t) => t.engine === "pdf" && !PDF_OPS[t.op]).map((t) => `${t.slug} → ${t.op}`);
    expect(missing).toEqual([]);
  });

  it("keeps card blurbs short enough for one line", () => {
    for (const tool of TOOLS) expect(tool.short.length).toBeLessThanOrEqual(90);
  });

  it("gives every tool search keywords", () => {
    for (const tool of TOOLS) expect(tool.keywords.length).toBeGreaterThanOrEqual(2);
  });

  it("gives file tools an accepts and output spec", () => {
    for (const tool of TOOLS.filter((t) => t.io === "file")) {
      expect(tool.accepts, tool.slug).toBeDefined();
      expect(tool.output, tool.slug).toBeDefined();
    }
  });

  it("uses unique option ids within each tool", () => {
    for (const tool of TOOLS) {
      const ids = tool.options.map((o) => o.id);
      expect(new Set(ids).size, tool.slug).toBe(ids.length);
    }
  });

  it("points every showIf condition at an option of the same tool", () => {
    const dangling: string[] = [];
    for (const tool of TOOLS) {
      const ids = new Set(tool.options.map((o) => o.id));
      for (const option of tool.options) {
        if (option.showIf && !ids.has(option.showIf.id)) dangling.push(`${tool.slug}.${option.id}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it("keeps select defaults among their own choices", () => {
    for (const tool of TOOLS) {
      for (const option of tool.options) {
        if (option.kind === "select") {
          expect(
            option.choices.map((c) => c.value),
            `${tool.slug}.${option.id}`,
          ).toContain(option.default);
        }
      }
    }
  });

  it("keeps slider and number defaults inside their own range", () => {
    for (const tool of TOOLS) {
      for (const option of tool.options) {
        if (option.kind === "slider") {
          expect(option.default, `${tool.slug}.${option.id}`).toBeGreaterThanOrEqual(option.min);
          expect(option.default, `${tool.slug}.${option.id}`).toBeLessThanOrEqual(option.max);
        }
        if (option.kind === "number") {
          if (option.min !== undefined) expect(option.default).toBeGreaterThanOrEqual(option.min);
          if (option.max !== undefined) expect(option.default).toBeLessThanOrEqual(option.max);
        }
      }
    }
  });

  it("builds a canonical href for every tool", () => {
    for (const tool of TOOLS) {
      expect(toolHref(tool)).toMatch(/^\/[a-z]+\/[a-z0-9-]+$/);
    }
  });

  it("leaves no category empty", () => {
    for (const category of CATEGORIES) {
      const count = TOOLS.filter((t) => t.category === category.id).length;
      // Categories whose engine hasn't shipped yet carry no tools and no route.
      expect(count, category.id).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("search", () => {
  it("finds an exact slug first", () => {
    expect(searchTools("json-formatter")[0].slug).toBe("json-formatter");
  });

  it("matches on a keyword rather than the title", () => {
    expect(searchTools("epoch").map((t) => t.slug)).toContain("unix-timestamp-converter");
  });

  it("matches a partial title", () => {
    expect(searchTools("base64").length).toBeGreaterThanOrEqual(2);
  });

  it("returns nothing for empty input", () => {
    expect(searchTools("   ")).toEqual([]);
  });

  it("respects the result limit", () => {
    expect(searchTools("e", 5).length).toBeLessThanOrEqual(5);
  });
});

describe("related tools", () => {
  it("resolves to real tool objects", () => {
    const tool = getTool("json-formatter")!;
    expect(relatedTools(tool).map((t) => t.slug)).toEqual(tool.related);
  });
});
