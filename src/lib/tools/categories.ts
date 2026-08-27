import type { Category, CategoryId } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "pdf",
    slug: "pdf",
    title: "PDF",
    short: "Merge, split, compress, protect",
    icon: "FileText",
    blurb:
      "Everything a document needs — combine, take apart, shrink, rotate, stamp, lock and unlock. Your PDFs are read and rewritten inside this tab and never uploaded anywhere.",
  },
  {
    id: "image",
    slug: "image",
    title: "Image",
    short: "Convert, compress, resize, crop",
    icon: "Image",
    blurb:
      "Modern encoders — MozJPEG, OxiPNG, WebP, AVIF — compiled to run in your browser. Same quality as the desktop tools, none of the uploading.",
  },
  {
    id: "media",
    slug: "video",
    title: "Video & Audio",
    short: "Convert, trim, extract, compress",
    icon: "Clapperboard",
    blurb:
      "A full FFmpeg build running in the tab. Convert formats, cut clips, pull the audio out, make a GIF — on files that never touch a server.",
  },
  {
    id: "file",
    slug: "file",
    title: "Files & Archives",
    short: "Zip, unzip, convert documents",
    icon: "FolderArchive",
    blurb:
      "Pack and unpack archives, move between document and spreadsheet formats, and clean up the files you already have.",
  },
  {
    id: "text",
    slug: "text",
    title: "Text & Data",
    short: "Format, convert, clean, compare",
    icon: "Type",
    blurb:
      "JSON, YAML, CSV, XML and plain prose — reformat, validate, convert between them, diff two versions and tidy the result.",
  },
  {
    id: "dev",
    slug: "dev",
    title: "Developer",
    short: "Encode, decode, hash, inspect",
    icon: "Terminal",
    blurb:
      "The small things you reach for a dozen times a day: base64, JWTs, URL encoding, regex, cron, timestamps, colour maths.",
  },
  {
    id: "security",
    slug: "security",
    title: "Security & Privacy",
    short: "Hash, generate, strip, redact",
    icon: "ShieldCheck",
    blurb:
      "Checksums, strong passwords, QR codes and metadata scrubbing. Nothing here phones home, which is rather the point for this category.",
  },
  {
    id: "calc",
    slug: "calculator",
    title: "Calculators & Generators",
    short: "Convert units, work out numbers",
    icon: "Calculator",
    blurb:
      "Units, dates, loans, tax and the small generators that save a trip to a spreadsheet.",
  },
];

export const CATEGORY_BY_ID = new Map<CategoryId, Category>(
  CATEGORIES.map((c) => [c.id, c]),
);

export const CATEGORY_BY_SLUG = new Map<string, Category>(
  CATEGORIES.map((c) => [c.slug, c]),
);

export function categoryOf(id: CategoryId): Category {
  const found = CATEGORY_BY_ID.get(id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}
