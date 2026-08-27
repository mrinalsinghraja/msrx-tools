/**
 * The marketing claims, in one place, as data.
 *
 * Every sentence here is checked against the code by `__tests__/pitch.test.ts`
 * and against the privacy notice, because a landing page that promises more
 * than the software delivers is the fastest way to lose the one thing this site
 * is selling. "Nothing leaves your device" has to survive a sceptic opening
 * their Network tab — so the claims stay narrow enough to be literally true,
 * and the assistant exception is stated rather than hidden.
 */

export interface Claim {
  /** lucide icon name. */
  icon: string;
  title: string;
  body: string;
  /** The reason a sceptic should believe it, not just the assertion. */
  proof?: string;
}

export const CLAIMS: Claim[] = [
  {
    icon: "IndianRupee",
    title: "Free, with nothing behind it",
    body: "Every tool, every feature, no limits. No trial that expires, no watermark on the output, no “upgrade to remove”, no card ever asked for.",
    proof: "There is no paid tier to upgrade to, so there is nothing to hold back.",
  },
  {
    icon: "UserX",
    title: "No login, no account",
    body: "No sign-up, no email address, no password, no cookie banner. Open a tool and use it.",
    proof: "Works in a private or incognito window exactly as well as a normal one.",
  },
  {
    icon: "CloudOff",
    title: "Your files never leave your device",
    body: "Files are read and processed by your own browser. They are never uploaded, so there is no server copy to leak, subpoena or forget to delete.",
    proof: "Open your browser's Network tab and run any tool. You will see no upload.",
  },
  {
    icon: "WifiOff",
    title: "Works with the internet off",
    body: "Once a tool page has loaded, pull the plug and it keeps working — which is only possible because the processing was never happening elsewhere.",
    proof: "The strongest proof there is: code that needed a server could not do this.",
  },
];

/** The comparison that makes the difference concrete. */
export interface Comparison {
  question: string;
  others: string;
  here: string;
}

export const COMPARISONS: Comparison[] = [
  {
    question: "Where does your file go?",
    others: "Uploaded to a server, processed there, deleted later — you are trusting a promise.",
    here: "Nowhere. It is read by the browser tab you already have open.",
  },
  {
    question: "What does it cost?",
    others: "Free for two files a day, then a subscription.",
    here: "Nothing, for everything, always.",
  },
  {
    question: "Do you need an account?",
    others: "Free tier by email, most features behind a login.",
    here: "No account exists to make.",
  },
  {
    question: "What happens on a bad connection?",
    others: "Upload, wait, download. A dropped connection means starting again.",
    here: "The page loads once. After that the network is not involved.",
  },
  {
    question: "What is being collected?",
    others: "Analytics, advertising identifiers, and the files themselves for a while.",
    here: "No cookies, no analytics, no accounts. Nothing to collect.",
  },
];

/** Home-page FAQ. Also emitted as FAQPage structured data. */
export const HOME_FAQ = [
  {
    q: "Is it really free? What is the catch?",
    a: "It is free and there is no catch, but the honest answer is worth giving: this site is cheap to run precisely because it does not process your files. There are no servers doing the work, no storage bill and no bandwidth cost for uploads, because none of that happens. A tool site that processes files on its servers has real costs and has to recover them somehow — usually a subscription, sometimes your data. This one does not have those costs.",
  },
  {
    q: "How can I check that my files are not being uploaded?",
    a: "Open your browser's developer tools, go to the Network tab, and run any tool. You will see the page load and then nothing further. A stronger test: load a tool page, disconnect from the internet completely, and use it. It will work. Software that was quietly uploading your file could not.",
  },
  {
    q: "Does it work in incognito or private browsing?",
    a: "Yes, identically. There is no account to sign into and the site stores nothing in your browser — no cookies, no local storage — so a private window behaves exactly like a normal one. Nothing is remembered between visits in either case.",
  },
  {
    q: "Is anything at all sent to a server?",
    a: "One thing, and only if you use it: the AI assistant on each tool page. When you ask it a question, the question you typed and the name of the tool are sent to be answered. Your files, and whatever you put into the tool, are not sent and the assistant cannot see them. Every other feature on the site sends nothing at all.",
  },
  {
    q: "Is there a file size limit?",
    a: "No imposed limit. The practical limit is your device's memory, since the work happens there — a laptop handles a few hundred megabytes comfortably, a phone rather less. The tools warn you when a file is large enough to be worth thinking about rather than failing silently.",
  },
  {
    q: "Can I use the results commercially?",
    a: "Yes. The output is yours, with no attribution required and no licence to read. We claim no rights over anything you put in or take out — we could not, since the files never reach us.",
  },
  {
    q: "Do you keep logs?",
    a: "The host records standard web-server request logs, as every web host does: which page was requested, when, and from which IP address. We add nothing to them and do not analyse them. The privacy notice sets out exactly what does and does not happen.",
  },
];

/**
 * Short lines for social previews and directory listings. Kept here so the
 * wording stays consistent everywhere it is repeated.
 */
export const PITCH = {
  headline: "Every file tool you need. None of them upload your files.",
  subhead:
    "Free forever, no account, works offline. PDFs, images, text and data — all processed inside your own browser.",
  oneLiner: "A hundred-plus free file tools that run in your browser. Nothing uploads, nothing is stored, no login.",
} as const;
