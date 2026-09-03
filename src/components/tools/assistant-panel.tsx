"use client";

import { ArrowUp, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button, Notice } from "@/components/ui/primitives";
import { MAX_QUESTION_LENGTH } from "@/lib/ai/limits";
import { stripMarkdown } from "@/lib/ai/plain-text";
import { getTool } from "@/lib/tools/registry";
import { cn } from "@/lib/utils";

/**
 * Per-tool assistant.
 *
 * The one part of the site that talks to a server. It sends the tool's slug and
 * the typed question — never the contents of the tool's input box, and never a
 * file. That boundary is the reason the site's privacy claim survives having an
 * assistant at all, so it is stated in the panel rather than buried in a policy.
 */
export function AssistantPanel({
  slug,
  toolTitle,
  presets,
}: {
  slug: string;
  toolTitle: string;
  presets: string[];
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAsked(trimmed);
    setAnswer("");
    setError(null);
    setBusy(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, question: trimmed }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "The assistant is unavailable right now.");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("The assistant returned nothing.");
        return;
      }

      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((current) => current + decoder.decode(value, { stream: true }));
      }
    } catch (thrown) {
      // An abort is the user pressing stop or leaving the page, not a failure.
      if (thrown instanceof DOMException && thrown.name === "AbortError") return;
      setError("Could not reach the assistant. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
    setBusy(false);
  }

  return (
    <section className="plate mt-12 rounded-lg p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-pen-wash text-pen-new">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <h2 className="stamp text-base font-semibold text-graphite">
          Ask about {toolTitle}
        </h2>
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-graphite-soft">
        Questions about what this tool does, which option to pick, or what it can and cannot handle.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={busy}
            onClick={() => {
              setQuestion("");
              void ask(preset);
            }}
            className="rounded-full border border-construction bg-sheet px-3 py-1.5 text-[13px] text-graphite-soft transition-colors hover:border-construction-strong hover:text-graphite disabled:opacity-50"
          >
            {preset}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
          setQuestion("");
        }}
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder="Ask your own question…"
          aria-label={`Ask a question about ${toolTitle}`}
          className="h-10 w-full rounded-md border border-construction bg-sheet px-3 text-sm text-graphite placeholder:text-graphite-faint transition-colors hover:border-construction-strong"
        />
        {busy ? (
          <Button type="button" variant="secondary" onClick={stop} aria-label="Stop the answer">
            <Square className="size-3.5" aria-hidden />
            Stop
          </Button>
        ) : (
          <Button type="submit" variant="primary" disabled={!question.trim()} aria-label="Send question">
            <ArrowUp className="size-4" aria-hidden />
          </Button>
        )}
      </form>

      {asked ? (
        <div className="mt-5 border-t border-construction pt-5">
          <p className="text-[13px] font-medium text-graphite">{asked}</p>

          {error ? (
            <div className="mt-3">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : (
            <div
              className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-graphite-soft"
              aria-live="polite"
              aria-busy={busy}
            >
              {stripMarkdown(answer)}
              {busy && !answer ? <span className="text-graphite-faint">Thinking…</span> : null}
              {busy && answer ? (
                <span className={cn("ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-pen-fill")} />
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <p className="mt-5 border-t border-construction pt-4 text-xs leading-relaxed text-graphite-faint">
        The question you type here is sent to an AI provider to be answered —{" "}
        <strong className="font-medium text-graphite-soft">
          your files and whatever you put in the tool above are not
        </strong>
        , and the assistant cannot see them. Answers are generated and can be wrong.{" "}
        {/* Worth saying on the hundred and forty-seven tools where it is true,
            and worth not saying on the twenty-three where it is not. */}
        {getTool(slug)?.engine === "ai"
          ? "So is what the tool above produces — it runs on a model too."
          : "The tool itself is not guessing: it runs deterministic code on your device."}
      </p>
    </section>
  );
}
