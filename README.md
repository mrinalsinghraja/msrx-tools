# MSRX Tools

**[tools.msrx.co.in](https://tools.msrx.co.in)** — 116 file, image, PDF and text tools that run entirely in your browser.

Nothing is uploaded. There is no account, no quota, no paid tier. Open the site in a private window and every tool works.

## Why it's built this way

Most "free online tools" are upload forms. Your file goes to someone's server, gets processed, and you take their word for what happened to it afterwards. That is a bad trade for a file you only wanted to rename.

So the constraint here is architectural, not a promise: the work happens in the page. PDFs go through `pdf-lib` and `pdfjs-dist`, archives through `fflate` (plain JavaScript deflate, not WASM, so it works on a phone and offline), encryption through the Web Crypto API. There is no upload endpoint to trust because there is no upload endpoint.

## What's in it

116 tools across seven categories, counted from the registry rather than typed into this sentence:

| Category | Tools |
|---|---|
| Developer | 28 |
| Text | 20 |
| Security | 18 |
| PDF | 17 |
| Image | 15 |
| Calculators | 15 |
| Files & archives | 3 |

## How it's structured

Every tool is one `ToolSpec` in `src/lib/tools/catalog/` and one content entry beside it. The registry in `src/lib/tools/registry.ts` is the single source of truth — routing, navigation, search, the sitemap, the internal link matrix and the smoke tests all read from it. Adding a tool means adding data, not wiring.

Execution is separated from description. A `ToolSpec` names an engine and an operation; the engines in `src/lib/engines/` (`pdf`, `image`, `archive`, `crypto`, `pure`) do the work and know nothing about pages or routing.

Two build gates worth knowing about:

- **`check:content --strict`** runs in `prebuild`, so a tool added without its written page fails the build. It checks for *reuse* rather than word count — no sentence or eight-word phrase may repeat across pages — because filler is long by nature and length proves nothing. It caught four self-plagiarised sentences mid-write and four defects in pages that had already shipped.
- **449 tests across 16 files**, including an option-contract suite that exists because of a real bug class: a dropdown that silently changed what its neighbours *meant* without changing them. Three tools were affected.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Radix UI · Zustand · pdf-lib · pdfjs-dist · fflate · Web Crypto

The optional per-tool AI assistant calls Groq. Its key is server-side only and never reaches the browser; every tool works with the assistant switched off.

## Running it

```bash
npm install
npm run dev
```

`npm test` runs the suite, `npm run typecheck` the types, `npm run check:content:strict` the content gate.

## Licence

No licence is granted. The source is public to read, not to redistribute.
