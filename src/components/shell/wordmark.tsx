import Image from "next/image";

import logoDark from "@/../public/brand/msrx-tools-logo-sheet-dark.png";
import logoLight from "@/../public/brand/msrx-tools-logo-sheet.png";
import { SITE } from "@/lib/site";

/**
 * The logo, in the sheet's ink.
 *
 * The supplied artwork is an opaque PNG on a near-white ground with a wide white
 * margin, so it had to be framed as a white plate to sit on the film at all —
 * and a bright card carrying a glossy app-icon reads as a sticker from another
 * product rather than as part of the drawing. `scripts/logo-sheet-edition.py`
 * recolours it without touching the form: the ground becomes real transparency,
 * brand cyan stays (it is already `--color-pen-fill` here), the violet end of
 * the gradient travels to the deep pen, and the wordmark becomes graphite.
 *
 * Two editions, because graphite lettering disappears on the dark sheet. The
 * second carries an empty alt so a screen reader is told the name once.
 */
export function Wordmark({ className, priority = false }: { className: string; priority?: boolean }) {
  return (
    <>
      <Image
        src={logoLight}
        alt={SITE.name}
        priority={priority}
        sizes="220px"
        className={`${className} dark:hidden`}
      />
      <Image
        src={logoDark}
        alt=""
        aria-hidden
        priority={priority}
        sizes="220px"
        className={`hidden ${className} dark:block`}
      />
    </>
  );
}
