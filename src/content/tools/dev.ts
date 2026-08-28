import type { ToolContent } from "@/lib/tools/types";

/** SEO prose for the Developer tools. Server-only. */
export const DEV_CONTENT: Record<string, ToolContent> = {
  "base64-encode": {
    intro: `Base64 turns arbitrary bytes into sixty-four printable characters, so that data which is not text can travel through channels that only carry text. Email attachments, data URIs, JWT segments, basic authentication headers, certificates in PEM form, small images embedded directly in CSS — all of them are Base64 underneath.

It is an encoding, not encryption. Anyone can decode it in a second, and this tool has a button for exactly that. Base64 makes data transportable; it makes it no more private than it was.

Two options here matter in practice. The URL-safe alphabet replaces the plus and forward slash with hyphen and underscore, which is what you need when the encoded value goes into a URL path, a query string or a filename — the standard alphabet would otherwise need percent-encoding on top and produce something unreadable. The padding switch removes the trailing equals signs, which several specifications including JWT require you to omit.

Encoding runs through a proper UTF-8 encoder rather than the browser's raw btoa, which throws an exception on the first character above U+00FF. That means accented letters, emoji, Japanese and every other script encode correctly here, where a naive implementation would fail outright.

One thing Base64 is not is a way to hide anything. It is a transport encoding, reversible by anyone with a decoder and no key at all, so an API key that has merely been Base64-encoded is an API key written in public. If what you want is secrecy rather than safe transport, encrypt it and encode the ciphertext.`,
    steps: [
      "Paste or type the text you want to encode into the input box.",
      "Turn on the URL-safe alphabet if the result will go into a URL, a query string or a filename.",
      "Turn off padding if the specification you are working to requires the equals signs removed — JWT does.",
      "Copy the Base64 result, or download it as a text file.",
    ],
    faq: [
      {
        q: "Does Base64 encrypt or protect my data?",
        a: "No. It is a reversible encoding with no key, and decoding is instant for anyone who has the string. Never use it to hide a secret — use it to move bytes through a text-only channel.",
      },
      {
        q: "Why is my encoded text about a third larger?",
        a: "Base64 represents every three bytes as four characters, which is a 33 per cent increase by design, plus up to two characters of padding. The figures above the result show the exact overhead for your input.",
      },
      {
        q: "What is the URL-safe alphabet for?",
        a: "Standard Base64 uses + and /, which have meaning inside URLs and filenames. The URL-safe variant substitutes - and _ so the value can be dropped into a path or query string unchanged.",
      },
      {
        q: "Can it encode emoji and non-English text?",
        a: "Yes. The text is encoded as UTF-8 first, so any Unicode character works. This is a real difference from tools built on the browser's btoa function, which fails on anything above U+00FF.",
      },
      {
        q: "Is my text uploaded?",
        a: "No. Encoding happens in your browser, so pasting a token or a credential here does not transmit it anywhere.",
      },
    ],
  },

  "base64-decode": {
    intro: `Decoding Base64 is how you find out what is actually inside a token, a data URI, a config value or a header that someone has encoded on the way past. The string is readable to any machine; this makes it readable to you.

The decoder is deliberately forgiving about the things that break stricter implementations. Whitespace and line breaks are stripped, because Base64 found in email headers and PEM files is wrapped at 76 characters. Missing padding is restored, because plenty of producers omit it. The URL-safe alphabet is accepted by default, so a value lifted straight out of a URL or a JWT decodes without you having to convert it first.

What it will not do is pretend. If the length of the input makes decoding impossible, or the string contains characters outside the alphabet, you get an explanation rather than mangled output. And when the decoded bytes are not text at all — an image, a compressed blob — the result shows replacement characters and the tool says so, rather than leaving you to wonder why the output looks like noise.

Everything happens locally, which matters here more than most places: the strings people decode are usually tokens.`,
    steps: [
      "Paste the Base64 string into the input box — line breaks and missing padding are fine.",
      "Leave “Accept URL-safe input” on unless a literal hyphen or underscore matters to you.",
      "Read the decoded text below.",
      "If the result is full of replacement characters, the original data was binary rather than text.",
    ],
    faq: [
      {
        q: "The result is unreadable symbols. What went wrong?",
        a: "Nothing, probably. The original data was not text — an image, a compressed archive or a binary protocol message. Base64 carries any bytes, but only text can be displayed as text.",
      },
      {
        q: "My string has no equals signs at the end. Will it still decode?",
        a: "Yes. Padding is restored automatically. Only a length that could never be valid Base64 is rejected, and the tool says so explicitly.",
      },
      {
        q: "Can I decode a JWT here?",
        a: "You can decode a single segment, but the JWT decoder is the better tool — it splits the token, decodes the header and payload together and shows the expiry as a readable date.",
      },
      {
        q: "Is it safe to decode a token on this page?",
        a: "Yes. The decoding runs in your browser and the token is never transmitted. Bear in mind that a token pasted anywhere is a token you should treat as exposed if the device itself is not yours.",
      },
    ],
  },

  "url-encode": {
    intro: `A URL has a grammar, and characters like the ampersand, question mark, slash and space all mean something inside it. Percent-encoding replaces a character with a percent sign and its hexadecimal byte value, so a value can carry those characters without the URL falling apart.

The three modes here correspond to three different jobs, and picking the wrong one is the usual cause of a broken link. Component mode encodes everything that is not unreserved — use it for a single query parameter value, a path segment or a fragment. Full URI mode leaves the structural characters intact, so a whole address stays a working address while its spaces get encoded; use it when you are cleaning up a complete URL. Form mode is component mode with spaces written as plus signs, which is what an HTML form submits and what many older server frameworks expect.

The distinction matters most with the ampersand. In component mode it becomes %26, so a value containing "Tom & Jerry" stays one parameter. In full URI mode it stays an ampersand, because at that level it is a separator between parameters. Encode a full URL with the wrong mode and you either break the address or silently split one parameter into two.

Encoding is done in your browser, using the same functions the browser itself uses.`,
    steps: [
      "Paste the text or URL you want to encode into the input box.",
      "Choose the mode: component for a single value, full URI for a whole address, form for form-style data.",
      "Copy the encoded result.",
      "Use the URL decoder to check it round-trips back to what you started with.",
    ],
    faq: [
      {
        q: "Which mode should I use?",
        a: "Component mode for a single parameter value or path segment — it is the safe default. Full URI mode only when you are encoding an entire address and want its structure preserved.",
      },
      {
        q: "Why is a space sometimes %20 and sometimes a plus?",
        a: "Both are correct in different places. %20 is correct anywhere in a URL; the plus sign means a space only inside form-encoded data. Use form mode when submitting to something that expects a form body.",
      },
      {
        q: "Do I need to encode non-English characters?",
        a: "Yes, if the URL is going anywhere it might be processed by older software. They are encoded as their UTF-8 bytes, which is why a single accented letter becomes two percent-escapes.",
      },
      {
        q: "Can I encode a whole URL in component mode?",
        a: "You can, but the result will not be a working URL — every slash, colon and ampersand becomes an escape. That is only what you want when the URL is itself the value of a parameter, such as a redirect target.",
      },
    ],
  },

  "jwt-decoder": {
    intro: `A JSON Web Token is three Base64URL segments joined by dots: a header saying how it was signed, a payload of claims, and a signature. The first two are not encrypted — they are encoded, and anyone holding the token can read them. This decoder does exactly that, and shows the result as formatted JSON.

Most of the time you are here to answer one of three questions. What is in this token? Has it expired? Which algorithm signed it? The tool answers all three: the header and payload are printed side by side, the standard time claims are converted from Unix seconds to readable dates, and the expiry is compared with the current time so the status reads as expired or not expired at a glance.

What it deliberately does not do is verify the signature. Verification requires the issuer's secret or public key, and a page that asks you to paste a signing secret into it is a page you should not use. The signature is shown for completeness with a note saying it has not been checked. A decoded token proves nothing about authenticity — only a verified one does, and that verification belongs on your server.

The token never leaves your browser. Since tokens are credentials, that is not a nice-to-have.`,
    steps: [
      "Paste the token into the input box — a leading “Bearer ” is stripped automatically.",
      "Read the decoded header and payload below.",
      "Check the times section for when the token was issued and when it expires.",
      "Read the status figure to see whether it has already expired.",
    ],
    faq: [
      {
        q: "Does this verify the signature?",
        a: "No, and deliberately so. Verifying requires the signing key, and you should never paste a signing secret into a web page. Decoding tells you what a token claims; only verification on your own server tells you whether to believe it.",
      },
      {
        q: "Is it safe to paste a real token here?",
        a: "The decoding happens entirely in your browser and nothing is transmitted or stored. That said, treat any credential you paste anywhere as one you might want to rotate later.",
      },
      {
        q: "What do exp, iat and nbf mean?",
        a: "Expiry, issued-at and not-valid-before, all as Unix timestamps in seconds. The tool converts each to a readable date so you do not have to.",
      },
      {
        q: "My token has only two segments. Is it broken?",
        a: "Not necessarily — an unsigned token uses the “none” algorithm and has an empty signature. It decodes fine here, but nothing vouches for its contents, and most systems rightly reject it.",
      },
      {
        q: "Can I edit the payload and re-sign it?",
        a: "No. Signing requires the secret, which this page never asks for and could not use safely if it did.",
      },
    ],
  },

  "regex-tester": {
    intro: `Regular expressions are written by iteration: try a pattern, look at what it caught, adjust. Doing that inside a program means a run cycle for every attempt. Doing it here means seeing every match update as you type.

The tester runs your pattern against your sample text using the browser's own regular expression engine, which is the same engine your JavaScript will use — so what matches here matches in your code. It shows every match one per line, or every match with its capture groups and their positions, or the text as it would look after a replacement, with backreferences like the first captured group written as a dollar sign and a number.

Flags are yours to set. Global finds every match rather than the first, case-insensitive is self-explanatory, multiline changes what the start and end anchors mean, and dot-all lets the dot match a newline. The tool forces the global flag internally when listing matches, so you get the full list even if you left it off.

An invalid pattern is reported with the engine's own explanation rather than silently producing nothing, which is the difference between debugging a pattern and staring at it.

Worth remembering: this runs on JavaScript's own regular-expression engine, so it tells you what your JavaScript will do. Most of what you write here will behave identically in Python, Ruby or Go, but lookbehind support, named-group syntax and the treatment of Unicode properties differ enough between engines that a pattern proven here is proven for the browser first.`,
    steps: [
      "Paste the text you want to search into the input box.",
      "Type your pattern into the Pattern field in the options — do not include the surrounding slashes.",
      "Set your flags: g for every match, i for case-insensitive, m for multiline, s for dot-matches-newline.",
      "Switch the output between plain matches, matches with capture groups, and the replaced result.",
      "For a replacement, type it in the Replace field using $1, $2 for captured groups.",
    ],
    faq: [
      {
        q: "Which regex flavour is this?",
        a: "JavaScript, using the browser's built-in engine. Most patterns transfer to other languages, but lookbehind, named groups and Unicode property escapes vary — check the target language if the pattern is going somewhere else.",
      },
      {
        q: "Should I include the slashes around my pattern?",
        a: "No. Type the pattern only and put the flags in the flags field. A leading slash would be matched as a literal slash character.",
      },
      {
        q: "Why do I only get one match?",
        a: "For the replacement output, a missing g flag replaces only the first occurrence. Match listing forces the global flag internally, so it always shows every match.",
      },
      {
        q: "How do I use a captured group in the replacement?",
        a: "Write $1 for the first group, $2 for the second, and so on. $& inserts the whole match, and $$ inserts a literal dollar sign.",
      },
      {
        q: "My pattern is very slow or the page freezes.",
        a: "That is catastrophic backtracking — usually nested quantifiers such as a repeated group that is itself repeated. Simplify the pattern or make the inner quantifier lazy.",
      },
    ],
  },

  "uuid-generator": {
    intro: `A UUID is 128 bits formatted as thirty-two hexadecimal digits in five hyphenated groups, and its point is that you can generate one anywhere, at any time, without coordinating with anything, and be confident it has never been generated before.

Version 4 is almost entirely random and is the right default for most uses. Version 7 is more interesting if the identifier is going into a database. It puts the creation time in the leading 48 bits, so v7 identifiers sort chronologically as plain strings — which means that as a primary key they append to the end of an index rather than scattering writes across it, the way random v4 keys do. On a busy table that difference is measurable.

The generator here produces v7 correctly, which not all of them do. Identifiers created within the same millisecond share a timestamp, so a monotonic counter occupies the twelve bits after the version nibble. Without it, a batch generated in one tick would be ordered only by its random tail, and the single property v7 exists to provide would be quietly missing.

All randomness comes from your browser's cryptographic random source, not from a general-purpose pseudo-random function. Nothing is generated on a server, so no identifier you take from this page has ever existed anywhere else.`,
    steps: [
      "Choose the version: v4 for general use, v7 if the identifier is going into a database as a key.",
      "Set how many you need — up to a thousand at a time.",
      "Adjust the formatting: uppercase, braces, or hyphens removed.",
      "Copy the list, or download it as a text file.",
    ],
    faq: [
      {
        q: "Should I use v4 or v7?",
        a: "v4 for anything where the identifier is just an identifier. v7 when it becomes a database primary key and you care about index locality, or when sorting by id should mean sorting by creation time.",
      },
      {
        q: "Can two UUIDs collide?",
        a: "In practice, no. A v4 UUID has 122 random bits; you would need to generate billions per second for decades before a collision became likely. The real risk is a weak random source, which is why this uses the browser's cryptographic one.",
      },
      {
        q: "Does v7 leak information?",
        a: "Yes, by design — the creation time is embedded and readable by anyone holding the identifier. That is fine for a database key and wrong for anything that should not reveal when it was made. Use v4 there.",
      },
      {
        q: "Are these generated on your server?",
        a: "There is no server involved. They are generated in your browser and never transmitted, so nobody else has ever seen the values you take from this page.",
      },
      {
        q: "What is the nil UUID for?",
        a: "It is all zeroes and serves as an explicit “no identifier” placeholder, in the same spirit as a null — useful when a field requires a UUID but the value is genuinely absent.",
      },
    ],
  },
};
