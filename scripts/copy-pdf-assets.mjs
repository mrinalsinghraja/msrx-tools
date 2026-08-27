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

console.log("pdf.js assets copied to public/vendor/pdfjs");
