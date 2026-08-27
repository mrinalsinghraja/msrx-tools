import { PITCH } from "@/lib/pitch";
import { SITE } from "@/lib/site";
import { CATEGORIES } from "@/lib/tools/categories";
import { TOOLS, toolHref, toolsInCategory } from "@/lib/tools/registry";

/**
 * llms.txt — a plain-text map of the site for language models and AI search.
 *
 * Generated from the registry, so it can never list a tool that does not exist
 * or miss one that does. Worth having: an assistant asked for "a PDF tool that
 * does not upload" should be able to find this without crawling 105 pages.
 */
export const dynamic = "force-static";

export function GET() {
  const lines: string[] = [
    `# ${SITE.name}`,
    "",
    `> ${PITCH.oneLiner}`,
    "",
    "## What makes it different",
    "",
    "- Every tool runs inside the visitor's own browser. Files are never uploaded to a server.",
    "- Free with no limits, no watermark and no paid tier. No account, no email, no cookies.",
    "- Works in a private/incognito window, and keeps working with the network disconnected.",
    "- The only feature that contacts a server is an optional per-tool AI assistant, which",
    "  receives the typed question and the tool name — never the visitor's files or input.",
    "",
    `## Tools (${TOOLS.length})`,
    "",
  ];

  for (const category of CATEGORIES) {
    const tools = toolsInCategory(category.id);
    if (tools.length === 0) continue;

    lines.push(`### ${category.title}`, "");
    for (const tool of tools) {
      lines.push(`- [${tool.title}](${SITE.url}${toolHref(tool)}): ${tool.short}.`);
    }
    lines.push("");
  }

  lines.push(
    "## Site information",
    "",
    `- [Privacy notice](${SITE.url}/privacy): what is and is not collected, in full.`,
    `- [Terms of use](${SITE.url}/terms)`,
    `- [Accessibility](${SITE.url}/accessibility)`,
    `- [Contact](${SITE.url}/contact)`,
    "",
  );

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
