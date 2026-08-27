import type { OptionValues } from "@/lib/tools/types";

/** How the result panel should present the output. */
export type OutputFormat = "text" | "json" | "yaml" | "xml" | "html" | "markdown" | "code" | "csv";

export interface OpStat {
  label: string;
  value: string;
}

export interface OpResult {
  output: string;
  format?: OutputFormat;
  /** Small figures shown above the output — counts, sizes, ratios. */
  stats?: OpStat[];
  /** A caveat worth reading, shown but not treated as a failure. */
  note?: string;
  /** Structured payload for tools with a custom result panel (diff, QR, units). */
  extra?: unknown;
}

/**
 * A failure the user caused and can fix — bad JSON, an unparseable date. The
 * message is shown verbatim, so write it for a person, not a log file.
 */
export class ToolError extends Error {
  readonly line?: number;
  readonly column?: number;

  constructor(message: string, position?: { line?: number; column?: number }) {
    super(message);
    this.name = "ToolError";
    this.line = position?.line;
    this.column = position?.column;
  }
}

export type PureOp = (input: string, options: OptionValues) => OpResult | Promise<OpResult>;

/** Option readers. Options arrive from the UI as strings more often than not. */
export function str(options: OptionValues, id: string, fallback = ""): string {
  const v = options[id];
  return v === undefined || v === null ? fallback : String(v);
}

export function num(options: OptionValues, id: string, fallback = 0): number {
  const v = options[id];
  if (v === undefined || v === null || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function bool(options: OptionValues, id: string, fallback = false): boolean {
  const v = options[id];
  if (v === undefined || v === null) return fallback;
  if (typeof v === "boolean") return v;
  return v === "true" || v === 1 || v === "1";
}
