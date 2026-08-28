import { bool, num, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Schema and type generation: JSON Schema, SQL DDL to TypeScript, GraphQL
 * formatting.
 *
 * All three are structural rewrites of something the user already has, so the
 * rule throughout is that a shape we cannot read becomes a comment in the
 * output rather than a thrown error. Losing one column is better than losing
 * the table.
 */

/* ------------------------------------------------------------------ */
/* JSON Schema                                                          */
/* ------------------------------------------------------------------ */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Schema = Record<string, unknown>;

const FORMAT_TESTS: [string, RegExp][] = [
  ["date-time", /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/],
  ["date", /^\d{4}-\d{2}-\d{2}$/],
  ["time", /^\d{2}:\d{2}(:\d{2})?$/],
  ["email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/],
  ["uri", /^[a-z][a-z0-9+.-]*:\/\/\S+$/i],
  ["uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i],
  ["ipv4", /^(\d{1,3}\.){3}\d{1,3}$/],
];

function detectFormat(value: string): string | undefined {
  for (const [format, test] of FORMAT_TESTS) if (test.test(value)) return format;
  return undefined;
}

/**
 * Merges two schemas describing different elements of the same array.
 *
 * Arrays in real payloads are rarely uniform — one row has a null where the
 * next has a string. Widening to a type union keeps the schema true to the
 * sample instead of describing only the first element.
 */
function merge(a: Schema, b: Schema): Schema {
  if (JSON.stringify(a) === JSON.stringify(b)) return a;

  const types = new Set<string>();
  for (const schema of [a, b]) {
    const t = schema.type;
    if (Array.isArray(t)) for (const one of t) types.add(String(one));
    else if (t) types.add(String(t));
  }

  if (a.type === "object" && b.type === "object") {
    const aProps = (a.properties ?? {}) as Record<string, Schema>;
    const bProps = (b.properties ?? {}) as Record<string, Schema>;
    const properties: Record<string, Schema> = {};
    for (const key of new Set([...Object.keys(aProps), ...Object.keys(bProps)])) {
      const left = aProps[key];
      const right = bProps[key];
      properties[key] = left && right ? merge(left, right) : (left ?? right);
    }
    // Only keys present in both are genuinely required by the sample.
    const required = ((a.required ?? []) as string[]).filter((key) =>
      ((b.required ?? []) as string[]).includes(key),
    );
    const out: Schema = { type: "object", properties };
    if (required.length) out.required = required;
    return out;
  }

  if (a.type === "array" && b.type === "array") {
    return { type: "array", items: merge((a.items ?? {}) as Schema, (b.items ?? {}) as Schema) };
  }

  const list = [...types];
  return { type: list.length === 1 ? list[0] : list };
}

interface SchemaOptions {
  requireAll: boolean;
  formats: boolean;
  examples: boolean;
}

function inferSchema(value: Json, options: SchemaOptions): Schema {
  if (value === null) return { type: "null" };

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: "array", items: {} };
    const items = value
      .map((item) => inferSchema(item, options))
      .reduce((acc, item) => merge(acc, item));
    return { type: "array", items };
  }

  if (typeof value === "object") {
    const properties: Record<string, Schema> = {};
    for (const [key, child] of Object.entries(value)) {
      properties[key] = inferSchema(child as Json, options);
    }
    const schema: Schema = { type: "object", properties };
    const keys = Object.keys(properties);
    // Everything in the sample is required by default: a sample is evidence a
    // key exists, never evidence it may be missing.
    if (keys.length && options.requireAll) schema.required = keys;
    schema.additionalProperties = false;
    return schema;
  }

  if (typeof value === "number") {
    const schema: Schema = { type: Number.isInteger(value) ? "integer" : "number" };
    if (options.examples) schema.examples = [value];
    return schema;
  }

  if (typeof value === "boolean") {
    const schema: Schema = { type: "boolean" };
    if (options.examples) schema.examples = [value];
    return schema;
  }

  const schema: Schema = { type: "string" };
  if (options.formats) {
    const format = detectFormat(value);
    if (format) schema.format = format;
  }
  if (options.examples) schema.examples = [value];
  return schema;
}

const DRAFTS: Record<string, string> = {
  "2020-12": "https://json-schema.org/draft/2020-12/schema",
  "07": "http://json-schema.org/draft-07/schema#",
};

function countKeys(schema: Schema): number {
  let total = 0;
  const walk = (node: Schema) => {
    if (node.type === "object" && node.properties) {
      const props = node.properties as Record<string, Schema>;
      total += Object.keys(props).length;
      for (const child of Object.values(props)) walk(child);
    }
    if (node.type === "array" && node.items) walk(node.items as Schema);
  };
  walk(schema);
  return total;
}

export const jsonSchemaGenerate: PureOp = (input, options): OpResult => {
  const text = input.trim();
  if (!text) return { output: "" };

  let parsed: Json;
  try {
    parsed = JSON.parse(text) as Json;
  } catch (error) {
    throw new ToolError(`That isn't valid JSON — ${(error as Error).message}`);
  }

  const draft = str(options, "draft", "2020-12");
  const title = str(options, "title").trim();
  const schema = inferSchema(parsed, {
    requireAll: bool(options, "requireAll", true),
    formats: bool(options, "formats", true),
    examples: bool(options, "examples", false),
  });

  const header: Schema = { $schema: DRAFTS[draft] ?? DRAFTS["2020-12"] };
  if (title) header.title = title;

  const output = JSON.stringify({ ...header, ...schema }, null, 2);

  return {
    output,
    format: "json",
    stats: [
      { label: "Draft", value: draft === "07" ? "draft-07" : "2020-12" },
      { label: "Properties", value: String(countKeys(schema)) },
    ],
    note: "A schema inferred from one sample describes that sample. Widen anything optional by hand before you rely on it in CI.",
  };
};

/* ------------------------------------------------------------------ */
/* SQL DDL to TypeScript                                                */
/* ------------------------------------------------------------------ */

/** Maps a SQL column type to TypeScript. Matching is on the leading word. */
function sqlTypeToTs(sqlType: string, dateAs: string): string {
  const base = sqlType.toLowerCase().replace(/\(.*$/, "").replace(/\s+(unsigned|zerofill)/g, "").trim();

  if (/^(int|integer|smallint|bigint|tinyint|mediumint|serial|bigserial|decimal|numeric|real|double|float|money)/.test(base)) {
    // bigint holds values beyond Number.MAX_SAFE_INTEGER, so most drivers hand
    // it back as a string. Saying `number` here would be a lie the compiler
    // cannot catch.
    return /^(bigint|bigserial)/.test(base) ? "string" : "number";
  }
  if (/^(bool|boolean|bit)/.test(base)) return "boolean";
  if (/^(date|time|timestamp|datetime|year)/.test(base)) return dateAs === "date" ? "Date" : "string";
  if (/^(json|jsonb)/.test(base)) return "unknown";
  if (/^(uuid|char|varchar|text|nchar|nvarchar|clob|enum|set|inet|cidr|citext)/.test(base)) return "string";
  if (/^(bytea|blob|binary|varbinary)/.test(base)) return "Uint8Array";
  return "unknown";
}

function toPascal(name: string): string {
  return name
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+|(?<=[a-z0-9])(?=[A-Z])/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function toCamel(name: string): string {
  const pascal = toPascal(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Naive singularisation, enough for the usual `users` -> `User`. */
function singular(name: string): string {
  if (/ies$/i.test(name)) return `${name.slice(0, -3)}y`;
  if (/(s|x|z|ch|sh)es$/i.test(name)) return name.slice(0, -2);
  if (/s$/i.test(name) && !/ss$/i.test(name)) return name.slice(0, -1);
  return name;
}

/** Splits a column list on commas that are not inside brackets. */
function splitColumns(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let quote: string | null = null;

  for (const char of body) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

const TABLE_CONSTRAINTS =
  /^(primary\s+key|foreign\s+key|unique|check|constraint|key|index|fulltext|spatial)\b/i;

interface ParsedColumn {
  name: string;
  tsType: string;
  nullable: boolean;
  comment?: string;
}

function unquote(name: string): string {
  return name.replace(/^[`"[]/, "").replace(/[`"\]]$/, "");
}

export const sqlToTypeScript: PureOp = (input, options): OpResult => {
  const sql = input.trim();
  if (!sql) return { output: "" };

  const naming = str(options, "naming", "camel");
  const nullStyle = str(options, "nullStyle", "optional");
  const declaration = str(options, "declaration", "interface");
  const dateAs = str(options, "dateAs", "string");
  const readonly = bool(options, "readonly", false);
  const exportEach = bool(options, "exportTypes", true);

  // The column list has to be found by counting brackets, not by a regex: a
  // lazy match stops at the first `)`, which in practice is the one inside
  // VARCHAR(255), and every column after it is silently lost.
  const headerRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?([`"[\]\w.]+)\s*\(/gi;

  const blocks: string[] = [];
  let tableCount = 0;
  let columnCount = 0;
  let match: RegExpExecArray | null;

  while ((match = headerRe.exec(sql)) !== null) {
    const bodyStart = headerRe.lastIndex;
    let depth = 1;
    let cursor = bodyStart;
    let quote: string | null = null;

    while (cursor < sql.length && depth > 0) {
      const char = sql[cursor];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === "'" || char === '"' || char === "`") {
        quote = char;
      } else if (char === "(") {
        depth++;
      } else if (char === ")") {
        depth--;
      }
      cursor++;
    }

    if (depth > 0) {
      throw new ToolError(
        `The column list for “${unquote(match[1])}” is never closed — a bracket is missing.`,
      );
    }

    const body = sql.slice(bodyStart, cursor - 1);
    headerRe.lastIndex = cursor;

    const rawName = unquote(match[1].split(".").pop() ?? match[1]);
    const columns: ParsedColumn[] = [];

    for (const raw of splitColumns(body)) {
      const line = raw.trim().replace(/\s+/g, " ");
      if (!line || TABLE_CONSTRAINTS.test(line)) continue;

      const columnMatch = /^([`"[]?[\w$]+[`"\]]?)\s+(.+)$/.exec(line);
      if (!columnMatch) continue;

      const name = unquote(columnMatch[1]);
      const rest = columnMatch[2];
      const typeMatch = /^([\w]+(?:\s+\w+)?(?:\s*\([^)]*\))?)/.exec(rest);
      if (!typeMatch) continue;

      const notNull = /\bnot\s+null\b/i.test(rest);
      const isPrimary = /\bprimary\s+key\b/i.test(rest);
      const hasDefault = /\bdefault\b/i.test(rest);
      const commentMatch = /\bcomment\s+'([^']*)'/i.exec(rest);

      columns.push({
        name,
        tsType: sqlTypeToTs(typeMatch[1], dateAs),
        // A primary key is never null even when the DDL leaves it implicit, and
        // a column with a default always has a value once the row exists.
        nullable: !notNull && !isPrimary && !hasDefault,
        comment: commentMatch?.[1],
      });
    }

    if (columns.length === 0) continue;
    tableCount++;
    columnCount += columns.length;

    const typeName = toPascal(singular(rawName));
    const lines = columns.map((column) => {
      const key =
        naming === "camel" ? toCamel(column.name) : naming === "pascal" ? toPascal(column.name) : column.name;
      const safeKey = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
      const optional = column.nullable && nullStyle === "optional" ? "?" : "";
      const union = column.nullable && nullStyle !== "optional" ? " | null" : "";
      const prefix = readonly ? "readonly " : "";
      const doc = column.comment ? `  /** ${column.comment} */\n` : "";
      return `${doc}  ${prefix}${safeKey}${optional}: ${column.tsType}${union};`;
    });

    const keyword = declaration === "type" ? `type ${typeName} = {` : `interface ${typeName} {`;
    const closing = declaration === "type" ? "};" : "}";
    const exported = exportEach ? "export " : "";
    blocks.push(
      `/** Row of \`${rawName}\`. */\n${exported}${keyword}\n${lines.join("\n")}\n${closing}`,
    );
  }

  if (tableCount === 0) {
    throw new ToolError(
      "No CREATE TABLE statement found. Paste the DDL including the trailing semicolon — that is what marks the end of a table.",
    );
  }

  return {
    output: blocks.join("\n\n"),
    format: "code",
    stats: [
      { label: "Tables", value: String(tableCount) },
      { label: "Columns", value: String(columnCount) },
    ],
    note: "Nullability is read from NOT NULL, PRIMARY KEY and DEFAULT. Columns your ORM fills in — created_at, soft deletes — may still need adjusting.",
  };
};

/* ------------------------------------------------------------------ */
/* GraphQL formatter                                                    */
/* ------------------------------------------------------------------ */

/**
 * Formats GraphQL by brace depth rather than by parsing it.
 *
 * A real AST would let us reorder and validate, but it would also refuse
 * anything with a syntax error — and a formatter is most wanted precisely when
 * the document is a mess. This one reindents whatever it is given.
 */
function tokenizeGraphql(source: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < source.length) {
    const char = source[i];

    if (char === "#") {
      const end = source.indexOf("\n", i);
      tokens.push(source.slice(i, end === -1 ? source.length : end).trimEnd());
      i = end === -1 ? source.length : end;
      continue;
    }

    if (source.startsWith('"""', i)) {
      const end = source.indexOf('"""', i + 3);
      const stop = end === -1 ? source.length : end + 3;
      tokens.push(source.slice(i, stop));
      i = stop;
      continue;
    }

    if (char === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== '"') j += source[j] === "\\" ? 2 : 1;
      tokens.push(source.slice(i, j + 1));
      i = j + 1;
      continue;
    }

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if ("{}()[]:,=|&!@$".includes(char)) {
      if (char === "." && source.startsWith("...", i)) {
        tokens.push("...");
        i += 3;
        continue;
      }
      tokens.push(char);
      i++;
      continue;
    }

    const word = /^[\w.\-+]+/.exec(source.slice(i));
    if (word) {
      tokens.push(word[0]);
      i += word[0].length;
      continue;
    }

    tokens.push(char);
    i++;
  }

  return tokens;
}

const NO_SPACE_BEFORE = new Set([":", ",", ")", "]", "}", "!"]);
const NO_SPACE_AFTER = new Set(["(", "[", "$", "@", "!"]);

export const graphqlFormat: PureOp = (input, options): OpResult => {
  const source = input.trim();
  if (!source) return { output: "" };

  const mode = str(options, "mode", "pretty");
  const indentSize = num(options, "indent", 2);
  const dropComments = bool(options, "dropComments", false);

  let tokens = tokenizeGraphql(source);
  if (dropComments) tokens = tokens.filter((token) => !token.startsWith("#"));

  if (mode === "minify") {
    let out = "";
    for (const [index, token] of tokens.entries()) {
      if (token.startsWith("#")) continue;
      const previous = tokens[index - 1];
      const needsSpace =
        previous !== undefined &&
        /[\w"]$/.test(previous) &&
        /^[\w"]/.test(token) &&
        !NO_SPACE_AFTER.has(previous);
      out += (needsSpace ? " " : "") + token;
    }
    return {
      output: out,
      format: "code",
      stats: [
        { label: "Before", value: `${source.length} chars` },
        { label: "After", value: `${out.length} chars` },
      ],
    };
  }

  const pad = " ".repeat(Math.max(0, Math.min(8, indentSize)));
  const lines: string[] = [];
  let depth = 0;
  let current = "";

  const flush = () => {
    if (current.trim()) lines.push(pad.repeat(depth) + current.trim());
    current = "";
  };

  for (const [index, token] of tokens.entries()) {
    if (token.startsWith("#")) {
      flush();
      lines.push(pad.repeat(depth) + token);
      continue;
    }

    if (token === "{") {
      current += (current.endsWith(" ") || !current ? "" : " ") + "{";
      flush();
      depth++;
      continue;
    }

    if (token === "}") {
      flush();
      depth = Math.max(0, depth - 1);
      lines.push(`${pad.repeat(depth)}}`);
      continue;
    }

    const previous = tokens[index - 1];
    const glue =
      !current ||
      NO_SPACE_BEFORE.has(token) ||
      (previous !== undefined && NO_SPACE_AFTER.has(previous));

    current += glue ? token : ` ${token}`;

    // A field with no selection set ends its line; the next token starting a new
    // field is what tells us so, which is why the break happens on lookahead.
    const next = tokens[index + 1];
    if (depth > 0 && next && !"({:,[".includes(token) && /^[A-Za-z_]/.test(next) && !"(:$@".includes(token)) {
      const balanced = (current.match(/\(/g) ?? []).length === (current.match(/\)/g) ?? []).length;
      if (balanced) flush();
    }
  }
  flush();

  const output = lines.join("\n");
  return {
    output,
    format: "code",
    stats: [
      { label: "Lines", value: String(lines.length) },
      { label: "Depth", value: String(Math.max(...lines.map((l) => (l.length - l.trimStart().length) / (pad.length || 1)), 0)) },
    ],
  };
};
