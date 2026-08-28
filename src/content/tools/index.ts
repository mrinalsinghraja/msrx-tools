import type { ToolContent } from "@/lib/tools/types";

import { CALC_CONTENT } from "./calc";
import { DEV_CONTENT } from "./dev";
import { FILE_CONTENT } from "./file";
import { IMAGE_CONTENT } from "./image";
import { PDF_CONTENT } from "./pdf";
import { SECURITY_CONTENT } from "./security";
import { TEXT_CONTENT } from "./text";

/**
 * Server-only SEO prose, kept out of the client bundle. A tool page imports this
 * from a server component; the interactive island never sees it.
 *
 * Every tool needs an entry before launch — `npm run check:content` is the gate.
 * Until a tool has one, its page falls back to the spec's one-line blurb, which
 * is honest but is not enough to rank and must not ship to production.
 */
export const TOOL_CONTENT: Record<string, ToolContent> = {
  ...TEXT_CONTENT,
  ...DEV_CONTENT,
  ...SECURITY_CONTENT,
  ...FILE_CONTENT,
  ...IMAGE_CONTENT,
  ...CALC_CONTENT,
  ...PDF_CONTENT,
};

export function getToolContent(slug: string): ToolContent | undefined {
  return TOOL_CONTENT[slug];
}
