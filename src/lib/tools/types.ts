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
export type EngineId =
  | "pure"
  | "image"
  | "pdf"
  | "media"
  | "doc"
  | "archive"
  | "data"
  | "crypto";

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
  /**
   * A quantity with its own unit picker, rendered as one row: a number box and
   * a compact unit dropdown beside it.
   *
   * There is no "metric or imperial" switch anywhere in this product, on
   * purpose. Plenty of people give their height in feet and their weight in
   * kilograms — that combination is normal in India and is not a system at all.
   * Asking someone to pick a system forces them to answer a question they don't
   * have, so each measurement carries its own unit instead.
   *
   * Values are stored across three keys: `id` holds the number, `${id}Unit` the
   * chosen unit, and `${id}Sub` the second box when a compound unit is picked.
   */
  | (OptionBase & {
      kind: "measure";
      /** Which table in `lib/units.ts` the unit symbols come from. */
      quantity: string;
      /** The unit symbols offered, in order. The first is the default. */
      units: string[];
      default: number;
      min?: number;
      max?: number;
      step?: number;
      /**
       * A second box for the remainder, for units people say in two parts.
       * "5 ft 7 in" is one height, not two, so feet alone would be a worse
       * question than the one it replaced.
       */
      compound?: { whenUnit: string; unit: string; label: string; default: number };
    })
  | (OptionBase & { kind: "toggle"; default: boolean })
  | (OptionBase & {
      kind: "text";
      default: string;
      placeholder?: string;
      maxLength?: number;
      /**
       * A password or key. Renders masked, with autofill and password managers
       * told to leave it alone: this is not a login, and a manager that offers
       * to save it would be storing the key to the person's own file under the
       * name of a website that never receives it.
       */
      secret?: boolean;
    })
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
  /**
   * What the visitor can see and do on the file itself before running anything.
   *
   * Typing coordinates into four number boxes and hoping is not a way to crop a
   * picture, and running a filter blind is not a way to choose one. Where the
   * tool acts on an image, the image goes on screen.
   *
   * Declared here rather than switched on a slug inside a component, so a new
   * tool gets the behaviour by describing itself.
   */
  stage?: {
    /**
     * The option ids a dragged selection writes into. Present only on tools
     * that act on a region. The selection is always written as a percentage of
     * the image, and `unit` is set to match — a rectangle drawn on screen means
     * the same thing at any resolution, and pixels would not.
     */
    region?: {
      x: string;
      y: string;
      width: string;
      height: string;
      /** The option holding percent-or-pixels, forced to percent while dragging. */
      unit?: string;
      /** The option holding an aspect-ratio lock, honoured by the selection. */
      aspect?: string;
    };
    /**
     * Run the real operation on the first file as the options change, and show
     * what comes out. Not an approximation of the op — the op itself, which is
     * the only kind of preview that cannot drift from the result.
     */
    preview?: boolean;
  };
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
