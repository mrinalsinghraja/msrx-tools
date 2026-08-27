"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { searchTools, toolHref } from "@/lib/tools/registry";
import { cn } from "@/lib/utils";

/**
 * Type-ahead over the whole registry. The list is small enough to filter on
 * every keystroke, so there is no index to build and nothing to fetch.
 */
export function ToolSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const router = useRouter();

  const results = useMemo(() => searchTools(query, 8), [query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  // Slash focuses the box, the way every developer tool trains people to expect.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const tool = results[active];
      if (tool) {
        router.push(toolHref(tool));
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search tools…"
          className="h-9 w-full rounded-md border border-line bg-surface pl-8 pr-3 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line-strong [&::-webkit-search-cancel-button]:appearance-none"
        />
      </div>

      {open && query.trim() ? (
        <div
          id={listId}
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[85vw] overflow-hidden rounded-lg border border-line bg-surface shadow-float"
        >
          {results.length ? (
            <ul className="max-h-80 overflow-y-auto p-1">
              {results.map((tool, index) => (
                <li key={tool.slug}>
                  <Link
                    href={toolHref(tool)}
                    role="option"
                    aria-selected={index === active}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      "block rounded px-2.5 py-2 transition-colors",
                      index === active ? "bg-surface-sunk" : "hover:bg-surface-sunk",
                    )}
                  >
                    <span className="block text-sm font-medium text-ink">{tool.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink-faint">{tool.short}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-4 text-sm text-ink-faint">
              Nothing matches “{query.trim()}” yet.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
