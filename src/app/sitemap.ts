import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";
import { CATEGORIES } from "@/lib/tools/categories";
import { TOOLS, categoryHref, toolHref } from "@/lib/tools/registry";
import { toolsInCategory } from "@/lib/tools/registry";

/** Generated from the registry, so a new tool is in the sitemap the day it ships. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: SITE.url, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...CATEGORIES.filter((category) => toolsInCategory(category.id).length > 0).map((category) => ({
      url: `${SITE.url}${categoryHref(category.id)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...TOOLS.map((tool) => ({
      url: `${SITE.url}${toolHref(tool)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
