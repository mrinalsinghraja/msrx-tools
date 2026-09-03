# Third-party licences

Every dependency that ships to a visitor's browser, and what its licence asks of
us. This exists because two of them are copyleft, and a public site that ships
copyleft code without saying so is not complying with anything.

## Engines

| Component | Version | Licence | Where it runs |
|---|---|---|---|
| [pdf-lib](https://github.com/Hopding/pdf-lib) | 1.17.1 | MIT | Structural PDF work — merge, split, rotate, stamp |
| [pdf.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist`) | 6.2.108 | Apache-2.0 | Rendering PDF pages and reading their text |
| [qpdf](https://github.com/qpdf/qpdf) via `@neslinesli93/qpdf-wasm` | qpdf 12.2.0 / wrapper 0.3.0 | Apache-2.0 (qpdf), ISC (wrapper) | Unlock PDF and Protect PDF |
| [LAME](https://lame.sourceforge.io) via `@breezystack/lamejs` | 1.2.7 | **LGPL-3.0** | MP3 encoding in the audio tools |
| [fflate](https://github.com/101arrowz/fflate) | 0.8.3 | MIT | Zip, unzip, EPUB, "download all" |
| [SheetJS](https://sheetjs.com) — *not used* | — | — | Considered for spreadsheets, not shipped |

Everything else in `package.json` that reaches the browser — React, Next.js,
Radix, lucide, zustand, marked, turndown, papaparse, yaml, smol-toml, diff,
qrcode, fast-xml-parser — is MIT or Apache-2.0 and carries no obligation beyond
retaining the notices, which the bundler does.

## The LGPL one

`@breezystack/lamejs` is a JavaScript port of LAME, licensed LGPL-3.0. It is
used **unmodified**, imported as a whole from npm and dynamically loaded by
`src/lib/engines/audio/codec.ts`. Nothing here is a derived work of it.

What that licence asks, and how this repository answers:

- **Say it is there, and under what licence.** This file, plus a named section
  in the site's own terms of use ("Open source components"), so the notice is
  somewhere a visitor actually lands.
- **Let someone replace it with their own build.** The import is a single
  dynamic `import("@breezystack/lamejs")` in one file, and the package is pinned
  in `package.json`. Swapping in a different LAME build is a one-line change to a
  file whose source is public.
- **Provide the library's source.** It is published on npm and on
  [GitHub](https://github.com/gideonstele/lamejs) under its own licence; the
  unmodified `LICENSE` ships inside `node_modules/@breezystack/lamejs`.

If MP3 output ever needs to stop depending on an LGPL library, the replacement
is WebCodecs `AudioEncoder`, which is in every current browser but not in enough
older ones to rely on today.

## Video

- **Mediabunny** — MPL-2.0. Reads and writes MP4, MOV, WebM, MKV, MPEG-TS, MP3,
  WAV and Ogg containers in TypeScript, and drives the browser's own WebCodecs
  encoders and decoders. MPL is file-level copyleft: it attaches to Mediabunny's
  own files, not to the code that imports them. Nothing in it is modified here,
  so the obligation is to keep the notice, which the unmodified `LICENSE` inside
  `node_modules/mediabunny` satisfies.

  No codec ships with it. Every encoder and decoder the video tools use is part
  of the browser already, which is why there is no WebAssembly blob behind this
  category and no patent question for this project to answer — the same H.264
  decoder that plays video on any other website does the work here.

- **gifenc** — MIT. Colour quantisation and GIF writing, for Video to GIF.
  Roughly ten kilobytes and loaded only on that page.

## What was deliberately not used

- **MuPDF** — AGPL-3.0. Excellent renderer; the licence would reach the whole
  site, which is not a trade this project is willing to make.
- **FFmpeg (`@ffmpeg/ffmpeg`)** — the default build is LGPL and the `-gpl` build
  is GPL. Not shipped, and the reasons have only got stronger since the video
  tools arrived:

  1. **Size.** The core is around thirty megabytes of WebAssembly, downloaded
     before the first click can do anything.
  2. **Cross-origin isolation.** The multithreaded build needs
     `SharedArrayBuffer`, which needs COOP and COEP headers. `require-corp`
     breaks third-party fonts and embeds across every other page on this site,
     so the cost would fall on the hundred and twenty tools that have no use
     for it.
  3. **Licence.** A GPL build served to a browser is distribution, and that is
     a question this project would rather not have to answer.

  The audio tools are arithmetic in `src/lib/engines/audio/dsp.ts`, and the
  video tools use WebCodecs — the codecs the browser already ships in order to
  play video — through Mediabunny.

## The AI tools: what was deliberately not built

Four things people expect beside a set of AI writing tools are missing on
purpose. Recording the reasons here so the question does not get reopened
without them.

- **AI content detector.** Not shipped. Detectors do not work reliably, and
  their errors are not randomly distributed — they fall hardest on non-native
  writers and on anyone with a plain, regular style. The output of one is used
  to accuse real students of cheating. A tool this site cannot make accurate is
  a tool this site should not offer, and a confident percentage would be the
  most harmful possible way to present it.

- **Plagiarism checker.** Not possible here and not honest to fake. Real
  plagiarism detection requires a web-scale index of existing documents to
  compare against. A language model asked whether text is plagiarised will
  produce a fluent answer with no index behind it at all.

- **Fact checker.** Not shipped. A model has no live sources and cannot verify
  a claim; asked to, it produces confident agreement or confident disagreement
  from the same place it produces everything else. A tool that appears to
  verify facts and does not is worse than no tool.

- **AI humanizer.** Not shipped under that name or that purpose. The product
  being sold elsewhere is detector evasion, which is only useful for passing
  generated work off as one's own — and which does not reliably work either.
  The legitimate half of the demand, making generated prose read less
  mechanically, is served by the Tone Changer and the Text Simplifier, which
  say what they do.

The Readability Checker is in the AI category and is not an AI tool. Reading
scores are arithmetic from 1948 to 1975 and run in the browser like the rest of
the site. It is grouped there because that is where people look for it.
