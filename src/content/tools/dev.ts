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

  "cidr-calculator": {
    intro: `A CIDR block such as 10.0.0.0/16 is a compact way of saying "these addresses". The number after the slash counts how many leading bits are fixed; everything after them varies. Working out what that means in practice — the first usable address, the broadcast address, how many machines fit — is arithmetic nobody enjoys doing in their head at the moment they need it.

This calculator does it for IPv4 and IPv6. Give it a block and it reports the network address, the netmask, the wildcard mask that access lists want, the broadcast address, the first and last usable host, and the total and usable counts. It also names the scope: whether the block is private under RFC 1918, loopback, link-local, carrier-grade NAT or genuinely public. That last line catches a surprising number of misunderstandings before they become firewall rules.

Two boundary cases are handled properly rather than glossed over. A /31 has no network or broadcast address at all: RFC 3021 makes both addresses usable, because a point-to-point link between two routers has no need to reserve either. A /32 is a single host. Most calculators subtract two regardless and quietly report a /31 as having zero usable addresses, which is wrong and confusing in exactly the situation where you are checking.

The subnet split does the planning half. Give it a target prefix and it lists the resulting subnets with their ranges and host counts, so dividing a /16 into /24s becomes a table rather than an exercise. It refuses if you ask for a prefix larger than the block you started with, since that is not a division.

IPv6 is described rather than split, because a /64 contains more addresses than there are grains of sand on Earth and enumerating them would help nobody. Addresses are printed collapsed in the canonical RFC 5952 form.`,
    steps: [
      "Type a block such as 192.168.1.0/24, or a bare address to treat it as a single host.",
      "Read the network, broadcast and usable host range. The scope line tells you whether the block is private, public or reserved.",
      "To divide the block, set the target prefix — 24 to split a /16 into /24s — and the tool lists the subnets.",
      "Raise the row limit if the split produces more subnets than are shown, or switch on the binary view to see where the mask actually falls.",
    ],
    faq: [
      {
        q: "Why does a /24 have 254 usable hosts rather than 256?",
        a: "The first address identifies the network itself and the last is the broadcast address, so neither can be assigned to a machine. That subtraction applies to every block from /30 upwards.",
      },
      {
        q: "Why does a /31 show two usable hosts?",
        a: "Because RFC 3021 defines it that way for point-to-point links. With exactly two addresses there is nothing to broadcast to, so both are usable. Tools that report zero are applying the general rule where a specific exception exists.",
      },
      {
        q: "Which private ranges are there?",
        a: "10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 under RFC 1918, plus 100.64.0.0/10 for carrier-grade NAT and 169.254.0.0/16 for link-local. The tool names whichever your block falls in.",
      },
      {
        q: "Why will it not split an IPv6 block?",
        a: "Because the numbers stop being useful. A single /64 holds 18 quintillion addresses, and listing subnets of it would produce a table nobody could read. For IPv6, the convention is a /64 per LAN and a /48 or /56 per site, and the tool reports the boundaries rather than enumerating them.",
      },
    ],
  },

  "dns-record-parser": {
    intro: `The output of dig, host and nslookup is designed to be complete rather than readable. Columns run together, the interesting lines are buried among comments and section headers, and each of the three tools formats things differently. This turns that output into a table.

It reads all three formats, plus the bare values that dig +short produces. Records are grouped by type, so every A record sits together and the MX records are not scattered between them, and the whole thing can be re-emitted as JSON or CSV when it needs to go into something else.

The part that saves the most time is the explanation of TXT records. An SPF record ending in "-all" means senders not on the list should be rejected outright; ending in "~all" means treat them as suspicious but deliver anyway; "?all" means the record expresses no opinion at all and is doing nothing for you. Those three characters are the entire policy, they are easy to misread at the end of a long line, and the difference between them is the difference between a domain that can be spoofed and one that cannot. The tool reads the policy and says it in words. It does the same for DMARC, and it names DKIM keys and the various site-verification records for what they are.

Nothing here performs a lookup. That is a deliberate boundary: a page that resolved names for you would need a server, and that server would learn which domains you were investigating. Run the query with your own resolver, where you can see what it returns and choose which one to trust, and paste the answer here to read it.`,
    steps: [
      "Run your query — dig example.com ANY, host example.com, or nslookup example.com.",
      "Paste the whole output here, comment lines and all. Anything that is not a record is skipped.",
      "Read the table. Records are grouped by type by default, and SPF and DMARC records are translated underneath.",
      "Switch the output to JSON or CSV if the records are going into a script or a spreadsheet.",
    ],
    faq: [
      {
        q: "Does this look up DNS records for me?",
        a: "No, and that is on purpose. Resolving would require a server, and that server would see every domain you looked up. Run dig or nslookup yourself and paste what your own resolver returned.",
      },
      {
        q: "Which command output does it understand?",
        a: "dig in full and short form, host, and nslookup. Between them that covers Linux, macOS and Windows. Lines it cannot interpret are skipped rather than guessed at.",
      },
      {
        q: "What does the SPF explanation mean?",
        a: "It reads the qualifier before \"all\" at the end of the record, which is the policy for senders not otherwise listed. A hyphen means reject, a tilde means accept but mark as suspicious, a question mark means no opinion. That single character is what actually determines whether your domain can be spoofed.",
      },
      {
        q: "Why is the TTL column showing a dash?",
        a: "Because the format you pasted does not include it. dig +short and most host output print values without their time-to-live, so there is nothing to show. Use plain dig if you need the TTLs.",
      },
    ],
  },

  "user-agent-parser": {
    intro: `A user-agent string is a sentence a browser tells about itself, and most of that sentence is a historical lie. Nearly every browser claims to be Mozilla; Chrome claims to be Safari; Edge claims to be both and then adds itself at the end. Each of those claims was added to get past a compatibility check written decades ago, and none has ever been removed.

This parser untangles it. Paste a string and it names the browser and version, the rendering engine, the operating system and version, and the device category. It also flags automated clients — search crawlers, AI crawlers, link-preview fetchers, and the command-line tools that make no attempt to pretend.

Order is everything in doing this correctly. Because every Chromium browser also declares itself as Chrome and as Safari, matching Chrome first would identify Edge, Opera, Samsung Internet and Brave all as Chrome. The parser checks the most specific token first and works outwards, which is why Edge is reported as Edge here and as Chrome by a great many parsers that do it the other way round.

The important caveat is on the page itself, not hidden in a footnote. Every part of this string is chosen by the client and none of it is verified. A crawler claiming to be Googlebot may not be Googlebot — confirming that requires a reverse DNS lookup on the connecting address. Browsers are also freezing these strings deliberately: Chrome no longer reports a meaningful minor version and Safari reports a fixed WebKit build, both as anti-fingerprinting measures.

So parse a user-agent to understand traffic you have already received. Do not branch your application on it. Feature detection tells you what the browser can actually do, and the Sec-CH-UA client hints give you the same facts through a channel designed for the purpose.`,
    steps: [
      "Paste the user-agent string, with or without the leading “User-Agent:” header name.",
      "Read the breakdown — browser, engine, operating system, device.",
      "Check the notes underneath, which say what the string can and cannot be trusted to tell you.",
      "Switch to JSON if the result is going into a script or a log-analysis pipeline.",
    ],
    faq: [
      {
        q: "Why does every browser claim to be Mozilla?",
        a: "A compatibility check from the 1990s tested for it before serving modern content. Browsers added the token to pass, and it has never been safe for any of them to remove. The same history explains why Chrome claims Safari and Edge claims both.",
      },
      {
        q: "Can I trust that a request really came from Googlebot?",
        a: "No. Anyone can send that string. Verifying it means a reverse DNS lookup on the connecting IP address followed by a forward lookup on the result — Google documents the procedure, and it is the only reliable check.",
      },
      {
        q: "Why does the version look truncated?",
        a: "Because it is. Chrome freezes the minor version components and reports the major version only, and Safari reports a fixed WebKit build number, both to reduce fingerprinting. There is no more detail available to extract.",
      },
      {
        q: "Should I use this to decide what to serve?",
        a: "No. Feature-detect instead, or read the Sec-CH-UA client hints. Branching on a user-agent breaks silently every time a browser changes its string, and browsers change their strings specifically to break that pattern.",
      },
    ],
  },

  "unicode-inspector": {
    intro: `Two strings look identical on screen and refuse to compare equal. A password that is definitely right is definitely rejected. A filename will not match. A JSON parser fails on a document that looks fine. The cause is almost always a character you cannot see.

This inspector lists every character in a string with its codepoint, its Unicode block, its UTF-8 bytes and how many of them it takes. More importantly, it flags the characters that cause exactly these problems. Zero-width spaces and joiners, which render as nothing at all. Byte-order marks, which arrive invisibly at the start of a file and break the first line of every parser. Non-breaking spaces, which look like spaces and are not. Line and paragraph separators, which are valid Unicode and invalid JavaScript string content.

It also names the look-alikes. Cyrillic small a is a different codepoint from Latin a and renders identically in most fonts. The same is true of Cyrillic e, o, p and c. That resemblance is the mechanism behind a whole family of phishing domains, and it is also how a copied-and-pasted identifier ends up failing a comparison it visibly ought to pass.

Smart quotes and dashes get flagged for a more mundane reason. A document editor silently converts a straight apostrophe into a typographic one and a double hyphen into an em dash, and code copied out of a formatted document then fails to compile with an error that names none of this.

Switch on grapheme grouping to see how the string divides the way a person reads it — a flag emoji is two codepoints, a family emoji can be seven joined by zero-width joiners, and a letter with an accent may be one codepoint or two depending on which normalisation form produced it.`,
    steps: [
      "Paste the string you are suspicious of. A short fragment is easier to read than a whole file.",
      "Read the table: each character with its codepoint, block and UTF-8 bytes.",
      "Switch on “only show flagged characters” to jump straight to what is likely to be causing the problem.",
      "Turn on grapheme grouping if the string contains emoji or combining accents and you want to see what counts as one character.",
    ],
    faq: [
      {
        q: "Why do two identical-looking strings not match?",
        a: "Usually an invisible character in one of them, or a look-alike from another script. The other common cause is normalisation: an accented letter can be stored as one codepoint or as a letter plus a combining mark, and the two are different strings that render identically.",
      },
      {
        q: "What is a zero-width space doing in my text?",
        a: "It was probably inserted by a website as a soft line-break hint, or came in with text copied from a PDF. They are common in text pasted from web pages and completely invisible until something compares strings.",
      },
      {
        q: "Why does an emoji count as several characters?",
        a: "Because many are built from several codepoints joined together — a flag is two regional indicators, a family is several people joined by zero-width joiners, and a skin tone is a modifier applied to a base emoji. Grapheme grouping shows them the way a reader sees them.",
      },
      {
        q: "Does the tool name every character?",
        a: "It names the block every character belongs to, and gives a specific warning for the ones known to cause trouble. It does not carry the full Unicode name database, which is over a megabyte and would have to be downloaded to tell you something you can look up once a year.",
      },
    ],
  },

  "svg-optimizer": {
    intro: `An SVG exported from a design application carries a great deal that a browser never renders. Editor namespaces recording which layer was selected, a metadata block naming the software, coordinates carried to fourteen decimal places when the artwork is 24 pixels wide. On a single icon that is a few kilobytes of waste; across an icon set inlined into a page, it is real weight on every load.

This strips it. Comments and editor metadata go, coordinates are rounded to a precision you choose, and whitespace between elements is collapsed. Byte counts before and after sit above the result, because the honest answer for an already-clean file is that there was nothing much to take out.

Precision is the setting that matters and the one that can go wrong. Two decimal places is safe for essentially all artwork — a coordinate moving by a hundredth of a pixel is not visible on any display. One decimal place starts to shift things by amounts the eye can catch on curves and hairline strokes. Zero rounds to whole pixels, which can look deliberate on a grid-aligned icon and destroys anything organic. The tool also drops the leading zero from decimals, since a path command reads a value beginning with a full stop identically and it saves a byte every time.

Unused id removal is off by default and careful when switched on. An id referenced by url(#gradient), by an href, or by an animation target is load-bearing: removing it silently breaks the gradient, the clip path or the animation. The tool collects every reference in the document first and only removes ids that nothing points at.

For a full pipeline, SVGO does considerably more — merging paths, converting shapes, cleaning up transforms. This covers the wins that are safe to apply without inspecting the result, in a page you do not have to install.`,
    steps: [
      "Paste the contents of the SVG file, starting at the opening svg tag.",
      "Set the decimal precision. Two is safe for nearly everything; go lower only after checking the result.",
      "Leave comment and metadata removal on. Switch on unused id removal if the file has been through several editors.",
      "Compare the before and after sizes, then check the optimised artwork renders identically before replacing the original.",
    ],
    faq: [
      {
        q: "Will this change how the image looks?",
        a: "Rounding moves coordinates very slightly, so at two decimal places the answer is effectively no. At one or zero, curves and thin strokes can shift visibly. Always view the result at the size it will be used before replacing the original.",
      },
      {
        q: "Is it safe to remove ids?",
        a: "Only unused ones, which is what the option does. Every id referenced by a gradient fill, a clip path, an href or an animation is collected first and kept. Anything nothing points at is dead weight.",
      },
      {
        q: "How much smaller should I expect the file to be?",
        a: "Editor exports commonly drop 30 to 60 per cent, mostly from metadata and excess coordinate precision. A file already through an optimiser will barely move, which the size comparison will tell you immediately.",
      },
      {
        q: "How does this compare to SVGO?",
        a: "SVGO does more: merging paths, converting shapes to paths, collapsing transform chains. This applies the subset that is safe without reviewing every change, and it runs in a browser tab rather than a build step.",
      },
    ],
  },

  "json-schema-generator": {
    intro: `A JSON Schema describes the shape a document must have, so a validator can check payloads automatically instead of a person reading them. Writing one by hand from an existing API response is tedious and error-prone; this generates a first draft from the response itself.

Paste a sample and it infers types, walks nested objects and arrays, and emits a schema in draft 2020-12 or draft-07. Optionally it detects formats in string values — dates, date-times, email addresses, URLs, UUIDs and IPv4 addresses all get a format annotation, which turns a plain string field into one a validator can actually check.

Arrays get particular care. Real payloads are rarely uniform: one element has a null where the next has a string, one object carries an extra field. Rather than describing only the first element, the generator merges the schemas of all of them, widening a type into a union where they disagree. It also narrows the required list to the keys present in every element, since a key missing from one is by definition not required.

That is the one place where the output needs your judgement rather than your trust, and the page says so under every result. A schema inferred from one sample describes that sample. If a field is nullable but happened to have a value in your example, the schema will say it cannot be null and your validator will start rejecting perfectly legitimate responses. Read the required list and the types before putting this in a pipeline.

By default every object also gets additionalProperties set to false, which is strict on purpose: it fails loudly when an API starts sending something new, rather than silently ignoring it. Relax it if your consumers should tolerate unknown fields.`,
    steps: [
      "Paste a representative JSON payload — ideally a real response rather than a hand-written example.",
      "Choose the draft. 2020-12 is current; draft-07 has the widest support among older validators.",
      "Leave format detection on so dates, emails and UUIDs are annotated rather than left as plain strings.",
      "Read the required list and relax anything that is genuinely optional before you use the schema to validate live traffic.",
    ],
    faq: [
      {
        q: "Which draft should I choose?",
        a: "2020-12 for anything new. Choose draft-07 if your validator library is older, which many still are — it remains the most widely implemented version by some distance.",
      },
      {
        q: "Why is every field marked required?",
        a: "Because a sample proves a key exists and never proves one may be absent. The generator cannot know which fields are optional, so it starts strict and leaves the loosening to you. Switch the option off if that is the wrong default for your payload.",
      },
      {
        q: "How does it handle arrays where the elements differ?",
        a: "It merges every element's schema rather than describing the first one. Where types disagree it produces a union, and it marks a key required only if it appears in every element.",
      },
      {
        q: "Can I generate a schema from several samples at once?",
        a: "Put them in an array and paste that. The merging logic applied to array elements is exactly what you want across examples, and the schema you need is then the one under “items”.",
      },
    ],
  },

  "sql-to-typescript": {
    intro: `Hand-writing a TypeScript interface for a database table is copying, and copying drifts. A column gets added in a migration, the interface does not, and the mismatch surfaces at runtime in whatever code assumed the field was there. This converts CREATE TABLE statements straight into typed row interfaces.

Paste your DDL and it produces one interface per table, named from the singularised table name, with columns mapped to TypeScript types and nullability worked out from the constraints. It reads MySQL, PostgreSQL, SQLite and SQL Server syntax, skips table-level constraints such as PRIMARY KEY and UNIQUE clauses rather than turning them into properties, and carries a column comment through as a doc comment.

Two mapping decisions are deliberate and worth knowing. BIGINT becomes string, not number, because a 64-bit integer does not fit in a JavaScript number and every serious driver returns it as a string to avoid silently losing precision at 2^53. Typing it as number would be a lie the compiler cannot catch, and would fail on exactly the large identifiers where correctness matters most. Second, DATE and TIMESTAMP default to string, which is what most drivers actually hand back — switch to Date only if your ORM parses them for you.

Nullability comes from three signals rather than one. NOT NULL means the column cannot be null. PRIMARY KEY means the same even when the DDL leaves NOT NULL implicit, which many dialects do. A DEFAULT clause means the column always has a value once a row exists. Everything else is treated as nullable, rendered either as an optional property or as a union with null, whichever your codebase prefers.

The output still deserves a read. Columns your application fills in — created_at, updated_at, soft-delete flags — are often typed as always-present when the insert type should treat them as optional.`,
    steps: [
      "Paste your CREATE TABLE statements, including the trailing semicolons that mark where each ends.",
      "Choose the property naming convention — camelCase for most codebases, or exactly as in the database if you query it directly.",
      "Pick how nullable columns should read: an optional property, or a union with null.",
      "Check the generated nullability against how your application actually inserts rows before relying on it.",
    ],
    faq: [
      {
        q: "Why is my BIGINT column typed as string?",
        a: "Because 64-bit integers exceed what a JavaScript number can hold exactly. Drivers return them as strings to avoid silent precision loss above 2^53, so string is the honest type. Change it only if you know your values stay small.",
      },
      {
        q: "Which SQL dialects does it read?",
        a: "MySQL, PostgreSQL, SQLite and SQL Server. Backtick, double-quote and square-bracket identifier quoting are all handled, as are the common type spellings each dialect prefers.",
      },
      {
        q: "How is nullability decided?",
        a: "NOT NULL, PRIMARY KEY and DEFAULT each mark a column as always having a value. Anything without one of those is treated as nullable. That matches how the database behaves, though it may not match how your insert code behaves.",
      },
      {
        q: "It only found some of my columns.",
        a: "Check that each statement ends with a semicolon — that is what marks the end of a table. Table-level constraints such as UNIQUE KEY and FOREIGN KEY clauses are skipped deliberately, since they are not columns.",
      },
    ],
  },

  "graphql-formatter": {
    intro: `GraphQL documents arrive unreadable more often than not. Copied from a network tab as one long line, pasted from a code file with the indentation of wherever it was embedded, or assembled by a client library that had no reason to be tidy. Reindenting by hand is a chore that has to be repeated every time.

This reformats queries, mutations, fragments and schema definitions, either indented for reading or minified onto a single line for sending. The indent width is yours to set, comments can be kept or dropped, and both directions work on the same document.

It formats by structure rather than by parsing into an abstract syntax tree, and that is a considered trade. A real parser would let the tool reorder fields and validate as it went, but it would also refuse anything with a syntax error — and a formatter is most wanted precisely when the document is a mess and you are trying to see what is wrong with it. This one reindents whatever it is given, so a query with an unbalanced brace still comes back readable enough to spot where the brace should have been.

Minifying is worth more here than for most formats. GraphQL queries travel in the request body on every call, and a large query pretty-printed carries a great deal of whitespace that is transmitted every single time. Stripping it is a straightforward saving on a hot path, and it is safe: whitespace outside string values carries no meaning in GraphQL.

String values, block strings delimited by triple quotes, and comments are all recognised and left alone, so a description containing braces will not confuse the indentation.`,
    steps: [
      "Paste the query, mutation, fragment or schema definition.",
      "Choose indented output for reading, or minified for sending over the wire.",
      "Set the indent width if two spaces is not your house style.",
      "Drop comments when minifying for production; keep them when the document is going back into source control.",
    ],
    faq: [
      {
        q: "Does it validate my query?",
        a: "No, and deliberately. Validation needs a schema, and refusing to format a document with an error in it would remove the tool's usefulness at the exact moment you are hunting for that error. It reindents whatever you give it.",
      },
      {
        q: "Is it safe to minify a query?",
        a: "Yes. Outside string values, whitespace in GraphQL is purely separative. The minified document is exactly equivalent and is what a client library should be sending anyway.",
      },
      {
        q: "Will it handle a full schema definition?",
        a: "Yes — type definitions, interfaces, enums, inputs and directives all format the same way, since the tool works from the document's brace structure rather than from what the blocks mean.",
      },
      {
        q: "What happens to descriptions in triple quotes?",
        a: "They are recognised as block strings and passed through untouched, including any braces or hashes inside them, which would otherwise confuse the indentation.",
      },
    ],
  },

  "gitignore-generator": {
    intro: `Every repository needs a .gitignore, and almost nobody writes one from scratch. The usual approach is copying a file from a previous project, which carries rules for frameworks this project does not use and misses rules for the ones it does.

This assembles one from the stacks you actually tick. Node, Next.js, Python, Go, Rust, Java and Gradle, Android, Swift and Xcode, Unity, PHP, Ruby, Terraform, Docker, plus the operating-system droppings and editor directories that follow you between machines. Rules that appear in more than one block are written once, because the same pattern twice is a file a reader has to check for differences that are not there.

The secrets block is on by default, and it is the reason to use this rather than a copied file. Credentials reach public repositories through a small and stable set of filenames — .env and its variants, PEM keys, .p12 and keystore files, service-account JSON, an SSH private key committed by accident, an .npmrc carrying a registry token. Those patterns are collected in one block at the top with the exception for .env.example, which you do want tracked.

There is a limit worth understanding before you rely on any .gitignore, and the page repeats it under the result. Ignoring a file only prevents it from being added. A file already tracked continues to be tracked, and a file already committed stays in the history for good. If a secret has been committed, the fix is not a .gitignore entry: it is rotating the credential, because the old value is in every clone anybody made.

Add project-specific rules below the generated blocks rather than editing inside them, so regenerating the file later does not overwrite your own additions.`,
    steps: [
      "Tick the stacks this repository actually uses. Two or three is usually the honest answer.",
      "Leave the secrets block switched on unless you have a specific reason not to.",
      "Choose whether to keep the section headings — they help whoever reads the file next.",
      "Save the result as .gitignore in the repository root, and add your own rules underneath the generated blocks.",
    ],
    faq: [
      {
        q: "I added a file to .gitignore and Git still tracks it.",
        a: "Ignoring applies only to untracked files. Once something is tracked, Git keeps tracking it. Run git rm --cached on the file to stop, then commit — that removes it going forward while leaving your local copy alone.",
      },
      {
        q: "I committed a secret and then ignored it. Am I safe?",
        a: "No. The value is in the repository history and in every clone and fork made since. Rotate the credential immediately. Rewriting history with git filter-repo or BFG helps, but only after the secret has been changed.",
      },
      {
        q: "Should Cargo.lock or package-lock.json be ignored?",
        a: "Lock files belong in version control for applications, so everyone builds the same dependency tree. For a published library, Cargo.lock is conventionally ignored because consumers resolve their own. The generated file notes this next to the Rust rules.",
      },
      {
        q: "Where should my own rules go?",
        a: "At the bottom, below the generated sections. That way regenerating the file when you add a stack does not overwrite anything you wrote, and a reader can see which rules were considered rather than assumed.",
      },
    ],
  },

  "mock-data-generator": {
    intro: `Seeding a database, filling a design with something other than "Test User", or building a fixture for a test — all of them need rows that look plausible and none of them should use real people's details.

This produces mock rows as JSON, NDJSON, CSV or SQL INSERT statements, with the fields you choose: identifiers, UUIDs, names, email addresses, phone numbers, addresses, cities, postcodes, company names, timestamps, prices and booleans.

Names and addresses come from India by default, with the United States and United Kingdom available. That default is deliberate rather than incidental. Most generators produce American names exclusively, so an Indian team building for Indian users ends up demonstrating their product to stakeholders with a screen full of Johns and Marys from Springfield. Phone numbers follow the right shape for each locale too — an Indian mobile starting with 6 to 9, a UK number starting 07, an American number with a valid area code.

The seed field is the part that matters for testing. Generation is driven by a seeded pseudorandom generator rather than the ordinary random function, so the same seed always produces exactly the same rows. A fixture that changes between runs turns a failing test into a mystery: you cannot tell whether the code broke or the data moved. Give each fixture its own seed and it is reproducible forever, on any machine.

The SQL output quotes and escapes values properly, so a name containing an apostrophe produces valid SQL rather than a syntax error. None of these people exist. The names are drawn from common name lists and combined at random, which is why you may occasionally see a combination that belongs to somebody real — the addresses will not.`,
    steps: [
      "Set how many rows you need and pick the fields to include.",
      "Choose the locale so names, phone numbers and postcodes match where your users are.",
      "Pick the output format — SQL if you are seeding directly, CSV for a spreadsheet, JSON for a fixture.",
      "Set a seed and record it with the fixture. The same seed regenerates the identical rows whenever you need them.",
    ],
    faq: [
      {
        q: "Are these real people's details?",
        a: "No. First names, surnames, street names and cities are drawn from common lists and combined at random, and the numbers are generated. A name may coincide with a real person's, which is unavoidable with common names; the address and phone number attached to it will not be theirs.",
      },
      {
        q: "Why does the seed matter?",
        a: "Because it makes the data reproducible. The same seed always produces the same rows, so a test fixture stays stable between runs and between machines. Without that, a failing test leaves you unable to tell whether the code or the data changed.",
      },
      {
        q: "Can I use this data in production?",
        a: "For seeding a demo or staging environment, yes. Never mix it into a production table holding real records — plausible fake rows are extremely hard to distinguish from real ones once they are in the same table.",
      },
      {
        q: "How many rows can it generate?",
        a: "Up to a thousand at a time. Beyond that a browser tab is the wrong tool; take the SQL output as a template and generate the rest in a script where you can stream it straight into the database.",
      },
    ],
  },

  "unix-timestamp-converter": {
    intro: `A Unix timestamp counts seconds since midnight UTC on 1 January 1970. It is compact, unambiguous and completely unreadable, which is why it appears in logs, databases and API responses and why converting it is a daily task for anyone who works near them.

This converts in both directions. Give it a timestamp and it shows the date and time in UTC, in your local zone, as an ISO-8601 string and as a relative phrase — "four minutes ago", "in three days" — which is usually the fastest way to judge whether a value is what you expected. Give it a date and it returns the timestamp.

Seconds and milliseconds are distinguished automatically. JavaScript works in milliseconds, most other languages and most databases in seconds, and mixing them is the single most common bug in this area: a millisecond value read as seconds lands somewhere around the year 56000, and a seconds value read as milliseconds lands in January 1970. A timestamp of ten digits is seconds and thirteen is milliseconds, and the tool decides on that basis rather than making you specify.

The relative phrase deserves more credit than it gets. Reading 1735689600 tells you nothing at a glance. Reading "seven months ago" tells you immediately whether the record you are looking at is stale, whether the token has expired, and whether the cache entry should still be there. Most of the time that is the actual question.

Timestamps carry no time zone. A Unix timestamp is an instant, identical everywhere on Earth; the zone only appears when you format it for a person. Storing instants and formatting late is the practice that avoids an entire category of bug, and it is why the tool shows UTC and local side by side rather than picking one.`,
    steps: [
      "Paste a timestamp in seconds or milliseconds — the tool works out which from its length.",
      "Read the UTC time, your local time, the ISO-8601 form and how long ago it was.",
      "To go the other way, enter a date and read the timestamp back.",
      "When comparing two systems, compare in UTC. Local time hides an hour's difference twice a year.",
    ],
    faq: [
      {
        q: "How do I tell seconds from milliseconds?",
        a: "By length. A current timestamp in seconds is ten digits; in milliseconds it is thirteen. If a date lands in 1970 you have divided by a thousand too many times, and if it lands tens of thousands of years hence you have not divided at all.",
      },
      {
        q: "What time zone is a timestamp in?",
        a: "None. It is a count of seconds since a fixed instant, identical everywhere. A zone only enters when the value is formatted for display, which is why storing timestamps and formatting late avoids so many bugs.",
      },
      {
        q: "What is the year 2038 problem?",
        a: "A signed 32-bit integer runs out on 19 January 2038, and systems still storing timestamps that way will overflow into 1901. Anything using 64-bit integers, which now includes most things, is fine for longer than the sun has left.",
      },
      {
        q: "Are leap seconds accounted for?",
        a: "No, and correctly so. Unix time deliberately ignores them: every day is treated as exactly 86,400 seconds, and a leap second is absorbed rather than counted. That is what makes the arithmetic simple and consistent everywhere.",
      },
    ],
  },

  "cron-expression-parser": {
    intro: `Cron syntax is five fields of numbers and symbols that describe a schedule, and reading it back is genuinely hard. Nobody looks at */15 9-17 * * 1-5 and immediately thinks "every quarter of an hour during office hours on weekdays" — they work it out, and sometimes they work it out wrong.

This translates the expression into a sentence and then lists the next several times it will actually fire. Both halves matter. The sentence tells you what you wrote; the list of upcoming runs tells you whether that is what you meant, which is a different question and the one that catches mistakes.

The classic error the run list exposes immediately is the day-of-week and day-of-month interaction. When both fields are restricted, cron treats them as an OR rather than an AND: "0 0 1 * 1" runs on the first of the month and on every Monday, not on Mondays that fall on the first. Anyone expecting the intersection is in for a surprise, and it will be a surprise in production. The list of next runs makes it obvious in a second.

Also visible at a glance is the difference between */5 and 5. The first means every five units; the second means at exactly five past. They differ by one character and by a factor of twelve in how often the job runs.

The step syntax is worth knowing properly, since it is where most non-obvious expressions come from. */n means every n units from the start of the range, and a-b/n means every n units within that range only — so 0-30/10 in the minute field fires at zero, ten, twenty and thirty and nothing else in that hour.`,
    steps: [
      "Paste the cron expression. Five fields is the standard form; six with seconds is also read.",
      "Read the plain-English description of what it means.",
      "Check the list of upcoming run times against what you actually intended.",
      "Look especially at the day-of-week and day-of-month fields if both are set, since cron combines them with OR rather than AND.",
    ],
    faq: [
      {
        q: "What do the five fields mean?",
        a: "Minute, hour, day of month, month, day of week, in that order. An asterisk means every value, a comma separates a list, a hyphen gives a range and a slash gives a step.",
      },
      {
        q: "Why does my job run more often than expected?",
        a: "Usually 5 where */5 was meant, or the reverse. It can also be the day-of-week and day-of-month OR behaviour, which fires on both conditions rather than their intersection. The upcoming run list shows either immediately.",
      },
      {
        q: "What time zone does cron use?",
        a: "The system's local time, unless the daemon or the platform is configured otherwise. That matters twice a year: a job scheduled inside the hour that repeats at the end of daylight saving can run twice, and one inside the hour that disappears may not run at all.",
      },
      {
        q: "Is @daily the same as 0 0 * * *?",
        a: "Yes, and @hourly, @weekly, @monthly and @yearly are the equivalent shorthands. @reboot is different in kind — it fires when the daemon starts rather than on any schedule.",
      },
    ],
  },

  "query-string-parser": {
    intro: `A URL with a dozen parameters is a wall of ampersands. Reading one to check a single value, or to see whether a tracking parameter is being appended twice, means counting separators by eye.

This takes a full URL or a bare query string and lays out the parameters as a list. Values are percent-decoded, so %20 appears as a space and %3A as a colon, and the parts of the URL around the query are broken out too.

Repeated keys are handled properly rather than collapsed. A query string can legitimately contain the same key more than once — tags=a&tags=b is how HTML forms submit multiple checkbox values — and different server frameworks disagree about what that means. PHP wants tags[] and builds an array; Rails and Express accept the repeated form; some frameworks silently keep only the last. When a parameter that should be single appears twice, that is nearly always the bug you were looking for, so the tool shows both rather than picking one.

Encoding is where the other half of the bugs live. A plus sign in a query string means a space, a legacy of HTML form encoding, so a value containing a genuine plus must be written as %2B or it arrives as a space instead. This matters constantly for phone numbers in international format, and it is why +919876543210 in a link reaches the server as a space followed by digits.

The other rule worth keeping in mind: query strings are logged. They sit in server logs, proxy logs, browser history and the referrer header sent to third parties. Never put a token, a password or personal detail in one — that is what a request body is for.`,
    steps: [
      "Paste the full URL, or just the part after the question mark.",
      "Read the parameters as a list, with values already percent-decoded.",
      "Look for keys that appear more than once — a parameter you expected to be single arriving twice is usually the problem.",
      "Check for plus signs in values that should contain a literal plus; they arrive as spaces unless encoded as %2B.",
    ],
    faq: [
      {
        q: "Why did my plus sign turn into a space?",
        a: "Because in a query string a plus means a space, inherited from HTML form encoding. A literal plus has to be written as %2B. This catches out international phone numbers more than anything else.",
      },
      {
        q: "Can the same parameter appear twice?",
        a: "Yes, and it is how multiple checkbox values are submitted. Frameworks disagree on what to do with it — some build an array, some keep the last value, PHP wants square brackets in the name. The tool shows every occurrence so you can see what actually arrived.",
      },
      {
        q: "Is there a length limit on a query string?",
        a: "Not in the specification, but in practice yes. Browsers and servers impose their own limits, commonly around 2,000 characters for reliable behaviour and sometimes as low as 4KB at a proxy. Long payloads belong in a request body.",
      },
      {
        q: "Is it safe to put an API key in a query string?",
        a: "No. Query strings appear in server logs, proxy logs, browser history and the referrer header sent to other sites. Secrets belong in a header or a body, both of which stay out of all four.",
      },
    ],
  },

  "slug-generator": {
    intro: `A slug is the readable part of a URL — the "how-to-make-bread" at the end of a recipe link. Turning a title into one means lowercasing it, replacing spaces with hyphens, and removing everything that has no business in a URL, which is a longer list than it first appears.

This does that, and handles the parts people usually get wrong. Accented characters are transliterated rather than stripped, so "café" becomes "cafe" instead of "caf". Punctuation, quotes and symbols are removed. Runs of separators collapse into one, and leading and trailing hyphens are trimmed, so a title ending in a question mark does not produce a slug ending in a dash.

Ampersands become "and" rather than disappearing, since "Salt & Pepper" reading as "salt-pepper" loses a word that was doing work. Numbers are kept, because they carry meaning in a title far more often than not.

Hyphens rather than underscores is the standard advice and it is worth following. Search engines treat a hyphen as a word separator and an underscore as a joining character, so "how_to_bake" is read as a single token while "how-to-bake" is read as three words. That difference is small but it is free.

Length is the judgement call the tool leaves to you. There is no technical limit worth worrying about, but a slug is read by people in link previews and search results, so cutting it after the meaningful words is usually better than carrying an entire headline. Trim the trailing words rather than abbreviating, and keep it stable — changing a published slug breaks every link to it unless you redirect the old one.`,
    steps: [
      "Type or paste the title you want turned into a slug.",
      "Read the result and shorten it if it has carried more of the headline than a URL needs.",
      "Keep hyphens as the separator unless something downstream insists otherwise.",
      "Once a slug is published, leave it alone — or redirect the old one, because every existing link points at it.",
    ],
    faq: [
      {
        q: "Hyphens or underscores?",
        a: "Hyphens. Search engines treat them as word separators, while an underscore joins words into a single token. It is a small difference that costs nothing to get right.",
      },
      {
        q: "What happens to accented characters?",
        a: "They are transliterated to their closest unaccented equivalent, so “café” becomes “cafe” and “Zürich” becomes “zurich”. Stripping them instead would leave “caf”, which is a different word.",
      },
      {
        q: "How long should a slug be?",
        a: "Long enough to say what the page is about, short enough to read in a search result. Three to six meaningful words is a good target. Cut whole words from the end rather than abbreviating them.",
      },
      {
        q: "Can I change a slug after publishing?",
        a: "Only with a redirect. The old URL is in links, bookmarks and search indexes, and changing it without a 301 turns all of them into 404s and discards whatever ranking the page had earned.",
      },
    ],
  },

  "lorem-ipsum-generator": {
    intro: `Placeholder text exists so a layout can be judged on its shape rather than its content. Lorem ipsum has done that job since the 1500s, when a printer scrambled a passage of Cicero to make a type specimen, and it survives because it looks like language without being readable as one.

This generates it by paragraphs, sentences or words, with the option to open on the traditional "Lorem ipsum dolor sit amet" so the block is recognisable as placeholder at a glance.

That recognisability is the entire point, and it is the argument against the alternatives. Placeholder text that reads as real English gets left in. It ships to production, appears in a screenshot, and occasionally makes it into print, because everyone who read past it assumed someone else had written it deliberately. Latin-looking nonsense cannot survive that trip unnoticed.

The other argument is about judgement. Real copy in a mockup makes the design impossible to evaluate honestly, because reviewers read the words and respond to them. Nonsense forces attention onto the thing being reviewed: line length, spacing, rhythm, whether the heading has room to breathe at two lines.

It is worth being honest about the limits, though. Lorem ipsum has the letter distribution of Latin, not English — more i, u and m, fewer of the letters that dominate English text — so it sets slightly differently. If you are choosing a typeface or fine-tuning tracking, set some real sentences instead. And a design that only works with placeholder text is a design that has not been tested: try it with a name of one character and a name of forty before you call it finished.`,
    steps: [
      "Choose whether you want paragraphs, sentences or a specific number of words.",
      "Set the amount, and keep the traditional opening if the text needs to be obviously placeholder.",
      "Copy the result into your mockup.",
      "Before signing anything off, replace it with the longest and shortest real content the layout will ever have to hold.",
    ],
    faq: [
      {
        q: "Why not use real sentences instead?",
        a: "Two reasons. Real text gets read, so reviewers respond to the writing rather than the layout. And real text gets left in — placeholder that looks like English ships to production far more often than Latin nonsense does.",
      },
      {
        q: "Does lorem ipsum mean anything?",
        a: "Not as written. It descends from a passage of Cicero on pleasure and pain, scrambled by a printer making a type specimen, and the corruption is old enough that fragments of real words survive without the sense.",
      },
      {
        q: "Is it bad for accessibility or SEO?",
        a: "Only if it ships. Placeholder text left on a live page is read aloud by a screen reader and indexed by a search engine, both of which reflect badly. Its value is entirely in the mockup stage.",
      },
      {
        q: "Should I use it to choose a typeface?",
        a: "No. Its letter frequencies are Latin rather than English, so it sets differently from the text the face will actually carry. Choose a typeface with real sentences from the real content.",
      },
    ],
  },

  "url-decode": {
    intro: `Percent-encoding is how a URL carries characters it cannot hold literally. A space becomes %20, a colon %3A, a slash %2F, and any byte outside the safe set becomes a percent sign followed by two hexadecimal digits. Reversing that by eye is possible and slow; this does it instantly.

Paste an encoded string and the readable version appears. It is most useful on the URLs that arrive in bug reports and analytics exports, where a redirect chain has nested one URL inside another and the whole thing has become a wall of percent signs.

Double encoding is the failure this most often diagnoses. When a value is encoded twice, the percent sign of the first encoding is itself encoded, so %20 becomes %2520 — the %25 is a literal percent sign, followed by the digits 20. If your decoded output still contains percent sequences, that is what happened, and running the decode again will finish the job. The cause is nearly always two layers of code both trying to be helpful, one in application code and one in a framework that had already done it.

The plus sign is the other trap. In the query part of a URL a plus means a space, a rule inherited from HTML form submission, but in the path portion a plus is a literal plus. A decoder that applies one rule everywhere gets one of the two cases wrong, which is why the mode matters when the string spans both parts.

An invalid sequence — a percent sign followed by something that is not two hexadecimal digits — is reported rather than silently dropped, because a stray percent in an otherwise valid URL is usually the actual bug and hiding it helps nobody.`,
    steps: [
      "Paste the percent-encoded text or URL into the input.",
      "Read the decoded result underneath.",
      "If percent sequences remain, the value was encoded twice — decode the result again.",
      "Choose the mode that matches where the string came from, since a plus means a space in a query and a literal plus in a path.",
    ],
    faq: [
      {
        q: "Why does my decoded text still have percent signs in it?",
        a: "It was encoded twice. %2520 decodes to %20, which decodes to a space. Run the decode a second time. The cause is usually two layers of code each encoding a value that was already encoded.",
      },
      {
        q: "Should a plus become a space?",
        a: "In the query string, yes — that comes from HTML form encoding. In the path, no, where a plus is a literal character. Pick the mode that matches the part of the URL your string came from.",
      },
      {
        q: "What does %C3%A9 decode to?",
        a: "The letter é. Characters outside ASCII are encoded as their UTF-8 bytes, so one visible character often becomes two or three percent sequences. Emoji commonly take four.",
      },
      {
        q: "It says the input is invalid.",
        a: "A percent sign must be followed by exactly two hexadecimal digits. A bare percent, or one followed by other characters, is not valid encoding — and it is usually the thing that broke whatever you are debugging, so it is reported rather than skipped.",
      },
    ],
  },

  "html-entity-encode": {
    intro: `HTML has five characters that cannot be written literally in content, because the browser reads them as markup. The angle brackets open and close tags, the ampersand starts an entity, and the quotes end attribute values. Encoding replaces each with a named entity so it is displayed rather than interpreted.

This encodes text for safe insertion into HTML, with an option to escape every non-ASCII character as a numeric reference for contexts that cannot carry UTF-8 — some email templates and older systems still need that.

The reason this matters is cross-site scripting, and it is worth being precise about the boundary. Inserting untrusted text into a page without encoding it lets that text become markup, and a string containing a script tag becomes a running script. Encoding the five characters prevents it in element content, which is the common case.

That is where the honest limit begins, and it is the part most explanations skip. Encoding is context-dependent. Text going into an unquoted attribute needs more escaping than these five characters provide, because a space or a slash can end the attribute. Text going into a script block needs JavaScript escaping, not HTML escaping. Text going into a URL attribute needs the scheme validated, because "javascript:" is a valid URL and encoding does nothing to it. Text inside a style attribute has its own rules again.

So this tool is right for the ordinary case and for understanding what encoding does. In application code, use your framework's context-aware escaping — React, Vue, Django, Rails and every other modern framework escape by default and are careful about the contexts this page cannot know about. Hand-rolled escaping is where XSS bugs come from.`,
    steps: [
      "Paste the text that needs to appear literally in an HTML page.",
      "Choose whether to encode only the five reserved characters or every non-ASCII character too.",
      "Copy the encoded result into your markup.",
      "In application code, prefer your framework's own escaping — it knows which context the value is going into and this page does not.",
    ],
    faq: [
      {
        q: "Which characters actually need encoding?",
        a: "Five: the ampersand, both angle brackets and both quote marks. The ampersand must be encoded first, otherwise encoding the others would produce entities that are themselves re-encoded.",
      },
      {
        q: "Does this protect against XSS?",
        a: "For text placed in element content, yes. For attributes, URLs, script blocks and style blocks, it is insufficient — each needs different escaping. Use your framework's context-aware output escaping rather than escaping by hand.",
      },
      {
        q: "When should I encode non-ASCII characters?",
        a: "Only when the document is not served as UTF-8, or when a system in the path mangles them. Modern pages declare UTF-8 and can carry accented letters and emoji directly, so encoding them adds size for nothing.",
      },
      {
        q: "Named entities or numeric ones?",
        a: "Named entities read better and are the conventional choice for the five reserved characters. Numeric references work for every codepoint, including the ones with no name, which is why the non-ASCII option uses them.",
      },
    ],
  },

  "html-entity-decode": {
    intro: `Text extracted from a web page, an RSS feed or a database column often arrives with its entities still in place: &amp;amp; where an ampersand belongs, &amp;#39; where an apostrophe should be, &amp;nbsp; scattered through the spacing. This turns them back into the characters they stand for.

It handles decimal and hexadecimal numeric references, which have no vocabulary to fall short of, and the named entities in everyday use: the five XML ones, the typographic marks, the currency and legal symbols, and every accented Latin letter. HTML defines well over two thousand names in total, reaching into Greek and mathematics, and a name outside that everyday set is left exactly as it was found rather than guessed at — so nothing is silently mangled, and you can see what was not understood.

Double encoding is the most common thing this reveals, and it shows up as &amp;amp;amp; in the output. That sequence means an already-encoded ampersand was encoded again, usually because one layer of code escaped a value that a framework had already escaped. Decode a second time to confirm, then fix the layer doing the extra work rather than decoding twice in production.

Non-breaking spaces deserve their own mention. &amp;nbsp; decodes to U+00A0, which looks exactly like an ordinary space and is not one. It will not match a space in a comparison, most trim functions leave it in place, and a great many "why does this string not equal that string" mysteries end there. The Unicode inspector on this site will show them if you suspect one.

A caution about what decoded text is: it is unsafe to insert into a page. Decoding is precisely the operation that turns &amp;lt;script&amp;gt; back into a live script tag. Decode when you need the text as data — to store it, to compare it, to read it — and re-encode before it goes anywhere near markup.`,
    steps: [
      "Paste the text containing HTML entities.",
      "Read the decoded result.",
      "If you still see sequences beginning with an ampersand, the text was encoded twice — decode again and fix the layer doing it.",
      "Treat the decoded output as data. Re-encode before putting it back into any HTML page.",
    ],
    faq: [
      {
        q: "Why do I see &amp;amp;amp; in the result?",
        a: "The text was encoded twice. One layer escaped a value that another had already escaped. Decode a second time to get the plain text, then find and remove the duplicated escaping rather than compensating for it.",
      },
      {
        q: "What is &amp;nbsp; and why does it cause trouble?",
        a: "A non-breaking space, U+00A0. It renders identically to a space but is a different character, so it fails comparisons and survives most trimming. It is a frequent cause of strings that look equal and are not.",
      },
      {
        q: "Which entities are supported?",
        a: "The named entities browsers recognise, plus decimal and hexadecimal numeric references. Between them that covers every entity a browser or a well-behaved encoder will have written.",
      },
      {
        q: "Is decoded text safe to put back into a page?",
        a: "No. Decoding is what turns an escaped script tag back into a working one. Use decoded text as data — for storage, comparison or reading — and encode it again before it reaches any markup.",
      },
    ],
  },

  "json-to-typescript": {
    intro: `An API returns JSON and your code needs to know its shape. Writing the interface by hand means reading the payload field by field and getting the optionality right, which is slow and easy to get subtly wrong.

This generates TypeScript interfaces from a sample. Nested objects become their own named interfaces rather than being inlined, so the result reads like something a person would have written, and arrays are inspected across their elements rather than only the first.

That array handling is the part that matters. A response where one item has a null description and the next has a string will produce "string | null" here, not "string" — which is what a first-element-only tool gives you, and which fails at runtime on the second item. Similarly, a key present in some elements and absent in others is marked optional, because that is what the sample actually demonstrates.

The unavoidable limitation is the same one every inference tool has, and it is worth stating rather than burying. A sample shows what came back once. It cannot show that a field is sometimes absent, that an empty array is really an array of orders, or that a string field is actually one of five specific values. Generated types are a starting point that saves the typing, not a specification.

Two places to look before trusting the output: any field that was null in your sample, which will have been typed as null and needs the real type adding; and any empty array, which cannot be inferred at all. Both are quick to fix once you know to look.

The best source of truth remains the API's own schema, if it publishes one. Generating types from an OpenAPI document gives you what the API promises rather than what it happened to send.`,
    steps: [
      "Paste a representative JSON response — a real one, with populated fields.",
      "Read the generated interfaces. Nested objects are extracted as their own named types.",
      "Fix any field that was null or an empty array in your sample, since neither can be inferred.",
      "Mark genuinely optional fields yourself; a sample cannot show that something is sometimes missing.",
    ],
    faq: [
      {
        q: "Why is a field typed as null?",
        a: "Because it was null in your sample and there was nothing else to go on. Replace it with the real type, or supply a sample where the field is populated.",
      },
      {
        q: "How are arrays with mixed elements handled?",
        a: "Every element is examined and the results are merged, so a field that is a string in one and null in another becomes a union. A key missing from some elements is marked optional.",
      },
      {
        q: "Should I use generated types directly?",
        a: "As a starting point. They save the typing and are usually right about shape, but they cannot know about optional fields that happened to be present, or string fields that are really a fixed set of values. Read them before committing them.",
      },
      {
        q: "What about an empty array in the sample?",
        a: "It becomes an array of unknown, because there is genuinely no information to work from. Supply a sample with at least one element, or fill the type in by hand.",
      },
    ],
  },

  "color-converter": {
    intro: `The same colour is written four or five different ways depending on where it is going. A designer hands over a hex code, CSS wants HSL to adjust a lightness, a print job needs CMYK, and a native app wants RGB components. Converting between them is arithmetic that has no business being done by hand.

This converts between hex, RGB, HSL, HSB and CMYK, in every direction, and accepts input in whichever notation you happen to have.

HSL earns its place in day-to-day work more than the others. Hue, saturation and lightness are the axes people actually think in: a hover state is the same colour a little darker, a disabled state is the same colour desaturated, a palette is one hue at several lightnesses. Doing any of that in hex means guessing at six digits. Doing it in HSL means changing one number, and it is why CSS custom properties are so often stored as HSL components.

CMYK carries a caveat the tool states rather than hiding. The conversion here is the standard arithmetic formula, which is not what a print shop will use. Real print conversion depends on an ICC profile describing the specific press, ink and paper, and the same CMYK values produce visibly different results on different stock. Treat the numbers here as an approximation for reference, and let the printer's own profile do the real conversion.

A related point on gamut: a vivid screen colour often has no CMYK equivalent at all. Print covers a smaller range than a display, and a bright cyan or a saturated orange will come back duller. That is not the conversion failing — it is the ink telling you what it can do.`,
    steps: [
      "Enter a colour in any notation — hex, an rgb() string, an hsl() string, or plain components.",
      "Read the equivalents in every other format below.",
      "Work in HSL when you need a variation: adjust the lightness for a hover state, the saturation for a disabled one.",
      "Treat the CMYK figures as a reference only, and let a printer's ICC profile do the real conversion.",
    ],
    faq: [
      {
        q: "Why do the CMYK numbers not match what my printer produces?",
        a: "Because a real conversion uses an ICC profile for that specific press, ink and paper, while this uses the standard formula. The result here is a reasonable reference; it is not a proof, and no formula can be.",
      },
      {
        q: "What is the difference between HSL and HSB?",
        a: "The third component. In HSL, 100% lightness is white; in HSB, 100% brightness is the most vivid version of the hue. Design applications tend to use HSB, CSS uses HSL, and confusing them produces colours far lighter or more vivid than intended.",
      },
      {
        q: "Does an eight-digit hex code work?",
        a: "Yes. The last two digits are the alpha channel, and they are preserved through the conversion where the target format can express transparency.",
      },
      {
        q: "Why did my bright screen colour come back dull in CMYK?",
        a: "Because it is outside the printable gamut. Displays emit light and cover a wider range than ink on paper reflects. Vivid cyans, oranges and greens are the usual casualties, and no conversion can recover them.",
      },
    ],
  },

  "css-gradient-generator": {
    intro: `CSS gradients are generated by the browser rather than loaded as images, so they scale to any size, cost no requests and can be animated. The syntax is not hard, but getting a gradient to look right involves more adjustment than typing, which is what a visual builder is for.

This builds linear, radial and conic gradients with as many colour stops as you need, and emits the CSS to paste straight into a stylesheet.

The most useful thing to know about gradients is why two-stop ones between distant hues often look wrong. Interpolating from blue to yellow in sRGB passes through a desaturated grey in the middle, because the straight line between those two points in the colour cube goes through the dull centre. It is not a rendering fault; it is what a linear blend between those coordinates is. The fix is a third stop at the midpoint, in a colour that keeps the saturation up — and once you see the effect you will notice it in a great many gradients on the web.

Conic gradients are the least used and the most distinctive. Colour sweeps around a centre point rather than along a line, which makes pie charts, progress rings and colour wheels possible in pure CSS with no library and no canvas.

Two practical notes. Multiple stops of the same colour at the same position produce a hard edge rather than a blend, which is how to build stripes and colour bands. And a gradient behind text needs the same contrast check as a flat colour — against the lightest point if the text is dark, and the darkest point if the text is light, because the readable ratio must hold across the whole run rather than on average.`,
    steps: [
      "Choose the gradient type — linear for a direction, radial for a centre, conic for a sweep.",
      "Add colour stops and drag them until the blend reads the way you want.",
      "Add a stop in the middle if a two-colour gradient looks washed out through the centre.",
      "Copy the CSS, then check contrast against the extremes of the gradient if text will sit on top of it.",
    ],
    faq: [
      {
        q: "Why does the middle of my gradient look grey?",
        a: "Because interpolating between two distant hues in sRGB passes through the desaturated centre of the colour space. Add a third stop at the midpoint in a saturated colour and the dullness disappears.",
      },
      {
        q: "How do I get a hard edge instead of a blend?",
        a: "Put two stops at the same position — one colour ending exactly where the next begins. Repeating that pattern is how stripes, bands and segmented rings are built.",
      },
      {
        q: "What is a conic gradient for?",
        a: "Anything that sweeps around a centre: pie charts, progress rings, colour wheels. It is the one gradient type that makes a whole category of graphic possible without an image or a canvas.",
      },
      {
        q: "Do gradients affect performance?",
        a: "Barely. The browser paints them directly and there is no request, so they are cheaper than an image. Animating a gradient is a different matter, since it forces a repaint every frame — animate a transform or an opacity over a static gradient instead.",
      },
    ],
  },

  "box-shadow-generator": {
    intro: `A CSS box-shadow takes five values — horizontal offset, vertical offset, blur radius, spread, and colour — and the difference between a shadow that reads as depth and one that reads as a smudge is entirely in how those five are chosen. This is a visual way to choose them.

Adjust the sliders, watch the preview, and copy the resulting CSS. Multiple shadows can be layered on one element, which is where the interesting results live.

The single most useful principle is that real shadows are soft, offset downward and barely visible. Light comes from above, so the vertical offset should be positive and the horizontal offset close to zero. The blur should be generous — usually larger than the offset — and the colour should be a low-opacity black rather than grey. Grey shadows look dead because they do not take on the colour of what is underneath them; a black at ten or fifteen per cent opacity does.

Layering is what separates a convincing elevation from a flat drop shadow. A single large blur looks like a sticker. Two or three shadows at different offsets and blurs — a tight one for the contact edge, a wider one for the ambient cast — is how every well-made design system builds its elevation scale, and it is why those shadows look like the object is above the page rather than pasted onto it.

Two things worth knowing. The inset keyword draws the shadow inside the element instead, which is how pressed buttons and recessed wells are made. And spread grows or shrinks the shadow before it is blurred, so a negative spread with a large blur produces a tight, subtle shadow that is very hard to achieve any other way.`,
    steps: [
      "Set a small positive vertical offset and leave the horizontal at zero — light comes from above.",
      "Raise the blur until the edge is soft, usually further than feels necessary.",
      "Use black at low opacity rather than a grey, so the shadow picks up whatever is beneath it.",
      "Add a second, tighter shadow for the contact edge, then copy the combined CSS.",
    ],
    faq: [
      {
        q: "Why does my shadow look fake?",
        a: "Usually too dark, too sharp, or offset sideways. Real shadows are soft, cast downward and much fainter than instinct suggests. Try black at ten per cent with a blur two or three times the offset.",
      },
      {
        q: "What does spread do?",
        a: "It grows or shrinks the shadow before blurring. A negative spread with a large blur gives a tight, diffuse shadow that is difficult to produce any other way, and it is a staple of subtle elevation scales.",
      },
      {
        q: "Can one element have several shadows?",
        a: "Yes — comma-separate them, and the first is painted on top. Layering a tight contact shadow with a wider ambient one is what makes an element look genuinely raised rather than stuck on.",
      },
      {
        q: "What is the inset keyword for?",
        a: "It draws the shadow inside the element's border box rather than outside it, which produces pressed buttons, recessed panels and inner glows.",
      },
    ],
  },
};
