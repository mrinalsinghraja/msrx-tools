/**
 * Strips the light markdown a model emits despite being asked for plain prose.
 *
 * The panel renders answers as plain text, so `**g**` arrives on screen with the
 * asterisks showing. Asking the model nicely is not a guarantee — this is, and
 * it costs nothing when the model does behave.
 *
 * Deliberately narrow: emphasis, inline code, list bullets and heading marks.
 * It is a display tidy-up, not a markdown parser, and it never removes content.
 */
export function stripMarkdown(text: string): string {
  return (
    text
      // Fenced blocks: keep the code, drop the fence line and its language tag.
      .replace(/^```[a-zA-Z0-9-]*\n?/gm, "")
      // Bold, italic and their combination, in either marker.
      .replace(/(\*\*\*|___)([\s\S]+?)\1/g, "$2")
      .replace(/(\*\*|__)([\s\S]+?)\1/g, "$2")
      .replace(/(?<![\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\w*])/g, "$1")
      // Single-underscore italic. The word-boundary guards are what keep
      // snake_case_identifiers intact, which matters a lot on a developer site.
      .replace(/(?<![\w_])_(?!\s)([^_\n]+?)(?<!\s)_(?![\w_])/g, "$1")
      // Inline code, including the doubled-backtick form.
      .replace(/``([\s\S]+?)``/g, "$1")
      .replace(/`([^`\n]+?)`/g, "$1")
      // Heading marks and list bullets at the start of a line.
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "• ")
  );
}
