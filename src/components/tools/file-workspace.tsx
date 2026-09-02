"use client";

import { zipSync } from "fflate";
import { ArrowDown, ArrowUp, Download, FileIcon, Trash2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { ImageStage } from "@/components/tools/image-stage";
import { Recorder } from "@/components/tools/recorder";
import { LivePreview } from "@/components/tools/live-preview";
import { OptionsPanel } from "@/components/tools/options-panel";
import { Button, Notice, Stat } from "@/components/ui/primitives";
import { formatBytes, type FileOpResult, type InputFile } from "@/lib/engines/file-types";
import { defaultOptions, runFileTool } from "@/lib/engines/run";
import { ToolError } from "@/lib/engines/types";
import type { OptionValue, OptionValues, ToolSpec } from "@/lib/tools/types";
import { cn } from "@/lib/utils";

/**
 * The workspace for file-in / file-out tools.
 *
 * Nothing here uploads. Files are read into memory with `arrayBuffer()`, handed
 * to the engine, and the results come back as bytes that become blob URLs. The
 * network is never touched, which is why the tools keep working offline.
 */

interface StagedFile extends InputFile {
  id: string;
  size: number;
}

export function FileWorkspace({ tool }: { tool: ToolSpec }) {
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [options, setOptions] = useState<OptionValues>(() => defaultOptions(tool));
  const [result, setResult] = useState<FileOpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ fraction: number; label?: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accepts = tool.accepts;
  const multiple = accepts?.multiple ?? false;

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      if (list.length === 0) return;

      const accepted: StagedFile[] = [];
      const rejected: string[] = [];

      for (const file of list) {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        // Extension is the gate, not MIME: browsers report application/octet-stream
        // for plenty of legitimate files, and an empty type for anything unusual.
        if (accepts && accepts.ext.length > 0 && !accepts.ext.includes(extension)) {
          rejected.push(file.name);
          continue;
        }
        accepted.push({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          name: file.name,
          size: file.size,
          bytes: new Uint8Array(await file.arrayBuffer()),
        });
      }

      setError(
        rejected.length
          ? `Skipped ${rejected.join(", ")} — this tool takes ${accepts?.ext.map((e) => `.${e}`).join(", ")}.`
          : null,
      );
      setResult(null);
      setFiles((current) => (multiple ? [...current, ...accepted] : accepted.slice(0, 1)));
    },
    [accepts, multiple],
  );

  function move(index: number, direction: -1 | 1) {
    setFiles((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  }

  function remove(id: string) {
    setFiles((current) => current.filter((file) => file.id !== id));
    setResult(null);
  }

  async function run() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({ fraction: 0 });

    try {
      const output = await runFileTool(
        tool,
        files.map(({ name, bytes }) => ({ name, bytes })),
        options,
        (fraction, label) => setProgress({ fraction, label }),
      );
      setResult(output);
    } catch (thrown) {
      setError(
        thrown instanceof ToolError || thrown instanceof Error
          ? thrown.message
          : "Something went wrong processing these files.",
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const overSize = accepts ? totalSize > accepts.maxMB * 1024 * 1024 : false;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <section
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void addFiles(event.dataTransfer.files);
          }}
          className={cn(
            "well flex flex-col items-center justify-center rounded-lg px-6 py-12 text-center transition-colors",
            dragging && "border-pen-new bg-pen-wash",
          )}
        >
          <Upload className="size-7 text-graphite-faint" aria-hidden />
          <p className="stamp mt-3 text-base font-semibold text-graphite">
            {multiple ? "Drop your files here" : "Drop your file here"}
          </p>
          <p className="mt-1 text-[13px] text-graphite-soft">
            {accepts?.ext.map((extension) => `.${extension}`).join(", ")} · they stay on this device
          </p>
          <Button variant="primary" className="mt-4" onClick={() => inputRef.current?.click()}>
            Choose {multiple ? "files" : "a file"}
          </Button>
          {tool.record ? <Recorder mode={tool.record} onRecorded={(file) => void addFiles([file])} /> : null}
          <input
            ref={inputRef}
            type="file"
            multiple={multiple}
            accept={accepts?.ext.map((extension) => `.${extension}`).join(",")}
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </section>

        {/* The picture, and what the current settings do to it. Both are driven
            by the registry rather than by a slug switch, so a tool that
            declares a stage gets them and one that does not is unchanged. */}
        {tool.stage && files[0] ? (
          <div
            className={cn(
              "grid gap-6",
              tool.engine === "image" && tool.stage.preview && "lg:grid-cols-2",
            )}
          >
            {/* The source pane is for tools whose input is a picture. Judging a
                filter, a quality setting or a background removal means comparing
                against what you started with. A PDF has nothing to show here,
                so those get the preview alone. */}
            {tool.engine === "image" ? (
            <ImageStage
              tool={tool}
              file={files[0]}
              values={options}
              onChange={(id, value) => {
                setOptions((current) => ({ ...current, [id]: value }));
                setResult(null);
              }}
            />
            ) : null}
            {tool.stage.preview ? (
              <LivePreview tool={tool} file={files[0]} options={options} />
            ) : null}
          </div>
        ) : null}

        {files.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="annot">
                {files.length} file{files.length === 1 ? "" : "s"} · {formatBytes(totalSize)}
              </h2>
              <Button size="sm" variant="ghost" onClick={() => { setFiles([]); setResult(null); }}>
                Clear
              </Button>
            </div>

            <ul className="flex flex-col gap-2">
              {files.map((file, index) => (
                <li key={file.id} className="plate flex items-center gap-3 rounded-md px-3 py-2">
                  <FileIcon className="size-4 shrink-0 text-graphite-faint" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-graphite">{file.name}</span>
                    <span className="block text-xs text-graphite-faint">{formatBytes(file.size)}</span>
                  </span>
                  {multiple && files.length > 1 ? (
                    <>
                      {/* Order matters for merge and image-to-PDF, so it has to
                          be adjustable without a drag-and-drop dependency. */}
                      <button
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${file.name} up`}
                        className="rounded p-1 text-graphite-faint transition-colors hover:text-graphite disabled:opacity-30"
                      >
                        <ArrowUp className="size-4" aria-hidden />
                      </button>
                      <button
                        onClick={() => move(index, 1)}
                        disabled={index === files.length - 1}
                        aria-label={`Move ${file.name} down`}
                        className="rounded p-1 text-graphite-faint transition-colors hover:text-graphite disabled:opacity-30"
                      >
                        <ArrowDown className="size-4" aria-hidden />
                      </button>
                    </>
                  ) : null}
                  <button
                    onClick={() => remove(file.id)}
                    aria-label={`Remove ${file.name}`}
                    className="rounded p-1 text-graphite-faint transition-colors hover:text-pen-rev"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>

            {overSize ? (
              <Notice>
                That is {formatBytes(totalSize)}. Everything runs in this tab, so files much above{" "}
                {accepts?.maxMB} MB may be slow or run out of memory — especially on a phone.
              </Notice>
            ) : null}

            <Button variant="primary" onClick={run} disabled={busy} className="self-start">
              {busy ? "Working…" : tool.title}
            </Button>

            {busy && progress ? (
              <div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunk ring-1 ring-inset ring-construction">
                  <div
                    className="h-full bg-pen-fill transition-[width] duration-150"
                    // A sliver at zero so the bar reads as "started", not "stuck".
                    style={{ width: `${Math.max(3, Math.round(progress.fraction * 100))}%` }}
                  />
                </div>
                {progress.label ? (
                  <p className="mt-2 text-xs text-graphite-faint">{progress.label}</p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {error ? <Notice tone="error">{error}</Notice> : null}

        {result ? <ResultFiles result={result} /> : null}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="plate rounded-lg p-5">
          <h2 className="stamp-wide mb-4 text-sm font-semibold text-graphite-soft">
            Options
          </h2>
          {tool.options.length ? (
            <OptionsPanel
              options={tool.options}
              values={options}
              onChange={(id: string, value: OptionValue) => {
                setOptions((current) => ({ ...current, [id]: value }));
                setResult(null);
              }}
            />
          ) : (
            <p className="text-[13px] text-graphite-faint">This tool has nothing to configure.</p>
          )}
          <p className="mt-5 border-t border-construction pt-4 text-xs leading-relaxed text-graphite-faint">
            Your files are read by this tab and never uploaded. Closing the page discards them.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ResultFiles({ result }: { result: FileOpResult }) {
  function download(file: { name: string; bytes: Uint8Array; mime: string }) {
    const blob = new Blob([file.bytes as unknown as BlobPart], { type: file.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadAll() {
    // Zipped in the browser with fflate. A hundred separate download prompts is
    // not a feature, and there is no server to build the archive on.
    const entries: Record<string, Uint8Array> = {};
    for (const file of result.files) entries[file.name] = file.bytes;
    const zipped = zipSync(entries, { level: 6 });

    const blob = new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "msrx-tools.zip";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="annot">
          Result
        </h2>
        {result.files.length > 1 ? (
          <Button size="sm" variant="primary" onClick={downloadAll}>
            <Download className="size-3.5" aria-hidden />
            Download all as ZIP
          </Button>
        ) : null}
      </div>

      {result.stats?.length ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-construction bg-sheet px-4 py-3 sm:grid-cols-3">
          {result.stats.map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </dl>
      ) : null}

      <ul className="flex flex-col gap-2">
        {result.files.map((file) => (
          <li key={file.name} className="plate flex items-center gap-3 rounded-md px-3 py-2">
            <FileIcon className="size-4 shrink-0 text-pen-new" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-graphite">{file.name}</span>
              <span className="block text-xs text-graphite-faint">{formatBytes(file.bytes.length)}</span>
            </span>
            <Button size="sm" variant="secondary" onClick={() => download(file)}>
              <Download className="size-3.5" aria-hidden />
              Download
            </Button>
          </li>
        ))}
      </ul>

      {result.note ? <Notice>{result.note}</Notice> : null}
    </section>
  );
}
