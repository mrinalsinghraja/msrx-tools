import { CloudOff, Gauge, Lock, WifiOff } from "lucide-react";
import Link from "next/link";

import { ToolCard } from "@/components/tools/tool-card";
import { SITE } from "@/lib/site";
import { CATEGORIES } from "@/lib/tools/categories";
import { TOOL_COUNT, toolsInCategory } from "@/lib/tools/registry";

export default function HomePage() {
  const populated = CATEGORIES.filter((category) => toolsInCategory(category.id).length > 0);

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-ink">
            {TOOL_COUNT} tools · nothing uploaded
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            Every file tool you need.
            <br />
            <span className="text-ink-soft">None of them upload your files.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft">
            Other tool sites send your documents to a server, process them there and promise to
            delete them later. These run inside the tab you already have open. There is no upload
            to trust, because there is no upload.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/text/json-formatter"
              className="inline-flex h-11 items-center rounded-md bg-accent-deep px-5 text-sm font-medium text-white shadow-raise transition-colors hover:bg-accent-ink"
            >
              Format some JSON
            </Link>
            <Link
              href="/security/password-generator"
              className="inline-flex h-11 items-center rounded-md border border-line bg-surface px-5 text-sm font-medium text-ink shadow-raise transition-colors hover:border-line-strong"
            >
              Make a password
            </Link>
          </div>

          <dl className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Promise
              icon={CloudOff}
              title="No upload"
              body="Files are read by your own browser. Nothing is transmitted, so nothing can leak."
            />
            <Promise
              icon={Lock}
              title="No account"
              body="No sign-up, no email, no cookie banner. Open a tool and use it."
            />
            <Promise
              icon={Gauge}
              title="No limits"
              body="No two-file cap, no daily quota, no watermark, no paid tier holding a feature back."
            />
            <Promise
              icon={WifiOff}
              title="Works offline"
              body="Once a tool has loaded, it keeps working with the network switched off."
            />
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {populated.map((category) => {
          const tools = toolsInCategory(category.id);
          return (
            <section key={category.id} className="mb-16 last:mb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  {category.title}
                </h2>
                <Link
                  href={`/${category.slug}`}
                  className="text-sm font-medium text-accent-ink underline-offset-4 hover:underline"
                >
                  All {tools.length} {category.title.toLowerCase()} tools
                </Link>
              </div>
              <div className="bench-rule mt-3 rounded-full" />
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">{category.blurb}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tools.slice(0, 6).map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE.name,
            url: SITE.url,
            description: SITE.description,
            publisher: { "@type": "Organization", name: SITE.brand, url: SITE.brandUrl },
          }),
        }}
      />
    </>
  );
}

function Promise({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
        <Icon className="size-4 text-accent-ink" aria-hidden />
        {title}
      </dt>
      <dd className="mt-2 text-[13px] leading-relaxed text-ink-soft">{body}</dd>
    </div>
  );
}
