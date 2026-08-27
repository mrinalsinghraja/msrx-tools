import { describe, expect, it } from "vitest";

import { CLAIMS, COMPARISONS, HOME_FAQ, PITCH } from "@/lib/pitch";
import { CONTACT_EMAIL, privacyNotice } from "@/lib/legal";
import { SITE } from "@/lib/site";

/**
 * Marketing copy is the easiest place for a true product to start telling lies.
 * A claim gets rounded up, a caveat gets trimmed for rhythm, and the landing
 * page ends up promising more than the privacy notice allows.
 *
 * These tests hold the pitch to the same standard as the legal pages: every
 * headline claim has to survive comparison with what the software does.
 */

const privacyText = privacyNotice(CONTACT_EMAIL)
  .sections.flatMap((section) => [...(section.paragraphs ?? []), ...(section.bullets ?? [])])
  .join("\n");

const pitchText = [
  ...CLAIMS.flatMap((claim) => [claim.title, claim.body, claim.proof ?? ""]),
  ...COMPARISONS.flatMap((row) => [row.question, row.others, row.here]),
  ...HOME_FAQ.flatMap((entry) => [entry.q, entry.a]),
  ...Object.values(PITCH),
].join("\n");

describe("the pitch does not overstate", () => {
  it("never claims that absolutely nothing is sent anywhere", () => {
    // The assistant sends the typed question. An unqualified "nothing ever
    // leaves your device" would be false, and falsifiably so.
    const absolutes = [
      /nothing (?:ever )?(?:is )?(?:sent|leaves)[^.]*\./gi,
    ];
    for (const pattern of absolutes) {
      for (const match of pitchText.match(pattern) ?? []) {
        // Any such sentence must be scoped to files or to the tools, not to the
        // whole site.
        expect(match.toLowerCase()).toMatch(/file|tool|upload/);
      }
    }
  });

  it("discloses the assistant exception somewhere in the pitch", () => {
    expect(pitchText).toMatch(/assistant/i);
    expect(pitchText).toMatch(/question you type|question you typed/i);
  });

  it("says the assistant cannot see files or tool input", () => {
    const assistantFaq = HOME_FAQ.find((entry) => /sent to a server/i.test(entry.q));
    expect(assistantFaq).toBeDefined();
    expect(assistantFaq!.a).toMatch(/files.*not sent|not sent.*files|cannot see/i);
  });

  it("makes the same free/no-account claims the privacy notice supports", () => {
    expect(pitchText).toMatch(/no account/i);
    expect(privacyText).toMatch(/no account/i);
    expect(pitchText).toMatch(/no cookies|cookie banner/i);
    expect(privacyText).toMatch(/no cookies/i);
  });

  it("admits the host keeps request logs rather than implying total invisibility", () => {
    const logsFaq = HOME_FAQ.find((entry) => /logs/i.test(entry.q));
    expect(logsFaq).toBeDefined();
    expect(logsFaq!.a).toMatch(/IP address/);
  });

  it("does not promise a file size limit the browser cannot honour", () => {
    const sizeFaq = HOME_FAQ.find((entry) => /size limit/i.test(entry.q));
    expect(sizeFaq!.a).toMatch(/device's memory|memory/i);
    expect(sizeFaq!.a).not.toMatch(/unlimited/i);
  });

  it("explains why it is free instead of just insisting there is no catch", () => {
    const freeFaq = HOME_FAQ.find((entry) => /free/i.test(entry.q));
    expect(freeFaq!.a).toMatch(/costs|servers|storage|bandwidth/i);
  });
});

describe("the claims are checkable", () => {
  it("gives a sceptic a way to verify the no-upload claim", () => {
    expect(pitchText).toMatch(/Network tab/);
    expect(pitchText).toMatch(/disconnect|internet off|network is not involved/i);
  });

  it("gives every headline claim a proof line", () => {
    for (const claim of CLAIMS) {
      expect(claim.proof, claim.title).toBeTruthy();
      expect(claim.proof!.length, claim.title).toBeGreaterThan(20);
    }
  });

  it("keeps the comparison honest about the alternative rather than strawmanning", () => {
    // Every row must describe the other approach as a real trade-off, not as
    // villainy — "they upload and delete later" is fair; "they steal" is not.
    const others = COMPARISONS.map((row) => row.others).join(" ").toLowerCase();
    for (const word of ["steal", "spy", "sell your", "scam", "malicious"]) {
      expect(others).not.toContain(word);
    }
  });
});

describe("copy hygiene", () => {
  it("has a headline, a subhead and a one-liner", () => {
    expect(PITCH.headline.length).toBeGreaterThan(20);
    expect(PITCH.subhead.length).toBeGreaterThan(40);
    expect(PITCH.oneLiner.length).toBeGreaterThan(40);
  });

  it("keeps the one-liner short enough for a directory listing", () => {
    expect(PITCH.oneLiner.length).toBeLessThanOrEqual(160);
  });

  it("keeps the site description within what search results show", () => {
    expect(SITE.description.length).toBeGreaterThan(70);
    expect(SITE.description.length).toBeLessThanOrEqual(320);
  });

  it("gives each FAQ answer enough substance to be worth reading", () => {
    for (const entry of HOME_FAQ) {
      expect(entry.a.length, entry.q).toBeGreaterThan(120);
    }
  });

  it("has no duplicate FAQ questions", () => {
    const questions = HOME_FAQ.map((entry) => entry.q);
    expect(new Set(questions).size).toBe(questions.length);
  });
});
