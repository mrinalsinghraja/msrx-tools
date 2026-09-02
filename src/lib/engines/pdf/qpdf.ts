import { ToolError } from "../types";

/**
 * qpdf, compiled to WebAssembly.
 *
 * Encryption is the one PDF job pdf-lib cannot do at all: it can neither read
 * an encrypted document nor write one. qpdf can do both, and it is the same
 * program the command-line world has trusted for twenty years, so the files it
 * writes open in Acrobat, Preview and every phone reader without argument.
 *
 * It is loaded from `/vendor/qpdf/` rather than imported, for two reasons. The
 * module is an Emscripten CommonJS bundle that reaches for `fs`, `path` and
 * `crypto` behind Node guards the bundler cannot see through, and its payload
 * is 1.3 MB — nobody formatting JSON should pay for that. A script tag keeps
 * both problems out of the build.
 */

/** Emscripten's virtual file system, narrowed to the parts used here. */
interface QpdfFS {
  writeFile(path: string, data: Uint8Array): void;
  readFile(path: string): Uint8Array;
  init(
    stdin: null,
    stdout: (charCode: number | null) => void,
    stderr: (charCode: number | null) => void,
  ): void;
}

interface QpdfInstance {
  callMain(args: string[]): number;
  FS: QpdfFS;
}

interface QpdfOptions {
  locateFile: () => string;
  preRun: ((module: QpdfInstance) => void)[];
}

type QpdfFactory = (options: QpdfOptions) => Promise<QpdfInstance>;

const ASSET_BASE = "/vendor/qpdf";

let factory: Promise<QpdfFactory> | null = null;

function loadFactory(): Promise<QpdfFactory> {
  if (factory) return factory;

  factory = new Promise<QpdfFactory>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new ToolError("The PDF password tools need a browser to run in."));
      return;
    }

    const script = window.document.createElement("script");
    script.src = `${ASSET_BASE}/qpdf.js`;
    script.async = true;
    script.onload = () => {
      // Anything thrown in here would be thrown inside a promise executor's
      // callback, where nobody is listening: the promise would never settle and
      // the tool would sit on "Working…" for ever. So this hands every failure
      // to reject() instead.
      try {
        // The bundle has no ES export: in a browser it leaves its factory on
        // the window as `Module`. Take it, then blank a name that generic so it
        // cannot be mistaken for anything else on the page. It is a top-level
        // `var`, so it can be overwritten but never deleted.
        const globals = window as unknown as { Module?: QpdfFactory };
        const loaded = globals.Module;
        globals.Module = undefined;
        if (typeof loaded !== "function") {
          reject(new ToolError("The PDF password engine loaded but did not start. Please reload the page."));
          return;
        }
        resolve(loaded);
      } catch (error) {
        factory = null;
        reject(
          new ToolError(
            `The PDF password engine could not be started: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    };
    script.onerror = () => {
      factory = null;
      reject(new ToolError("The PDF password engine could not be downloaded. Check your connection and try again."));
    };

    window.document.head.appendChild(script);
  });

  return factory;
}

/**
 * Test seam: hands the loader a factory directly.
 *
 * The shipped path is a script tag, which needs a browser. Tests run the same
 * binary through Node's own loader and inject it here, so what they exercise is
 * the real qpdf rather than a stand-in that agrees with whatever the code
 * expects. Pass null to forget it again.
 */
export function setQpdfFactory(create: QpdfFactory | null) {
  factory = create ? Promise.resolve(create) : null;
}

export interface QpdfRun {
  /** qpdf's exit status: 0 success, 2 error, 3 succeeded with warnings. */
  code: number;
  /** Everything qpdf printed, with its argv[0] prefix stripped from each line. */
  output: string;
  /** The output document, when the command wrote one. */
  bytes: Uint8Array | null;
}

const INPUT_PATH = "/in.pdf";
const OUTPUT_PATH = "/out.pdf";

/**
 * Runs one qpdf command over one document.
 *
 * A fresh instance per call, deliberately. qpdf is a command-line program with
 * a command-line program's relationship to global state, and the alternative —
 * reusing an instance and hoping each run leaves nothing behind — trades a few
 * milliseconds for a class of bug that would only appear on someone's second
 * file.
 *
 * `{INPUT}` and `{OUTPUT}` in `args` are replaced with the paths qpdf sees.
 */
export async function runQpdf(args: string[], input: Uint8Array): Promise<QpdfRun> {
  const create = await loadFactory();

  const printed: number[] = [];
  const collect = (charCode: number | null) => {
    if (charCode !== null) printed.push(charCode);
  };

  const qpdf = await create({
    locateFile: () => `${ASSET_BASE}/qpdf.wasm`,
    // This build compiles out Emscripten's `print` and `printErr` hooks, so the
    // only way to hear qpdf is to re-point the virtual terminal at ourselves.
    // Without it every failure would be an exit code with no sentence attached,
    // and "invalid password" would reach the user as the number 2.
    preRun: [(module) => module.FS.init(null, collect, collect)],
  });

  qpdf.FS.writeFile(INPUT_PATH, input);

  const resolved = args.map((arg) =>
    arg.replace("{INPUT}", INPUT_PATH).replace("{OUTPUT}", OUTPUT_PATH),
  );

  let code: number;
  try {
    code = qpdf.callMain(resolved);
  } catch (error) {
    throw new ToolError(
      `The PDF password engine stopped unexpectedly: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let bytes: Uint8Array | null = null;
  try {
    bytes = qpdf.FS.readFile(OUTPUT_PATH);
  } catch {
    // Commands that only report (--show-encryption) write no file.
  }

  return { code, output: cleanOutput(printed), bytes };
}

/**
 * qpdf prefixes its messages with the name it was invoked as, which here is an
 * Emscripten placeholder like "./this.program". Showing that to someone who
 * dropped a file on a web page would be nonsense, so it comes off.
 */
function cleanOutput(charCodes: number[]): string {
  const text = charCodes.map((code) => String.fromCharCode(code)).join("");
  return text
    .split("\n")
    .map((line) => line.replace(/^[^\s:]*(?:qpdf|program|\.js):\s*/i, ""))
    .join("\n")
    .trim();
}

/** True when qpdf refused the document because it wants a password it wasn't given. */
export function isPasswordFailure(run: QpdfRun): boolean {
  return run.code !== 0 && /invalid password/i.test(run.output);
}
