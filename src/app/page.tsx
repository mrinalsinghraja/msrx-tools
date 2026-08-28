import * as icons from "lucide-react";
import { Check, X } from "lucide-react";
import Link from "next/link";

import { HeroAssembly } from "@/components/diagram/hero-assembly";
import { ToolCard } from "@/components/tools/tool-card";
import { CLAIMS, COMPARISONS, HOME_FAQ, PITCH } from "@/lib/pitch";
import { SITE } from "@/lib/site";
import { CATEGORIES } from "@/lib/tools/categories";
import { TOOL_COUNT, toolsInCategory } from "@/lib/tools/registry";

export default function HomePage() {
  const populated = CATEGORIES.filter((category) => toolsInCategory(category.id).length > 0);

  return (
    <>
      <section className="sheet-grid border-b-2 border-graphite">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="annot">
            {TOOL_COUNT} tools · free · no account · nothing uploaded
          </p>
          <h1 className="stamp mt-4 max-w-3xl text-4xl font-semibold leading-[1.06] text-graphite sm:text-5xl">
            Every file tool you need.
            <br />
            <span className="text-graphite-soft">None of them upload your files.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-graphite-soft">
            Other tool sites send your documents to a server, process them there and promise to
            delete them later. These run inside the tab you already have open. There is no upload
            to trust, because there is no upload.
          </p>

          {/* The argument, drawn. See hero-assembly.tsx for why it is a diagram. */}
          <div className="mt-10 border border-construction bg-sheet p-4 sm:p-6">
            <HeroAssembly />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pdf/merge-pdf"
              className="inline-flex h-11 items-center rounded-md bg-pen-new px-5 text-sm font-medium text-on-pen transition-colors hover:bg-pen-deep"
            >
              Merge a PDF
            </Link>
            <Link
              href="/image/compress-image"
              className="inline-flex h-11 items-center rounded-md border border-construction bg-sheet px-5 text-sm font-medium text-graphite shadow-raise transition-colors hover:border-construction-strong"
            >
              Compress an image
            </Link>
          </div>

          <dl className="mt-14 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {CLAIMS.map((claim, index) => {
              const set = icons as unknown as Record<string, icons.LucideIcon>;
              const Icon = set[claim.icon] ?? icons.Check;
              return (
                <div key={claim.title} className="border-t border-construction pt-4">
                  {/* Callout bubbles are numbered because these annotate the
                      drawing above — the number is the leader, not decoration. */}
                  <dt className="flex items-start gap-3">
                    <span className="callout mt-0.5">{String(index + 1).padStart(2, "0")}</span>
                    <span className="stamp text-sm font-semibold text-graphite">
                      <Icon className="mr-1.5 inline size-4 -translate-y-px text-pen-new" aria-hidden />
                      {claim.title}
                    </span>
                  </dt>
                  <dd className="mt-3 text-[13px] leading-relaxed text-graphite-soft">
                    {claim.body}
                    {claim.proof ? (
                      <span className="annot mt-2 block normal-case tracking-normal text-graphite-faint">
                        {claim.proof}
                      </span>
                    ) : null}
                  </dd>
                </div>
              );
            })}
          </dl>

          <p className="mt-10 max-w-xl text-[13px] leading-relaxed text-graphite-faint">
            One exception, stated plainly: the optional AI assistant on each tool page sends the
            question you type to be answered. It never sees your files or your tool input.{" "}
            <Link href="/privacy" className="text-pen-new underline-offset-4 hover:underline">
              The privacy notice
            </Link>{" "}
            explains exactly what does and does not happen.
          </p>
        </div>
      </section>

      <section className="border-b border-construction bg-sheet">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="stamp-wide text-xl font-semibold text-graphite">
            How this differs from every other tool site
          </h2>
          <div className="section-rule mt-3 max-w-md rounded-full" />

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-construction">
                  <th scope="col" className="py-3 pr-6 text-[13px] font-medium text-graphite-faint">
                    &nbsp;
                  </th>
                  <th scope="col" className="py-3 pr-6 text-[13px] font-medium text-graphite-faint">
                    <span className="inline-flex items-center gap-1.5">
                      <X className="size-3.5" aria-hidden />
                      The usual arrangement
                    </span>
                  </th>
                  <th scope="col" className="py-3 text-[13px] font-medium text-pen-new">
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="size-3.5" aria-hidden />
                      {SITE.name}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISONS.map((row) => (
                  <tr key={row.question} className="border-b border-construction align-top">
                    <th scope="row" className="py-4 pr-6 stamp text-sm font-semibold text-graphite">
                      {row.question}
                    </th>
                    <td className="py-4 pr-6 text-[13px] leading-relaxed text-graphite-soft">
                      {row.others}
                    </td>
                    <td className="py-4 text-[13px] leading-relaxed text-graphite">{row.here}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {populated.map((category) => {
          const tools = toolsInCategory(category.id);
          return (
            <section key={category.id} className="mb-16 last:mb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="stamp-wide text-xl font-semibold text-graphite">
                  {category.title}
                </h2>
                <Link
                  href={`/${category.slug}`}
                  className="text-sm font-medium text-pen-new underline-offset-4 hover:underline"
                >
                  All {tools.length} {category.title.toLowerCase()} tools
                </Link>
              </div>
              <div className="section-rule mt-3 rounded-full" />
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-graphite-soft">{category.blurb}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tools.slice(0, 6).map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="border-t border-construction bg-sheet">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="stamp-wide text-xl font-semibold text-graphite">
            Questions people reasonably ask
          </h2>
          <div className="section-rule mt-3 max-w-md rounded-full" />

          <dl className="mt-8 divide-y divide-construction border-y border-construction">
            {HOME_FAQ.map((entry) => (
              <div key={entry.q} className="py-5">
                <dt className="stamp text-[15px] font-semibold text-graphite">{entry.q}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-graphite-soft">{entry.a}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 text-sm text-graphite-soft">
            Still unsure?{" "}
            <Link href="/privacy" className="text-pen-new underline-offset-4 hover:underline">
              Read the privacy notice
            </Link>
            , or{" "}
            <Link href="/contact" className="text-pen-new underline-offset-4 hover:underline">
              ask
            </Link>
            .
          </p>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                name: SITE.name,
                url: SITE.url,
                description: PITCH.oneLiner,
                publisher: { "@type": "Organization", name: SITE.brand, url: SITE.brandUrl },
              },
              {
                "@type": "FAQPage",
                mainEntity: HOME_FAQ.map((entry) => ({
                  "@type": "Question",
                  name: entry.q,
                  acceptedAnswer: { "@type": "Answer", text: entry.a },
                })),
              },
            ],
          }),
        }}
      />
    </>
  );
}
