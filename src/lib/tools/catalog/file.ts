import type { ToolSpec } from "../types";

/**
 * Files and archives, on fflate — a deflate implementation in plain JavaScript
 * rather than WASM, so these work on a phone and offline.
 */
export const FILE_TOOLS: ToolSpec[] = [
  {
    slug: "zip-files",
    category: "file",
    title: "Create a Zip",
    short: "Bundle any files into one archive without uploading them",
    keywords: ["zip files online", "create zip archive", "compress files to zip", "make a zip file"],
    io: "file",
    engine: "archive",
    op: "zipFiles",
    accepts: { mime: [], ext: [], multiple: true, maxMB: 400 },
    output: { ext: "zip", mime: "application/zip", cardinality: "single" },
    options: [
      { kind: "text", id: "name", label: "Archive name", default: "archive", placeholder: "archive" },
      {
        kind: "text",
        id: "folder",
        label: "Put everything in a folder called",
        default: "",
        placeholder: "Leave empty for no folder",
      },
      {
        kind: "slider",
        id: "level",
        label: "Compression",
        min: 0,
        max: 9,
        step: 1,
        default: 6,
        help: "0 stores without compressing, which is fastest and right for files that are already compressed.",
      },
    ],
    related: ["unzip-file", "encrypt-file", "compress-image"],
    icon: "FolderArchive",
  },
  {
    slug: "unzip-file",
    category: "file",
    title: "Unzip a File",
    short: "Open a zip and pull out what you need, one file or all of them",
    keywords: ["unzip online", "extract zip file", "open zip in browser", "zip extractor no upload"],
    io: "file",
    engine: "archive",
    op: "unzipFile",
    accepts: { mime: ["application/zip"], ext: ["zip"], multiple: true, maxMB: 400 },
    output: { ext: "bin", mime: "application/octet-stream", cardinality: "per-file" },
    options: [
      {
        kind: "text",
        id: "filter",
        label: "Only extract",
        default: "",
        placeholder: "*.csv, docs/*",
        help: "Comma-separated patterns. Leave empty to take everything.",
      },
      { kind: "toggle", id: "flatten", label: "Drop folder names", default: false },
      { kind: "toggle", id: "skipHidden", label: "Skip hidden and __MACOSX entries", default: true },
    ],
    related: ["zip-files", "decrypt-file", "epub-to-text"],
    icon: "FolderOpen",
  },
  {
    slug: "epub-to-text",
    category: "file",
    title: "EPUB to Text",
    short: "Pull the readable text out of an ebook, in reading order",
    keywords: ["epub to text", "convert epub to markdown", "extract text from epub", "epub reader online"],
    io: "file",
    engine: "archive",
    op: "epubToText",
    accepts: { mime: ["application/epub+zip"], ext: ["epub"], multiple: true, maxMB: 200 },
    output: { ext: "md", mime: "text/markdown", cardinality: "per-file" },
    options: [
      {
        kind: "select",
        id: "format",
        label: "Output as",
        choices: [
          { value: "markdown", label: "Markdown — keeps headings and emphasis" },
          { value: "text", label: "Plain text" },
        ],
        default: "markdown",
      },
      { kind: "toggle", id: "separators", label: "Mark where each chapter starts", default: true },
      { kind: "toggle", id: "metadata", label: "Include the title and author", default: true },
    ],
    related: ["unzip-file", "pdf-to-markdown", "html-to-markdown"],
    icon: "BookOpen",
  },
];
