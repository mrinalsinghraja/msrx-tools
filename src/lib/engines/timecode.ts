import { ToolError } from "./types";

/** Reads `1:23`, `83`, `1:23.5` or an empty string. */
export function parseTimecode(text: string, fallback: number): number {
  const trimmed = text.trim();
  if (!trimmed) return fallback;

  const parts = trimmed.split(":");
  let seconds = 0;
  for (const part of parts) {
    const value = Number(part);
    if (!Number.isFinite(value) || value < 0) {
      throw new ToolError(`“${text}” is not a time. Write it as seconds, or as minutes:seconds — 90 or 1:30.`);
    }
    seconds = seconds * 60 + value;
  }
  return seconds;
}
