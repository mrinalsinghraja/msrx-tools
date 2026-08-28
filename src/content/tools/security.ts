import type { ToolContent } from "@/lib/tools/types";

/**
 * SEO prose for the Security & Privacy tools. Server-only.
 *
 * House style, and it matters most here: name the real threat and the real
 * limit. A security page that only says a thing is secure has told the reader
 * nothing they can act on. Every page below says what the tool protects
 * against and what it does not.
 */
export const SECURITY_CONTENT: Record<string, ToolContent> = {
  "encrypt-text": {
    intro: `Sometimes a paragraph needs to travel through a channel you do not trust. A note in a shared document, a password sent to a colleague over chat, recovery details pasted into a ticket that will outlive the problem. Encrypting the text first means the channel carries something unreadable, and only the person with the password gets the words back.

This tool uses AES-256 in GCM mode, which is the same construction that protects HTTPS traffic, run through your browser's built-in WebCrypto implementation. The key is not your password — it is derived from your password by PBKDF2, which repeats a hash function hundreds of thousands of times specifically to make guessing slow. Six hundred thousand rounds is the current OWASP floor, and it is the default here. On a laptop that costs about a second. To someone running a dictionary attack against you, it costs a second per guess, which is the entire point.

GCM is an authenticated cipher, which is the part people usually skip. It does not merely conceal the text; it detects any change to it. If a single byte of the result is altered in transit, decryption fails rather than returning subtly wrong words. That means you can tell the difference between "this arrived intact" and "something happened to this", which a plain cipher cannot tell you.

Everything the result needs to be opened again — the random salt, the initialisation vector, the iteration count and the hash used — is packed into the output alongside the ciphertext. Keep the whole block and it will still open in a year, whatever the defaults on this page have become by then. Lose the password and nothing opens it, including us. There is no recovery path, because there is no account, no key escrow and nowhere a copy could have been kept.`,
    steps: [
      "Type or paste the text you want to protect into the input box.",
      "Enter a password in the options. Long and unusual beats short and clever — a passphrase of four unrelated words is stronger than a mangled dictionary word.",
      "Leave the PBKDF2 rounds at 600,000 unless you have a reason to change them. Raising the number slows an attacker and this page by the same proportion.",
      "Copy the encrypted block that appears. Send all of it, including the line breaks, or paste it somewhere it will not be reflowed.",
      "Store the password separately from the ciphertext, in a password manager. Sending both down the same channel defeats the exercise.",
    ],
    faq: [
      {
        q: "Where does my password go?",
        a: "Into your browser's cryptography engine and nowhere else. This page has no backend that could receive it — the encryption happens in JavaScript on your own device, which is why the tool keeps working with the network switched off entirely.",
      },
      {
        q: "Can you recover my text if I forget the password?",
        a: "No, and that is not a policy we could change. The key exists only for as long as the tab is doing the work, and it is derived from your password each time. Nobody here ever holds a copy of either.",
      },
      {
        q: "Why is the encrypted result so much longer than my text?",
        a: "Forty-one bytes of header travel with it — a format marker, the iteration count, the sixteen-byte salt and the twelve-byte initialisation vector — plus a sixteen-byte authentication tag at the end. That overhead is fixed, so it looks enormous on a short message and negligible on a long one.",
      },
      {
        q: "Is this compatible with OpenSSL or another encryption tool?",
        a: "No. The cipher is standard, but the container around it is specific to this site, so the output opens with the matching decrypt tool here and not with `openssl enc`. If you need an interchange format, encrypt a file with GPG instead.",
      },
      {
        q: "Should I use this instead of an end-to-end encrypted messenger?",
        a: "Use the messenger where you have one. This is for the cases where you do not — a document, a ticketing system, a shared spreadsheet, anywhere the medium is fixed and untrustworthy and you still need to put something in it.",
      },
    ],
  },

  "decrypt-text": {
    intro: `This opens text that was sealed with the encrypt tool on this site. Paste the block, supply the password it was sealed with, and the original words come back.

The settings shown in the options panel are deliberately not used. Every encrypted block produced here carries its own parameters inside it — how many PBKDF2 rounds derived the key, which hash was used, the random salt, the initialisation vector — and those are read out of the message and used in preference to anything selected on screen. That design decision has a practical consequence worth stating plainly: a block encrypted three years ago, when the defaults on this page were different, still opens today without anyone having to remember what those defaults were. Formats that leave the parameters implicit are the reason old encrypted archives become unopenable.

If decryption fails, the message says the password is wrong or the data has been altered, and it deliberately does not guess which. AES-GCM verifies the whole message against an authentication tag before it will hand back a single byte, and a failed tag has exactly two causes: a key that does not match, or content that changed after it was sealed. The cipher genuinely cannot distinguish them, and a tool that claimed to would be inventing the answer.

That failure mode is a feature rather than an inconvenience. It means a partially corrupted download refuses to open rather than returning plausible-looking nonsense, and it means an attacker who alters the ciphertext in transit cannot make it decrypt into something else of their choosing. You either get exactly what was sealed, or you get told that you cannot.`,
    steps: [
      "Paste the whole encrypted block into the input, including every line if it was wrapped.",
      "Enter the password it was sealed with.",
      "The recovered text appears below. The figures above it report the settings that were read out of the message itself.",
      "If it refuses, check the password first and the completeness of the pasted block second — a truncated copy fails in exactly the same way as a wrong password.",
    ],
    faq: [
      {
        q: "It says it would not decrypt. What went wrong?",
        a: "One of two things: the password does not match, or the block is not byte-for-byte what was produced. A missing final line, an autocorrected character, or a chat client that reflowed the text will all cause it. Copy the original again and retry before assuming the password is wrong.",
      },
      {
        q: "Why does changing the rounds setting have no effect?",
        a: "Because the real value is stored inside the message and takes precedence. The control is there so the panel matches its counterpart on the encrypt page; the figures shown with your result are the ones actually used.",
      },
      {
        q: "Can this open files encrypted by other tools?",
        a: "No. It expects the container this site writes, which begins with a specific marker. Output from OpenSSL, GPG, 7-Zip or another web tool uses a different layout and will be refused rather than misread.",
      },
      {
        q: "Does the decrypted text get stored anywhere?",
        a: "It exists in the memory of this tab and nowhere else. Close the page and it is gone. Nothing is written to disk, to storage, or to any server, because there is no server involved at any point.",
      },
    ],
  },

  "encrypt-file": {
    intro: `Cloud storage, email attachments and messaging apps all read what passes through them, whatever their marketing says about privacy. Encrypting a file before it goes into any of them changes what they are holding: not your document, but an opaque block that means nothing without your password.

The tool takes any file — a PDF, a spreadsheet, a photograph, an archive, a video — and seals it with AES-256-GCM. The key comes from your password through PBKDF2 at 600,000 rounds, so a weak password is still a weak password, but a good one is genuinely expensive to attack. The result is a “.enc” file you download as normal and can put anywhere.

Two design choices are worth knowing about. First, the original filename keeps its extension inside the new name, so “accounts.xlsx” becomes “accounts.xlsx.enc” and whoever decrypts it gets a spreadsheet back rather than an anonymous blob. If the file type is itself sensitive, there is a switch to drop it. Second, the whole file is encrypted as one unit rather than in chunks. Chunking would allow arbitrarily large files, but it would also mean inventing a chunk format, and home-made chunk formats are historically where encryption goes wrong. The honest trade is a stated 512 MB ceiling instead of a subtle weakness.

Because GCM authenticates as well as encrypts, decryption doubles as an integrity check. A file that comes back is a file that has not been altered by anything since it was sealed — not by a flaky transfer, not by a storage provider, not by anyone in between. If it has been altered, it refuses to open rather than handing you a damaged document.`,
    steps: [
      "Drop in the files you want to protect. Any type works, and you can do several at once with the same password.",
      "Enter a password, then enter it again in the confirmation field. There is no recovery, so a typo would be permanent.",
      "Adjust the PBKDF2 rounds only if you have a reason. Higher is slower for an attacker and for you in equal measure.",
      "Press the button and wait — key derivation is meant to be slow, so a second or two of work is the tool functioning correctly.",
      "Download the .enc files, and put the password in a password manager before you close the tab.",
    ],
    faq: [
      {
        q: "Is my file uploaded to be encrypted?",
        a: "It is not. The bytes are read into this tab, encrypted by your browser's own cryptography engine and handed straight back as a download. Disconnect from the network before you start if you want to watch that claim hold up.",
      },
      {
        q: "How big a file can this handle?",
        a: "512 MB is the stated limit. The whole file and its encrypted copy are both held in memory at once, so a device with little RAM will struggle before that. For very large archives, split them first or use a desktop tool built for streaming.",
      },
      {
        q: "What happens if I forget the password?",
        a: "The file is unrecoverable. That is not a support policy that could be appealed — there is no account, no stored key and no copy of anything on our side. Treat the password as the file.",
      },
      {
        q: "Can the recipient open it without visiting this site?",
        a: "Not conveniently. The container is specific to these tools, so the intended route is the matching decrypt page, which also runs entirely in their browser. If the recipient needs a standard format, use GPG or an encrypted archive instead.",
      },
      {
        q: "Does encrypting hide the filename and size?",
        a: "The size is still visible, and the name is too unless you switch off the option that preserves the extension. Encryption conceals contents, not metadata. If the existence or the size of the document is the sensitive part, put it inside an archive with other files first.",
      },
    ],
  },

  "decrypt-file": {
    intro: `The counterpart to the file encryption tool. Give it a “.enc” file produced here and the password it was sealed with, and it returns the original bytes under the original name.

Everything needed to derive the key again lives in the file's own header: the sixteen-byte random salt, the iteration count, and which hash the derivation used. Nothing about the settings on this page affects the outcome, which is deliberate — a file encrypted with one set of parameters must remain openable when the page's defaults have moved on. The figures reported alongside your result are the ones the file itself specified.

Filenames are restored by removing the “.enc” suffix, so “contract.pdf.enc” becomes “contract.pdf” again. When the original extension was not preserved at encryption time, the result is handed back as a plain “.bin”. That is not the tool being unhelpful — it genuinely does not know what the bytes are, and guessing a file type from content it cannot inspect would be a fabrication. Rename it yourself once you know.

The most useful property of this page is the one that reports failure. Because AES-GCM checks an authentication tag over the entire file before releasing any of it, a successful decryption is proof that not one byte has changed since the file was sealed. Storage corruption, a truncated download, an interfering proxy, deliberate tampering: all of them produce a refusal rather than a quietly damaged document. A tool that returned something anyway would be worse than useless for anything you actually needed to trust.`,
    steps: [
      "Drop in the .enc files you want to open. Several at once is fine if they share a password.",
      "Enter the password they were encrypted with.",
      "Press the button. The wait is the key derivation running the same number of rounds that were used to seal the file.",
      "Download the restored files. The summary confirms the derivation settings that were read from the file itself.",
    ],
    faq: [
      {
        q: "Why does it say the file was not produced here?",
        a: "Every file this site encrypts begins with a specific eight-byte marker. Without it, the tool stops rather than attempting to interpret a layout it does not understand. Encrypted output from other software uses different containers and is not interchangeable.",
      },
      {
        q: "It refuses even though I am sure of the password.",
        a: "Then the file has changed since it was sealed. Re-download it from wherever it was stored, since a truncated or partially synced copy is the usual culprit, and check that no tool in the path tried to be helpful by decompressing or re-encoding it.",
      },
      {
        q: "Why did I get a .bin file back?",
        a: "Because the original extension was dropped when it was encrypted. The contents are intact and correct; only the name lost its type. Rename it to the right extension and it will open normally.",
      },
      {
        q: "Can several files share one password?",
        a: "Yes, and they can be decrypted together in one pass. Each file still has its own random salt and initialisation vector, so reusing a password across files does not weaken any of them.",
      },
    ],
  },

  "totp-generator": {
    intro: `Two-factor codes are generated by arithmetic, not by magic and not by a network call. Your authenticator app holds a shared secret, combines it with the current time, and runs an HMAC. Every app doing this correctly produces the same six digits, because there is only one right answer.

This page does the same arithmetic. Paste the seed — the Base32 string a service shows beside the QR code during setup, or the whole “otpauth://” URI if you have it — and it shows the current code, the one before it, the one after it, and how many seconds are left before the current one expires. If you paste the URI, its own settings for digit count, period and algorithm override whatever the options say, because the service that issued it knows better than a default.

The obvious question is whether pasting a 2FA seed into a web page is sensible. Ordinarily it is not, and the reason is worth being precise about: with the seed, anyone can generate your codes forever. What makes it defensible here is that the page has no way to send it anywhere — the computation runs in your browser, and you can confirm that by disconnecting from the network and watching the codes keep rotating. That is the check to make of any site offering this, including this one.

The legitimate uses are narrow and real. Checking that a seed you have just backed up produces the same codes your phone does. Recovering access when the phone is lost but the seed was written down. Testing an authentication flow you are building without wiring up a real authenticator. What it is not is a replacement for an authenticator app, and it should not be your day-to-day way of logging in.`,
    steps: [
      "Paste the Base32 secret, or the full otpauth:// URI from a setup QR code, into the input.",
      "Leave the algorithm on SHA-1 and the period at 30 seconds unless the service told you otherwise — almost every provider uses those.",
      "Read the current code and the countdown beside it. The previous and next codes are shown because servers usually accept one step either side of the present.",
      "Switch to HOTP if your provider uses a counter rather than a clock, and set the counter to the value it expects.",
    ],
    faq: [
      {
        q: "Is it safe to paste my 2FA secret here?",
        a: "It is safe in the specific sense that this page cannot transmit it — everything happens in your browser and the tool works offline. It is still a secret worth treating carefully: use it on a device you control, and do not paste it into any site that has not made the same guarantee and let you verify it.",
      },
      {
        q: "The code is rejected even though the seed is right.",
        a: "Your device clock is almost certainly wrong. TOTP is time-based and tolerates only about thirty seconds of drift either way. Switch on automatic time synchronisation and try again.",
      },
      {
        q: "Which algorithm should I choose?",
        a: "SHA-1, unless your provider explicitly specified otherwise. It is the RFC 6238 default and what nearly every service uses. SHA-1's weaknesses are in collision resistance, which does not apply to its use inside HMAC here.",
      },
      {
        q: "What is the difference between TOTP and HOTP?",
        a: "TOTP derives the code from the current time, so it changes every thirty seconds on its own. HOTP derives it from a counter that advances each time a code is used, so codes do not expire but the two sides can drift out of step. Time-based is far more common.",
      },
      {
        q: "Can I use this instead of an authenticator app?",
        a: "You could, but you should not. An authenticator keeps the seed in secure device storage; a browser page requires you to store the seed yourself and paste it each time, which multiplies the chances of it ending up somewhere it should not.",
      },
    ],
  },

  "split-secret": {
    intro: `Some secrets are too important to keep in one place and too important to copy. A master password, a crypto wallet recovery phrase, the root credentials for a company's infrastructure. Storing one copy risks losing it; storing several copies multiplies the chance one is stolen.

Shamir's Secret Sharing resolves that properly rather than by compromise. It splits the secret into any number of shares and sets a threshold: bring that many back together and the original is reconstructed exactly. Bring fewer and you learn nothing at all — not part of it, not its structure, nothing beyond the length. That is not a claim about how hard the mathematics is to break. Below the threshold, every possible secret of that length remains exactly as likely as every other, so there is nothing to attack.

The mechanism is a polynomial over a finite field. To require three shares, the tool builds a degree-two polynomial whose constant term is your secret byte and whose other coefficients are random, then hands out points on that curve. Three points determine a parabola uniquely; two points lie on infinitely many, which is precisely why two shares tell you nothing. Each byte of your secret gets its own polynomial with fresh random coefficients.

Three of five is the usual arrangement and a sensible default: you can lose two shares to a house fire or a failed drive and still recover, while an attacker needs to compromise three separate locations. Give them to different people, or put them in different places, and keep a note of the threshold — a set of shares with no record of how many are needed is a puzzle you have set yourself.`,
    steps: [
      "Type or paste the secret — a password, a recovery phrase, a key. Anything that fits in text works.",
      "Choose how many shares to produce and how many of them are needed to rebuild it.",
      "Optionally add a label, which is prefixed to each share so you can tell one set apart from another later.",
      "Distribute the shares to genuinely separate places. Two shares in the same drawer are one share for every purpose that matters.",
      "Record the threshold somewhere with the shares, and destroy this page's output by closing the tab.",
    ],
    faq: [
      {
        q: "What happens if I lose a share?",
        a: "Nothing, as long as you still hold the threshold number. That redundancy is the reason to produce more shares than you require — five shares needing three tolerates two losses without any drama.",
      },
      {
        q: "Do fewer shares than the threshold leak part of the secret?",
        a: "No. This is information-theoretic rather than computational security: below the threshold every possible secret of that length remains equally consistent with what you hold. More computing power does not help, and neither will a future one.",
      },
      {
        q: "Is a share as sensitive as the secret?",
        a: "Less so, but not harmless. A share reveals the length of the secret, and it is one of the pieces an attacker needs. Store each one as carefully as you would a password, just in different places.",
      },
      {
        q: "Can I use this for a crypto wallet seed phrase?",
        a: "It is one of the strongest reasons to use it, and the one caution is the obvious one: test the recovery before you rely on it. Split the phrase, combine a threshold subset on the matching page, and check you get the same words back before you destroy anything.",
      },
      {
        q: "Why not just split the password into three pieces myself?",
        a: "Because each piece would give away part of the answer and shorten the guess. Holding two-thirds of a password is a colossal advantage to an attacker. Holding two of three shares is no advantage whatsoever.",
      },
    ],
  },

  "combine-secret-shares": {
    intro: `This rebuilds a secret from shares produced by the splitting tool. Paste enough of them, one to a line, and the original comes back exactly.

The reconstruction is Lagrange interpolation over the same finite field the shares were built in. Each share is a point on a curve whose value at zero is the secret; given enough points, that curve is determined and the value at zero can be computed directly. Order does not matter, and which particular shares you hold does not matter — any combination that meets the threshold works identically.

There is one behaviour to understand before you rely on this, and it is the reason the page says so on every result. If you supply fewer shares than the threshold, the tool does not report an error. It produces a different answer. The mathematics is perfectly happy to fit a curve through too few points; there are simply infinitely many curves that fit, and it will find one of them. The output will be the right length and completely wrong.

So the practical check is to read what comes back. A recovered passphrase that reads like a passphrase is almost certainly correct — the odds of a wrong reconstruction producing sensible text are negligible. Output that arrives as unreadable characters, which the tool shows as hexadecimal instead, means you are short a share or one of them was mistyped. That is the failure to expect, and it is why testing recovery at the moment you split something is worth the two minutes it costs.`,
    steps: [
      "Paste your shares into the input, one per line. Labels and colons are fine — they are ignored.",
      "The rebuilt secret appears immediately. There is nothing to configure unless the original was binary rather than text.",
      "Read the result rather than trusting it. Sensible text means success; hexadecimal usually means a missing share.",
      "If it looks wrong, add another share and try again — being one short produces a plausible-looking answer rather than an error.",
    ],
    faq: [
      {
        q: "How many shares do I need?",
        a: "The threshold that was chosen when they were created. That number is not recorded in the shares themselves, which is why it is worth writing down alongside them. If you are unsure, add shares one at a time until the result reads correctly.",
      },
      {
        q: "Does the order of the shares matter?",
        a: "Not at all. The interpolation uses the index carried at the start of each share, so they can be pasted in any sequence and any combination meeting the threshold gives the identical result.",
      },
      {
        q: "I get gibberish rather than my secret.",
        a: "Almost always too few shares. It can also be a mistyped character — each share is hexadecimal, so a transposed pair corrupts everything after it. Check the shares against their originals and add another one.",
      },
      {
        q: "Can I combine shares that came from different secrets?",
        a: "The tool refuses when the lengths differ, but two same-length sets would combine into nonsense rather than an error. Labelling each set when you create it is the way to avoid mixing them up.",
      },
    ],
  },

  "hash-generator": {
    intro: `A hash is a fingerprint of some data: run the same input through and you always get the same output, change one character and the output changes completely. That property makes hashes useful for two everyday jobs — checking that a download arrived intact, and checking that two things are identical without comparing them byte by byte.

This tool computes SHA-256, SHA-384, SHA-512, SHA-1, MD5 and CRC32 from whatever text you paste, and by default shows all of them at once so you can match whichever one a vendor happened to publish. The SHA family comes from your browser's own cryptography engine. MD5 and CRC32 are implemented here directly, because browsers deliberately refuse to provide MD5 and CRC32 is not a cryptographic function at all.

Two of those algorithms are on the list only for compatibility, and the tool says so beneath the result. MD5 and SHA-1 are both broken in the sense that matters: it is practical to construct two different inputs with the same digest. That makes them unsafe for signatures, for password storage and for anything where an adversary chooses the input. It does not make them useless for verifying an accidental corruption against a checksum a project published in 2009, which is exactly why they remain here.

CRC32 belongs to a different category again. It is an error-detecting code, not a hash — designed to catch the kinds of damage a noisy transmission causes, trivially forgeable by anyone who wants to. Use it to confirm a file survived a copy, never to confirm a file is the one you expected.

Finally, none of these are password hashes. Hashing a password with SHA-256 gives an attacker with a stolen database billions of guesses per second. Passwords need a deliberately slow function such as bcrypt, scrypt or Argon2, whose entire purpose is to be expensive.`,
    steps: [
      "Paste or type the text you want fingerprinted into the input.",
      "Leave the algorithm on “Show them all” to compare against whichever digest a vendor published, or pick one to get a single line.",
      "Switch the output between hexadecimal and Base64 depending on what you are comparing against.",
      "Copy the digest and compare it with the published value — character by character, or by pasting both into the text diff tool.",
    ],
    faq: [
      {
        q: "Which algorithm should I use?",
        a: "SHA-256 unless something forces your hand. It is fast, universally supported and has no known weaknesses. Reach for SHA-512 when a specification asks for it, and treat MD5 or SHA-1 as read-only — fine for checking against an old published checksum, wrong for anything new.",
      },
      {
        q: "Can a hash be reversed to get my text back?",
        a: "Not by inverting it — the function discards information deliberately. Short or common inputs are a different matter, because an attacker can simply hash every candidate and compare. A hashed six-digit PIN offers no protection at all, since there are only a million of them.",
      },
      {
        q: "Why do two tools give me different digests for the same text?",
        a: "Nearly always a trailing newline, or a different character encoding. A file ending in a line break hashes differently from one that does not, and text pasted from a document may carry a byte-order mark you cannot see. The Unicode inspector on this site will show you what is really there.",
      },
      {
        q: "Is my text sent anywhere to be hashed?",
        a: "No. Digest computation happens in this tab, which is why you can hash a password, an API key or a customer record here without it being transmitted. There is no request to inspect and no log to end up in.",
      },
    ],
  },

  "hmac-generator": {
    intro: `An HMAC answers a question a plain hash cannot: not merely whether a message is intact, but whether it came from someone who knows a shared secret. It combines the message with a key in a specific nested construction, so a digest can only be produced — and only checked — by a party holding that key.

This is the mechanism behind almost every webhook signature you will ever integrate. Stripe, GitHub, Shopify, Slack and most others sign their payloads with HMAC-SHA-256 and send the result in a header. Your endpoint recomputes the HMAC over the raw body using the secret they gave you, compares the two, and rejects the request if they differ. Without that step, your webhook endpoint will process anything anyone sends it, which is a very short path to a serious incident.

The tool computes HMAC-SHA-256, SHA-384, SHA-512 or SHA-1 over your message with your key, in hexadecimal or Base64. Its most common use is debugging that comparison: you have a payload, a secret and a signature the provider sent, and you need to find out why yours does not match theirs.

When it does not match, the cause is usually one of three things, and none of them is the algorithm. The body must be the exact raw bytes received, before any JSON parsing and re-serialisation — reordered keys or changed whitespace produce a completely different digest. The encoding must match what the provider used, hexadecimal or Base64, and lowercase or uppercase where hexadecimal is concerned. And some providers sign a constructed string rather than the body alone, typically a timestamp and the payload joined by a separator, which their documentation will specify and which is easy to miss.

In production, compare signatures with a constant-time function rather than string equality, so the comparison itself does not leak the answer through its timing.`,
    steps: [
      "Paste the exact message being signed into the input — the raw request body, byte for byte.",
      "Enter the shared secret in the key field.",
      "Choose the algorithm your provider specifies. HMAC-SHA-256 is the near-universal choice.",
      "Match the output encoding to what you are comparing against, then check the two digests agree.",
    ],
    faq: [
      {
        q: "My signature does not match the provider's. Why?",
        a: "In order of likelihood: the body has been parsed and re-serialised so the bytes differ, the encoding is hexadecimal where they used Base64, or the provider signs a constructed string such as a timestamp joined to the payload rather than the payload alone. Capture the raw body before any middleware touches it and retry.",
      },
      {
        q: "How is this different from just hashing the message?",
        a: "A hash proves the message is unchanged; anyone can compute one. An HMAC proves the message came from someone holding the key, which is a claim about origin rather than integrity. It is also specifically constructed to resist length-extension attacks that naive key-then-message hashing is vulnerable to.",
      },
      {
        q: "Is HMAC-SHA-1 safe to use?",
        a: "For verifying existing systems, yes — HMAC's construction holds up even though SHA-1's collision resistance does not. For anything new, use SHA-256, because there is no reason to build on a primitive being phased out everywhere else.",
      },
      {
        q: "Does my secret key leave the browser?",
        a: "It does not. The key is imported into your browser's own cryptography engine and used there. Nothing is transmitted, which is what makes it reasonable to paste a live webhook secret into this page while debugging.",
      },
    ],
  },

  "password-generator": {
    intro: `A password's strength is not about looking complicated. It is about how many equally likely possibilities an attacker has to work through, and the only two things that move that number are the size of the character set and the length.

This generator draws from your browser's cryptographically secure random source, the same one that produces keys and session tokens. That distinction matters more than it sounds. The ordinary random function most code reaches for is predictable given enough output — perfectly adequate for shuffling a list, entirely unsuitable for anything an adversary is trying to guess.

You choose the length and which character sets to include, and the tool reports the resulting entropy in bits. That figure is the honest measure: each additional bit doubles the work. Around 60 bits resists a determined offline attack on a well-hashed password; above 80 bits the arithmetic stops being interesting to anyone. Length contributes far more than symbol variety does, which is why a long password of lowercase letters beats a short one with punctuation scattered through it.

There is an option to exclude look-alike characters — zero against capital O, one against lowercase l against capital I. Turn it on when the password will be read aloud, copied by hand or typed from a printout, and leave it off when it goes straight into a password manager, since removing characters shrinks the pool slightly.

The best password is one you never see. Generate it, paste it into a manager, and let the manager type it from then on. The reason to use a generator at all is that human-chosen passwords cluster hard around a small set of predictable patterns, and attackers have known those patterns for twenty years.`,
    steps: [
      "Set the length. Sixteen characters is a sound default; twenty or more for anything that matters.",
      "Choose the character sets to draw from. More sets widen the pool, though length matters more.",
      "Switch on “exclude similar characters” only if a person will have to read or retype this.",
      "Copy the result straight into your password manager rather than anywhere it might be saved as a note.",
    ],
    faq: [
      {
        q: "Are these passwords generated on your server?",
        a: "There is no server involved. Randomness comes from your browser's own secure generator, in this tab, which is why the page still produces passwords with the network disconnected. Nothing generated here is transmitted or recorded anywhere.",
      },
      {
        q: "How long should a password be?",
        a: "Sixteen characters for ordinary accounts, twenty or more for a password manager's master password or anything protecting money or infrastructure. Length is the cheapest strength you can buy — it costs nothing when a manager does the typing.",
      },
      {
        q: "Are symbols necessary?",
        a: "Helpful but overrated. Adding punctuation widens the pool from 62 characters to about 95, which is worth roughly six extra bits on a sixteen-character password. Adding two more characters of length is worth about twelve. Prefer length when a site's rules force a choice.",
      },
      {
        q: "Is a random string better than a passphrase?",
        a: "Per character, yes; in practice it depends on whether you have to remember it. Four random dictionary words carry around 52 bits and can be memorised, which is the right trade for the handful of passwords you must type from memory. Everything else should be random and stored.",
      },
    ],
  },

  "password-strength-checker": {
    intro: `This estimates how long a password would survive a serious guessing attack, and — more usefully — explains which of its properties are working against it.

The calculation starts with the character pool and the length, which together give a theoretical entropy. That number alone is optimistic, because attackers do not guess randomly. They begin with leaked password lists, then dictionary words, then the substitutions people believe are clever, then keyboard runs. So the estimate here is reduced for the patterns that actually shorten a real attack: appearing on lists of the most-guessed passwords, repeating characters, using a single character class, containing counting or keyboard sequences.

The time-to-crack figure assumes an offline attack — the attacker has stolen a database of hashes and is guessing against their own hardware at ten billion attempts per second, which is an ordinary rate for a modern graphics card against a fast hash. That is the pessimistic and correct assumption. A password only ever attacked through a login form with rate limiting would last far longer, but you have no way to know how the site that holds it stores it, and plenty store it badly.

Treat the result as a comparison rather than a promise. It tells you reliably that one password is far weaker than another, and it tells you when something is catastrophically weak. It cannot know whether your particular password appeared in a breach last year, which is the single most important fact about it and the one thing this page cannot see.

Nothing typed here is transmitted. That is the reason a strength checker can be safe to use at all — a page that sent your password somewhere to score it would be doing precisely what you are trying to prevent.`,
    steps: [
      "Type the password you want assessed into the input.",
      "Read the verdict and the entropy figure, then the list of what weakens it underneath.",
      "Change the attacker speed if you want to model a different scenario — a slow hash makes a dramatic difference.",
      "Fix whatever the tool names, or generate a new password instead, which is usually faster than repairing an old one.",
    ],
    faq: [
      {
        q: "Is it safe to type a real password here?",
        a: "Safer than in most places, because the assessment runs in your browser and this page has no backend to receive anything. Verify that the way you would for any such site: disconnect from the network and confirm it still scores what you type.",
      },
      {
        q: "It says my password is strong. Is it definitely safe?",
        a: "It says the password is hard to guess from scratch. It cannot know whether that exact string appeared in a breach, in which case it is already on a list and its structure is irrelevant. Check it against a breach-notification service too.",
      },
      {
        q: "Why did substituting letters for numbers barely help?",
        a: "Because attackers applied those substitutions to their dictionaries decades ago. Turning an “a” into a “4” adds almost nothing to the search space; it merely makes the password harder for you to type.",
      },
      {
        q: "What entropy should I aim for?",
        a: "Sixty bits is a reasonable floor for an ordinary account, eighty and above for anything guarding money, infrastructure or a password vault. Below forty, an offline attack finishes in minutes.",
      },
    ],
  },

  "random-string-generator": {
    intro: `Sometimes what you need is not a password but a token: an API key for a service you are building, a random identifier for a test fixture, a nonce, a share code, a temporary slug. This produces those, in whichever alphabet suits where the value is going.

The randomness comes from your browser's cryptographically secure source, so these are safe to use as real secrets rather than only as placeholders. That is the difference between a generator like this and the quick approach of slicing a random floating-point number into a string, which produces values an attacker can predict from a handful of samples.

The alphabet is the choice that matters. Hexadecimal is the safest thing to put in a URL, a filename or a header, and never needs escaping. Alphanumeric packs more entropy into the same length and remains safe nearly everywhere. Base58 removes the characters people misread — zero, capital O, capital I, lowercase l — which is what you want on anything a human will read from a screen and type somewhere else. The full printable set is densest and the most likely to need escaping somewhere downstream.

Length should follow from purpose. Sixteen hexadecimal characters is 64 bits, ample for an identifier that only has to be unique. Anything acting as a bearer credential — an API key, a reset token, a signed download link — wants at least 128 bits, which is thirty-two hexadecimal characters, because that value is the only thing standing between a stranger and whatever it unlocks.

If what you need is a standard identifier rather than an arbitrary token, use the UUID generator instead: version 4 UUIDs carry 122 bits of randomness in a format every database and language already understands.`,
    steps: [
      "Set the length in characters, remembering that hexadecimal carries four bits per character and alphanumeric closer to six.",
      "Pick the alphabet to match the destination — hexadecimal for URLs and filenames, Base58 for anything read by a person.",
      "Generate as many values as you need; each one is drawn independently from the secure source.",
      "Copy the result. Nothing is kept once the page is closed, so paste it where it belongs before you leave.",
    ],
    faq: [
      {
        q: "Are these strings genuinely random?",
        a: "They come from your browser's cryptographic random source, which is seeded by the operating system's entropy pool and is the same source used for TLS keys. That is as good as randomness gets in software, and it is not the predictable generator ordinary application code usually reaches for.",
      },
      {
        q: "How long should an API key be?",
        a: "At least 128 bits of randomness — thirty-two hexadecimal characters, or twenty-two alphanumeric. That is comfortably beyond brute force, and the extra characters cost nothing since no human types an API key.",
      },
      {
        q: "Which alphabet should I choose?",
        a: "Hexadecimal when the value goes into a URL, a filename or a header and must never need escaping. Base58 when someone will read it aloud or retype it. Alphanumeric when you want density without punctuation causing trouble downstream.",
      },
      {
        q: "Can two generated strings collide?",
        a: "In theory, and in practice never at these lengths. With 128 bits you would need to generate about 2.6 × 10^19 values before a collision became likely, which is more identifiers than any system will ever mint.",
      },
    ],
  },

  "qr-code-generator": {
    intro: `A QR code is a URL, a phone number or a block of text drawn as a grid of squares so a camera can read it. Making one requires no account and no service — the encoding is a published standard, and this page runs it in your browser.

That matters more than it first appears. A great many QR generators produce a code pointing at their own domain, which then redirects to your destination. They call it tracking or dynamic codes, and the consequence is that your code stops working the day that company changes its plans. Codes made here contain your data directly. There is no redirect, no analytics hop, and nothing to expire.

The tool builds codes for a plain link, a Wi-Fi network, a contact card, an SMS, an email or arbitrary text, each following the conventions phone cameras already recognise. The Wi-Fi format is the quietly useful one: a printed code by the door lets a visitor join without anyone reading a password aloud.

Error correction is the setting people change without knowing what it does. QR codes carry redundant data so a damaged or partly obscured code still scans, and the four levels trade capacity for resilience — the highest recovers from about thirty per cent damage but holds substantially less data in the same grid. Use the low or medium levels for a code on a screen, and a high level for anything printed on a surface that will be handled, folded or rained on.

Keep the quiet margin around the code when you place it, keep the contrast strong and dark-on-light, and test the printed result at the size and distance people will actually meet it before you order five hundred of them.`,
    steps: [
      "Choose what the code should contain — a link, a Wi-Fi network, contact details, an SMS, an email or plain text.",
      "Fill in the fields for that type. The tool assembles the payload in the format phone cameras expect.",
      "Raise the error correction level if the code will be printed on something that gets handled.",
      "Download the image and test it with an actual phone, at the size it will be used, before committing it to print.",
    ],
    faq: [
      {
        q: "Will this code expire or stop working?",
        a: "No. Your data is encoded in the pattern itself, so there is no service in the middle that could shut down, rate-limit or start charging. The code will still scan in ten years, on any reader, with no involvement from this site.",
      },
      {
        q: "Can I track how many people scan it?",
        a: "Not with a code made here, because the code points directly at your destination. If you want counts, point it at a URL you control and measure the hits at your end, which keeps the tracking yours rather than someone else's.",
      },
      {
        q: "How much data fits in a QR code?",
        a: "A few thousand characters at the theoretical maximum, but usefully far less. Long payloads produce a dense grid that needs a good camera and a steady hand. Keep links short — under about a hundred characters keeps the pattern comfortably scannable.",
      },
      {
        q: "Which error correction level should I pick?",
        a: "Low or medium for a screen or a clean printed page. High for a sticker, a label on machinery, a menu, or anywhere the surface will be touched, creased or exposed to weather.",
      },
    ],
  },

  "rsa-key-generator": {
    intro: `Public-key cryptography splits a key in two. One half you publish; the other you guard. Anyone can verify a signature or encrypt a message with the public half, and only the private half can produce that signature or read that message. This page generates such a pair, in your browser, and hands you both in PEM format.

The pair is produced by your browser's WebCrypto implementation — the same code path that establishes TLS connections — and it exists nowhere else. Nothing is transmitted, nothing is stored, and reloading the page produces a completely different pair. That last point is worth taking seriously: copy the private key somewhere safe before you navigate away, because it cannot be regenerated and there is no copy to recover.

Choose the purpose before the size. A signing pair uses RSASSA-PKCS1-v1_5, which produces and verifies signatures; an encryption pair uses RSA-OAEP, which encrypts and decrypts. WebCrypto binds a key to its purpose deliberately, and using one for the other is a category error that real cryptographic libraries refuse for good reasons.

On size: 2048 bits remains the standard and is not considered weak. 3072 and 4096 buy more margin at a real cost — generation takes noticeably longer and every operation afterwards is slower. If you are choosing freshly for a system you control and do not need RSA specifically, Ed25519 is faster, smaller and generally the better modern answer. RSA earns its place through compatibility, which is a perfectly good reason to be here.

Remember what a signature does and does not prove. It proves the holder of the private key signed that exact content. It says nothing about who that holder is — establishing that is what certificates and published key fingerprints exist for.`,
    steps: [
      "Choose whether the pair is for signing or for encryption. The two use different algorithms and are not interchangeable.",
      "Pick a key size. 2048 bits unless a specification or a security policy requires more.",
      "Choose the hash. SHA-256 is the sensible default and the widest supported.",
      "Copy both keys out before leaving the page. The private key in particular exists only in this tab and cannot be regenerated.",
    ],
    faq: [
      {
        q: "Is the private key sent to a server?",
        a: "No. Key generation runs in your browser's cryptography engine and both halves are exported locally. There is no request that could carry them and no storage they are written to. Generating with the network disconnected demonstrates it.",
      },
      {
        q: "Is it wise to generate keys in a browser at all?",
        a: "For test keys, development and non-critical signing, it is reasonable — WebCrypto's randomness is the operating system's. For keys protecting production infrastructure or real money, generate them on a machine you control with OpenSSL or an HSM, where the key never passes through a rendering engine at all.",
      },
      {
        q: "What is the difference between the two purposes?",
        a: "A signing key proves you produced something; anyone with the public half can verify it. An encryption key lets anyone with the public half send you something only you can read. WebCrypto restricts a key to the purpose it was created for.",
      },
      {
        q: "Should I use RSA or a modern elliptic curve?",
        a: "Ed25519 for anything new where you control both ends: smaller keys, faster operations, fewer ways to misuse. RSA when you need to interoperate with something that expects it, which is still a great deal of software.",
      },
    ],
  },

  "sign-verify-text": {
    intro: `A digital signature answers a narrow question exactly. Given some text, a signature and a public key, it tells you whether the holder of the matching private key signed that precise text. Not similar text. Not the same text with a trailing newline. That one.

Signing takes your private key and produces a signature over the message. Verifying takes the corresponding public key, the message and the signature, and returns a yes or a no. This page does both, using RSASSA-PKCS1-v1_5 through your browser's cryptography engine, with the keys in the PEM format nearly every tool reads and writes.

Its practical use is provenance where a channel cannot be trusted. Publishing a release note that readers can confirm came from you. Signing a message in a forum where accounts can be impersonated. Checking a statement someone else signed against the public key they published elsewhere. In each case the signature carries the assurance rather than the medium.

The exactness is where people get caught. A single altered character, a converted line ending, an editor that trims trailing whitespace on save — any of these makes verification fail, correctly. That sensitivity is the whole mechanism, not a defect in it, and it is why signed text should be transported as a fixed block rather than pasted through anything that might reformat it.

One limit stated plainly: a valid signature proves control of a private key, and nothing about whose key it is. Binding a key to a person or an organisation requires something outside the mathematics — a certificate authority, a fingerprint published somewhere you already trust, or a key you were handed in person.`,
    steps: [
      "Paste the message into the input, exactly as it will be published or exactly as you received it.",
      "Choose whether you are signing or verifying, then paste the matching PEM key — private to sign, public to verify.",
      "When verifying, also paste the signature you were given.",
      "Set the hash to whatever was used to sign. SHA-256 is the usual choice, and a mismatch here fails verification just as a wrong key would.",
    ],
    faq: [
      {
        q: "Verification failed but I am sure the key is right.",
        a: "Then the message differs from what was signed. Check for a trailing newline, converted line endings, or an editor that reflowed the text. Also confirm the hash matches the one used when signing — SHA-256 and SHA-384 produce entirely different results from the same key.",
      },
      {
        q: "What does a valid signature actually prove?",
        a: "That whoever holds the private key signed exactly this text, and that the text has not changed since. It proves nothing about who that person is. Identity comes from a certificate or a fingerprint you obtained through a channel you already trusted.",
      },
      {
        q: "Does my private key leave this page?",
        a: "It does not. The key is imported into your browser's cryptography engine and used there for the single operation. Nothing is transmitted or retained, and closing the tab discards it entirely.",
      },
      {
        q: "Can I verify something signed by GPG or OpenSSL here?",
        a: "Only if it used plain RSASSA-PKCS1-v1_5 over the raw message with a matching hash. GPG wraps signatures in its own packet format, so its output will not verify here. OpenSSL's raw signature output generally will.",
      },
    ],
  },

  "log-anonymizer": {
    intro: `Sharing a log is how most support requests, bug reports and incident write-ups begin. It is also how customer email addresses, internal IP ranges, session tokens and occasionally card numbers end up in a public issue tracker, where search engines find them.

This tool anonymises a log before it leaves your machine. It recognises email addresses, IPv4 and IPv6 addresses, phone numbers, UUIDs, MAC addresses, API keys and JWTs, card numbers, and usernames embedded in file paths, and replaces each with a placeholder.

The replacement style is where the design earns its keep. Redacting everything to a single marker destroys the log's meaning — you can no longer see that three failed requests came from one address. The default here assigns numbered tokens instead, so every occurrence of a particular value becomes the same tag and different values get different tags. The pattern of the incident survives while the identities do not, which is what makes the log still worth reading.

Card numbers are checked against the Luhn algorithm before being masked, so a sixteen-digit build identifier or order reference passes through untouched while a real card number does not. The JWT and API-key patterns look for the structural shapes those take, and for the long opaque values that follow words like bearer, token and secret.

Say the honest thing about what this can promise: pattern matching finds the shapes it knows. A customer's name in a free-text field, an internal hostname that reveals your architecture, a URL that identifies an account — none of those look like anything in particular, and none will be caught. Run the tool, then read the result before you post it. The tool removes the categories of secret that are mechanically recognisable; the judgement remains yours.`,
    steps: [
      "Paste the log into the input. Large files are fine — it is all processed locally.",
      "Choose the replacement style. Numbered tokens keep the correlation between repeated values, which is usually what makes a log worth reading.",
      "Switch individual categories on or off. Masking usernames from file paths is off by default because it often obscures the very path you are asking about.",
      "Optionally filter to lines containing a keyword, so you share the relevant portion rather than the whole file.",
      "Read the result before you post it. Pattern matching cannot find a secret that does not look like one.",
    ],
    faq: [
      {
        q: "Is my log uploaded to be processed?",
        a: "No, which is the reason this tool exists in this form. A log is exactly the kind of file you should not hand to a third party, so the matching and replacement run in your browser and nothing is transmitted.",
      },
      {
        q: "Why are some sixteen-digit numbers masked and others not?",
        a: "Card numbers are validated with the Luhn checksum first. Real card numbers satisfy it; sequential build numbers and order references almost never do. That check is what stops the tool from mangling every long number in the file.",
      },
      {
        q: "What does the numbered style actually do?",
        a: "It gives each distinct value a stable tag, so one address becomes the same tag everywhere it appears and a second address gets a different one. You keep the ability to see that several events shared a source without knowing what that source was.",
      },
      {
        q: "Is the output safe to publish?",
        a: "Safer, not safe. Everything with a recognisable shape has gone. Names, hostnames, account identifiers in URLs and anything else that reads like ordinary text will still be there, so the result needs a human read before it goes anywhere public.",
      },
    ],
  },

  "hide-text-in-image": {
    intro: `Steganography hides the existence of a message rather than its contents. Encryption produces something obviously secret; a picture with a message in it looks like a picture.

The method here is least-significant-bit substitution. Every pixel stores its red, green and blue channels as numbers from 0 to 255, and altering the last bit of each shifts that channel by one step out of 256 — a change no screen renders differently and no eye detects. Those spare bits, read in sequence, carry your message. A modest photograph holds tens of thousands of characters this way.

Two limits deserve stating before you rely on it. The first is that hiding is not encrypting: anyone who suspects a file and reads its low bits gets your text. That is why this page offers a password, and why using one changes the situation entirely — with a password the hidden bits are AES-256-GCM ciphertext, so discovering them yields nothing without the key. Hiding then buys you the fact that nobody looked, and encryption covers you when somebody does.

The second is fragility. The message lives in the exact pixel values, so anything that recompresses the image destroys it. Saving as JPEG destroys it. Most chat applications and social networks recompress on upload, which destroys it. The output is PNG for that reason, and it must stay PNG and travel by a route that transfers files rather than re-encoding them — an email attachment, a file share, a cloud link.

Used within those limits it is genuinely effective. Used outside them it fails silently, which is the worst way for anything security-adjacent to fail, and the reason both are said plainly here rather than in a footnote.`,
    steps: [
      "Drop in the image that will carry the message. Photographs and detailed pictures hide it better than flat graphics.",
      "Type the message. The result panel reports how many bytes were embedded against what the image could hold.",
      "Add a password unless you genuinely only need concealment — with one, the text is encrypted before it is hidden.",
      "Leave the bits per channel at one unless the message does not fit; two doubles capacity and is slightly more visible in flat areas.",
      "Download the PNG and send it as a file. Any route that recompresses the image erases the message.",
    ],
    faq: [
      {
        q: "Can someone tell the image has a message in it?",
        a: "Not by looking. Statistical analysis of the low bits can suggest it, and anyone who runs the right tool will find the payload. Treat this as concealment from casual inspection, not as resistance to a determined examiner — which is exactly why the password option exists.",
      },
      {
        q: "Why must the output stay a PNG?",
        a: "Because PNG is lossless and JPEG is not. JPEG compression works by discarding detail the eye does not notice, and the low bits carrying your message are precisely that detail. One re-save as JPEG and the message is gone with no warning.",
      },
      {
        q: "How much text can an image hold?",
        a: "About one bit per colour channel per pixel, so roughly three bits per pixel at the default setting. A 1000 by 1000 image holds around 375 KB, which is far more prose than anyone puts in one. The tool refuses and tells you the capacity if the message is too large.",
      },
      {
        q: "Will this survive being posted on social media?",
        a: "No. Essentially every platform recompresses uploaded images, which erases the message. Send the file directly — as an attachment, or through a service that stores files rather than optimising photographs.",
      },
    ],
  },

  "reveal-hidden-text": {
    intro: `The counterpart to the hiding tool. Give it a PNG that carries a concealed message and it will reveal what is in there, reading the low bits back out and reconstructing the text.

It begins by looking for a short marker written into the first bits of the image. Finding it confirms the picture was prepared by these tools and tells the reader how long the payload is and whether it was encrypted. Without that marker the tool stops rather than presenting whatever the low bits happened to contain, which in an ordinary photograph is simply sensor noise rendered as characters.

If the message was hidden with a password, the recovered bits are AES-256-GCM ciphertext and the same password is needed to turn them back into words. Supply it and the text appears; supply the wrong one and decryption fails outright rather than producing a plausible-looking mistake, because the cipher authenticates the whole message before releasing any of it.

When nothing is found, there are three likely explanations and the tool names all of them. The image may genuinely carry nothing. It may have been recompressed since — a JPEG re-save, or an upload through an application that optimises images, both of which erase the payload completely. Or it was hidden at two bits per channel while the reader is set to one, in which case switching the setting and trying again resolves it.

Everything happens in this tab. The image is read by your browser, the message is reconstructed in memory, and the text file offered for download exists only on your machine.`,
    steps: [
      "Drop in the PNG you believe carries a message.",
      "Enter the password if one was used when it was hidden.",
      "Match the bits per channel to the setting used at the time — one is the default, two if the sender needed the capacity.",
      "Download the recovered text. Nothing is retained once the tab closes.",
    ],
    faq: [
      {
        q: "It says no hidden message was found.",
        a: "Three possibilities, in order of likelihood: the image was recompressed after the message was written and the payload is gone; the bits-per-channel setting does not match what was used; or the image never carried anything. A JPEG re-save is by far the most common cause.",
      },
      {
        q: "Can it read messages hidden by other steganography tools?",
        a: "No. It looks for the marker this site writes at the start of the payload. Other tools order the bits differently, spread them across channels differently, or use their own headers, so their output is unreadable here and this tool's output is unreadable there.",
      },
      {
        q: "Do I need the password?",
        a: "Only if the message was encrypted when it was hidden. The header records which it was, so the tool asks for a password precisely when one is required and not otherwise.",
      },
      {
        q: "Does the image get uploaded to be analysed?",
        a: "It does not. The picture is decoded onto a canvas in this tab, the bits are read locally, and any decryption happens in your browser's own cryptography engine. Nothing is transmitted at any stage.",
      },
    ],
  },
};
