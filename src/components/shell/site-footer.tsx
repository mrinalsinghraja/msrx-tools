import Image from "next/image";
import Link from "next/link";

import logo from "@/../public/brand/msrx-tools-logo.png";
import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { SITE } from "@/lib/site";
import { CATEGORIES } from "@/lib/tools/categories";
import { TOOL_COUNT, toolsInCategory } from "@/lib/tools/registry";

/**
 * The title block.
 *
 * Every engineering drawing ends in one: a ruled panel carrying the project, the
 * sheet count, the scale, the revision and the notes. It is the most recognisable
 * object in the drafting vocabulary, and it wants exactly what a footer wants —
 * so this is a real title block rather than a footer wearing one.
 *
 * Every field holds a true value. Sheets is the tool count. Scale is 1:1 because
 * nothing is sent anywhere to be worked on at another size. The notes are the
 * legal pages.
 */
export function SiteFooter() {
  const populated = CATEGORIES.filter((category) => toolsInCategory(category.id).length > 0);
  const revision = new Date().toISOString().slice(0, 10);

  return (
    <footer className="mt-20 border-t-2 border-graphite bg-sheet">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 border-b border-construction md:grid-cols-4">
          <Field label="Project">
            <span className="stamp-wide text-base text-graphite">{SITE.name}</span>
          </Field>
          <Field label="Sheets">
            <span className="font-mono text-base text-graphite">{TOOL_COUNT}</span>
            <span className="annot ml-2">tools</span>
          </Field>
          <Field label="Scale">
            <span className="font-mono text-base text-graphite">1:1</span>
            <span className="annot ml-2">no server</span>
          </Field>
          <Field label="Revision" last>
            <span className="font-mono text-base text-graphite">{revision}</span>
          </Field>
        </div>

        <div className="grid gap-8 border-b border-construction py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <p className="annot">Drawn by</p>
            {/* The supplied logo, unmodified — see the note in site-header.tsx. */}
            <span className="mt-3 inline-flex border border-construction bg-sheet px-2 py-1">
              <Image src={logo} alt={SITE.name} className="h-12 w-auto" sizes="74px" />
            </span>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-graphite-soft">
              {TOOL_COUNT} tools that run entirely in your browser. No uploads, no accounts, no
              limits, no cost.
            </p>
            <a
              href={SITE.brandUrl}
              className="mt-3 inline-block text-[13px] font-medium text-pen-new underline-offset-4 hover:underline"
            >
              More from MSRX
            </a>
          </div>

          <nav aria-label="All categories">
            <p className="annot">Sheet index</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {populated.map((category, index) => (
                <li key={category.id} className="flex items-baseline gap-2">
                  {/* Grid reference: this category's column on the plan. */}
                  <span className="font-mono text-[11px] text-graphite-faint">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>
                    <Link
                      href={`/${category.slug}`}
                      className="text-sm font-medium text-graphite transition-colors hover:text-pen-new"
                    >
                      {category.title}
                    </Link>
                    <span className="mt-0.5 block font-mono text-[11px] text-graphite-faint">
                      {toolsInCategory(category.id).length} tools
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4 py-6">
          <nav aria-label="Site information">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {LEGAL_DOCUMENTS.map((document) => (
                <li key={document.slug}>
                  <Link
                    href={`/${document.slug}`}
                    className="text-[13px] text-graphite-soft underline-offset-4 transition-colors hover:text-graphite hover:underline"
                  >
                    {document.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="annot">
            © {new Date().getFullYear()} {SITE.brand} — free, and staying that way
          </p>
        </div>
      </div>
    </footer>
  );
}

/** One ruled cell of the title block. */
function Field({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`border-b border-construction px-4 py-3 md:border-b-0 ${last ? "" : "md:border-r md:border-construction"}`}
    >
      <p className="annot">{label}</p>
      <p className="mt-1 flex items-baseline">{children}</p>
    </div>
  );
}
