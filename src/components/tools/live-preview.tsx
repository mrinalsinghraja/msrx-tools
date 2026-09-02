"use client";

import { useEffect, useRef, useState } from "react";

import { Notice } from "@/components/ui/primitives";
import { formatBytes, type InputFile } from "@/lib/engines/file-types";
import { runFileTool } from "@/lib/engines/run";
import { ToolError } from "@/lib/engines/types";
import type { OptionValues, ToolSpec } from "@/lib/tools/types";

/**
 * What the settings currently produce, shown before anything is downloaded.
 *
 * The preview runs the real operation on the real first file. It is not a CSS
 * filter approximating a blur, or a transform standing in for a rotation —
 * those drift from the engine the moment either changes, and a preview that
 * disagrees with the output is worse than none. What is on screen here came out
 * of the same function the button calls.
 *
 * The cost of that honesty is time, so it is debounced, it runs on one file
 * rather than the batch, and it steps aside for images large enough that
 * re-running on every keystroke would make the page stutter.
 */

/**
 * Beyond this the work is slow enough to be felt between keystrokes.
 *
 * PDFs get a lower ceiling than images because they cost twice: the tool runs,
 * and then page one of its output has to be rasterised before there is anything
 * to look at.
 */
const LIVE_PREVIEW_BYTE_LIMIT = 12 * 1024 * 1024;
const PDF_PREVIEW_BYTE_LIMIT = 6 * 1024 * 1024;
const DEBOUNCE_MS = 280;

const PDF_MIME = "application/pdf";

const TEXT_TYPES = new Set(["text/plain", "text/csv", "application/json", "text/markdown"]);

interface Rendered {
  /** The file this was produced from, so a stale result cannot outlive its input. */
  source: InputFile;
  url: string | null;
  text: string | null;
  name: string;
  /** The size of the real output, not of the picture standing in for it. */
  bytes: number;
  mime: string;
  count: number;
  /** Page count, when the output was a PDF rendered down to an image. */
  pages?: number;
}

export function LivePreview({
  tool,
  file,
  options,
}: {
  tool: ToolSpec;
  file: InputFile | null;
  options: OptionValues;
}) {
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Only the newest run may write to state: options change faster than a large
  // image encodes, so without this the preview settles on whichever run happens
  // to finish last rather than on the current settings.
  const runId = useRef(0);
  const urlRef = useRef<string | null>(null);

  const limit = tool.engine === "pdf" ? PDF_PREVIEW_BYTE_LIMIT : LIVE_PREVIEW_BYTE_LIMIT;
  const tooLarge = file ? file.bytes.length > limit : false;

  useEffect(() => {
    if (!file || tooLarge) return;

    const id = ++runId.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const result = await runFileTool(tool, [file], options);
        if (id !== runId.current) return;

        const first = result.files[0];
        if (!first) {
          setError(null);
          return;
        }

        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;

        let url: string | null = null;
        let text: string | null = null;
        let pages: number | undefined;

        if (TEXT_TYPES.has(first.mime)) {
          text = new TextDecoder().decode(first.bytes);
        } else if (first.mime === PDF_MIME) {
          // A PDF cannot go in an <img>, and an embed brings its own viewer,
          // toolbar and scrollbars to fight the layout. Page one is rendered to
          // a picture instead, by the same engine the tools use. Imported here
          // rather than at the top so a page with no PDF on it never downloads
          // pdf.js.
          const { renderFirstPage } = await import("@/lib/engines/pdf");
          const page = await renderFirstPage(first.bytes);
          if (id !== runId.current) return;

          const blob = new Blob([page.bytes as unknown as BlobPart], { type: page.mime });
          url = URL.createObjectURL(blob);
          urlRef.current = url;
          pages = page.pages;
        } else {
          const blob = new Blob([first.bytes as unknown as BlobPart], { type: first.mime });
          url = URL.createObjectURL(blob);
          urlRef.current = url;
        }

        setRendered({
          source: file,
          url,
          text,
          name: first.name,
          bytes: first.bytes.length,
          mime: first.mime,
          count: result.files.length,
          pages,
        });
        setError(null);
      } catch (thrown) {
        if (id !== runId.current) return;
        // A refusal here is usually the settings being mid-edit — an empty
        // watermark, a message that does not fit yet. Showing it as a quiet
        // line beats an error panel that flashes on every keystroke.
        setError(thrown instanceof ToolError ? thrown.message : "This combination can't be previewed.");
      } finally {
        if (id === runId.current) setBusy(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [tool, file, options, tooLarge]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  if (!file) return null;
  const current = rendered?.source === file ? rendered : null;

  if (tooLarge) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="annot">Preview</h2>
        <Notice>
          This file is {formatBytes(file.bytes.length)}, which is large enough that re-running the
          tool on every change would make the page stutter. Press the button to run it once instead.
        </Notice>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="annot">Preview</h2>
        <span className="font-mono text-xs text-graphite-faint">
          {busy ? "updating…" : current ? formatBytes(current.bytes) : ""}
        </span>
      </div>

      <div className="well flex min-h-40 items-center justify-center overflow-hidden rounded-lg p-3">
        {current?.url ? (
          // A blob URL built in this tab from the visitor's own file. next/image
          // would want a loader and a host, and there is neither.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={`Preview of ${current.name}`}
            className="block max-h-[26rem] w-auto max-w-full rounded"
            // A checkerboard shows through anything transparent, which is the
            // only way to tell a cut-out background from a white one.
            style={{
              backgroundImage:
                "linear-gradient(45deg, var(--color-sunk) 25%, transparent 25%, transparent 75%, var(--color-sunk) 75%), linear-gradient(45deg, var(--color-sunk) 25%, transparent 25%, transparent 75%, var(--color-sunk) 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 8px 8px",
            }}
          />
        ) : current?.text ? (
          <pre className="max-h-[26rem] w-full overflow-auto whitespace-pre font-mono text-[10px] leading-[1.15] text-graphite-soft">
            {current.text.slice(0, 20000)}
          </pre>
        ) : error ? (
          <p className="px-4 text-center text-[13px] text-graphite-soft">{error}</p>
        ) : (
          <p className="text-[13px] text-graphite-faint">Adjust the options to see the result.</p>
        )}
      </div>

      <p className="text-xs leading-relaxed text-graphite-faint">
        This is the real operation running on your first file, not an approximation of it — what you
        see is what the download will contain.
        {current?.pages
          ? current.pages > 1
            ? ` Page 1 of ${current.pages}, drawn from the result.`
            : " The result's only page, drawn from the file itself."
          : ""}
        {current && current.count > 1 ? " Only the first output is shown." : ""}
      </p>
    </section>
  );
}
