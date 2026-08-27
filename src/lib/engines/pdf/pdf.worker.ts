/**
 * pdf.js worker entry.
 *
 * Exists so the worker can be created with a RELATIVE `new URL(...)`, which is
 * the only form Turbopack rewrites into a real asset URL. A bare package path
 * there produces a URL that never resolves, and pdf.js then waits on a worker
 * that will never start — a hang with no error, which is the worst kind.
 */
import "pdfjs-dist/build/pdf.worker.min.mjs";
