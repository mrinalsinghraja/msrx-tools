import Link from "next/link";

import { LEGAL_DOCUMENTS, LEGAL_UPDATED, type LegalDocument } from "@/lib/legal";

/**
 * Renders one legal page. Shared by the four literal routes.
 *
 * The routes are literal rather than a `[document]` segment because a second
 * root-level dynamic route would collide with `/[category]` — Next allows only
 * one slug name per dynamic path.
 */
export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-ink-faint">
        <Link href="/" className="hover:text-ink">
          Tools
        </Link>
        <span className="px-2">/</span>
        <span className="text-ink">{document.title}</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {document.title}
        </h1>
        <div className="bench-rule mt-4 rounded-full" />
        <p className="mt-5 text-base leading-relaxed text-ink-soft">{document.standfirst}</p>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-ink-faint">
          Last updated {LEGAL_UPDATED}
        </p>
      </header>

      <div className="mt-10 flex flex-col gap-10">
        {document.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
              {section.heading}
            </h2>

            {section.paragraphs?.map((paragraph, index) => (
              <p key={index} className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                {paragraph}
              </p>
            ))}

            {section.bullets ? (
              <ul className="mt-4 flex flex-col gap-3">
                {section.bullets.map((bullet, index) => (
                  <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <nav aria-label="Other pages" className="mt-14 border-t border-line pt-6">
        <ul className="flex flex-wrap gap-2">
          {LEGAL_DOCUMENTS.filter((other) => other.slug !== document.slug).map((other) => (
            <li key={other.slug}>
              <Link
                href={`/${other.slug}`}
                className="inline-flex rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-line-strong"
              >
                {other.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
