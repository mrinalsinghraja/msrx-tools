// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * That pdf.js can actually find its worker.
 *
 * This exists because of a bug that cost five tools: the loader asked the
 * bundler for a worker, the bundler published the raw TypeScript source as a
 * static asset instead, and the browser refused to run it. pdf.js then waited
 * for a handshake for ever. No exception, no console message, no failed
 * request — just a spinner, in production, for weeks.
 *
 * Nothing in a unit test can start a worker. What it can do is check the two
 * halves still agree: that the path the loader asks for is the path the copy
 * script writes, and that the file behind it exists and is a real script rather
 * than something that merely has the right name.
 */

// `.pathname` would percent-encode the space in this repository's parent
// directory, and every path built from it would then miss.
const ROOT = fileURLToPath(new URL("../../../..", import.meta.url));

const LOADER = readFileSync(join(ROOT, "src/lib/engines/pdf/pdfjs.ts"), "utf8");
const RENDER = readFileSync(join(ROOT, "src/lib/engines/pdf/render.ts"), "utf8");
const COPY_SCRIPT = readFileSync(join(ROOT, "scripts/copy-pdf-assets.mjs"), "utf8");

/** The path in `WORKER_SRC`, read out of the loader rather than duplicated here. */
function declaredWorkerPath(): string {
  const base = /const ASSET_BASE = "([^"]+)"/.exec(LOADER)?.[1];
  const file = /const WORKER_SRC = `\$\{ASSET_BASE\}\/([^`]+)`/.exec(LOADER)?.[1];
  expect(base, "ASSET_BASE not found in pdfjs.ts").toBeTruthy();
  expect(file, "WORKER_SRC not found in pdfjs.ts").toBeTruthy();
  return `${base}/${file}`;
}

describe("pdf.js worker", () => {
  it("is asked for by a path, not resolved through the bundler", () => {
    // `new Worker(new URL(...))` is what broke: Turbopack answered it with an
    // asset URL for the untranspiled source. If it comes back, so does the hang.
    expect(LOADER).not.toMatch(/new Worker\s*\(/);
    expect(LOADER).toMatch(/GlobalWorkerOptions\.workerSrc\s*=/);
  });

  it("names a file the copy script actually writes", () => {
    const filename = declaredWorkerPath().split("/").pop() as string;
    expect(COPY_SCRIPT).toContain(filename);
  });

  it("has that file in public/, ready to serve", () => {
    const served = join(ROOT, "public", declaredWorkerPath().replace(/^\//, ""));
    expect(existsSync(served), `${served} is missing — run scripts/copy-pdf-assets.mjs`).toBe(true);

    // A worker that is not JavaScript is exactly the failure being guarded
    // against, so check the content rather than only the name.
    const head = readFileSync(served, "utf8").slice(0, 4000);
    expect(head).toMatch(/pdf\.js|pdfjs|Mozilla/i);
    expect(served.endsWith(".mjs")).toBe(true);
  });

  it("copies it from the installed pdfjs-dist, so it cannot drift from the library", () => {
    const require = createRequire(import.meta.url);
    const packageRoot = dirname(require.resolve("pdfjs-dist/package.json"));
    const source = join(packageRoot, "build", "pdf.worker.min.mjs");

    expect(existsSync(source)).toBe(true);
    // Byte-for-byte: a worker from a different version than the library that
    // loads it fails in ways far more confusing than a missing file.
    const served = join(ROOT, "public", declaredWorkerPath().replace(/^\//, ""));
    expect(readFileSync(served).equals(readFileSync(source))).toBe(true);
  });

  it("still serves the font and cmap assets the renderer waits on", () => {
    for (const directory of ["standard_fonts", "cmaps", "wasm"]) {
      expect(existsSync(join(ROOT, "public/vendor/pdfjs", directory)), directory).toBe(true);
    }
  });
});

describe("pdf.js rendering", () => {
  it("asks for print intent on every render, or the page never finishes in a background tab", () => {
    // pdf.js schedules each chunk of a display-intent render with
    // requestAnimationFrame, and a browser runs no animation frames in a tab
    // that is not visible. Anyone who starts a conversion and switches tab —
    // the natural thing to do while waiting — comes back to a spinner that will
    // never finish, with no error anywhere. Print intent schedules on
    // microtasks and completes whether the tab is watched or not.
    const calls = RENDER.match(/\.render\(\{[^}]*\}\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call, `a render call is missing intent: "print" — ${call}`).toMatch(/intent:\s*"print"/);
    }
  });

  it("puts a deadline on opening a document, so a stall becomes a sentence", () => {
    // Every way the worker can fail to start looks the same from here: pdf.js
    // waits for a message that never arrives. A promise that never settles is
    // the worst failure a tool can have, because the person watching it cannot
    // tell whether to keep waiting.
    expect(LOADER).toMatch(/OPEN_TIMEOUT_MS/);
    expect(LOADER).toMatch(/withTimeout\(/);
  });
});

describe("pdf.js documents", () => {
  it("are only reachable through the scope that closes them", () => {
    // pdf.js holds every parsed document in the worker until it is told to let
    // go. Five ops opened one and walked away, and the live preview would have
    // done it on every keystroke. Making `openDocument` private is what stops
    // that coming back: there is no way to open one without the scope.
    expect(LOADER).toMatch(/^async function openDocument/m);
    expect(LOADER).not.toMatch(/^export async function openDocument/m);
    expect(LOADER).toMatch(/export async function withDocument/);
  });

  it("close on the loading task, which is the call that actually frees them", () => {
    // `PDFDocumentProxy` has a `cleanup()` that frees page resources and keeps
    // the parsed document. Only the loading task's `destroy()` releases it, and
    // the two are easy to confuse.
    expect(LOADER).toMatch(/loadingTask\.destroy\(\)/);
  });

  it("are closed even when the work inside throws", () => {
    // Several ops throw after opening — no extractable text, no matching terms.
    // A close that only ran on the happy path would leak exactly when a person
    // is retrying with different settings.
    const scope = /export async function withDocument[\s\S]*?\n}/.exec(LOADER)?.[0] ?? "";
    expect(scope).toMatch(/try\s*\{/);
    expect(scope).toMatch(/finally\s*\{/);
  });

  it("leaves no op opening one on its own", () => {
    const ops = readFileSync(join(ROOT, "src/lib/engines/pdf/render.ts"), "utf8");
    expect(ops).not.toMatch(/await openDocument\(/);
  });
});
