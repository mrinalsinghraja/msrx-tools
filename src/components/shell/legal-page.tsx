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
      <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-graphite-faint">
        <Link href="/" className="hover:text-graphite">
          Tools
        </Link>
        <span className="px-2">/</span>
        <span className="text-graphite">{document.title}</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="stamp text-4xl font-semibold text-graphite sm:text-5xl">
          {document.title}
        </h1>
        <div className="section-rule mt-4 rounded-full" />
        <p className="mt-5 text-base leading-relaxed text-graphite-soft">{document.standfirst}</p>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-graphite-faint">
          Last updated {LEGAL_UPDATED}
        </p>
      </header>

      <div className="mt-10 flex flex-col gap-10">
        {document.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="stamp-wide text-lg font-semibold text-graphite">
              {section.heading}
            </h2>

            {section.paragraphs?.map((paragraph, index) => (
              <p key={index} className="mt-4 text-[15px] leading-relaxed text-graphite-soft">
                {paragraph}
              </p>
            ))}

            {section.bullets ? (
              <ul className="mt-4 flex flex-col gap-3">
                {section.bullets.map((bullet, index) => (
                  <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-graphite-soft">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-pen-fill" />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <nav aria-label="Other pages" className="mt-14 border-t border-construction pt-6">
        <ul className="flex flex-wrap gap-2">
          {LEGAL_DOCUMENTS.filter((other) => other.slug !== document.slug).map((other) => (
            <li key={other.slug}>
              <Link
                href={`/${other.slug}`}
                className="inline-flex rounded-md border border-construction bg-sheet px-3 py-1.5 text-[13px] font-medium text-graphite transition-colors hover:border-construction-strong"
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
