import { cpSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * Copies pdf.js's runtime assets into public/vendor/pdfjs.
 *
 * pdf.js does not bundle these. Without them `getDocument` still resolves — the
 * document parses fine — but `page.render()` never settles, because it is
 * waiting on font data that will never arrive. A hang with no error, which is
 * why this script exists rather than a comment saying "remember to copy these".
 *
 *   standard_fonts  the Foxit substitutes for Helvetica, Times and Courier.
 *                   Needed by almost every PDF ever made.
 *   cmaps           character maps for CJK and other multi-byte encodings.
 *   wasm            the optional decoders pdf.js uses for some image formats.
 *
 * Serving them from our own origin is also what keeps the site offline-capable:
 * pdf.js would otherwise want a CDN.
 */
const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve("pdfjs-dist/package.json"));
const target = join(process.cwd(), "public", "vendor", "pdfjs");

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

for (const directory of ["standard_fonts", "cmaps", "wasm"]) {
  cpSync(join(packageRoot, directory), join(target, directory), { recursive: true });
}

/**
 * The worker, copied rather than bundled.
 *
 * pdf.js does its parsing in a worker and will not start without one. Handing
 * the bundler a wrapper module and `new URL("./pdf.worker.ts", import.meta.url)`
 * looks like the modern way to do it and silently is not: Turbopack treats that
 * as a static asset reference, so it published the raw TypeScript source at
 * /_next/static/media/pdf.worker.<hash>.ts, served as `video/mp2t` because `.ts`
 * is also a video extension. The browser refused it, the Worker fired an error
 * event with no message, and pdf.js waited on a handshake that never came — an
 * infinite spinner on five tools, with nothing in the console.
 *
 * Copying the prebuilt worker and pointing `workerSrc` at it takes the bundler
 * out of the question entirely. It is the same file pdf.js ships to everyone.
 *
 * If this name changes, change WORKER_SRC in src/lib/engines/pdf/pdfjs.ts to
 * match — there is a test that fails if the two ever disagree.
 */
cpSync(join(packageRoot, "build", "pdf.worker.min.mjs"), join(target, "pdf.worker.min.mjs"));

console.log("pdf.js assets copied to public/vendor/pdfjs");

/**
 * qpdf's WebAssembly build, for the password tools.
 *
 * It is copied rather than imported because the package is an Emscripten
 * CommonJS bundle that reaches for `fs`, `path` and `crypto` behind Node guards
 * a browser bundler cannot see through — and because its 1.3 MB payload has no
 * business in the main bundle. `src/lib/engines/pdf/qpdf.ts` loads it from here
 * with a script tag, on the first run of a tool that needs it.
 */
const qpdfRoot = dirname(require.resolve("@neslinesli93/qpdf-wasm/package.json"));
const qpdfTarget = join(process.cwd(), "public", "vendor", "qpdf");

rmSync(qpdfTarget, { recursive: true, force: true });
mkdirSync(qpdfTarget, { recursive: true });

for (const file of ["qpdf.js", "qpdf.wasm"]) {
  cpSync(join(qpdfRoot, "dist", file), join(qpdfTarget, file));
}

console.log("qpdf assets copied to public/vendor/qpdf");
