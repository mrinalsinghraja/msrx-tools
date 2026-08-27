import { XMLBuilder, XMLParser } from "fast-xml-parser";
import Papa from "papaparse";
import { parse as parseToml } from "smol-toml";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { bool, num, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * JSON and its neighbours — YAML, CSV, XML, TOML — plus TypeScript generation.
 *
 * Parse errors funnel through `parseJson`. Engines disagree wildly about what a
 * SyntaxError message looks like — some give "at position 4172", some give a
 * truncated snippet and no offset at all — so when the message has no position
 * we scan the document ourselves and report the first offending character.
 * "Line 88, column 9" is actionable; "unexpected token" is not.
 */

function lineAndColumn(text: string, index: number): { line: number; column: number } {
  const before = text.slice(0, index);
  const line = before.split("\n").length;
  const column = index - before.lastIndexOf("\n");
  return { line, column };
}

/**
 * Finds the index of the first character that can't belong to a valid JSON
 * document. This is a structural scan, not a full parser: it tracks strings,
 * escapes and nesting, which is enough to locate every syntax error people
 * actually hit — an unclosed string, a stray comma, a missing brace.
 */
export function findJsonFault(text: string): number {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      const expected = ch === "}" ? "{" : "[";
      if (stack.pop() !== expected) return i;
      // A closing brace directly after a comma is the classic trailing comma.
      const previous = text.slice(0, i).trimEnd();
      if (previous.endsWith(",")) return previous.length - 1;
    } else if (ch === ",") {
      const next = text.slice(i + 1).trimStart();
      if (next.startsWith(",") || next.startsWith("}") || next.startsWith("]") || next === "") return i;
    } else if (ch === ":") {
      const next = text.slice(i + 1).trimStart();
      if (next.startsWith(",") || next.startsWith("}") || next.startsWith("]") || next === "") return i;
    }
  }

  if (inString) return text.lastIndexOf('"');
  if (stack.length) return text.length - 1;
  return -1;
}

export function parseJson(input: string): unknown {
  const text = input.trim();
  if (!text) throw new ToolError("There's nothing to parse yet — paste some JSON above.");
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Take whichever position comes first. The engine reports where parsing
    // became impossible; the scan reports what caused it. For the commonest
    // mistake — a trailing comma — those are different lines, and the comma is
    // the one worth pointing at.
    const explicit = /position (\d+)/.exec(message);
    const engineIndex = explicit ? Number(explicit[1]) : -1;
    const scanIndex = findJsonFault(text);
    const candidates = [engineIndex, scanIndex].filter((n) => n >= 0);
    const index = candidates.length ? Math.min(...candidates) : -1;
    const detail = message
      .split(" in JSON at position")[0]
      .replace(/^JSON\.parse: /, "")
      .replace(/ is not valid JSON$/, "")
      .replace(/,? \.\.\."[\s\S]*$/, "")
      .trim();

    if (index >= 0) {
      const { line, column } = lineAndColumn(text, index);
      throw new ToolError(`${detail} — line ${line}, column ${column}.`, { line, column });
    }
    throw new ToolError(detail || message);
  }
}

function indentOf(options: Record<string, unknown>, id = "indent"): string | number {
  const raw = String(options[id] ?? "2");
  if (raw === "tab") return "\t";
  const n = Number(raw);
  return Number.isFinite(n) ? n : 2;
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, sortDeep(v)]));
  }
  return value;
}

interface JsonShape {
  keys: number;
  depth: number;
  arrays: number;
  objects: number;
  values: number;
}

function describe(value: unknown, depth = 1, acc: JsonShape = { keys: 0, depth: 0, arrays: 0, objects: 0, values: 0 }): JsonShape {
  acc.depth = Math.max(acc.depth, depth);
  if (Array.isArray(value)) {
    acc.arrays++;
    for (const item of value) describe(item, depth + 1, acc);
  } else if (value && typeof value === "object") {
    acc.objects++;
    for (const [, v] of Object.entries(value)) {
      acc.keys++;
      describe(v, depth + 1, acc);
    }
  } else {
    acc.values++;
  }
  return acc;
}

export const jsonFormat: PureOp = (input, options): OpResult => {
  const parsed = parseJson(input);
  const value = bool(options, "sortKeys") ? sortDeep(parsed) : parsed;
  const output = JSON.stringify(value, null, indentOf(options));
  const shape = describe(parsed);
  return {
    output,
    format: "json",
    stats: [
      { label: "Keys", value: String(shape.keys) },
      { label: "Depth", value: String(shape.depth) },
      { label: "Size", value: `${input.trim().length} → ${output.length} chars` },
    ],
  };
};

export const jsonMinify: PureOp = (input): OpResult => {
  const parsed = parseJson(input);
  const output = JSON.stringify(parsed);
  const saved = input.trim().length - output.length;
  return {
    output,
    format: "json",
    stats: [
      { label: "Before", value: `${input.trim().length} chars` },
      { label: "After", value: `${output.length} chars` },
      { label: "Saved", value: saved > 0 ? `${Math.round((saved / input.trim().length) * 100)}%` : "0%" },
    ],
  };
};

export const jsonValidate: PureOp = (input, options): OpResult => {
  const parsed = parseJson(input);
  const shape = describe(parsed);
  const rootType = Array.isArray(parsed) ? "array" : parsed === null ? "null" : typeof parsed;

  const lines = ["Valid JSON."];
  if (bool(options, "stats", true)) {
    lines.push(
      "",
      `Root          ${rootType}${Array.isArray(parsed) ? ` of ${parsed.length}` : ""}`,
      `Objects       ${shape.objects}`,
      `Arrays        ${shape.arrays}`,
      `Keys          ${shape.keys}`,
      `Scalar values ${shape.values}`,
      `Nesting depth ${shape.depth}`,
    );
  }
  return {
    output: lines.join("\n"),
    stats: [{ label: "Result", value: "Valid" }],
  };
};

export const jsonToYaml: PureOp = (input, options): OpResult => {
  const parsed = parseJson(input);
  const output = stringifyYaml(parsed, {
    indent: num(options, "indent", 2),
    defaultStringType: bool(options, "quoteStrings") ? "QUOTE_DOUBLE" : "PLAIN",
    defaultKeyType: "PLAIN",
    lineWidth: 0,
  });
  return { output, format: "yaml" };
};

export const yamlToJson: PureOp = (input, options): OpResult => {
  if (!input.trim()) throw new ToolError("There's nothing to convert yet — paste some YAML above.");
  let parsed: unknown;
  try {
    parsed = parseYaml(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ToolError(message.split("\n")[0]);
  }
  const indent = num(options, "indent", 2);
  return {
    output: indent === 0 ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent),
    format: "json",
  };
};

/** `{ a: { b: 1 } }` becomes `{ "a.b": 1 }` so it fits in one CSV row. */
function flatten(value: unknown, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else if (Array.isArray(value) && value.some((v) => v && typeof v === "object")) {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else {
    out[prefix] = Array.isArray(value) ? value.join("; ") : value;
  }
  return out;
}

export const jsonToCsv: PureOp = (input, options): OpResult => {
  const parsed = parseJson(input);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  if (rows.length === 0) return { output: "", format: "csv" };
  if (!rows.every((r) => r && typeof r === "object")) {
    throw new ToolError(
      "CSV needs a list of objects — an array of plain values has no column names to work from.",
    );
  }

  const shaped = bool(options, "flatten", true)
    ? rows.map((r) => flatten(r))
    : (rows as Record<string, unknown>[]);

  // Union of every row's keys, so a field missing from row 1 still gets a column.
  const columns: string[] = [];
  for (const row of shaped) {
    for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key);
  }

  const output = Papa.unparse(
    { fields: columns, data: shaped.map((r) => columns.map((c) => r[c] ?? "")) },
    { delimiter: str(options, "delimiter", ","), header: bool(options, "header", true) },
  );

  return {
    output,
    format: "csv",
    stats: [
      { label: "Rows", value: String(shaped.length) },
      { label: "Columns", value: String(columns.length) },
    ],
  };
};

export const csvToJson: PureOp = (input, options): OpResult => {
  if (!input.trim()) throw new ToolError("There's nothing to convert yet — paste some CSV above.");
  const delimiter = str(options, "delimiter", "auto");
  const result = Papa.parse<Record<string, unknown> | unknown[]>(input.trim(), {
    header: bool(options, "header", true),
    dynamicTyping: bool(options, "typed", true),
    skipEmptyLines: "greedy",
    delimiter: delimiter === "auto" ? undefined : delimiter,
  });

  // Papa reports per-row problems but still returns the rows; surface them as a
  // note rather than failing, because a single ragged row shouldn't lose the file.
  const note = result.errors.length
    ? `${result.errors.length} row${result.errors.length === 1 ? "" : "s"} didn't parse cleanly — first problem on row ${
        (result.errors[0].row ?? 0) + 1
      }: ${result.errors[0].message}`
    : undefined;

  return {
    output: JSON.stringify(result.data, null, 2),
    format: "json",
    note,
    stats: [
      { label: "Rows", value: String(result.data.length) },
      { label: "Delimiter", value: result.meta.delimiter === "\t" ? "Tab" : result.meta.delimiter },
    ],
  };
};

export const csvToMarkdown: PureOp = (input, options): OpResult => {
  if (!input.trim()) throw new ToolError("There's nothing to convert yet — paste some CSV above.");
  const delimiter = str(options, "delimiter", "auto");
  const result = Papa.parse<string[]>(input.trim(), {
    skipEmptyLines: "greedy",
    delimiter: delimiter === "auto" ? undefined : delimiter,
  });
  const rows = result.data.map((r) => r.map((c) => String(c ?? "").replace(/\|/g, "\\|")));
  if (rows.length === 0) return { output: "" };

  const columnCount = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => [...r, ...Array(columnCount - r.length).fill("")]);
  const widths = bool(options, "pad", true)
    ? Array.from({ length: columnCount }, (_, i) => Math.max(3, ...padded.map((r) => r[i].length)))
    : Array.from({ length: columnCount }, () => 0);

  const align = str(options, "align", "none");
  const rule = widths.map((w) => {
    const bar = "-".repeat(Math.max(3, w));
    if (align === "left") return `:${bar.slice(1)}`;
    if (align === "right") return `${bar.slice(1)}:`;
    if (align === "center") return `:${bar.slice(2)}:`;
    return bar;
  });

  const line = (cells: string[]) => `| ${cells.map((c, i) => c.padEnd(widths[i])).join(" | ")} |`;
  const [header, ...body] = padded;
  const output = [line(header), `| ${rule.join(" | ")} |`, ...body.map(line)].join("\n");

  return {
    output,
    format: "markdown",
    stats: [
      { label: "Rows", value: String(Math.max(0, padded.length - 1)) },
      { label: "Columns", value: String(columnCount) },
    ],
  };
};

export const jsonToXml: PureOp = (input, options): OpResult => {
  const parsed = parseJson(input);
  const builder = new XMLBuilder({
    format: bool(options, "pretty", true),
    indentBy: "  ",
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const rootName = str(options, "rootName", "root") || "root";
  const body = builder.build({ [rootName]: parsed });
  const declaration = bool(options, "declaration", true) ? '<?xml version="1.0" encoding="UTF-8"?>\n' : "";
  return { output: declaration + body, format: "xml" };
};

export const xmlToJson: PureOp = (input, options): OpResult => {
  if (!input.trim()) throw new ToolError("There's nothing to convert yet — paste some XML above.");
  const parser = new XMLParser({
    ignoreAttributes: !bool(options, "attributes", true),
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
    trimValues: true,
  });
  let parsed: unknown;
  try {
    parsed = parser.parse(input);
  } catch (error) {
    throw new ToolError(error instanceof Error ? error.message : "That XML couldn't be parsed.");
  }
  return {
    output: bool(options, "pretty", true) ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed),
    format: "json",
  };
};

export const tomlToJson: PureOp = (input, options): OpResult => {
  if (!input.trim()) throw new ToolError("There's nothing to convert yet — paste some TOML above.");
  let parsed: unknown;
  try {
    parsed = parseToml(input);
  } catch (error) {
    throw new ToolError(error instanceof Error ? error.message : "That TOML couldn't be parsed.");
  }
  return { output: JSON.stringify(parsed, null, num(options, "indent", 2)), format: "json" };
};

/* ------------------------------------------------------------------ */
/* JSON -> TypeScript                                                   */
/* ------------------------------------------------------------------ */

const RESERVED = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function pascal(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""));
  const head = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /^[A-Za-z]/.test(head) ? head : `Type${head}`;
}

function singular(name: string): string {
  if (name.endsWith("ies")) return `${name.slice(0, -3)}y`;
  if (name.endsWith("sses")) return name.slice(0, -2);
  if (name.endsWith("s") && !name.endsWith("ss")) return name.slice(0, -1);
  return name;
}

interface TsContext {
  declarations: Map<string, string>;
  style: "interface" | "type";
  optionalNulls: boolean;
  readonly: boolean;
}

function tsTypeOf(value: unknown, name: string, ctx: TsContext): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    // Union the member types so a mixed array doesn't silently become the first one.
    const members = Array.from(
      new Set(value.map((item) => tsTypeOf(item, singular(name), ctx))),
    );
    const inner = members.length === 1 ? members[0] : `(${members.join(" | ")})`;
    return `${inner}[]`;
  }
  if (typeof value === "object") {
    const typeName = pascal(name);
    const entries = Object.entries(value as Record<string, unknown>);
    const body = entries
      .map(([key, v]) => {
        // A null in the sample tells us the field exists but not what it holds.
        // Marking it optional is the honest reading; widening it to `T | null`
        // would be inventing a T we never saw.
        const optional = v === null && ctx.optionalNulls;
        const propType = tsTypeOf(v, key, ctx);
        const safeKey = RESERVED.test(key) ? key : JSON.stringify(key);
        const prefix = ctx.readonly ? "  readonly " : "  ";
        return `${prefix}${safeKey}${optional ? "?" : ""}: ${propType};`;
      })
      .join("\n");

    const declaration =
      ctx.style === "interface"
        ? `export interface ${typeName} {\n${body}\n}`
        : `export type ${typeName} = {\n${body}\n};`;

    // Deduplicate identical shapes so `items[]` doesn't emit Item, Item2, Item3.
    for (const [existingName, existingBody] of ctx.declarations) {
      if (existingBody.replace(existingName, typeName) === declaration) return existingName;
    }

    let unique = typeName;
    let n = 2;
    while (ctx.declarations.has(unique) && ctx.declarations.get(unique) !== declaration) {
      unique = `${typeName}${n++}`;
    }
    ctx.declarations.set(unique, declaration.replace(typeName, unique));
    return unique;
  }
  if (typeof value === "number") return Number.isInteger(value) ? "number" : "number";
  return typeof value; // string | boolean
}

export const jsonToTypeScript: PureOp = (input, options): OpResult => {
  const parsed = parseJson(input);
  const ctx: TsContext = {
    declarations: new Map(),
    style: str(options, "style", "interface") === "type" ? "type" : "interface",
    optionalNulls: bool(options, "optional", true),
    readonly: bool(options, "readonly"),
  };
  const rootName = str(options, "rootName", "Root") || "Root";
  const rootType = tsTypeOf(parsed, rootName, ctx);

  const declarations = Array.from(ctx.declarations.values()).reverse();
  if (declarations.length === 0) {
    declarations.push(`export type ${pascal(rootName)} = ${rootType};`);
  } else if (!ctx.declarations.has(rootType)) {
    declarations.push(`export type ${pascal(rootName)} = ${rootType};`);
  }

  return {
    output: declarations.join("\n\n"),
    format: "code",
    stats: [{ label: "Types", value: String(declarations.length) }],
    note:
      "Types are inferred from this one sample. A field that happens to be null here, or absent, will need checking by hand.",
  };
};
