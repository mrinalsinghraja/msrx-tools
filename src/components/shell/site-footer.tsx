import Image from "next/image";
import Link from "next/link";

import logo from "@/../public/brand/msrx-tools-logo.png";
import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { SITE } from "@/lib/site";
import { CATEGORIES } from "@/lib/tools/categories";
import { TOOL_COUNT, toolsInCategory } from "@/lib/tools/registry";

export function SiteFooter() {
  const populated = CATEGORIES.filter((category) => toolsInCategory(category.id).length > 0);

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
          <div>
            {/* The supplied logo, unmodified — see the note in site-header.tsx. */}
            <span className="plate inline-flex items-center overflow-hidden rounded-lg px-2 py-1">
              <Image src={logo} alt={SITE.name} className="h-16 w-auto" sizes="99px" />
            </span>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
              {TOOL_COUNT} tools that run entirely in your browser. No uploads, no accounts, no
              limits, no cost.
            </p>
            <a
              href={SITE.brandUrl}
              className="mt-4 inline-block text-sm font-medium text-accent-ink underline-offset-4 hover:underline"
            >
              More from MSRX
            </a>
          </div>

          <nav aria-label="All categories">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {populated.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/${category.slug}`}
                    className="text-sm font-medium text-ink transition-colors hover:text-accent-ink"
                  >
                    {category.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {toolsInCategory(category.id).length} tools
                  </p>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <nav aria-label="Site information" className="mt-10 border-t border-line pt-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_DOCUMENTS.map((document) => (
              <li key={document.slug}>
                <Link
                  href={`/${document.slug}`}
                  className="text-[13px] text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  {document.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-6 text-xs text-ink-faint">
          © {new Date().getFullYear()} {SITE.brand}. Built for people who would rather not upload
          their files to a stranger.
        </p>
      </div>
    </footer>
  );
}
