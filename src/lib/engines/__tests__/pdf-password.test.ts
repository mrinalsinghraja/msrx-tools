// @vitest-environment node
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { PDFDocument, StandardFonts } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";

import { protectPdf, unlockPdf } from "@/lib/engines/pdf/protect";
import { runQpdf, setQpdfFactory } from "@/lib/engines/pdf/qpdf";
import { ToolError } from "@/lib/engines/types";

/**
 * The password tools, against the real qpdf.
 *
 * This file runs in Node rather than jsdom on purpose. The shipped loader
 * fetches the WebAssembly build with a script tag, which jsdom will not do, so
 * the module is required through Node's own loader and injected. Everything
 * under test is then the real thing: real AES-256, real documents, and a
 * round trip that proves the output of one tool is readable by the other.
 */

const require = createRequire(import.meta.url);

beforeAll(async () => {
  const packageRoot = dirname(require.resolve("@neslinesli93/qpdf-wasm/package.json"));
  const create = require("@neslinesli93/qpdf-wasm");
  setQpdfFactory((options) =>
    create({ ...options, locateFile: () => join(packageRoot, "dist", "qpdf.wasm") }),
  );
});

async function makePdf(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([300, 200]).drawText(text, { x: 20, y: 100, size: 16, font });
  doc.addPage([300, 200]).drawText("second page", { x: 20, y: 100, size: 12, font });
  return await doc.save();
}

/**
 * Builds the two shapes of protected PDF that exist in the wild.
 *
 * qpdf's encryption grammar is positional: passwords, then `--bits`, then the
 * permission flags. Written in any other order it rejects the argument it has
 * not reached yet, which is why this helper takes the two groups apart.
 */
async function encrypt(
  bytes: Uint8Array,
  passwords: string[],
  permissions: string[] = [],
): Promise<Uint8Array> {
  const run = await runQpdf(
    ["{INPUT}", "--encrypt", ...passwords, "--bits=256", ...permissions, "--", "{OUTPUT}"],
    bytes,
  );
  expect([run.code, run.output]).toEqual([0, ""]);
  if (!run.bytes) throw new Error("qpdf wrote no output");
  return run.bytes;
}

const asFile = (name: string, bytes: Uint8Array) => [{ name, bytes }];
const latin1 = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

let plain: Uint8Array;
let locked: Uint8Array;
let restricted: Uint8Array;

beforeAll(async () => {
  plain = await makePdf("Confidential");
  locked = await encrypt(plain, ["--user-password=secret", "--owner-password=secret"]);
  restricted = await encrypt(plain, ["--user-password=", "--owner-password=boss"], ["--print=none"]);
});

describe("unlockPdf", () => {
  it("removes a password when given the one that opens the file", async () => {
    const result = await unlockPdf(asFile("report.pdf", locked), { password: "secret" });

    expect(result.files[0].name).toBe("report-unlocked.pdf");
    // The claim is that the encryption is GONE, so check the document rather
    // than the exit code: pdf-lib cannot read an encrypted PDF at all.
    const reopened = await PDFDocument.load(result.files[0].bytes);
    expect(reopened.getPageCount()).toBe(2);
    expect(latin1(result.files[0].bytes)).not.toContain("/Encrypt");
  });

  it("refuses to guess, and says which password it wants", async () => {
    await expect(unlockPdf(asFile("report.pdf", locked), { password: "" })).rejects.toThrow(ToolError);
    await expect(unlockPdf(asFile("report.pdf", locked), { password: "" })).rejects.toThrow(
      /needs its password/i,
    );
  });

  it("does not accept a wrong password", async () => {
    await expect(unlockPdf(asFile("report.pdf", locked), { password: "Secret" })).rejects.toThrow(
      /did not open/i,
    );
  });

  it("lifts usage restrictions without asking for a password", async () => {
    // A file with an owner password only opens for anyone already. Asking for a
    // password here would be theatre, and the tool would be unusable for the
    // most common case people bring to it.
    const result = await unlockPdf(asFile("restricted.pdf", restricted), { password: "" });

    expect(latin1(result.files[0].bytes)).not.toContain("/Encrypt");
    expect(result.note).toMatch(/usage restrictions/i);
  });

  it("leaves a document that was never encrypted exactly as it was", async () => {
    const result = await unlockPdf(asFile("open.pdf", plain), { password: "" });

    expect(result.files[0].bytes).toEqual(plain);
    expect(result.files[0].name).toBe("open.pdf");
    expect(result.note).toMatch(/not encrypted at all/i);
  });
});

describe("protectPdf", () => {
  it("writes a document that cannot be opened without the password", async () => {
    const result = await protectPdf(asFile("notes.pdf", plain), { password: "hunter2" });
    const out = result.files[0].bytes;

    expect(result.files[0].name).toBe("notes-protected.pdf");
    expect(latin1(out)).toContain("/Encrypt");
    // AESV3 is the 256-bit algorithm. A file that said RC4 here would still
    // "have a password" and would be worth nothing.
    expect(latin1(out)).toContain("AESV3");

    const withoutPassword = await runQpdf(["{INPUT}", "--show-encryption"], out);
    expect(withoutPassword.output).toMatch(/invalid password/i);

    const withPassword = await runQpdf(["--password=hunter2", "{INPUT}", "--decrypt", "--", "{OUTPUT}"], out);
    expect(withPassword.code).toBe(0);
  });

  it("round-trips through unlockPdf", async () => {
    const [protectedFile] = (await protectPdf(asFile("notes.pdf", plain), { password: "pass phrase" })).files;
    const [unlockedFile] = (await unlockPdf(asFile(protectedFile.name, protectedFile.bytes), {
      password: "pass phrase",
    })).files;

    const reopened = await PDFDocument.load(unlockedFile.bytes);
    expect(reopened.getPageCount()).toBe(2);
  });

  it("records the permissions it was asked for", async () => {
    const [file] = (
      await protectPdf(asFile("notes.pdf", plain), {
        password: "x",
        allowPrinting: false,
        allowCopying: false,
        allowEditing: false,
      })
    ).files;

    const shown = await runQpdf(["--password=x", "{INPUT}", "--show-encryption"], file.bytes);
    expect(shown.output).toMatch(/print low resolution: not allowed/);
    expect(shown.output).toMatch(/extract for any purpose: not allowed/);
  });

  it("will not encrypt an already encrypted file into a document nobody can open", async () => {
    // Encrypting twice would produce a file needing two passwords in sequence,
    // which no reader offers, so this has to be a refusal rather than an attempt.
    await expect(protectPdf(asFile("locked.pdf", locked), { password: "new" })).rejects.toThrow(
      /already encrypted/i,
    );
  });

  it("refuses an empty password instead of writing an unprotected file", async () => {
    await expect(protectPdf(asFile("notes.pdf", plain), { password: "" })).rejects.toThrow(
      /Type the password/i,
    );
  });
});
