import { describe, expect, it } from "vitest";

import { getArchiveOp } from "@/lib/engines/archive";
import { getCryptoOp } from "@/lib/engines/crypto";
import { getPureOp } from "@/lib/engines/pure";
import type { InputFile } from "@/lib/engines/file-types";
import type { OptionValues } from "@/lib/tools/types";

import { FIXTURE_PASSWORD, FIXTURE_PRIVATE_KEY } from "./fixtures/crypto";

/**
 * Behaviour tests for the tools added in v2.
 *
 * The option-contract sweep proves every control is wired to something. These
 * prove the something is correct — which is a different question, and the one
 * that matters to whoever is standing in front of the page.
 */

const run = async (op: string, input: string, options: OptionValues = {}) => {
  const fn = getPureOp(op);
  if (!fn) throw new Error(`no such op: ${op}`);
  return await fn(input, options);
};

const encode = (text: string) => new TextEncoder().encode(text);
const file = (name: string, text: string): InputFile => ({ name, bytes: encode(text) });

/* ------------------------------------------------------------------ */

describe("JSON Schema generator", () => {
  it("widens a union where an array is not uniform", async () => {
    const result = await run("jsonSchemaGenerate", '[{"a":1},{"a":null}]', {});
    const schema = JSON.parse(result.output);
    expect(schema.items.properties.a.type).toEqual(["integer", "null"]);
  });

  it("only requires keys present in every element", async () => {
    const result = await run("jsonSchemaGenerate", '[{"a":1,"b":2},{"a":3}]', { requireAll: true });
    expect(JSON.parse(result.output).items.required).toEqual(["a"]);
  });

  it("recognises a date, an email and a UUID", async () => {
    const result = await run(
      "jsonSchemaGenerate",
      '{"d":"2026-08-28","e":"a@b.co","u":"7f4a1e2c-1111-4222-8333-444455556666"}',
      { formats: true },
    );
    const props = JSON.parse(result.output).properties;
    expect([props.d.format, props.e.format, props.u.format]).toEqual(["date", "email", "uuid"]);
  });
});

describe("SQL to TypeScript", () => {
  const DDL = `CREATE TABLE user_accounts (
    id BIGINT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    nickname TEXT,
    created_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id),
    UNIQUE KEY uq_email (email)
  );`;

  it("names the type after the singular table", async () => {
    const result = await run("sqlToTypeScript", DDL, {});
    expect(result.output).toContain("interface UserAccount {");
  });

  it("returns bigint as string, since it does not fit a JavaScript number", async () => {
    const result = await run("sqlToTypeScript", DDL, {});
    expect(result.output).toMatch(/\bid: string;/);
  });

  it("treats a primary key and a defaulted column as never null", async () => {
    const result = await run("sqlToTypeScript", DDL, { nullStyle: "union" });
    expect(result.output).not.toMatch(/id: string \| null/);
    expect(result.output).not.toMatch(/isActive: boolean \| null/);
    // Nothing constrains a plain nullable column, so it stays nullable.
    expect(result.output).toMatch(/nickname: string \| null/);
  });

  it("skips table-level constraints rather than making columns of them", async () => {
    const result = await run("sqlToTypeScript", DDL, {});
    expect(result.output.toLowerCase()).not.toContain("unique");
    expect(result.stats?.find((s) => s.label === "Columns")?.value).toBe("5");
  });
});

describe("CIDR calculator", () => {
  it("describes a /24", async () => {
    const result = await run("cidrCalculate", "192.168.1.10/24", {});
    expect(result.output).toContain("192.168.1.0/24");
    expect(result.output).toContain("255.255.255.0");
    expect(result.output).toContain("192.168.1.255");
    expect(result.output).toContain("254");
    expect(result.output).toContain("Private (RFC 1918)");
  });

  it("gives a /31 both addresses, because RFC 3021 does", async () => {
    const result = await run("cidrCalculate", "10.0.0.0/31", {});
    expect(result.stats?.find((s) => s.label === "Usable hosts")?.value).toBe("2");
  });

  it("splits a block and counts the subnets", async () => {
    const result = await run("cidrCalculate", "10.0.0.0/16", { splitPrefix: 24, maxSubnets: 4 });
    expect(result.output).toContain("256 subnets");
    expect(result.output).toContain("10.0.3.0/24");
    expect(result.output).toContain("252 more");
  });

  it("refuses to split into something larger than the block", async () => {
    await expect(run("cidrCalculate", "10.0.0.0/24", { splitPrefix: 16 })).rejects.toThrow(/larger than/);
  });

  it("collapses an IPv6 network the way RFC 5952 asks", async () => {
    const result = await run("cidrCalculate", "2001:0db8:0000:0000:0000:0000:0000:0001/48", {});
    expect(result.output).toContain("2001:db8::/48");
  });
});

describe("DNS parser", () => {
  const DIG = [
    "example.com.\t300\tIN\tA\t93.184.216.34",
    "example.com.\t3600\tIN\tMX\t10 mail.example.com.",
    'example.com.\t3600\tIN\tTXT\t"v=spf1 include:_spf.google.com -all"',
    "; a comment that is not a record",
  ].join("\n");

  it("reads dig output into rows", async () => {
    const result = await run("dnsParse", DIG, {});
    expect(result.stats?.find((s) => s.label === "Records")?.value).toBe("3");
    expect(result.stats?.find((s) => s.label === "Types")?.value).toBe("A, MX, TXT");
  });

  it("says what an SPF policy actually does", async () => {
    const result = await run("dnsParse", DIG, { explain: true });
    expect(result.output).toContain("SPF — senders not listed: hard fail");
  });

  it("reads host output too", async () => {
    const result = await run("dnsParse", "example.com has address 93.184.216.34", {});
    expect(result.output).toContain("93.184.216.34");
  });
});

describe("user agent parser", () => {
  it("does not mistake Edge for Chrome", async () => {
    const result = await run(
      "userAgentParse",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
      {},
    );
    expect(result.stats?.find((s) => s.label === "Browser")?.value).toBe("Edge");
    expect(result.output).toContain("Blink");
  });

  it("reads an iPhone", async () => {
    const result = await run(
      "userAgentParse",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      {},
    );
    expect(result.stats?.find((s) => s.label === "OS")?.value).toBe("iOS");
    expect(result.stats?.find((s) => s.label === "Device")?.value).toBe("Phone");
  });

  it("flags a crawler", async () => {
    const result = await run("userAgentParse", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", {});
    expect(result.output).toContain("Googlebot");
  });
});

describe("Unicode inspector", () => {
  it("finds a zero-width space", async () => {
    const result = await run("unicodeInspect", "a​b", { suspiciousOnly: true });
    expect(result.output).toContain("U+200B");
    expect(result.stats?.find((s) => s.label === "Flagged")?.value).toBe("1");
  });

  it("names a Cyrillic look-alike", async () => {
    const result = await run("unicodeInspect", "pаssword", { suspiciousOnly: true });
    expect(result.output).toContain("looks identical to Latin a");
  });

  it("counts UTF-8 bytes rather than characters", async () => {
    const result = await run("unicodeInspect", "café", {});
    expect(result.stats?.find((s) => s.label === "UTF-8 bytes")?.value).toBe("5");
  });
});

describe("SVG optimizer", () => {
  const SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n  <!-- drawn by hand -->\n  <title>icon</title>\n  <path id="unused" d="M1.234567 2.345678 L10.987654 4.5"/>\n  <path id="used" d="M0 0"/>\n  <use href="#used"/>\n</svg>';

  it("rounds coordinates and drops the leading zero", async () => {
    const result = await run("svgOptimize", SVG, { precision: 2 });
    expect(result.output).toContain("M1.23 2.35 L10.99 4.5");
  });

  it("removes comments and editor metadata", async () => {
    const result = await run("svgOptimize", SVG, {});
    expect(result.output).not.toContain("drawn by hand");
    expect(result.output).not.toContain("<title>");
  });

  it("keeps an id something points at", async () => {
    const result = await run("svgOptimize", SVG, { ids: true });
    expect(result.output).not.toContain('id="unused"');
    expect(result.output).toContain('id="used"');
  });

  it("refuses input that is not an SVG", async () => {
    await expect(run("svgOptimize", "just some text", {})).rejects.toThrow(/doesn't look like an SVG/);
  });
});

describe("log anonymizer", () => {
  const LOG = [
    "2026-08-28 ERROR ada@example.com from 203.0.113.42 card 4111111111111111 build 1234567890123456",
    "2026-08-28 INFO  retry from 203.0.113.42",
  ].join("\n");

  it("gives the same value the same token, so correlation survives", async () => {
    const result = await run("logAnonymize", LOG, { style: "numbered" });
    expect(result.output.match(/<IP_1>/g)).toHaveLength(2);
  });

  it("masks a real card number and leaves a number that fails Luhn", async () => {
    const result = await run("logAnonymize", LOG, {});
    expect(result.output).not.toContain("4111111111111111");
    expect(result.output).toContain("1234567890123456");
  });

  it("filters lines before masking", async () => {
    const result = await run("logAnonymize", LOG, { filter: "ERROR" });
    expect(result.output.split("\n")).toHaveLength(1);
    expect(result.stats?.find((s) => s.label === "Lines")?.value).toBe("1 of 2");
  });
});

describe("mock data", () => {
  it("gives the same rows for the same seed", async () => {
    const a = await run("mockData", "", { seed: "abc", rows: 5 });
    const b = await run("mockData", "", { seed: "abc", rows: 5 });
    const c = await run("mockData", "", { seed: "xyz", rows: 5 });
    expect(a.output).toBe(b.output);
    expect(a.output).not.toBe(c.output);
  });

  it("writes SQL that names the table it was given", async () => {
    const result = await run("mockData", "", { format: "sql", table: "members", rows: 2, fieldName: true });
    expect(result.output).toContain("INSERT INTO `members`");
    expect(result.output.trim().endsWith(";")).toBe(true);
  });

  it("writes SQL whose quoting stays balanced on every row", async () => {
    const result = await run("mockData", "", { format: "sql", rows: 50, locale: "uk" });
    const rows = result.output.split("\n").filter((line) => line.startsWith("  ("));
    expect(rows).toHaveLength(50);
    for (const row of rows) {
      expect((row.match(/'/g) ?? []).length % 2, row).toBe(0);
    }
  });
});

describe("gitignore", () => {
  it("never writes the same rule twice", async () => {
    const result = await run("gitignoreBuild", "", { node: true, next: true, java: true, ruby: true });
    const rules = result.output
      .split("\n")
      .map((line) => line.split("#")[0].trim())
      .filter(Boolean);
    expect(new Set(rules).size).toBe(rules.length);
  });

  it("puts the secrets block in by default", async () => {
    const result = await run("gitignoreBuild", "", { node: true });
    expect(result.output).toContain(".env");
    expect(result.output).toContain("!.env.example");
  });
});

describe("text encryption", () => {
  it("round-trips", async () => {
    const sealed = await run("encryptText", "the eagle has landed", {
      password: FIXTURE_PASSWORD,
      iterations: 100000,
    });
    const opened = await run("decryptText", sealed.output, { password: FIXTURE_PASSWORD });
    expect(opened.output).toBe("the eagle has landed");
  });

  it("produces different ciphertext each time, because the IV is fresh", async () => {
    const a = await run("encryptText", "same text", { password: "pw", iterations: 100000 });
    const b = await run("encryptText", "same text", { password: "pw", iterations: 100000 });
    expect(a.output).not.toBe(b.output);
  });

  it("refuses the wrong password rather than returning rubbish", async () => {
    const sealed = await run("encryptText", "secret", { password: "right", iterations: 100000 });
    await expect(run("decryptText", sealed.output, { password: "wrong" })).rejects.toThrow(/didn't decrypt/);
  });

  it("detects a tampered byte", async () => {
    const sealed = await run("encryptText", "secret", { password: "pw", iterations: 100000 });
    const flat = sealed.output.replace(/\n/g, "");
    const damaged = `${flat.slice(0, -6)}${flat[flat.length - 6] === "A" ? "B" : "A"}${flat.slice(-5)}`;
    await expect(run("decryptText", damaged, { password: "pw" })).rejects.toThrow();
  });

  it("takes the iteration count from the message, not the panel", async () => {
    const sealed = await run("encryptText", "hello", { password: "pw", iterations: 120000 });
    const opened = await run("decryptText", sealed.output, { password: "pw", iterations: 999999 });
    expect(opened.output).toBe("hello");
    expect(opened.stats?.find((s) => s.label === "Key derivation")?.value).toContain("120,000");
  });
});

describe("TOTP", () => {
  // RFC 6238 appendix B: the secret is the ASCII digits 1234567890 repeated.
  const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it("matches the RFC 6238 test vector at T=59", async () => {
    const at = new Date(59_000);
    const original = Date.now;
    Date.now = () => at.getTime();
    try {
      const result = await run("totpGenerate", RFC_SECRET, { digits: 8, period: 30, algorithm: "SHA-1" });
      expect(result.stats?.find((s) => s.label === "Code")?.value).toBe("94287082");
    } finally {
      Date.now = original;
    }
  });

  it("matches the RFC 4226 HOTP vector at counter 0", async () => {
    const result = await run("totpGenerate", RFC_SECRET, { mode: "hotp", counter: 0, digits: 6 });
    expect(result.stats?.find((s) => s.label === "Code")?.value).toBe("755224");
  });

  it("reads an otpauth URI, and its settings win over the panel", async () => {
    const result = await run("totpGenerate", `otpauth://totp/Acme:ada?secret=${RFC_SECRET}&digits=8&period=60`, {
      digits: 6,
      period: 30,
    });
    expect(result.stats?.find((s) => s.label === "Code")?.value).toHaveLength(8);
    expect(result.output).toContain("Acme:ada");
  });

  it("rejects a secret that is not Base32", async () => {
    await expect(run("totpGenerate", "notbase32!!", {})).rejects.toThrow(/Base32/);
  });
});

describe("Shamir's secret sharing", () => {
  it("rebuilds the secret from exactly the threshold", async () => {
    const split = await run("shamirSplit", "correct horse battery staple", { shares: 5, threshold: 3 });
    const shares = split.output.split("\n");
    const combined = await run("shamirCombine", [shares[0], shares[2], shares[4]].join("\n"), {});
    expect(combined.output).toBe("correct horse battery staple");
  });

  it("survives a UTF-8 secret", async () => {
    const split = await run("shamirSplit", "पासवर्ड ✓", { shares: 3, threshold: 2 });
    const shares = split.output.split("\n");
    const combined = await run("shamirCombine", shares.slice(0, 2).join("\n"), {});
    expect(combined.output).toBe("पासवर्ड ✓");
  });

  it("gives a wrong answer, not the secret, when short a share", async () => {
    const split = await run("shamirSplit", "the launch code", { shares: 5, threshold: 3 });
    const shares = split.output.split("\n");
    const combined = await run("shamirCombine", shares.slice(0, 2).join("\n"), {});
    expect(combined.output).not.toBe("the launch code");
  });

  it("refuses a threshold larger than the number of shares", async () => {
    await expect(run("shamirSplit", "x", { shares: 3, threshold: 5 })).rejects.toThrow(/unrecoverable/);
  });

  it("keeps a label off the share body", async () => {
    const split = await run("shamirSplit", "abc", { shares: 2, threshold: 2, label: "vault" });
    expect(split.output).toContain("vault-1:");
    const combined = await run("shamirCombine", split.output, {});
    expect(combined.output).toBe("abc");
  });
});

describe("RSA signatures", () => {
  it("signs and verifies with a generated pair", async () => {
    const pair = await run("rsaKeypair", "", { bits: "2048", purpose: "sign", hash: "SHA-256" });
    const privateKey = pair.output.slice(pair.output.indexOf("-----BEGIN PRIVATE KEY-----"));
    const publicKey = pair.output.slice(0, pair.output.indexOf("-----BEGIN PRIVATE KEY-----")).trim();

    const signed = await run("rsaSign", "release 2.0", { mode: "sign", key: privateKey, hash: "SHA-256" });
    const checked = await run("rsaSign", "release 2.0", {
      mode: "verify",
      key: publicKey,
      hash: "SHA-256",
      signature: signed.output,
    });
    expect(checked.stats?.find((s) => s.label === "Result")?.value).toBe("Valid");

    const tampered = await run("rsaSign", "release 2.1", {
      mode: "verify",
      key: publicKey,
      hash: "SHA-256",
      signature: signed.output,
    });
    expect(tampered.stats?.find((s) => s.label === "Result")?.value).toBe("Not valid");
  });

  it("says so when a public key is offered where a private one is needed", async () => {
    await expect(
      run("rsaSign", "x", { mode: "sign", key: "-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----" }),
    ).rejects.toThrow(/public key/);
  });

  it("accepts the committed fixture key", async () => {
    const signed = await run("rsaSign", "hello", { mode: "sign", key: FIXTURE_PRIVATE_KEY });
    expect(signed.output.length).toBeGreaterThan(300);
  });
});

/* ------------------------------------------------------------------ */

describe("archives", () => {
  const zip = async (files: InputFile[], options: OptionValues = {}) =>
    await getArchiveOp("zipFiles")!(files, options);
  const unzip = async (files: InputFile[], options: OptionValues = {}) =>
    await getArchiveOp("unzipFile")!(files, options);

  it("round-trips through a zip", async () => {
    const packed = await zip([file("a.txt", "alpha"), file("b.txt", "beta")], { name: "bundle" });
    expect(packed.files[0].name).toBe("bundle.zip");

    const opened = await unzip([{ name: "bundle.zip", bytes: packed.files[0].bytes }]);
    expect(opened.files.map((f) => f.name).sort()).toEqual(["a.txt", "b.txt"]);
    expect(new TextDecoder().decode(opened.files[0].bytes)).toBe("alpha");
  });

  it("numbers a duplicate name instead of losing the file", async () => {
    const packed = await zip([file("same.txt", "first"), file("same.txt", "second")]);
    const opened = await unzip([{ name: "a.zip", bytes: packed.files[0].bytes }]);
    expect(opened.files).toHaveLength(2);
  });

  it("puts everything in a folder when asked", async () => {
    const packed = await zip([file("a.txt", "x")], { folder: "docs" });
    const opened = await unzip([{ name: "a.zip", bytes: packed.files[0].bytes }], { flatten: false });
    expect(opened.files[0].name).toBe("docs_a.txt");
  });

  it("applies an extraction filter", async () => {
    const packed = await zip([file("a.txt", "x"), file("b.csv", "y")]);
    const opened = await unzip([{ name: "a.zip", bytes: packed.files[0].bytes }], { filter: "*.csv" });
    expect(opened.files.map((f) => f.name)).toEqual(["b.csv"]);
    expect(opened.stats?.find((s) => s.label === "Skipped")?.value).toBe("1");
  });

  it("says what is wrong when the file is not a zip", async () => {
    await expect(unzip([file("notes.txt", "definitely not a zip")])).rejects.toThrow(/could not be read as a zip/);
  });
});

describe("EPUB", () => {
  it("reads chapters in spine order, not alphabetical order", async () => {
    const packed = await getArchiveOp("zipFiles")!(
      [
        file(
          "META-INF/container.xml",
          '<container><rootfiles><rootfile full-path="OEBPS/book.opf"/></rootfiles></container>',
        ),
        file(
          "OEBPS/book.opf",
          `<package><metadata><dc:title>A Book</dc:title><dc:creator>Ada</dc:creator></metadata>
           <manifest><item id="two" href="z-second.xhtml"/><item id="one" href="a-first.xhtml"/></manifest>
           <spine><itemref idref="two"/><itemref idref="one"/></spine></package>`,
        ),
        file("OEBPS/z-second.xhtml", "<html><body><h1>Second</h1><p>Comes first in the spine.</p></body></html>"),
        file("OEBPS/a-first.xhtml", "<html><body><h1>First</h1><p>Comes second in the spine.</p></body></html>"),
      ],
      { name: "book" },
    );

    const result = await getArchiveOp("epubToText")!(
      [{ name: "book.epub", bytes: packed.files[0].bytes }],
      { format: "markdown" },
    );

    const text = new TextDecoder().decode(result.files[0].bytes);
    expect(text.indexOf("Second")).toBeLessThan(text.indexOf("First"));
    expect(text).toContain("# A Book");
    expect(text).toContain("_by Ada_");
    expect(result.files[0].name).toBe("book.md");
  });

  it("refuses a zip that is not an EPUB", async () => {
    const packed = await getArchiveOp("zipFiles")!([file("a.txt", "x")], {});
    await expect(
      getArchiveOp("epubToText")!([{ name: "fake.epub", bytes: packed.files[0].bytes }], {}),
    ).rejects.toThrow(/container.xml/);
  });
});

describe("file encryption", () => {
  it("round-trips a file and restores its name", async () => {
    const original = encode("the contents of a report");
    const sealed = await getCryptoOp("encryptFile")!([{ name: "report.pdf", bytes: original }], {
      password: "pw",
      iterations: 100000,
    });
    expect(sealed.files[0].name).toBe("report.pdf.enc");

    const opened = await getCryptoOp("decryptFile")!(
      [{ name: sealed.files[0].name, bytes: sealed.files[0].bytes }],
      { password: "pw" },
    );
    expect(opened.files[0].name).toBe("report.pdf");
    expect(new TextDecoder().decode(opened.files[0].bytes)).toBe("the contents of a report");
  });

  it("stops when the two passwords differ", async () => {
    await expect(
      getCryptoOp("encryptFile")!([file("a.txt", "x")], { password: "one", confirm: "two" }),
    ).rejects.toThrow(/don't match/);
  });

  it("refuses a file that was not produced here", async () => {
    await expect(
      getCryptoOp("decryptFile")!(
        [file("fake.enc", "not an envelope at all, merely a long enough run of ordinary text to clear the header check")],
        { password: "pw" },
      ),
    ).rejects.toThrow(/MSRXENC1/);
  });
});

describe("log anonymiser: what must survive", () => {
  const clean = async (text: string) => (await run("logAnonymize", text)).output;

  it("leaves the clock alone", async () => {
    // The IPv6 pattern used to match any two-to-seven groups of hex separated
    // by colons, and 10:00:01 is exactly that — so every timestamp in every
    // log came back as <IPV6_1>, destroying the field you always want to keep
    // and mislabelling it as an address.
    const out = await clean("2026-09-02 10:00:01 request finished");
    expect(out).toContain("10:00:01");
    expect(out).not.toMatch(/IPV6/);
  });

  it("still masks a real IPv6 address, in both of its shapes", async () => {
    expect(await clean("src=2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toMatch(/<IPV6_1>/);
    expect(await clean("src=fe80::1")).toMatch(/<IPV6_1>/);
    expect(await clean("src=::1")).toMatch(/<IPV6_1>/);
  });

  it("does not eat the space after a card number", async () => {
    // The pattern ended on an optional separator, so it consumed the space and
    // glued the next word onto the placeholder: "<CARD_1>ok".
    const out = await clean("card=4111111111111111 ok");
    expect(out).toBe("card=<CARD_1> ok");
  });

  it("leaves a number that fails the Luhn check, because it is not a card", async () => {
    const out = await clean("ref=4111111111111112 done");
    expect(out).toContain("4111111111111112");
  });

  it("gives the same value the same token, so the log can still be followed", async () => {
    const out = await clean("a=ada@example.test\nb=ada@example.test\nc=grace@navy.test");
    expect(out.match(/<EMAIL_1>/g)).toHaveLength(2);
    expect(out).toMatch(/<EMAIL_2>/);
  });
});
