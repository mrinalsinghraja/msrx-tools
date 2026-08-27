import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AssistantPanel } from "@/components/tools/assistant-panel";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolRunner } from "@/components/tools/tool-runner";
import { getToolContent } from "@/content/tools";
import { presetQuestions } from "@/lib/ai/prompt";
import { SITE, PRIVACY_LINE } from "@/lib/site";
import { CATEGORY_BY_SLUG, categoryOf } from "@/lib/tools/categories";
import { getTool, relatedTools, TOOLS, toolHref } from "@/lib/tools/registry";
import type { ToolSpec } from "@/lib/tools/types";

/** Every tool page is prerendered at build time — there is nothing dynamic. */
export function generateStaticParams() {
  return TOOLS.map((tool) => ({
    category: categoryOf(tool.category).slug,
    tool: tool.slug,
  }));
}

function resolve(categorySlug: string, toolSlug: string): ToolSpec | null {
  const category = CATEGORY_BY_SLUG.get(categorySlug);
  const tool = getTool(toolSlug);
  // Guards against a tool being reachable under a category it doesn't belong to,
  // which would otherwise create a duplicate URL for the same page.
  if (!category || !tool || tool.category !== category.id) return null;
  return tool;
}

export async function generateMetadata({ params }: PageProps<"/[category]/[tool]">): Promise<Metadata> {
  const { category, tool: toolSlug } = await params;
  const tool = resolve(category, toolSlug);
  if (!tool) return {};

  const title = `${tool.title} — free, no upload`;
  const description = `${tool.short}. ${PRIVACY_LINE}`;
  const url = `${SITE.url}${toolHref(tool)}`;

  return {
    title: tool.title,
    description,
    keywords: tool.keywords,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function ToolPage({ params }: PageProps<"/[category]/[tool]">) {
  const { category: categorySlug, tool: toolSlug } = await params;
  const tool = resolve(categorySlug, toolSlug);
  if (!tool) notFound();

  const category = categoryOf(tool.category);
  const content = getToolContent(tool.slug);
  const related = relatedTools(tool);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-faint">
          <li>
            <Link href="/" className="hover:text-ink">
              Tools
            </Link>
          </li>
          <ChevronRight className="size-3.5" aria-hidden />
          <li>
            <Link href={`/${category.slug}`} className="hover:text-ink">
              {category.title}
            </Link>
          </li>
          <ChevronRight className="size-3.5" aria-hidden />
          <li aria-current="page" className="text-ink">
            {tool.title}
          </li>
        </ol>
      </nav>

      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {tool.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">{tool.short}.</p>
        <p className="mt-2 text-[13px] text-accent-ink">{PRIVACY_LINE}</p>
      </header>

      <ToolRunner slug={tool.slug} />

      <AssistantPanel slug={tool.slug} toolTitle={tool.title} presets={presetQuestions(tool)} />

      {content ? (
        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
              About the {tool.title}
            </h2>
            <div className="bench-rule mt-3 rounded-full" />
            {content.intro.split("\n\n").map((paragraph, index) => (
              <p key={index} className="mt-4 text-[15px] leading-relaxed text-ink-soft">
                {paragraph}
              </p>
            ))}

            <h2 className="mt-10 font-display text-xl font-semibold tracking-tight text-ink">
              How to use it
            </h2>
            <div className="bench-rule mt-3 rounded-full" />
            <ol className="mt-4 flex flex-col gap-3">
              {content.steps.map((step, index) => (
                <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-wash font-mono text-xs font-medium text-accent-ink">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <h2 className="mt-10 font-display text-xl font-semibold tracking-tight text-ink">
              Questions
            </h2>
            <div className="bench-rule mt-3 rounded-full" />
            <dl className="mt-4 flex flex-col divide-y divide-line border-y border-line">
              {content.faq.map((entry) => (
                <div key={entry.q} className="py-4">
                  <dt className="font-display text-[15px] font-semibold text-ink">{entry.q}</dt>
                  <dd className="mt-2 text-[15px] leading-relaxed text-ink-soft">{entry.a}</dd>
                </div>
              ))}
            </dl>
          </div>

          {related.length ? <RelatedRail tools={related} /> : null}
        </div>
      ) : related.length ? (
        <div className="mt-16 max-w-md">
          <RelatedRail tools={related} />
        </div>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(tool, content, category.title)) }}
      />
    </div>
  );
}

function RelatedRail({ tools }: { tools: ToolSpec[] }) {
  return (
    <aside>
      <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-ink-soft">
        Related tools
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </aside>
  );
}

function buildJsonLd(
  tool: ToolSpec,
  content: ReturnType<typeof getToolContent>,
  categoryTitle: string,
) {
  const url = `${SITE.url}${toolHref(tool)}`;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "SoftwareApplication",
      name: tool.title,
      url,
      applicationCategory: "UtilitiesApplication",
      applicationSubCategory: categoryTitle,
      operatingSystem: "Any browser",
      description: `${tool.short}. ${PRIVACY_LINE}`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      publisher: { "@type": "Organization", name: SITE.brand, url: SITE.brandUrl },
    },
  ];

  if (content) {
    graph.push({
      "@type": "HowTo",
      name: `How to use the ${tool.title.toLowerCase()}`,
      step: content.steps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        text: step,
      })),
    });
    graph.push({
      "@type": "FAQPage",
      mainEntity: content.faq.map((entry) => ({
        "@type": "Question",
        name: entry.q,
        acceptedAnswer: { "@type": "Answer", text: entry.a },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
