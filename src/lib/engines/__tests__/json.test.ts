import { describe, expect, it } from "vitest";

import {
  csvToJson,
  csvToMarkdown,
  jsonFormat,
  jsonMinify,
  jsonToCsv,
  jsonToTypeScript,
  jsonToXml,
  jsonToYaml,
  jsonValidate,
  tomlToJson,
  xmlToJson,
  yamlToJson,
} from "@/lib/engines/pure/json";
import { ToolError, type PureOp } from "@/lib/engines/types";

async function run(op: PureOp, input: string, options: Record<string, unknown> = {}) {
  return await op(input, options as never);
}

const SAMPLE = '{"name":"Ada","langs":["asm","plankalkul"],"meta":{"born":1815,"active":true}}';

describe("json formatting", () => {
  it("pretty-prints with the requested indent", async () => {
    const result = await run(jsonFormat, SAMPLE, { indent: "4" });
    expect(result.output.split("\n")[1].startsWith("    ")).toBe(true);
  });

  it("uses a tab when asked", async () => {
    const result = await run(jsonFormat, SAMPLE, { indent: "tab" });
    expect(result.output).toContain("\t");
  });

  it("sorts keys deeply, not just at the top level", async () => {
    const result = await run(jsonFormat, '{"b":1,"a":{"z":1,"y":2}}', { sortKeys: true });
    const parsed = JSON.parse(result.output);
    expect(Object.keys(parsed)).toEqual(["a", "b"]);
    expect(Object.keys(parsed.a)).toEqual(["y", "z"]);
  });

  it("minifies back to the shortest form", async () => {
    const pretty = await run(jsonFormat, SAMPLE);
    const minified = await run(jsonMinify, pretty.output);
    expect(minified.output).toBe(SAMPLE);
  });

  it("reports a line and column for a syntax error", async () => {
    const broken = '{\n  "a": 1,\n  "b": ,\n}';
    await expect(run(jsonFormat, broken)).rejects.toThrow(/line \d+, column \d+/);
  });

  it("points at the trailing comma itself, not the brace that followed it", async () => {
    // The engine reports the closing brace on line 4; the comma on line 3 is
    // the actual mistake and is what the user needs to delete.
    const trailing = '{\n  "a": 1,\n  "b": [2, 3],\n}';
    await expect(run(jsonFormat, trailing)).rejects.toThrow(/line 3/);
  });

  it("refuses empty input with a useful message", async () => {
    await expect(run(jsonFormat, "   ")).rejects.toThrow(/nothing to parse/i);
  });

  it("confirms valid documents and describes their shape", async () => {
    const result = await run(jsonValidate, SAMPLE, { stats: true });
    expect(result.output).toContain("Valid JSON");
    expect(result.output).toContain("Nesting depth");
  });
});

describe("json <-> yaml", () => {
  it("round-trips without losing values", async () => {
    const yaml = await run(jsonToYaml, SAMPLE);
    const back = await run(yamlToJson, yaml.output);
    expect(JSON.parse(back.output)).toEqual(JSON.parse(SAMPLE));
  });

  it("quotes strings on request so YAML doesn't read them as booleans", async () => {
    const yaml = await run(jsonToYaml, '{"answer":"yes"}', { quoteStrings: true });
    expect(yaml.output).toContain('"yes"');
  });

  it("surfaces a YAML parse failure as a ToolError", async () => {
    await expect(run(yamlToJson, "a:\n  - 1\n b: broken indent")).rejects.toBeInstanceOf(ToolError);
  });
});

describe("json <-> csv", () => {
  const rows = '[{"id":1,"user":{"name":"Ada"}},{"id":2,"user":{"name":"Grace"},"extra":true}]';

  it("flattens nested objects into dotted columns", async () => {
    const csv = await run(jsonToCsv, rows, { flatten: true });
    expect(csv.output.split("\n")[0]).toContain("user.name");
  });

  it("unions columns across rows so late fields aren't dropped", async () => {
    const csv = await run(jsonToCsv, rows);
    expect(csv.output.split("\n")[0]).toContain("extra");
  });

  it("refuses an array of bare values, which has no columns", async () => {
    await expect(run(jsonToCsv, "[1,2,3]")).rejects.toThrow(/list of objects/i);
  });

  it("parses CSV back with types when asked", async () => {
    const result = await run(csvToJson, "id,active\n1,true\n2,false", { typed: true });
    expect(JSON.parse(result.output)[0]).toEqual({ id: 1, active: true });
  });

  it("keeps everything a string when typing is off", async () => {
    const result = await run(csvToJson, "id\n007", { typed: false });
    expect(JSON.parse(result.output)[0].id).toBe("007");
  });

  it("detects a semicolon delimiter", async () => {
    const result = await run(csvToJson, "a;b\n1;2");
    expect(JSON.parse(result.output)[0]).toEqual({ a: 1, b: 2 });
  });

  it("builds a markdown table with an alignment rule row", async () => {
    const result = await run(csvToMarkdown, "name,role\nAda,engineer", { align: "left" });
    const lines = result.output.split("\n");
    expect(lines[0]).toContain("name");
    expect(lines[1]).toMatch(/^\|\s*:-/);
  });

  it("escapes pipes so they don't break the table", async () => {
    const result = await run(csvToMarkdown, 'a\n"x|y"');
    expect(result.output).toContain("x\\|y");
  });
});

describe("json <-> xml", () => {
  it("round-trips a simple document", async () => {
    const xml = await run(jsonToXml, '{"item":{"id":1,"name":"Ada"}}', { rootName: "doc" });
    expect(xml.output).toContain("<doc>");
    const back = await run(xmlToJson, xml.output);
    expect(JSON.parse(back.output).doc.item.name).toBe("Ada");
  });

  it("keeps attributes under a prefix", async () => {
    const result = await run(xmlToJson, '<a id="7"><b>x</b></a>', { attributes: true });
    expect(JSON.parse(result.output).a["@_id"]).toBe(7);
  });
});

describe("toml", () => {
  it("converts a table and its keys", async () => {
    const result = await run(tomlToJson, '[server]\nport = 8080\nhost = "localhost"');
    expect(JSON.parse(result.output)).toEqual({ server: { port: 8080, host: "localhost" } });
  });

  it("reports invalid TOML rather than returning nothing", async () => {
    await expect(run(tomlToJson, "= nope")).rejects.toBeInstanceOf(ToolError);
  });
});

describe("json to typescript", () => {
  it("names the root type and emits an interface", async () => {
    const result = await run(jsonToTypeScript, '{"id":1,"name":"Ada"}', { rootName: "User" });
    expect(result.output).toContain("export interface User {");
    expect(result.output).toContain("id: number;");
  });

  it("unions the member types of a mixed array", async () => {
    const result = await run(jsonToTypeScript, '{"values":[1,"two"]}');
    expect(result.output).toMatch(/values: \((number \| string|string \| number)\)\[\];/);
  });

  it("marks nulls optional when asked", async () => {
    const result = await run(jsonToTypeScript, '{"note":null}', { optional: true });
    expect(result.output).toContain("note?: null;");
  });

  it("quotes keys that aren't valid identifiers", async () => {
    const result = await run(jsonToTypeScript, '{"content-type":"json"}');
    expect(result.output).toContain('"content-type"');
  });

  it("emits readonly properties on request", async () => {
    const result = await run(jsonToTypeScript, '{"id":1}', { readonly: true });
    expect(result.output).toContain("readonly id: number;");
  });
});
