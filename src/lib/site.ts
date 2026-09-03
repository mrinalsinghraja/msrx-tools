/** One place for the facts that appear in metadata, JSON-LD and the footer. */
export const SITE = {
  name: "MSRX Tools",
  shortName: "Tools",
  url: "https://tools.msrx.co.in",
  tagline: "Every file tool you need. None of them upload your files.",
  description:
    "Free forever, no account, works offline. Merge and split PDFs, compress and convert images, format JSON and more — all processed inside your own browser, so your files are never uploaded and nothing is stored on a server.",
  brand: "MSRX",
  brandUrl: "https://www.msrx.co.in",
  locale: "en_IN",
} as const;

/** The one-line promise that appears on every page. It has to stay true. */
export const PRIVACY_LINE =
  "Everything runs inside your browser. Your files never leave your device.";

/**
 * The AI category's version of that line.
 *
 * The promise above is the site's whole argument, and on twenty-three pages it
 * would be false. Rather than soften it everywhere with an asterisk — which
 * would weaken it on the hundred and twenty-five pages where it is exactly
 * true — those pages state the opposite, in the same position, at the same
 * size. A claim that is qualified everywhere is worth less than a claim that
 * holds absolutely and names its exception.
 */
export const AI_PRIVACY_LINE =
  "This tool sends your text to a server. Nothing else on this site does.";

/** Picks the line for a tool. The AI engine is the only one that leaves the device. */
export function privacyLineFor(engine: string): string {
  return engine === "ai" ? AI_PRIVACY_LINE : PRIVACY_LINE;
}
