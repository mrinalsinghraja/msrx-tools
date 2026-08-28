"use client";

import { cn } from "@/lib/utils";
import type { DiffPayload } from "@/lib/engines/pure/text";
import type { OpResult } from "@/lib/engines/types";
import type { ToolSpec } from "@/lib/tools/types";

/**
 * Result panels for the handful of tools whose output is not text: a diff wants
 * colour, a QR code wants to be seen, a colour wants a swatch. Everything else
 * uses the shared monospace panel and needs nothing here.
 */
export function CustomResult({ tool, result }: { tool: ToolSpec; result: OpResult | null }) {
  if (!result) return null;

  switch (tool.slug) {
    case "text-diff":
      return <DiffView payload={result.extra as DiffPayload | undefined} />;
    case "qr-code-generator":
      return <QrView extra={result.extra as { svg?: string } | undefined} />;
    case "color-converter":
      return <SwatchView extra={result.extra as { hex?: string } | undefined} />;
    case "css-gradient-generator":
    case "box-shadow-generator":
      return <CssPreview slug={tool.slug} extra={result.extra as { css?: string } | undefined} />;
    default:
      return null;
  }
}

function DiffView({ payload }: { payload?: DiffPayload }) {
  if (!payload) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="annot">
        Differences
      </h2>
      <div className="well overflow-auto rounded-lg p-1">
        <pre className="font-mono text-[13px] leading-relaxed">
          {payload.changes.map((change, index) => (
            <span
              key={index}
              className={cn(
                "block whitespace-pre-wrap break-words px-3 py-px",
                change.added && "bg-good-wash text-good",
                change.removed && "bg-pen-rev-wash text-pen-rev line-through decoration-pen-rev/40",
                !change.added && !change.removed && "text-graphite-soft",
              )}
            >
              {change.value.replace(/\n$/, "") || " "}
            </span>
          ))}
        </pre>
      </div>
    </section>
  );
}

function QrView({ extra }: { extra?: { svg?: string } }) {
  if (!extra?.svg) return null;

  function downloadSvg() {
    const blob = new Blob([extra!.svg!], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qr-code.svg";
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Rasterises the SVG through a canvas. Everything stays local: the SVG becomes
   * a blob URL, the canvas never leaves the page, and no image host is involved.
   */
  function downloadPng() {
    const blob = new Blob([extra!.svg!], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || 1024;
      canvas.height = image.naturalHeight || 1024;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((png) => {
          if (!png) return;
          const pngUrl = URL.createObjectURL(png);
          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = "qr-code.png";
          link.click();
          URL.revokeObjectURL(pngUrl);
        }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="annot">
        Preview
      </h2>
      <div className="well flex flex-col items-center gap-4 rounded-lg p-6">
        <div
          className="w-full max-w-64 [&>svg]:h-auto [&>svg]:w-full"
          // The SVG is generated locally by the qrcode library from the user's
          // own input — it never comes from the network or another document.
          dangerouslySetInnerHTML={{ __html: extra.svg }}
        />
        <div className="flex gap-2">
          <button
            onClick={downloadPng}
            className="h-8 rounded-md bg-pen-new px-3 text-[13px] font-medium text-on-pen transition-colors hover:bg-pen-deep"
          >
            Download PNG
          </button>
          <button
            onClick={downloadSvg}
            className="h-8 rounded-md border border-construction bg-sheet px-3 text-[13px] font-medium text-graphite transition-colors hover:border-construction-strong"
          >
            Download SVG
          </button>
        </div>
      </div>
    </section>
  );
}

function SwatchView({ extra }: { extra?: { hex?: string } }) {
  if (!extra?.hex) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="annot">
        Swatch
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div
          className="flex h-24 items-end rounded-lg border border-construction p-3"
          style={{ backgroundColor: extra.hex }}
        >
          <span className="rounded bg-white/85 px-2 py-0.5 font-mono text-xs text-[#17191d]">
            on white
          </span>
        </div>
        <div
          className="flex h-24 items-end rounded-lg border border-construction p-3"
          style={{ backgroundColor: extra.hex }}
        >
          <span className="rounded bg-black/80 px-2 py-0.5 font-mono text-xs text-white">on black</span>
        </div>
      </div>
    </section>
  );
}

function CssPreview({ slug, extra }: { slug: string; extra?: { css?: string } }) {
  if (!extra?.css) return null;
  const isGradient = slug === "css-gradient-generator";

  return (
    <section className="flex flex-col gap-3">
      <h2 className="annot">
        Preview
      </h2>
      <div className="well flex items-center justify-center rounded-lg p-8">
        <div
          className="h-32 w-full max-w-sm rounded-xl border border-construction"
          style={isGradient ? { background: extra.css } : { boxShadow: extra.css, background: "var(--color-sheet)" }}
        />
      </div>
    </section>
  );
}

/**
 * Example inputs. A tool with an empty box in front of it asks the visitor to
 * invent test data before they can see whether it does what they want.
 */
export const SAMPLE_INPUTS: Record<
  string,
  { input: string; second?: string; placeholder?: string }
> = {
  "json-formatter": {
    input: '{"id":42,"name":"Ada Lovelace","tags":["maths","engines"],"active":true,"meta":{"born":1815}}',
    placeholder: 'Paste JSON here, for example {"a": 1}',
  },
  "json-minifier": { input: '{\n  "id": 42,\n  "name": "Ada"\n}' },
  "json-validator": { input: '{"a": 1, "b": [2, 3],}' },
  "json-to-yaml": { input: '{"server":{"host":"localhost","port":8080,"tls":false}}' },
  "yaml-to-json": { input: "server:\n  host: localhost\n  port: 8080\n  tls: false" },
  "json-to-csv": { input: '[{"id":1,"name":"Ada"},{"id":2,"name":"Grace"}]' },
  "csv-to-json": { input: "id,name,role\n1,Ada,engineer\n2,Grace,admiral" },
  "csv-to-markdown-table": { input: "Tool,Category\nJSON Formatter,Text\nBase64 Encode,Developer" },
  "json-to-xml": { input: '{"book":{"title":"Notes","pages":220}}' },
  "xml-to-json": { input: '<book id="7"><title>Notes</title><pages>220</pages></book>' },
  "toml-to-json": { input: '[server]\nhost = "localhost"\nport = 8080' },
  "json-to-typescript": { input: '{"id":1,"name":"Ada","tags":["a","b"],"meta":{"born":1815}}' },
  "markdown-to-html": { input: "# Title\n\nSome **bold** text and a [link](https://example.test)." },
  "html-to-markdown": { input: "<h1>Title</h1><p>Some <strong>bold</strong> text.</p>" },
  "text-diff": {
    input: "The quick brown fox\njumps over the lazy dog\nand keeps running.",
    second: "The quick brown fox\nleaps over the lazy dog\nand keeps running.",
  },
  "case-converter": { input: "the quick brown fox jumps over the lazy dog" },
  "word-counter": {
    input:
      "Writing is thinking made visible. Count the words, and you learn how long someone will spend with them.",
  },
  "sort-lines": { input: "item10\nitem2\nbanana\nApple\nitem1" },
  "remove-duplicate-lines": { input: "alpha\nbeta\nalpha\ngamma\nbeta" },
  "find-and-replace": { input: "The cat sat on the mat. The cat was happy." },
  "remove-line-breaks": { input: "This sentence has been\nhard-wrapped by an email\nclient.\n\nThis is a new paragraph." },
  "base64-encode": { input: "Hello, world!" },
  "base64-decode": { input: "SGVsbG8sIHdvcmxkIQ==" },
  "url-encode": { input: "search terms & special/characters?" },
  "url-decode": { input: "search%20terms%20%26%20special%2Fcharacters%3F" },
  "html-entity-encode": { input: '<a href="/x">Tom & Jerry</a>' },
  "html-entity-decode": { input: "&lt;p&gt;Caf&eacute; &amp; cr&egrave;me&lt;/p&gt;" },
  "jwt-decoder": {
    input:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNTE2MjQyNjIyfQ.dummy-signature",
  },
  "regex-tester": { input: "Contact ada@example.test or grace@navy.test for details." },
  "query-string-parser": { input: "https://example.test/search?q=web+tools&page=2&tag=pdf&tag=image" },
  "slug-generator": { input: "10 Best Café Tools for 2026!" },
  "unix-timestamp-converter": { input: "1516239022" },
  "cron-expression-parser": { input: "0 9 * * 1-5" },
  "color-converter": { input: "#3b82f6" },
  "hash-generator": { input: "The quick brown fox jumps over the lazy dog" },
  "hmac-generator": { input: "message to sign" },
  "password-strength-checker": { input: "correct-horse-battery-staple" },
  "base-converter": { input: "255" },
  "roman-numeral-converter": { input: "2026" },
  "number-to-words": { input: "1234567.89" },
};
