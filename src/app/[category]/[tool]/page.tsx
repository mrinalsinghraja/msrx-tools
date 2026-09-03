import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AssistantPanel } from "@/components/tools/assistant-panel";
import { SpecBlock } from "@/components/tools/spec-block";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolRunner } from "@/components/tools/tool-runner";
import { getToolContent } from "@/content/tools";
import { presetQuestions } from "@/lib/ai/prompt";
import { AiDisclosure } from "@/components/tools/ai-disclosure";
import { SITE, privacyLineFor } from "@/lib/site";
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
  const description = `${tool.short}. ${privacyLineFor(tool.engine)}`;
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
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-graphite-faint">
          <li>
            <Link href="/" className="hover:text-graphite">
              Tools
            </Link>
          </li>
          <ChevronRight className="size-3.5" aria-hidden />
          <li>
            <Link href={`/${category.slug}`} className="hover:text-graphite">
              {category.title}
            </Link>
          </li>
          <ChevronRight className="size-3.5" aria-hidden />
          <li aria-current="page" className="text-graphite">
            {tool.title}
          </li>
        </ol>
      </nav>

      <header className="mb-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="max-w-2xl">
          <h1 className="stamp text-3xl font-semibold text-graphite sm:text-4xl">{tool.title}</h1>
          <div className="section-rule mt-4 max-w-xs" />
          <p className="mt-5 text-base leading-relaxed text-graphite-soft">{tool.short}.</p>
          <p className={tool.engine === "ai" ? "annot mt-3 text-pen-rev" : "annot mt-3 text-pen-new"}>
            {privacyLineFor(tool.engine)}
          </p>
        </div>

        {/* The facts you want before starting, read straight from the registry
            so a row can never disagree with the tool it describes. */}
        <SpecBlock tool={tool} />
      </header>

      <ToolRunner slug={tool.slug} />

      {/* Stated once per page, from the registry, rather than written into the
          prose of every AI tool — it is a fact about the category. */}
      {tool.engine === "ai" ? <AiDisclosure /> : null}

      <AssistantPanel slug={tool.slug} toolTitle={tool.title} presets={presetQuestions(tool)} />

      {content ? (
        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="max-w-2xl">
            <h2 className="stamp-wide text-lg font-semibold text-graphite">
              About the {tool.title}
            </h2>
            <div className="section-rule mt-3 rounded-full" />
            {content.intro.split("\n\n").map((paragraph, index) => (
              <p key={index} className="mt-4 text-[15px] leading-relaxed text-graphite-soft">
                {paragraph}
              </p>
            ))}

            <h2 className="mt-10 stamp-wide text-lg font-semibold text-graphite">
              How to use it
            </h2>
            <div className="section-rule mt-3 rounded-full" />
            <ol className="mt-4 flex flex-col gap-3">
              {content.steps.map((step, index) => (
                <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-graphite-soft">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-pen-wash font-mono text-xs font-medium text-pen-new">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <h2 className="mt-10 stamp-wide text-lg font-semibold text-graphite">
              Questions
            </h2>
            <div className="section-rule mt-3 rounded-full" />
            <dl className="mt-4 flex flex-col divide-y divide-construction border-y border-construction">
              {content.faq.map((entry) => (
                <div key={entry.q} className="py-4">
                  <dt className="stamp text-[15px] font-semibold text-graphite">{entry.q}</dt>
                  <dd className="mt-2 text-[15px] leading-relaxed text-graphite-soft">{entry.a}</dd>
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
      <h2 className="annot">
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
      description: `${tool.short}. ${privacyLineFor(tool.engine)}`,
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
