import type { ToolSpec } from "@/lib/tools/types";

/**
 * The specification block.
 *
 * This replaces the boxed illustration that used to sit here. A drawing's spec
 * block is a ruled panel of the facts you need before you start work, and that
 * is exactly what somebody landing on a tool page wants to know: what it takes,
 * what it gives back, where it runs, and how big a file it will survive.
 *
 * Every value is read from the registry, so a row can never disagree with the
 * tool it describes, and adding a tool gets a correct panel for free. Nothing
 * here is decorative — if a fact is not in the registry it does not get a row.
 */

/** Where the work happens. Named for what the person gets, not for the module. */
const ENGINE_NOTE: Record<ToolSpec["engine"], string> = {
  pure: "This tab",
  pdf: "This tab · PDF engine",
  image: "This tab · image engine",
  doc: "This tab · document engine",
  archive: "This tab · archive engine",
  data: "This tab · data engine",
  crypto: "This tab · WebCrypto",
  audio: "This tab · audio engine",
  video: "This tab · WebCodecs",
  // Still this tab. The model is downloaded and run here, which is the whole
  // point of it — an AI cut-out that behaves like the offline tools beside it.
  segment: "This tab · on-device model",
  // The only value in this table that is not "this tab", and the reason the
  // column exists at all: a visitor should be able to see where the work goes
  // without reading the page.
  ai: "A server · AI model",
};

function extList(exts: string[]) {
  return exts.map((ext) => `.${ext}`).join("  ");
}

export function SpecBlock({ tool }: { tool: ToolSpec }) {
  const rows: { label: string; value: string; note?: string }[] = [];

  if (tool.accepts) {
    rows.push({
      label: "Accepts",
      value: extList(tool.accepts.ext),
      note: tool.accepts.multiple ? "One or many at a time" : "One at a time",
    });
  } else if (tool.io === "text") {
    rows.push({ label: "Accepts", value: "Text you type or paste" });
  } else {
    rows.push({ label: "Accepts", value: "The settings below" });
  }

  if (tool.output) {
    rows.push({
      label: "Returns",
      value: `.${tool.output.ext}`,
      note:
        tool.output.cardinality === "single"
          ? "One file for the whole batch"
          : "One file per input",
    });
  } else {
    rows.push({ label: "Returns", value: tool.io === "form" ? "A value to copy" : "Text to copy" });
  }

  rows.push({ label: "Runs in", value: ENGINE_NOTE[tool.engine] });

  if (tool.accepts) {
    rows.push({
      label: "Comfortable to",
      value: `${tool.accepts.maxMB} MB`,
      note: "Larger still works if your device has the memory",
    });
  }

  // The last row is the one people came for. On the AI tools it has to give the
  // opposite answer, and give it as plainly as the other rows give theirs — a
  // spec block that hedged here would be worse than not having the row.
  rows.push(
    tool.engine === "ai"
      ? {
          label: "Sends",
          value: "Your text",
          note: "Posted to a server and on to an AI provider. Never a file — this tool takes none",
        }
      : { label: "Uploads", value: "None", note: "There is no server to send it to" },
  );

  return (
    <aside className="pane" aria-label={`${tool.title} specification`}>
      <p className="annot border-b border-construction px-4 py-2.5">Specification</p>
      <dl className="divide-y divide-construction">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 px-4 py-3">
            <dt className="annot pt-0.5 normal-case tracking-[0.1em]">{row.label}</dt>
            <dd>
              <span
                className={`block font-mono text-[13px] ${
                  row.label === "Uploads"
                    ? "text-pen-new"
                    : row.label === "Sends"
                      ? "text-pen-rev"
                      : "text-graphite"
                }`}
              >
                {row.value}
              </span>
              {row.note ? (
                <span className="mt-1 block text-[12px] leading-snug text-graphite-faint">
                  {row.note}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
