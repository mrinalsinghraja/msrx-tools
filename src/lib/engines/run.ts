import type { OptionValues, ToolSpec } from "@/lib/tools/types";

import type { FileOpResult, InputFile, ProgressReporter } from "./file-types";
import { getPureOp } from "./pure";
import { ToolError, type OpResult } from "./types";

/**
 * The single entry point every workspace calls.
 *
 * `pure` ops run on the main thread — they finish in under a millisecond on any
 * realistic input, and a worker round trip would cost more than the work. The
 * WASM engines (image, pdf, media) will dispatch to their own lazily-loaded
 * worker from here, which is why callers already await this.
 */
export async function runTool(
  tool: ToolSpec,
  input: string,
  options: OptionValues,
): Promise<OpResult> {
  if (tool.engine === "pure") {
    const op = getPureOp(tool.op);
    if (!op) {
      throw new ToolError(
        `This tool is wired to an operation ("${tool.op}") that isn't available. Please report it.`,
      );
    }
    return await op(input, options);
  }

  throw new ToolError(`The ${tool.engine} engine isn't available in this build yet.`);
}

/**
 * Runs a file-in / file-out tool.
 *
 * The engine module is imported on demand, so a visitor formatting JSON never
 * downloads pdf-lib or pdf.js — together they are larger than the rest of the
 * site put together.
 */
export async function runFileTool(
  tool: ToolSpec,
  files: InputFile[],
  options: OptionValues,
  onProgress?: ProgressReporter,
): Promise<FileOpResult> {
  if (tool.engine === "pdf") {
    const { getPdfOp } = await import("./pdf");
    const op = getPdfOp(tool.op);
    if (!op) {
      throw new ToolError(
        `This tool is wired to an operation ("${tool.op}") that isn't available. Please report it.`,
      );
    }
    return await op(files, options, onProgress);
  }

  throw new ToolError(`The ${tool.engine} engine isn't available in this build yet.`);
}

/** Every option's declared default, which is the state a tool page opens in. */
export function defaultOptions(tool: ToolSpec): OptionValues {
  const values: OptionValues = {};
  for (const option of tool.options) values[option.id] = option.default;
  return values;
}

/**
 * An option is visible when it has no condition, or when the option it depends
 * on currently holds the required value. Hidden options keep their values so
 * toggling back and forth doesn't lose what the user typed.
 */
export function isOptionVisible(
  option: ToolSpec["options"][number],
  values: OptionValues,
): boolean {
  if (!option.showIf) return true;
  const current = values[option.showIf.id];
  // Values arrive from form controls as strings; compare loosely on purpose.
  return String(current) === String(option.showIf.equals);
}
