/**
 * The four pages a public site is expected to have.
 *
 * Kept as data in one module rather than as prose in four route files, for the
 * same reason the library project does it: a privacy notice that quietly stops
 * matching the software is worse than none at all. `__tests__/legal.test.ts`
 * reads these strings and checks the claims against what the code actually
 * does, so a change that breaks a promise breaks a test.
 *
 * ------------------------------------------------------------------------
 * NOT LEGAL ADVICE, AND NOT REVIEWED BY A LAWYER.
 *
 * Everything below is an accurate description of what this software does. That
 * makes it honest, which is the hard part and the part that matters most here —
 * a site whose entire claim is "your files never leave your device" cannot
 * afford a privacy notice copied from a template. It does not make it
 * sufficient under the DPDP Act 2023, the GDPR, or anything else. Have it read
 * by somebody qualified before treating it as a legal position.
 * ------------------------------------------------------------------------
 */

export interface LegalSection {
  heading: string;
  /** Plain paragraphs. */
  paragraphs?: string[];
  /** A list, when the content is genuinely a list and not prose pretending. */
  bullets?: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  /** One sentence under the title, saying who the page is for. */
  standfirst: string;
  /** Used as the meta description. */
  summary: string;
  sections: LegalSection[];
}

/** The date these were last rewritten. Shown on the page, so it must be real. */
export const LEGAL_UPDATED = "28 August 2026";

export function privacyNotice(contactEmail: string): LegalDocument {
  return {
    slug: "privacy",
    title: "Privacy notice",
    standfirst: "What this site does with your information, which is very close to nothing.",
    summary:
      "MSRX Tools processes your files inside your own browser. No accounts, no uploads, no cookies, no analytics. The one exception is the AI assistant, and it is described here in full.",
    sections: [
      {
        heading: "The short version",
        paragraphs: [
          "Every tool on this site runs inside the browser tab you have open. Your files are read by JavaScript running on your own device, processed there, and handed back to you there. They are never uploaded, so there is no copy of them anywhere for us to keep, lose or be compelled to hand over.",
          "There are no accounts, so we do not know who you are. There are no cookies and no analytics, so we do not know what you did. There is one exception — the AI assistant — and it is described in full below rather than buried.",
        ],
      },
      {
        heading: "What we do not collect",
        bullets: [
          "No account, name, email address or password — there is nothing to sign up for.",
          "No cookies. This site sets none of its own, and there is no consent banner because there is nothing to consent to.",
          "No analytics, no tracking pixels, no advertising network, no fingerprinting.",
          "No use of your browser's local storage or session storage.",
          "No third-party requests. Fonts are served from this site, not from a font network; the PDF engine's assets are served from this site too. Loading a page here contacts nobody else.",
        ],
      },
      {
        heading: "Your files",
        paragraphs: [
          "When you drop a file onto a tool, the browser reads it into memory on your device. The work happens there: PDFs are rearranged by a library running in the tab, images are drawn on a canvas by the browser itself, text is parsed in JavaScript. The result is written back to memory and offered to you as a download.",
          "At no point does the file travel over the network. You can prove this to yourself: open your browser's developer tools, switch to the Network tab, and run any tool. You will see no upload. You can also disconnect from the internet entirely after the page has loaded — the tools keep working.",
          "Closing the tab discards everything. Nothing is written to disk except the files you choose to download.",
        ],
      },
      {
        heading: "The AI assistant — the one exception",
        paragraphs: [
          "Each tool page has an assistant that answers questions about that tool. It is the only part of this site that uses a server, and the only thing that leaves your device.",
          "When you ask it something, two pieces of information are sent to our server and on to Groq, the AI provider that generates the answer: the question you typed, and the name of the tool you are on. That is the entire payload.",
          "What is not sent: your files, the contents of the tool's input box, the results it produced, or anything identifying you. The assistant genuinely cannot see them — they are never included in the request, so there is nothing for it to read.",
          "Groq processes the question to produce the answer and applies its own retention policy to it, which is outside our control. Treat anything you type into the assistant as you would treat a question typed into any AI chat: do not paste confidential text into it. The tools themselves have no such caveat, because they send nothing.",
        ],
      },
      {
        heading: "Server logs",
        paragraphs: [
          "This site is hosted on Vercel. Like any web host, Vercel records standard request information — the page requested, the time, your IP address and your browser's user agent — for the pages it serves and for the assistant endpoint. We do not add to those logs, query them, or connect them to anything else.",
          "The assistant endpoint limits how many questions one visitor can ask in an hour. To do that it holds your IP address in memory for the length of that window. It is not written to a database and does not survive the server restarting.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Rights over personal data — access, correction, erasure, portability — apply to data an organisation holds about you. We hold none. There is no account to close, no profile to export and no records to delete, because none were ever created.",
          `If you believe that is wrong, or you want to ask about anything on this page, write to ${contactEmail}.`,
        ],
      },
      {
        heading: "Children",
        paragraphs: [
          "This site is not directed at children specifically, but it collects nothing from anyone, so a child using it is in exactly the same position as an adult: nothing about them is gathered, stored or shared. The assistant is the only feature that transmits anything, and it transmits only the question typed into it.",
        ],
      },
      {
        heading: "Changes",
        paragraphs: [
          "If this notice changes, the date at the top of the page changes with it. The claims here are checked against the code by an automated test, so if the software stops behaving as described, that test fails before the change can ship.",
        ],
      },
    ],
  };
}

export function termsOfUse(contactEmail: string): LegalDocument {
  return {
    slug: "terms",
    title: "Terms of use",
    standfirst: "The tools are free and offered as they are. Here is what that means.",
    summary:
      "MSRX Tools is free to use with no account and no limits, offered without warranty. Your files remain yours and are never uploaded.",
    sections: [
      {
        heading: "Using the tools",
        paragraphs: [
          "Everything here is free, for personal and commercial use alike. There is no account, no quota, no watermark and no paid tier holding a feature back. You do not need permission to use the output of these tools in your work.",
          "Because the processing happens on your own device, you are not sending us anything, and we are not doing anything on your behalf. In a real sense you are running software we wrote, on your own computer, in your browser.",
        ],
      },
      {
        heading: "Your files stay yours",
        paragraphs: [
          "We claim no rights over anything you put into these tools or take out of them. We could not, in any case: the files never reach us.",
          "You are responsible for having the right to process the files you use here — for example, that you are permitted to remove a watermark, edit a document or redact a record.",
        ],
      },
      {
        heading: "No warranty",
        paragraphs: [
          "The tools are provided as they are, without any warranty. Software has bugs, browsers differ, and file formats are full of edge cases. A tool may produce a result you did not expect, or fail on a file that another tool handles.",
          "Keep your originals. Several tools say this in the result panel because it genuinely matters: rasterising a PDF, redacting a document and stripping image metadata are all irreversible, and the tool cannot give you back what it removed.",
          "To the fullest extent the law allows, we are not liable for any loss arising from using these tools, including loss of data. If a result matters, check it before relying on it.",
        ],
      },
      {
        heading: "The assistant can be wrong",
        paragraphs: [
          "Answers from the AI assistant are generated by a language model and may be incorrect. It is briefed on what each tool does, but it is not reading your files and it cannot inspect your results. Do not rely on it for legal, security or safety judgements.",
          "The tools themselves are not guessing. They run deterministic code, and where a tool makes an approximation — detecting headings by font size, matching a background colour by tolerance — it says so in the result.",
        ],
      },
      {
        heading: "Fair use of the assistant",
        paragraphs: [
          "The assistant runs on a paid API and is limited to a modest number of questions per visitor per hour. Automated or bulk use of that endpoint is not permitted and will be blocked. Everything else on the site has no limits at all, because it costs nothing to run.",
        ],
      },
      {
        heading: "Availability",
        paragraphs: [
          "There is no guarantee this site stays available, and no notice period if it does not. Tools that have already loaded keep working offline, which is some protection against that.",
        ],
      },
      {
        heading: "Open source components",
        paragraphs: [
          "These tools are built on other people's work, running in your browser: pdf-lib and pdf.js for documents, qpdf for PDF encryption, LAME for MP3, fflate for archives. Their licences and versions are listed in docs/licences.md in the source repository.",
          "One of them is copyleft and is worth naming here rather than in a file nobody opens. MP3 encoding uses LAME under the LGPL-3.0, unmodified and loaded as a whole. You are entitled to replace it with your own build of that library; it is imported in one place, and the licence text ships inside the package.",
        ],
      },
      {
        heading: "Questions",
        paragraphs: [`Anything unclear here, write to ${contactEmail}.`],
      },
    ],
  };
}

export function accessibilityStatement(contactEmail: string): LegalDocument {
  return {
    slug: "accessibility",
    title: "Accessibility",
    standfirst: "What has been done, and — more usefully — what has not.",
    summary:
      "How MSRX Tools approaches accessibility, including an honest account of what has not yet been tested.",
    sections: [
      {
        heading: "What has been done",
        bullets: [
          "Every control is reachable and operable with a keyboard, and the focus outline is always visible — it is never removed.",
          "Colour is never the only way information is conveyed, and the brand cyan is never used for small text: it measures 2.4:1 on white and would fail. A darker tone carries the words.",
          "Results announce themselves to screen readers as they appear, rather than changing silently.",
          "Every input has a real label, and every icon-only button has a text alternative.",
          "The interface respects your system's dark mode and your reduced-motion setting; with that setting on, animation is switched off rather than merely shortened.",
          "Text reflows to a narrow window without a horizontal scrollbar, and can be zoomed without the layout breaking.",
        ],
      },
      {
        heading: "What has not been done",
        paragraphs: [
          "This is the part most accessibility statements leave out, so it is worth being direct.",
          "This site has not been formally audited against WCAG 2.2, and no conformance level is claimed. It has not been tested with a screen reader by somebody who uses one daily, which is the only test that really counts.",
          "Some tools ask for numbers where direct manipulation would be easier — the crop and blur tools take coordinates rather than offering a draggable box on the image. That works with a keyboard, which is why it was built that way first, but it asks more of everyone than it should.",
          "File drag-and-drop has a keyboard-accessible alternative in every case, but the drop zone itself is not operable by keyboard.",
        ],
      },
      {
        heading: "If something does not work for you",
        paragraphs: [
          `Please write to ${contactEmail} and say what you were trying to do, what got in the way, and what you were using. A specific report about one tool is far more useful than a general one, and it will be fixed rather than logged.`,
        ],
      },
    ],
  };
}

export function contactPage(contactEmail: string): LegalDocument {
  return {
    slug: "contact",
    title: "Contact",
    standfirst: "One address, read by a person.",
    summary: "How to report a bug, request a tool or ask a question about MSRX Tools.",
    sections: [
      {
        heading: "Email",
        paragraphs: [
          `${contactEmail} — for bug reports, tool requests, accessibility problems and anything about this site.`,
        ],
      },
      {
        heading: "Reporting a problem with a tool",
        paragraphs: [
          "The useful details, in rough order of how much they help:",
        ],
        bullets: [
          "Which tool, and what you were trying to do.",
          "What happened instead, including the exact wording of any message shown.",
          "The kind of file — its format, roughly how big, and whether it came from a phone, a scanner or an export from some other program. Please do not attach the file itself unless you are happy for it to be seen; the tools never send it, and neither should you by habit.",
          "Your browser and operating system. Several tools depend on what the browser itself can decode, so this genuinely changes the answer.",
        ],
      },
      {
        heading: "Asking for your data",
        paragraphs: [
          "There is nothing to ask for. This site has no accounts and stores nothing about you, so there is no record to access, correct, export or delete. The privacy notice explains exactly what does and does not happen, including the one feature that sends anything at all.",
        ],
      },
      {
        heading: "More from MSRX",
        paragraphs: [
          "MSRX Tools is one of a number of things built under the same name. The rest are listed at www.msrx.co.in.",
        ],
      },
    ],
  };
}

/** The contact address published on the site. Configuration, not a literal. */
export const CONTACT_EMAIL = "mrinalsinghraja@gmail.com";

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  privacyNotice(CONTACT_EMAIL),
  termsOfUse(CONTACT_EMAIL),
  accessibilityStatement(CONTACT_EMAIL),
  contactPage(CONTACT_EMAIL),
];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug);
}
