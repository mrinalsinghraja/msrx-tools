import * as icons from "lucide-react";
import Link from "next/link";

import { toolHref } from "@/lib/tools/registry";
import type { ToolSpec } from "@/lib/tools/types";

/** Falls back to a neutral glyph rather than crashing on a bad icon name. */
function iconFor(name: string) {
  const set = icons as unknown as Record<string, icons.LucideIcon>;
  return set[name] ?? icons.Wrench;
}

export function ToolCard({ tool }: { tool: ToolSpec }) {
  const Icon = iconFor(tool.icon);

  return (
    <Link href={toolHref(tool)} className="plate group flex gap-3 rounded-lg p-4">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-wash text-accent-ink transition-colors group-hover:bg-accent group-hover:text-white">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-sm font-semibold text-ink">{tool.title}</span>
        <span className="mt-1 block text-[13px] leading-snug text-ink-soft">{tool.short}</span>
      </span>
    </Link>
  );
}
