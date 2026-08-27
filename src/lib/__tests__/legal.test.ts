import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  accessibilityStatement,
  CONTACT_EMAIL,
  contactPage,
  getLegalDocument,
  LEGAL_DOCUMENTS,
  privacyNotice,
  termsOfUse,
} from "@/lib/legal";

/**
 * A privacy notice that quietly stops matching the software is worse than
 * none — it turns an honest claim into a false one. These tests read the source
 * and fail when a promise on the page is no longer true of the code.
 */

const SOURCE_ROOT = join(process.cwd(), "src");

function readSource(...segments: string[]): string {
  return readFileSync(join(SOURCE_ROOT, ...segments), "utf8");
}

const privacy = privacyNotice(CONTACT_EMAIL);
const allPrivacyText = privacy.sections
  .flatMap((section) => [...(section.paragraphs ?? []), ...(section.bullets ?? [])])
  .join("\n");

describe("document structure", () => {
  it("has the four pages the site links to", () => {
    expect(LEGAL_DOCUMENTS.map((d) => d.slug).sort()).toEqual([
      "accessibility",
      "contact",
      "privacy",
      "terms",
    ]);
  });

  it("looks each one up by slug", () => {
    for (const document of LEGAL_DOCUMENTS) {
      expect(getLegalDocument(document.slug)?.title).toBe(document.title);
    }
    expect(getLegalDocument("nope")).toBeUndefined();
  });

  it("gives every page a title, a standfirst and a meta summary", () => {
    for (const document of LEGAL_DOCUMENTS) {
      expect(document.title.length, document.slug).toBeGreaterThan(3);
      expect(document.standfirst.length, document.slug).toBeGreaterThan(20);
      expect(document.summary.length, document.slug).toBeGreaterThan(40);
    }
  });

  it("gives every section something to say", () => {
    for (const document of LEGAL_DOCUMENTS) {
      for (const section of document.sections) {
        const content = (section.paragraphs?.length ?? 0) + (section.bullets?.length ?? 0);
        expect(content, `${document.slug} → ${section.heading}`).toBeGreaterThan(0);
      }
    }
  });

  it("puts the contact address on every page that promises one", () => {
    for (const build of [privacyNotice, termsOfUse, accessibilityStatement, contactPage]) {
      const document = build("someone@example.test");
      const text = document.sections
        .flatMap((section) => [...(section.paragraphs ?? []), ...(section.bullets ?? [])])
        .join(" ");
      expect(text, document.slug).toContain("someone@example.test");
    }
  });

  it("takes the address as an argument rather than hard-coding it in the prose", () => {
    // If it were a literal, changing CONTACT_EMAIL would silently leave stale
    // addresses on the page.
    const document = privacyNotice("changed@example.test");
    const text = JSON.stringify(document);
    expect(text).toContain("changed@example.test");
    expect(text).not.toContain(CONTACT_EMAIL);
  });
});

describe("the claim checks are actually reading the source", () => {
  // A test that passes because its grep returned nothing proves nothing. These
  // guard the guards.
  it("finds real source under each directory it checks", () => {
    expect(execGrep("components").length).toBeGreaterThan(5000);
    expect(execGrep("lib").length).toBeGreaterThan(20000);
    expect(execGrep("lib/engines").length).toBeGreaterThan(20000);
  });

  it("finds the files it reads directly", () => {
    expect(readSource("app", "globals.css").length).toBeGreaterThan(1000);
    expect(readSource("lib", "ai", "rate-limit.ts")).toContain("token bucket");
  });

  it("would notice a banned pattern if one appeared", () => {
    // Sanity: the matcher used for the negative assertions really does match.
    expect("const x = localStorage.getItem('a')").toMatch(/localStorage/);
  });
});

describe("the privacy notice matches the code", () => {
  it("claims no cookies, and the code sets none", () => {
    expect(allPrivacyText).toMatch(/no cookies/i);

    const sources = ["components", "lib", "app"].map(execGrep).join("\n");
    expect(sources.length).toBeGreaterThan(20000);
    expect(sources).not.toMatch(/document\.cookie/);
  });

  it("claims no local storage, and the code uses none", () => {
    expect(allPrivacyText).toMatch(/local storage|session storage/i);
    expect(execGrep("components") + execGrep("lib")).not.toMatch(/localStorage|sessionStorage/);
  });

  it("claims the assistant sends only the question and the tool name", () => {
    expect(allPrivacyText).toMatch(/the question you typed, and the name of the tool/i);

    // The panel builds the request body; it must contain exactly those two.
    const panel = readSource("components", "tools", "assistant-panel.tsx");
    const body = /JSON\.stringify\(\{([^}]*)\}\)/.exec(panel)?.[1] ?? "";
    expect(body).toContain("slug");
    expect(body).toContain("question");
    expect(body).not.toMatch(/file|input|result|content/i);
  });

  it("claims the server discards any other field, and the validator does", () => {
    const prompt = readSource("lib", "ai", "prompt.ts");
    // validateQuestion returns a fresh object of exactly slug and question.
    expect(prompt).toMatch(/return \{ ok: true, slug, question: trimmed \}/);
  });

  it("claims files are never uploaded, and no engine performs a fetch", () => {
    const engines = execGrep("lib/engines");
    // The only network access an engine makes is pdf.js loading its own assets
    // from this origin; nothing posts anywhere.
    expect(engines).not.toMatch(/fetch\(\s*["'`]https?:/);
    expect(engines).not.toMatch(/XMLHttpRequest|navigator\.sendBeacon/);
    expect(allPrivacyText).toMatch(/never uploaded|never travel|does the file travel/i);
  });

  it("names the AI provider rather than saying 'a third party'", () => {
    expect(allPrivacyText).toContain("Groq");
  });

  it("admits the host keeps request logs", () => {
    expect(allPrivacyText).toMatch(/IP address/);
    expect(allPrivacyText).toMatch(/Vercel/);
  });

  it("describes the rate limiter holding an IP in memory, which it does", () => {
    expect(allPrivacyText).toMatch(/holds your IP address in memory/i);
    const limiter = readSource("lib", "ai", "rate-limit.ts");
    expect(limiter).toMatch(/new Map<string, Bucket>/);
    expect(limiter).not.toMatch(/prisma|postgres|redis|fs\.write/i);
  });

  it("does not promise a data-subject process the site cannot perform", () => {
    // There is no store, so the page must say so rather than offering erasure.
    expect(allPrivacyText).toMatch(/We hold none|no account to close/i);
  });
});

describe("the accessibility statement is honest", () => {
  const accessibility = accessibilityStatement(CONTACT_EMAIL);

  it("has a section for what has not been done", () => {
    const headings = accessibility.sections.map((section) => section.heading);
    expect(headings.some((heading) => /not been done/i.test(heading))).toBe(true);
  });

  it("claims no conformance level it has not tested for", () => {
    const text = JSON.stringify(accessibility);
    expect(text).toMatch(/not been formally audited/i);
    expect(text).not.toMatch(/fully conformant|WCAG 2\.2 AA compliant/i);
  });

  it("claims reduced motion is respected, and the stylesheet does it", () => {
    expect(JSON.stringify(accessibility)).toMatch(/reduced-motion/i);
    expect(readSource("app", "globals.css")).toContain("prefers-reduced-motion");
  });

  it("claims focus is never removed, and no rule removes it", () => {
    const css = readSource("app", "globals.css");
    expect(css).toContain("focus-visible");
    expect(css).not.toMatch(/outline:\s*none/);
  });
});

describe("the terms match how the site behaves", () => {
  const terms = termsOfUse(CONTACT_EMAIL);
  const text = JSON.stringify(terms);

  it("says the tools are free with no account", () => {
    expect(text).toMatch(/free/i);
    expect(text).toMatch(/no account/i);
  });

  it("warns that irreversible tools are irreversible", () => {
    expect(text).toMatch(/irreversible/i);
    expect(text).toMatch(/Keep your originals/i);
  });

  it("says the assistant can be wrong", () => {
    expect(text).toMatch(/may be incorrect|can be wrong/i);
  });

  it("discloses the assistant's rate limit, which the route enforces", () => {
    expect(text).toMatch(/limited to a modest number of questions/i);
    expect(readSource("lib", "ai", "rate-limit.ts")).toMatch(/REQUESTS_PER_WINDOW/);
  });
});

/** Reads every source file under a directory into one string, for claim checks. */
function execGrep(directory: string): string {
  const { execSync } = require("node:child_process") as typeof import("node:child_process");
  try {
    return execSync(
      `find ${JSON.stringify(join(SOURCE_ROOT, directory))} -type f \\( -name '*.ts' -o -name '*.tsx' \\) -not -path '*__tests__*' -exec cat {} +`,
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
  } catch {
    return "";
  }
}
