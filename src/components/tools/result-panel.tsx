"use client";

import { Check, Copy, Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, Notice, Stat } from "@/components/ui/primitives";
import type { OpResult } from "@/lib/engines/types";
import type { ToolSpec } from "@/lib/tools/types";

const EXTENSION_BY_FORMAT: Record<string, string> = {
  json: "json",
  yaml: "yaml",
  xml: "xml",
  html: "html",
  markdown: "md",
  csv: "csv",
  code: "txt",
  text: "txt",
};

export function ResultPanel({
  tool,
  result,
  error,
  busy,
  /**
   * True when a custom panel above has already rendered the result visually —
   * a QR image, a coloured diff. The raw text is then noise, so only the
   * figures, the note and the copy controls remain.
   */
  outputShownAbove = false,
}: {
  tool: ToolSpec;
  result: OpResult | null;
  error: string | null;
  busy: boolean;
  outputShownAbove?: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-col gap-3" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <h2 className="annot">
          Result
        </h2>
        {result && result.output ? <ResultActions tool={tool} result={result} /> : null}
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {result?.stats?.length ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-construction bg-sheet px-4 py-3 sm:grid-cols-3">
          {result.stats.map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </dl>
      ) : null}

      {outputShownAbove && result?.output ? null : (
      <output
        className="well relative min-h-40 flex-1 overflow-auto rounded-lg p-4"
        data-busy={busy ? "true" : undefined}
      >
        {result?.output ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-graphite">
            {result.output}
          </pre>
        ) : (
          <p className="text-sm text-graphite-faint">
            {error ? "Fix the input above and the result appears here." : "The result appears here as you type."}
          </p>
        )}
      </output>
      )}

      {result?.note ? <Notice>{result.note}</Notice> : null}
    </section>
  );
}

function ResultActions({ tool, result }: { tool: ToolSpec; result: OpResult }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
    } catch {
      // Clipboard access can be refused (permissions, insecure context). The
      // text is on screen and selectable, so this is a non-event.
    }
  }

  function download() {
    const extension = EXTENSION_BY_FORMAT[result.format ?? "text"] ?? "txt";
    const blob = new Blob([result.output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tool.slug}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost" onClick={download}>
        <Download className="size-3.5" aria-hidden />
        Download
      </Button>
      <Button size="sm" variant="secondary" onClick={copy}>
        {copied ? <Check className="size-3.5 text-good" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
