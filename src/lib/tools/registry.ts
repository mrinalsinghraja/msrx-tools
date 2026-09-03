import { CATEGORIES, CATEGORY_BY_ID } from "./categories";
import { AI_TOOLS } from "./catalog/ai";
import { AUDIO_TOOLS } from "./catalog/audio";
import { CALC_TOOLS } from "./catalog/calc";
import { DEV_TOOLS } from "./catalog/dev";
import { FILE_TOOLS } from "./catalog/file";
import { FINANCE_TOOLS } from "./catalog/finance";
import { IMAGE_TOOLS } from "./catalog/image";
import { PDF_TOOLS } from "./catalog/pdf";
import { SECURITY_TOOLS } from "./catalog/security";
import { TEXT_TOOLS } from "./catalog/text";
import { VIDEO_TOOLS } from "./catalog/video";
import type { CategoryId, ToolSpec } from "./types";

/**
 * Every tool on the site. Routing, navigation, search, the sitemap, the internal
 * link matrix and the smoke-test suite all read from here.
 *
 * Order within a category is the order tools appear on the category page, so put
 * the highest-intent tools first.
 */
export const TOOLS: ToolSpec[] = [
  ...PDF_TOOLS,
  ...IMAGE_TOOLS,
  ...VIDEO_TOOLS,
  ...AUDIO_TOOLS,
  ...FILE_TOOLS,
  ...TEXT_TOOLS,
  ...AI_TOOLS,
  ...DEV_TOOLS,
  ...SECURITY_TOOLS,
  ...FINANCE_TOOLS,
  ...CALC_TOOLS,
];

const BY_SLUG = new Map<string, ToolSpec>(TOOLS.map((t) => [t.slug, t]));

export function getTool(slug: string): ToolSpec | undefined {
  return BY_SLUG.get(slug);
}

export function toolsInCategory(id: CategoryId): ToolSpec[] {
  return TOOLS.filter((t) => t.category === id);
}

/** `/text/json-formatter` — the canonical path for a tool. */
export function toolHref(tool: ToolSpec): string {
  const category = CATEGORY_BY_ID.get(tool.category);
  if (!category) throw new Error(`Tool ${tool.slug} has unknown category ${tool.category}`);
  return `/${category.slug}/${tool.slug}`;
}

export function categoryHref(id: CategoryId): string {
  const category = CATEGORY_BY_ID.get(id);
  if (!category) throw new Error(`Unknown category ${id}`);
  return `/${category.slug}`;
}

/** Resolves `related` slugs, silently dropping any that no longer exist. */
export function relatedTools(tool: ToolSpec): ToolSpec[] {
  return tool.related.map((slug) => BY_SLUG.get(slug)).filter((t): t is ToolSpec => Boolean(t));
}

/**
 * Substring search over title, blurb and keywords. Deliberately dumb — with a
 * few hundred tools this beats shipping a search index, and it never misses an
 * exact slug match.
 */
export function searchTools(query: string, limit = 12): ToolSpec[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: { tool: ToolSpec; score: number }[] = [];
  for (const tool of TOOLS) {
    let score = 0;
    if (tool.slug === q) score = 100;
    else if (tool.title.toLowerCase() === q) score = 90;
    else if (tool.slug.includes(q)) score = 60;
    else if (tool.title.toLowerCase().includes(q)) score = 50;
    else if (tool.keywords.some((k) => k.includes(q))) score = 35;
    else if (tool.short.toLowerCase().includes(q)) score = 20;
    if (score > 0) scored.push({ tool, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.tool.title.localeCompare(b.tool.title))
    .slice(0, limit)
    .map((s) => s.tool);
}

export const TOOL_COUNT = TOOLS.length;
export { CATEGORIES };
