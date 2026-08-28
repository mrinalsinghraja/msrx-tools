import type { ToolSpec } from "@/lib/tools/types";

/**
 * Which diagram a tool gets.
 *
 * Derived from the registry rather than assigned by hand, so 88 tools do not
 * need 88 drawings and none can be given a picture that contradicts what it
 * does. The archetype is the *shape of the operation* — how many things go in,
 * how many come out, and what happened in between — which is exactly what a
 * structural diagram is for.
 */
export type Archetype =
  | "converge" // many in, one out — merge, images to PDF
  | "diverge" // one in, many out — split, PDF to images, favicon set
  | "reduce" // one in, one out, smaller — compress
  | "subtract" // one in, one out, with something removed — remove pages, strip metadata
  | "apply" // one in, one out, with something added — watermark, page numbers, sign
  | "transform" // one in, one out, reshaped — rotate, crop, resize, convert
  | "compare" // two in, a report out — compare, diff
  | "stream" // text in, text out — the pure text and developer tools
  | "emit"; // nothing in, a value out — generators and calculators

/** Tools whose shape the generic rules would get wrong. */
const OVERRIDES: Record<string, Archetype> = {
  "merge-pdf": "converge",
  "jpg-to-pdf": "converge",
  "split-pdf": "diverge",
  "pdf-to-jpg": "diverge",
  "favicon-generator": "diverge",
  "compress-pdf": "reduce",
  "compress-image": "reduce",
  "remove-pages": "subtract",
  "redact-pdf": "subtract",
  "strip-image-metadata": "subtract",
  "remove-image-background": "subtract",
  "add-watermark": "apply",
  "add-page-numbers": "apply",
  "sign-pdf": "apply",
  "watermark-image": "apply",
  "meme-generator": "apply",
  "compare-pdf": "compare",
  "text-diff": "compare",
  "json-minifier": "reduce",
  "remove-duplicate-lines": "subtract",
};

export function archetypeOf(tool: ToolSpec): Archetype {
  const override = OVERRIDES[tool.slug];
  if (override) return override;

  if (tool.io === "form") return "emit";
  if (tool.io === "text") return "stream";

  // File tools fall back to their cardinality, which the registry already states.
  if (tool.accepts?.multiple && tool.output?.cardinality === "single") return "converge";
  if (tool.output?.cardinality === "per-file") return "diverge";
  return "transform";
}

/** The one-line caption under each diagram. Says what the drawing shows. */
export const ARCHETYPE_CAPTION: Record<Archetype, string> = {
  converge: "Several inputs, assembled into one output",
  diverge: "One input, separated into several outputs",
  reduce: "One input, rewritten smaller",
  subtract: "One input, with the marked material removed",
  apply: "One input, with a layer added over it",
  transform: "One input, reshaped and written back out",
  compare: "Two inputs, measured against each other",
  stream: "Text in, text out, as you type",
  emit: "Settings in, a generated result out",
};
