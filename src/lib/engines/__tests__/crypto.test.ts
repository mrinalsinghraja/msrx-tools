import { describe, expect, it } from "vitest";

import { crc32, hashText, hmacText, md5, passwordStrength } from "@/lib/engines/pure/hash";
import { passwordGenerate, randomString, uuidGenerate } from "@/lib/engines/pure/random";
import { ToolError, type PureOp } from "@/lib/engines/types";

async function run(op: PureOp, input: string, options: Record<string, unknown> = {}) {
  return await op(input, options as never);
}

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

describe("md5", () => {
  // RFC 1321 test suite.
  it.each([
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
    ["12345678901234567890123456789012345678901234567890123456789012345678901234567890", "57edf4a22be3c955ac49da2e2107b67a"],
  ])("matches the published digest for %j", (input, expected) => {
    expect(hex(md5(new TextEncoder().encode(input)))).toBe(expected);
  });

  it("handles input that crosses a block boundary", () => {
    const text = "x".repeat(56); // forces a second padding block
    expect(hex(md5(new TextEncoder().encode(text)))).toHaveLength(32);
  });
});

describe("crc32", () => {
  it("matches the known check value for '123456789'", () => {
    expect(crc32(new TextEncoder().encode("123456789")).toString(16)).toBe("cbf43926");
  });

  it("is zero for empty input", () => {
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("hash tool", () => {
  it("produces the known SHA-256 of 'abc'", async () => {
    const result = await run(hashText, "abc", { algorithm: "SHA-256" });
    expect(result.output).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("lists every algorithm in all mode", async () => {
    const result = await run(hashText, "abc", { algorithm: "all" });
    for (const name of ["SHA-256", "SHA-512", "SHA-1", "MD5", "CRC32"]) {
      expect(result.output).toContain(name);
    }
  });

  it("warns that MD5 and SHA-1 aren't safe", async () => {
    const result = await run(hashText, "abc", { algorithm: "MD5" });
    expect(result.note).toMatch(/Neither is safe/i);
  });

  it("encodes as base64 on request", async () => {
    const result = await run(hashText, "abc", { algorithm: "SHA-256", encoding: "base64" });
    expect(result.output).toBe("ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=");
  });
});

describe("hmac", () => {
  it("matches RFC 4231 test case 1", async () => {
    // Key "Jefe", data "what do ya want for nothing?" is case 2 of the RFC.
    const result = await run(hmacText, "what do ya want for nothing?", {
      key: "Jefe",
      algorithm: "SHA-256",
    });
    expect(result.output).toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
  });

  it("insists on a key", async () => {
    await expect(run(hmacText, "data", {})).rejects.toBeInstanceOf(ToolError);
  });
});

describe("password strength", () => {
  it("calls a top-25 password very weak whatever its length", async () => {
    const result = await run(passwordStrength, "password", {});
    expect(result.output).toContain("Very weak");
  });

  it("rates a long random password strongly", async () => {
    const result = await run(passwordStrength, "8Jq#vR2mZ!pLx4Wn@7Kd", {});
    expect(result.output).toMatch(/Very strong|Strong/);
  });

  it("penalises a single character class", async () => {
    const result = await run(passwordStrength, "abcdefghijklmnop", {});
    expect(result.output).toContain("single character class");
  });

  it("says the password never leaves the tab", async () => {
    const result = await run(passwordStrength, "anything", {});
    expect(result.note).toMatch(/never leaves/i);
  });
});

describe("password generator", () => {
  it("honours the requested length and count", async () => {
    const result = await run(passwordGenerate, "", { length: 24, count: 5 });
    const lines = result.output.split("\n");
    expect(lines).toHaveLength(5);
    for (const line of lines) expect(line).toHaveLength(24);
  });

  it("includes at least one character from every enabled set", async () => {
    const result = await run(passwordGenerate, "", {
      length: 12,
      count: 20,
      lower: true,
      upper: true,
      digits: true,
      symbols: true,
    });
    for (const password of result.output.split("\n")) {
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it("excludes look-alike characters when asked", async () => {
    const result = await run(passwordGenerate, "", {
      length: 40,
      count: 20,
      excludeAmbiguous: true,
    });
    expect(result.output).not.toMatch(/[0O1lI|]/);
  });

  it("refuses when every character set is off", async () => {
    await expect(
      run(passwordGenerate, "", { lower: false, upper: false, digits: false, symbols: false }),
    ).rejects.toBeInstanceOf(ToolError);
  });

  it("does not repeat itself across a large batch", async () => {
    const result = await run(passwordGenerate, "", { length: 20, count: 50 });
    const lines = result.output.split("\n");
    expect(new Set(lines).size).toBe(lines.length);
  });
});

describe("uuid", () => {
  it("generates well-formed v4 identifiers", async () => {
    const result = await run(uuidGenerate, "", { version: "v4", count: 10 });
    for (const id of result.output.split("\n")) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  it("sets the version and variant nibbles for v7", async () => {
    const result = await run(uuidGenerate, "", { version: "v7", count: 5 });
    for (const id of result.output.split("\n")) {
      expect(id[14]).toBe("7");
      expect("89ab").toContain(id[19]);
    }
  });

  it("produces v7 ids that sort in creation order", async () => {
    const result = await run(uuidGenerate, "", { version: "v7", count: 20 });
    const ids = result.output.split("\n");
    expect([...ids].sort()).toEqual(ids);
  });

  it("strips hyphens and uppercases on request", async () => {
    const result = await run(uuidGenerate, "", { count: 1, hyphens: false, uppercase: true });
    expect(result.output).toMatch(/^[0-9A-F]{32}$/);
  });
});

describe("random string", () => {
  it("draws only from the chosen alphabet", async () => {
    const result = await run(randomString, "", { alphabet: "hex", length: 64, count: 5 });
    expect(result.output.replace(/\n/g, "")).toMatch(/^[0-9a-f]+$/);
  });

  it("omits look-alikes in base58", async () => {
    const result = await run(randomString, "", { alphabet: "base58", length: 100, count: 5 });
    expect(result.output).not.toMatch(/[0OIl]/);
  });

  it("prefixes each string", async () => {
    const result = await run(randomString, "", { count: 3, length: 8, prefix: "sk_" });
    for (const line of result.output.split("\n")) expect(line.startsWith("sk_")).toBe(true);
  });

  it("rejects an empty custom alphabet", async () => {
    await expect(run(randomString, "", { alphabet: "custom", custom: "" })).rejects.toBeInstanceOf(
      ToolError,
    );
  });
});

describe("password strength: the decorated common word", () => {
  const check = async (password: string) => (await passwordStrength(password, {})).output;

  it("does not call a top-of-the-breach-list password reasonable", async () => {
    // "password123" was rated Reasonable at 48 bits, four hours to crack. A
    // word list finds it in the first thousand guesses.
    const out = await check("password123");
    expect(out).toMatch(/Verdict\s+Very weak/);
    expect(out).toMatch(/well-known password with characters added/);
  });

  it("catches the same trick with punctuation and leetspeak", async () => {
    for (const password of ["Password1!", "p4ssw0rd", "qwerty!!", "letmein2026"]) {
      expect(await check(password), password).toMatch(/Verdict\s+(Very weak|Weak)/);
    }
  });

  it("still calls the bare word what it is", async () => {
    expect(await check("password")).toMatch(/most-guessed passwords in existence/);
  });

  it("does not punish a long passphrase that merely contains a common word", async () => {
    // The stem is what is looked up, so a real passphrase must not be caught
    // by it — otherwise the check would push people away from good passwords.
    const out = await check("password-of-the-seven-locked-gates");
    expect(out).toMatch(/Verdict\s+(Strong|Very strong)/);
  });

  it("writes centuries, not centurys, and stops piling on zeroes", async () => {
    const out = await check("Tr0ub4dor&3-correct-horse-battery-staple-xyzzy");
    expect(out).not.toMatch(/centurys/);
    expect(out).toMatch(/Time to crack\s+(effectively forever|[\d,.]+ centuries)/);
  });
});
