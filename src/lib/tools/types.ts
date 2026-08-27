/**
 * Tool type system.
 *
 * The registry is the single source of truth for routing, navigation, search,
 * sitemap, internal links and the smoke-test suite. Adding a tool means adding
 * one `ToolSpec` plus one `ToolContent` — never a new page or a new route.
 *
 * Deliberate split:
 *   - `ToolSpec`    lives in `catalog/*` and IS shipped to the browser. Keep it small.
 *   - `ToolContent` lives in `src/content/tools/*` and is server-only SEO prose.
 *     139 tools x 200+ words would be ~150 kB of dead weight in the client bundle.
 */

export type CategoryId =
  | "pdf"
  | "image"
  | "media"
  | "file"
  | "text"
  | "dev"
  | "security"
  | "calc";

/** Which worker bundle runs the op. `pure` needs no WASM and no worker warm-up. */
export type EngineId = "pure" | "image" | "pdf" | "media" | "doc" | "archive" | "data";

/**
 * The shape of the tool's workspace.
 *  - `file` drop files in, get files out (PDF merge, image resize)
 *  - `text` text in, text out (JSON format, base64)
 *  - `form` inputs only, value out (password generator, EMI calculator)
 */
export type ToolIO = "file" | "text" | "form";

/** Show an option only when another option holds a given value. */
export interface OptionCondition {
  id: string;
  equals: string | number | boolean;
}

interface OptionBase {
  id: string;
  label: string;
  help?: string;
  showIf?: OptionCondition;
}

export type OptionSpec =
  | (OptionBase & {
      kind: "select";
      choices: { value: string; label: string }[];
      default: string;
    })
  | (OptionBase & {
      kind: "slider";
      min: number;
      max: number;
      step: number;
      default: number;
      unit?: string;
    })
  | (OptionBase & {
      kind: "number";
      min?: number;
      max?: number;
      step?: number;
      default: number;
      unit?: string;
    })
  | (OptionBase & { kind: "toggle"; default: boolean })
  | (OptionBase & { kind: "text"; default: string; placeholder?: string; maxLength?: number })
  | (OptionBase & { kind: "textarea"; default: string; placeholder?: string; rows?: number })
  | (OptionBase & { kind: "color"; default: string })
  /** Free-form page selection, e.g. `1-3, 7, 12-`. Validated against the real page count. */
  | (OptionBase & { kind: "pageRange"; default: string; placeholder?: string });

export type OptionValue = string | number | boolean;
export type OptionValues = Record<string, OptionValue>;

export interface AcceptSpec {
  /** MIME types for the file picker. Empty means "anything". */
  mime: string[];
  /** Lowercase extensions without the dot — the real gate, since MIME is unreliable. */
  ext: string[];
  multiple: boolean;
  /** Soft ceiling in MB. Above this we warn about device memory rather than refuse. */
  maxMB: number;
}

export interface OutputSpec {
  ext: string;
  mime: string;
  /** One output file per input, or one output for the whole batch (merge, zip). */
  cardinality: "per-file" | "single";
}

export interface ToolSpec {
  slug: string;
  category: CategoryId;
  /** Used as the H1 and the base of the <title>. */
  title: string;
  /** Card blurb. Keep under 90 characters so cards stay one line on desktop. */
  short: string;
  keywords: string[];
  io: ToolIO;
  engine: EngineId;
  /** Op name dispatched inside the engine worker. */
  op: string;
  accepts?: AcceptSpec;
  output?: OutputSpec;
  options: OptionSpec[];
  /**
   * Set when the tool needs bespoke canvas UI (crop, sign, redact). The panel
   * itself is resolved at runtime from `components/tools/custom-panels.ts` —
   * the registry stays plain data so server components can import it.
   */
  customPanel?: boolean;
  /** Sibling slugs. Drives the internal link matrix and the "related tools" rail. */
  related: string[];
  /** lucide-react icon name, e.g. "FileText". */
  icon: string;
}

export interface ToolFaq {
  q: string;
  a: string;
}

/** Server-only SEO body. Every tool must have one — the build gate enforces it. */
export interface ToolContent {
  /** 200+ words of tool-specific prose. Generic filler fails the build gate. */
  intro: string;
  steps: string[];
  faq: ToolFaq[];
}

export interface Category {
  id: CategoryId;
  /** URL segment, e.g. "pdf" -> /pdf/merge-pdf */
  slug: string;
  title: string;
  short: string;
  icon: string;
  blurb: string;
}
