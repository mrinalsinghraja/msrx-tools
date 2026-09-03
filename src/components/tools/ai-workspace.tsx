"use client";

import { CornerDownLeft, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { OptionsPanel } from "@/components/tools/options-panel";
import { ResultPanel } from "@/components/tools/result-panel";
import { Button, Notice, Textarea } from "@/components/ui/primitives";
import { aiField } from "@/lib/ai/fields";
import { checkRegexAnswer, describeRegexCheck } from "@/lib/ai/verify-regex";
import { defaultOptions } from "@/lib/engines/run";
import type { OpResult, OpStat } from "@/lib/engines/types";
import type { OptionValue, OptionValues, ToolSpec } from "@/lib/tools/types";

/**
 * Counts each numbered line of an answer, and says whether it fits.
 *
 * The models these tools run on cannot count characters — asked to, they
 * deliberate at length and still get it wrong — so anything with a length
 * constraint is measured on this side, where it is arithmetic on a string.
 * A leading list number is not part of the text the writer will paste, so it
 * comes off before measuring.
 */
function measureLines(output: string, range: { min?: number; max?: number }): OpStat[] {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  return lines.map((line, index) => {
    const text = line.replace(/^\s*\d+[.)]\s*/, "").trim();
    const count = [...text].length;
    const short = range.min !== undefined && count < range.min;
    const long = range.max !== undefined && count > range.max;
    const verdict = long ? " · too long" : short ? " · too short" : range.max !== undefined ? " · fits" : "";
    return { label: `Line ${index + 1}`, value: `${count} chars${verdict}` };
  });
}

/**
 * The workspace for a tool that runs on a model.
 *
 * It differs from the ordinary text workspace in three ways, each of which is a
 * consequence of the work happening somewhere else and costing something:
 *
 *  - **It does not run as you type.** Every other text tool on this site
 *    recomputes on a 220 ms debounce, which is right when the work is free and
 *    instant. Here it would fire a paid request at every pause in your typing
 *    and stream three different half-answers into the box. So there is a
 *    button, and Ctrl-Enter for people who would rather not reach for it.
 *  - **The answer arrives a token at a time.** A summary of a long report takes
 *    several seconds to write, and watching it appear is the difference between
 *    a tool that feels quick and a spinner that feels broken.
 *  - **It says where the text is going.** Every other workspace on this site
 *    ends with a line promising nothing is uploaded. That line would be a lie
 *    here, so this one says the opposite, in the same place, in the same size.
 */
export function AiWorkspace({ tool }: { tool: ToolSpec }) {
  const field = aiField(tool.slug);
  const [options, setOptions] = useState<OptionValues>(() => defaultOptions(tool));
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Set once the first run finishes, so the idle message only shows before it. */
  const [ran, setRan] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const maxChars = field?.maxChars ?? 8000;
  const over = input.length > maxChars;

  const run = useCallback(async () => {
    const text = input.trim();
    if (!text || busy || over) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setOutput("");
    setError(null);
    setBusy(true);
    setRan(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: tool.slug, input: text, options }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "This tool is unavailable right now.");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("The server returned nothing. Try running it again.");
        return;
      }

      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((current) => current + decoder.decode(value, { stream: true }));
      }
    } catch (thrown) {
      // Aborting is the visitor pressing stop or leaving, not a failure.
      if (thrown instanceof DOMException && thrown.name === "AbortError") return;
      setError("Could not reach the server. Check your connection and run it again.");
    } finally {
      setBusy(false);
    }
  }, [busy, input, options, over, tool.slug]);

  function stop() {
    abortRef.current?.abort();
    setBusy(false);
  }

  function reset() {
    abortRef.current?.abort();
    setOptions(defaultOptions(tool));
    setInput("");
    setOutput("");
    setError(null);
    setBusy(false);
    setRan(false);
  }

  const setOption = useCallback((id: string, value: OptionValue) => {
    setOptions((current) => ({ ...current, [id]: value }));
  }, []);

  // The result panel takes a finished op result, so the partial stream is
  // dressed as one. Everything it gives us — copy, download, the note — then
  // works on a half-written answer exactly as it does on a complete one.
  // Only once the answer is complete: half an expression would fail to compile
  // and half an example list would look like a contradiction.
  const selfCheck = useMemo(() => {
    if (busy || !output || field?.verify !== "regex") return null;
    return describeRegexCheck(checkRegexAnswer(output, String(options.flavour ?? "javascript")));
  }, [busy, output, field, options.flavour]);

  const result: OpResult | null = useMemo(() => {
    if (!output) return null;
    return {
      output,
      format: field?.format ?? "text",
      note: busy ? undefined : field?.note,
      // Measured here rather than asked for, and only once the answer is
      // complete — a count of a half-written line would be wrong and would
      // flicker while it settled.
      stats: busy || !field?.lineMetric ? undefined : measureLines(output, field.lineMetric),
    };
  }, [output, busy, field]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="annot">{field?.inputLabel ?? "Input"}</h2>
            <div className="flex items-center gap-2">
              {field?.placeholder ? (
                <Button size="sm" variant="ghost" onClick={() => setInput(field.placeholder)}>
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
            aria-label={field?.inputLabel ?? "Input"}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void run();
              }
            }}
            rows={10}
            placeholder={field?.placeholder ?? "Paste or type here…"}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={over ? "text-[13px] text-pen-rev" : "text-[13px] text-graphite-faint"}>
              {input.length.toLocaleString("en-IN")} of {maxChars.toLocaleString("en-IN")} characters
              {over ? " — trim it, or run it in sections" : null}
            </p>

            <div className="flex items-center gap-2">
              {busy ? (
                <Button variant="secondary" onClick={stop}>
                  <Square className="size-3.5" aria-hidden />
                  Stop
                </Button>
              ) : (
                <Button variant="primary" onClick={() => void run()} disabled={!input.trim() || over}>
                  {field?.runLabel ?? tool.title}
                  <kbd className="ml-1 hidden items-center gap-0.5 rounded border border-current/30 px-1 text-[10px] opacity-70 sm:inline-flex">
                    <CornerDownLeft className="size-2.5" aria-hidden />
                  </kbd>
                </Button>
              )}
            </div>
          </div>
        </section>

        <ResultPanel
          tool={tool}
          result={result}
          error={error}
          busy={busy}
          idleMessage={
            ran ? "Nothing came back. Run it again." : `Press ${field?.runLabel ?? "the button"} and the answer is written here.`
          }
        />

        {selfCheck ? (
          <div className="-mt-3">
            <Notice tone={selfCheck.tone}>{selfCheck.text}</Notice>
          </div>
        ) : null}

        {busy && !output ? (
          <p className="-mt-3 text-[13px] text-graphite-faint" aria-live="polite">
            Working…
          </p>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="plate rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="annot">Options</h2>
          </div>

          {tool.options.length ? (
            <OptionsPanel options={tool.options} values={options} onChange={setOption} />
          ) : (
            <p className="text-[13px] text-graphite-faint">This tool has nothing to configure.</p>
          )}

          <div className="mt-5 border-t border-construction pt-4">
            <Notice tone="warn">
              This tool uses a server. What you put in the box above is sent to an AI provider to be
              worked on — unlike every other tool on this site, which never sends anything anywhere.
              Do not paste anything confidential. The answer is generated and can be wrong.
            </Notice>
          </div>
        </div>
      </aside>
    </div>
  );
}
