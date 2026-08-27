"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { OptionsPanel } from "@/components/tools/options-panel";
import { ResultPanel } from "@/components/tools/result-panel";
import { CustomResult, SAMPLE_INPUTS } from "@/components/tools/custom-panels";
import { FileWorkspace } from "@/components/tools/file-workspace";
import { Button, Textarea } from "@/components/ui/primitives";
import { defaultOptions, runTool } from "@/lib/engines/run";
import { ToolError, type OpResult } from "@/lib/engines/types";
import { DIFF_SEPARATOR } from "@/lib/engines/pure/text";
import { getTool } from "@/lib/tools/registry";
import type { OptionValue, OptionValues, ToolSpec } from "@/lib/tools/types";

/**
 * The interactive half of a tool page.
 *
 * It takes only a slug: the page itself is a static server component, and this
 * island looks the spec up from the registry so the two never drift apart.
 */
export function ToolRunner({ slug }: { slug: string }) {
  const tool = getTool(slug);
  if (!tool) throw new Error(`ToolRunner rendered for unknown tool "${slug}"`);
  // File tools have a different shape entirely — a drop zone and an ordered
  // queue rather than a text box — so they get their own workspace.
  if (tool.io === "file") return <FileWorkspace tool={tool} />;
  return <Workspace tool={tool} />;
}

/**
 * Split from the lookup above so the spec arrives already narrowed — hooks then
 * close over a `ToolSpec`, not a `ToolSpec | undefined`.
 */
function Workspace({ tool }: { tool: ToolSpec }) {
  const [options, setOptions] = useState<OptionValues>(() => defaultOptions(tool));
  const [input, setInput] = useState("");
  const [secondInput, setSecondInput] = useState("");
  const [result, setResult] = useState<OpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isDiff = tool.slug === "text-diff";
  const composed = useMemo(
    () => (isDiff ? `${input}${DIFF_SEPARATOR}${secondInput}` : input),
    [input, secondInput, isDiff],
  );

  // Every run is numbered so a slow result can never overwrite a newer one.
  const runId = useRef(0);

  const execute = useCallback(async () => {
    const id = ++runId.current;
    setBusy(true);
    try {
      const next = await runTool(tool, composed, options);
      if (id !== runId.current) return;
      setResult(next);
      setError(null);
    } catch (thrown) {
      if (id !== runId.current) return;
      setResult(null);
      setError(
        thrown instanceof ToolError
          ? thrown.message
          : thrown instanceof Error
            ? thrown.message
            : "Something went wrong running this tool.",
      );
    } finally {
      if (id === runId.current) setBusy(false);
    }
  }, [tool, composed, options]);

  // Form tools have no text input, so they run immediately and on every change.
  // Text tools debounce: retyping a large document shouldn't reparse per keystroke.
  useEffect(() => {
    if (tool.io === "form") {
      void execute();
      return;
    }
    if (!composed.replace(DIFF_SEPARATOR, "").trim()) {
      setResult(null);
      setError(null);
      return;
    }
    const timer = window.setTimeout(() => void execute(), 220);
    return () => window.clearTimeout(timer);
  }, [execute, composed, tool.io]);

  const setOption = useCallback((id: string, value: OptionValue) => {
    setOptions((current) => ({ ...current, [id]: value }));
  }, []);

  function reset() {
    setOptions(defaultOptions(tool));
    setInput("");
    setSecondInput("");
    setResult(null);
    setError(null);
  }

  const sample = SAMPLE_INPUTS[tool.slug];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {tool.io !== "form" ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {isDiff ? "Original" : "Input"}
              </h2>
              <div className="flex items-center gap-2">
                {sample ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setInput(sample.input);
                      if (sample.second) setSecondInput(sample.second);
                    }}
                  >
                    Try an example
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={reset}>
                  <RotateCcw className="size-3.5" aria-hidden />
                  Reset
                </Button>
              </div>
            </div>

            <Textarea
              aria-label={isDiff ? "Original text" : "Input"}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={isDiff ? 8 : 12}
              spellCheck={false}
              placeholder={sample?.placeholder ?? "Paste or type here…"}
            />

            {isDiff ? (
              <>
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-ink-soft">
                  Changed
                </h2>
                <Textarea
                  aria-label="Changed text"
                  value={secondInput}
                  onChange={(event) => setSecondInput(event.target.value)}
                  rows={8}
                  spellCheck={false}
                  placeholder="Paste the other version here…"
                />
              </>
            ) : null}
          </section>
        ) : null}

        <CustomResult tool={tool} result={result} />

        <ResultPanel
          tool={tool}
          result={result}
          error={error}
          busy={busy}
          outputShownAbove={tool.customPanel === true}
        />
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="plate rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-ink-soft">
              Options
            </h2>
            {tool.io === "form" ? (
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="size-3.5" aria-hidden />
                Reset
              </Button>
            ) : null}
          </div>

          {tool.options.length ? (
            <OptionsPanel options={tool.options} values={options} onChange={setOption} />
          ) : (
            <p className="text-[13px] text-ink-faint">This tool has nothing to configure.</p>
          )}

          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
            Everything runs inside this tab. Nothing you type or paste is uploaded.
          </p>
        </div>
      </aside>
    </div>
  );
}
