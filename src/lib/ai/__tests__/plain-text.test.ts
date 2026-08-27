import { describe, expect, it } from "vitest";

import { stripMarkdown } from "@/lib/ai/plain-text";

describe("stripMarkdown", () => {
  it("removes bold and italic markers but keeps the words", () => {
    expect(stripMarkdown("Use the **g** flag and the _i_ flag.")).toBe("Use the g flag and the i flag.");
  });

  it("removes inline code backticks", () => {
    expect(stripMarkdown("Set it to `gi` or ``a`b``.")).toBe("Set it to gi or a`b.");
  });

  it("turns list bullets into a readable character", () => {
    expect(stripMarkdown("- one\n* two\n+ three")).toBe("• one\n• two\n• three");
  });

  it("drops heading marks", () => {
    expect(stripMarkdown("## Options\ntext")).toBe("Options\ntext");
  });

  it("leaves snake_case identifiers alone", () => {
    expect(stripMarkdown("Use max_retry_count and _leading names.")).toBe(
      "Use max_retry_count and _leading names.",
    );
  });

  it("leaves multiplication and arithmetic alone", () => {
    expect(stripMarkdown("3 * 4 = 12 and 2*3")).toBe("3 * 4 = 12 and 2*3");
  });

  it("leaves plain prose untouched", () => {
    const prose = "The g flag finds every match rather than stopping at the first.";
    expect(stripMarkdown(prose)).toBe(prose);
  });

  it("never loses characters that were not markers", () => {
    const input = "**Bold** then `code` then plain.";
    expect(stripMarkdown(input)).toBe("Bold then code then plain.");
  });
});
