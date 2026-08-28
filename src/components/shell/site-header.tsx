import Link from "next/link";

import { ToolSearch } from "@/components/shell/tool-search";
import { Wordmark } from "@/components/shell/wordmark";
import { CATEGORIES } from "@/lib/tools/categories";
import { toolsInCategory } from "@/lib/tools/registry";
import { SITE } from "@/lib/site";

export function SiteHeader() {
  const populated = CATEGORIES.filter((category) => toolsInCategory(category.id).length > 0);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-graphite bg-film/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label={`${SITE.name} home`}>
          {/*
            No plate. The mark is inked in the sheet's own colours and sits
            straight on the film, the way every other mark on the page does.
            `priority` because it is above the fold on every page in the site.
          */}
          <Wordmark priority className="h-14 w-auto sm:h-[72px]" />
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-3">
          <ToolSearch />
        </div>
      </div>

      {/*
        The category strip is the grid line. Each category carries its reference
        letter, the way a column grid on a structural plan does — so the letter
        in the footer's sheet index and the letter here mean the same thing.
      */}
      <nav aria-label="Tool categories" className="border-t border-construction">
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 sm:px-6">
          <ul className="flex items-stretch">
            {populated.map((category, index) => (
              <li key={category.id} className="border-r border-construction first:border-l">
                <Link
                  href={`/${category.slug}`}
                  className="group flex items-center gap-2 whitespace-nowrap px-3 py-2 transition-colors hover:bg-sheet"
                >
                  <span className="font-mono text-[10px] text-graphite-faint group-hover:text-pen-new">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-[13px] font-medium text-graphite-soft group-hover:text-graphite">
                    {category.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
