import { describe, expect, it } from "vitest";

import {
  base64Decode,
  base64Encode,
  htmlDecode,
  htmlEncode,
  jwtDecode,
  queryParse,
  urlDecode,
  urlEncode,
} from "@/lib/engines/pure/encoding";
import { ToolError } from "@/lib/engines/types";

async function run(op: typeof base64Encode, input: string, options: Record<string, unknown> = {}) {
  return await op(input, options as never);
}

describe("base64", () => {
  it("round-trips ASCII", async () => {
    const encoded = await run(base64Encode, "Hello, world!");
    expect(encoded.output).toBe("SGVsbG8sIHdvcmxkIQ==");
    const decoded = await run(base64Decode, encoded.output);
    expect(decoded.output).toBe("Hello, world!");
  });

  it("handles characters btoa alone would reject", async () => {
    const text = "café — naïve 🚀 日本語";
    const encoded = await run(base64Encode, text);
    const decoded = await run(base64Decode, encoded.output);
    expect(decoded.output).toBe(text);
  });

  it("produces a URL-safe alphabet on request", async () => {
    // These bytes encode to "+/" in the standard alphabet.
    const encoded = await run(base64Encode, "ûÿ", { urlSafe: true });
    expect(encoded.output).not.toMatch(/[+/]/);
  });

  it("drops padding when asked and still decodes", async () => {
    const encoded = await run(base64Encode, "abc", { padding: false });
    expect(encoded.output.endsWith("=")).toBe(false);
    expect((await run(base64Decode, encoded.output)).output).toBe("abc");
  });

  it("rejects input whose length can never decode", async () => {
    await expect(run(base64Decode, "SGVsbG8sIHdvcmxkIQ=A")).rejects.toBeInstanceOf(ToolError);
  });
});

describe("url encoding", () => {
  it("encodes reserved characters in component mode", async () => {
    expect((await run(urlEncode, "a b&c=d")).output).toBe("a%20b%26c%3Dd");
  });

  it("leaves URL structure intact in uri mode", async () => {
    expect((await run(urlEncode, "https://x.test/a b?q=1", { mode: "uri" })).output).toBe(
      "https://x.test/a%20b?q=1",
    );
  });

  it("uses + for spaces in form mode", async () => {
    expect((await run(urlEncode, "a b")).output).toBe("a%20b");
    expect((await run(urlEncode, "a b", { mode: "form" })).output).toBe("a+b");
  });

  it("round-trips through decode", async () => {
    const text = "key=value & more/things?";
    const encoded = await run(urlEncode, text);
    expect((await run(urlDecode, encoded.output, { plusAsSpace: false })).output).toBe(text);
  });

  it("explains a malformed escape rather than throwing a raw URIError", async () => {
    await expect(run(urlDecode, "%zz")).rejects.toBeInstanceOf(ToolError);
  });
});

describe("html entities", () => {
  it("escapes the five characters that matter", async () => {
    expect((await run(htmlEncode, `<a href="x">&'</a>`)).output).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("round-trips named and numeric entities", async () => {
    expect((await run(htmlDecode, "&amp;&lt;&copy;&#233;&#x1F600;")).output).toBe("&<©é😀");
  });

  it("leaves unknown entities alone rather than mangling them", async () => {
    expect((await run(htmlDecode, "&notarealentity; 5 &lt; 6")).output).toBe("&notarealentity; 5 < 6");
  });

  it("encodes emoji as a single code point when asked", async () => {
    expect((await run(htmlEncode, "😀", { nonAscii: true })).output).toBe("&#128512;");
  });
});

describe("jwt", () => {
  // Header {"alg":"HS256","typ":"JWT"}, payload {"sub":"1234","exp":1516239022}
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwiZXhwIjoxNTE2MjM5MDIyfQ.signature";

  it("decodes both segments", async () => {
    const result = await run(jwtDecode, token);
    expect(result.output).toContain('"alg": "HS256"');
    expect(result.output).toContain('"sub": "1234"');
  });

  it("reports expiry against the current time", async () => {
    const result = await run(jwtDecode, token);
    expect(result.stats).toEqual(
      expect.arrayContaining([{ label: "Status", value: "Expired" }]),
    );
  });

  it("strips a Bearer prefix", async () => {
    const result = await run(jwtDecode, `Bearer ${token}`);
    expect(result.output).toContain("HS256");
  });

  it("says so when the input has too few segments", async () => {
    await expect(run(jwtDecode, "notatoken")).rejects.toBeInstanceOf(ToolError);
  });

  it("never claims the signature is verified", async () => {
    const result = await run(jwtDecode, token);
    expect(result.note).toMatch(/not verified/i);
  });
});

describe("query string", () => {
  it("splits a full URL's query", async () => {
    const result = await run(queryParse, "https://x.test/p?a=1&b=two+words#frag");
    expect(result.output).toContain("two words");
    expect(result.stats).toEqual(expect.arrayContaining([{ label: "Fragment", value: "#frag" }]));
  });

  it("collects repeated keys into an array in JSON mode", async () => {
    const result = await run(queryParse, "tag=a&tag=b&tag=c", { output: "json" });
    expect(JSON.parse(result.output)).toEqual({ tag: ["a", "b", "c"] });
  });

  it("handles a valueless key", async () => {
    const result = await run(queryParse, "flag&x=1", { output: "json" });
    expect(JSON.parse(result.output)).toEqual({ flag: "", x: "1" });
  });
});

describe("html entity decoding of accented letters", () => {
  const decode = async (text: string) => (await run(htmlDecode, text)).output;

  it("decodes the tool's own example, which it could not before", async () => {
    // The named-entity table held punctuation and symbols but no letters, so
    // the sample loaded by "Try an example" came back half-decoded — the tool
    // failing in front of anyone who clicked it.
    expect(await decode("&lt;p&gt;Caf&eacute; &amp; cr&egrave;me&lt;/p&gt;")).toBe("<p>Café & crème</p>");
  });

  it("covers the whole Latin-1 block, including both ends", async () => {
    expect(await decode("&Agrave;")).toBe("À");
    expect(await decode("&yuml;")).toBe("ÿ");
    expect(await decode("&szlig;")).toBe("ß");
    expect(await decode("&ntilde;")).toBe("ñ");
    expect(await decode("&Ouml;")).toBe("Ö");
  });

  it("steps over the two symbols inside that range rather than shifting past them", async () => {
    // × and ÷ sit at U+00D7 and U+00F7. An off-by-one there would pair every
    // later name with the wrong letter, and each one would still look plausible.
    expect(await decode("&Oslash;")).toBe("Ø");
    expect(await decode("&oslash;")).toBe("ø");
    expect(await decode("&times;")).toBe("×");
    expect(await decode("&divide;")).toBe("÷");
  });

  it("round-trips with the encoder for non-ASCII text", async () => {
    const original = "Café & crème brûlée — naïve señor";
    const encoded = (await run(htmlEncode, original, { nonAscii: true })).output;
    expect(encoded).not.toBe(original);
    expect(await decode(encoded)).toBe(original);
  });

  it("leaves an unknown entity alone rather than guessing", async () => {
    // Greek and mathematical names are outside the table. Passing them through
    // untouched is the honest answer: the reader can see what was not understood.
    expect(await decode("&notarealentity; &alpha;")).toBe("&notarealentity; &alpha;");
  });
});
