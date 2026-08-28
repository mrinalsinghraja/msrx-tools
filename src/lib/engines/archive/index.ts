import { unzipSync, zipSync, strFromU8 } from "fflate";

import { formatBytes, stem, type FileOp, type OutputFile } from "../file-types";
import { bool, num, str, ToolError } from "../types";

/**
 * Archives, on fflate.
 *
 * fflate is a deflate implementation in plain JavaScript — no WASM, about 30 kB
 * — which is why zipping is available on a page that promises to work offline
 * on a phone.
 */

const MIME_BY_EXT: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  css: "text/css",
  js: "text/javascript",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  zip: "application/zip",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
};

function mimeFor(name: string): string {
  return MIME_BY_EXT[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

/** Turns `*.txt`, `docs/*` into a matcher. An empty pattern matches everything. */
function makeMatcher(pattern: string): (name: string) => boolean {
  const trimmed = pattern.trim();
  if (!trimmed) return () => true;

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const escaped = part.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
      return new RegExp(`^${escaped}$`, "i");
    });

  return (name: string) => parts.some((re) => re.test(name) || re.test(name.split("/").pop() ?? name));
}

export const zipFiles: FileOp = async (files, options, onProgress) => {
  if (files.length === 0) throw new ToolError("Add the files you want zipped.");

  const level = Math.max(0, Math.min(9, num(options, "level", 6))) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  const archiveName = str(options, "name", "archive").trim() || "archive";
  const folder = str(options, "folder").trim().replace(/^\/+|\/+$/g, "");

  const entries: Record<string, Uint8Array> = {};
  for (const [index, file] of files.entries()) {
    // Two files of the same name would silently overwrite each other inside the
    // archive, so the second one is numbered rather than lost.
    let name = folder ? `${folder}/${file.name}` : file.name;
    let suffix = 1;
    while (entries[name]) {
      name = `${folder ? `${folder}/` : ""}${stem(file.name)} (${suffix++}).${file.name.split(".").pop()}`;
    }
    entries[name] = file.bytes;
    onProgress?.((index + 1) / (files.length + 1), file.name);
  }

  onProgress?.(0.95, "Compressing");
  const bytes = zipSync(entries, { level });

  const before = files.reduce((sum, file) => sum + file.bytes.length, 0);
  const ratio = before > 0 ? Math.round((1 - bytes.length / before) * 100) : 0;

  return {
    files: [{ name: `${archiveName}.zip`, bytes, mime: "application/zip" }],
    stats: [
      { label: "Files", value: String(files.length) },
      { label: "Before", value: formatBytes(before) },
      { label: "After", value: formatBytes(bytes.length) },
      { label: "Saved", value: `${Math.max(0, ratio)}%` },
    ],
    note:
      ratio <= 2
        ? "Barely smaller, which is normal: JPEG, PNG, MP4 and PDF are already compressed, and zipping them mostly just puts them in one file."
        : undefined,
  };
};

export const unzipFile: FileOp = async (files, options, onProgress) => {
  const filter = makeMatcher(str(options, "filter"));
  const flatten = bool(options, "flatten", false);
  const skipHidden = bool(options, "skipHidden", true);

  const outputs: OutputFile[] = [];
  let skipped = 0;

  for (const [index, file] of files.entries()) {
    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(file.bytes);
    } catch {
      throw new ToolError(
        `“${file.name}” could not be read as a zip. Encrypted archives and formats such as .rar, .7z and .tar.gz are not zip files and are not supported here.`,
      );
    }

    for (const [path, bytes] of Object.entries(entries)) {
      // Directory entries carry no data; the folder is implied by the paths.
      if (path.endsWith("/")) continue;
      const base = path.split("/").pop() ?? path;
      if (skipHidden && (base.startsWith(".") || path.startsWith("__MACOSX/"))) {
        skipped++;
        continue;
      }
      if (!filter(path)) {
        skipped++;
        continue;
      }
      outputs.push({
        name: flatten ? base : path.replace(/\//g, "_"),
        bytes,
        mime: mimeFor(base),
      });
    }
    onProgress?.((index + 1) / files.length, file.name);
  }

  if (outputs.length === 0) {
    throw new ToolError(
      skipped > 0
        ? "Every entry was filtered out. Clear the filter, or widen it — it matches whole names, so use a pattern like *.txt."
        : "That archive is empty.",
    );
  }

  return {
    files: outputs,
    stats: [
      { label: "Extracted", value: String(outputs.length) },
      { label: "Skipped", value: String(skipped) },
      { label: "Total size", value: formatBytes(outputs.reduce((sum, f) => sum + f.bytes.length, 0)) },
    ],
    note: flatten
      ? "Folder structure was flattened, so files that shared a name in different folders now sit side by side."
      : "Folder separators become underscores, since a browser download cannot create directories.",
  };
};

/* ------------------------------------------------------------------ */
/* EPUB                                                                 */
/* ------------------------------------------------------------------ */

function stripTags(html: string, asMarkdown: boolean): string {
  let text = html
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  if (asMarkdown) {
    text = text
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, body: string) =>
        `\n\n${"#".repeat(Number(level))} ${body.replace(/<[^>]+>/g, "").trim()}\n\n`,
      )
      .replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**")
      .replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, "_$1_")
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, body: string) =>
        `\n\n> ${body.replace(/<[^>]+>/g, "").trim()}\n\n`,
      );
  }

  return text
    .replace(/<\/(?:p|div|h[1-6]|li|tr|section)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const epubToText: FileOp = async (files, options, onProgress) => {
  const asMarkdown = str(options, "format", "markdown") === "markdown";
  const separators = bool(options, "separators", true);
  const includeMeta = bool(options, "metadata", true);

  const outputs: OutputFile[] = [];
  let chapterTotal = 0;
  let wordTotal = 0;

  for (const [index, file] of files.entries()) {
    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(file.bytes);
    } catch {
      throw new ToolError(`“${file.name}” could not be opened. An EPUB is a zip archive; this one is not readable as one.`);
    }

    // The container points at the OPF, and the OPF's spine is the reading
    // order. Reading files alphabetically instead would shuffle the chapters.
    const containerEntry = entries["META-INF/container.xml"];
    if (!containerEntry) {
      throw new ToolError(`“${file.name}” has no META-INF/container.xml, so it isn't a valid EPUB.`);
    }
    const container = strFromU8(containerEntry);
    const opfPath = /full-path="([^"]+)"/.exec(container)?.[1];
    if (!opfPath || !entries[opfPath]) {
      throw new ToolError(`“${file.name}” names a package file that isn't inside the archive.`);
    }

    const opf = strFromU8(entries[opfPath]);
    const base = opfPath.includes("/") ? `${opfPath.slice(0, opfPath.lastIndexOf("/"))}/` : "";

    const manifest = new Map<string, string>();
    for (const item of opf.matchAll(/<item\b[^>]*>/gi)) {
      const id = /id="([^"]+)"/.exec(item[0])?.[1];
      const href = /href="([^"]+)"/.exec(item[0])?.[1];
      if (id && href) manifest.set(id, `${base}${decodeURIComponent(href)}`);
    }

    const spine = [...opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/gi)].map((m) => m[1]);
    const paths = spine.map((id) => manifest.get(id)).filter((p): p is string => Boolean(p && entries[p]));

    if (paths.length === 0) {
      throw new ToolError(`No readable chapters were found in “${file.name}”.`);
    }

    const title = /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i.exec(opf)?.[1]?.trim();
    const author = /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i.exec(opf)?.[1]?.trim();
    const language = /<dc:language[^>]*>([\s\S]*?)<\/dc:language>/i.exec(opf)?.[1]?.trim();

    const parts: string[] = [];
    if (includeMeta && (title || author)) {
      parts.push(
        asMarkdown
          ? `# ${title ?? stem(file.name)}\n${author ? `\n_by ${author}_` : ""}${language ? `\n\nLanguage: ${language}` : ""}`
          : `${title ?? stem(file.name)}${author ? `\nby ${author}` : ""}${language ? `\nLanguage: ${language}` : ""}`,
      );
    }

    for (const path of paths) {
      const body = stripTags(strFromU8(entries[path]), asMarkdown);
      if (!body) continue;
      chapterTotal++;
      wordTotal += body.split(/\s+/).filter(Boolean).length;
      parts.push(separators ? `${asMarkdown ? "\n---\n" : "\n* * *\n"}\n${body}` : body);
    }

    outputs.push({
      name: `${stem(file.name)}.${asMarkdown ? "md" : "txt"}`,
      bytes: new TextEncoder().encode(parts.join("\n\n")),
      mime: asMarkdown ? "text/markdown" : "text/plain",
    });
    onProgress?.((index + 1) / files.length, file.name);
  }

  return {
    files: outputs,
    stats: [
      { label: "Books", value: String(outputs.length) },
      { label: "Chapters", value: String(chapterTotal) },
      { label: "Words", value: wordTotal.toLocaleString() },
    ],
    note: "Text only. Images, footnote links, tables and the original formatting are not carried across, and a DRM-protected EPUB cannot be opened at all.",
  };
};

export const ARCHIVE_OPS: Record<string, FileOp> = { zipFiles, unzipFile, epubToText };

export function getArchiveOp(name: string): FileOp | undefined {
  return ARCHIVE_OPS[name];
}
