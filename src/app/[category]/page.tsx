import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ToolCard } from "@/components/tools/tool-card";
import { PRIVACY_LINE, SITE } from "@/lib/site";
import { CATEGORIES, CATEGORY_BY_SLUG } from "@/lib/tools/categories";
import { toolsInCategory } from "@/lib/tools/registry";

export function generateStaticParams() {
  return CATEGORIES.filter((category) => toolsInCategory(category.id).length > 0).map((category) => ({
    category: category.slug,
  }));
}

export async function generateMetadata({ params }: PageProps<"/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = CATEGORY_BY_SLUG.get(slug);
  if (!category) return {};

  const count = toolsInCategory(category.id).length;
  const title = `${count} free ${category.title.toLowerCase()} tools`;

  return {
    title: `${category.title} tools`,
    description: `${category.blurb} ${PRIVACY_LINE}`,
    alternates: { canonical: `${SITE.url}/${category.slug}` },
    openGraph: { title, description: category.blurb, url: `${SITE.url}/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/[category]">) {
  const { category: slug } = await params;
  const category = CATEGORY_BY_SLUG.get(slug);
  if (!category) notFound();

  const tools = toolsInCategory(category.id);
  if (tools.length === 0) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-graphite-faint">
        <Link href="/" className="hover:text-graphite">
          Tools
        </Link>
        <span className="px-2">/</span>
        <span className="text-graphite">{category.title}</span>
      </nav>

      <header className="max-w-2xl">
        <h1 className="stamp text-4xl font-semibold text-graphite sm:text-5xl">
          {category.title} tools
        </h1>
        <div className="section-rule mt-4 rounded-full" />
        <p className="mt-5 text-base leading-relaxed text-graphite-soft">{category.blurb}</p>
        <p className="annot mt-3 font-medium text-pen-new">
          {tools.length} tools · free · nothing uploaded
        </p>
      </header>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>

      <section className="mt-16 border-t border-construction pt-10">
        <h2 className="stamp-wide text-lg font-semibold text-graphite">
          Other categories
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.id !== category.id && toolsInCategory(c.id).length > 0).map(
            (other) => (
              <li key={other.id}>
                <Link
                  href={`/${other.slug}`}
                  className="inline-flex items-center gap-2 rounded-md border border-construction bg-sheet px-3 py-1.5 text-[13px] font-medium text-graphite transition-colors hover:border-construction-strong"
                >
                  {other.title}
                  <span className="text-graphite-faint">{toolsInCategory(other.id).length}</span>
                </Link>
              </li>
            ),
          )}
        </ul>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${category.title} tools`,
            url: `${SITE.url}/${category.slug}`,
            description: category.blurb,
            hasPart: tools.map((tool) => ({
              "@type": "SoftwareApplication",
              name: tool.title,
              url: `${SITE.url}/${category.slug}/${tool.slug}`,
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Any browser",
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
            })),
          }),
        }}
      />
    </div>
  );
}
