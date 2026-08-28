# Sheet 1 of 1 — the MSRX Tools design system

This file is the source of truth. `src/app/globals.css` implements it; if the two
disagree, this document is wrong and should be corrected, not ignored.

## The idea

The site is a structural drawing. **Not a blueprint** — the glowing-cyan-on-navy
blueprint is the reflex answer to "engineering theme" and it is not what modern
structural drawings look like. Real ones are plotted on near-white film in thin
precise linework, annotated in two pens, and signed off in a title block.

That world fits: these tools are instruments, and a drawing sheet is where
instruments are specified.

## Three rules that are not negotiable

**1. A drafting device must encode something true.**
This is what separates the direction from a costume. Every borrowed device maps
to real information:

| Device | What it encodes |
|---|---|
| Grid reference letters (A, B, C…) | the category axis — the same letter in the nav and in the footer's sheet index means the same category |
| Dimension lines | real quantities: tool counts, before/after file sizes |
| Callout bubbles (`01`, `02`…) | numbered because they annotate the hero drawing; the number is a leader, not decoration |
| Title block | the footer: project, sheet count, scale, revision, notes |
| Poché hatch | the workspace — material the section plane cuts through |
| Revision strike | the upload path that was deleted |

A device that only decorates gets cut. Two grid bubbles were removed from the
hero drawing during the build for exactly this reason: they referenced nothing.

**2. Two pens, and the bright one never writes.**
`--pen-new` (#0e7c8a) draws the work and carries text. `--pen-rev` (#c1362f) is
the revision pen and appears **at most once per page** — on the home page it is
the strike through the server path, and nowhere else. `--pen-fill` (#22d3ee) is
brand cyan: it fills marks and rules and never sets type.

Anything sitting on a pen fill uses `--color-on-pen`, which is paired with the
pen so the two invert together. White text on a pen fill is correct in light
mode and unreadable in dark; the token is what makes the rule survive both.

**3. The theme lives in the chrome.**
Sheet grid, grid references, title block, section rules and dimension lines all
belong to the frame. Inside a tool the sheet goes quiet — somebody is trying to
merge a PDF, not admire a drawing. The one exception is the drop zone, which is
poché because it genuinely is the cut.

## Colour

Never write a hex value in a component. Dark mode overrides the generated custom
properties on plain `:root` inside a media query — **`@theme` is only valid at
the top level**, and a nested one silently does nothing.

Dark mode is a negative plot: graphite ground, luminous linework.

## Type

| Role | Face | Where |
|---|---|---|
| Display | **Archivo**, width axis | `.stamp` (wdth 112) for headings, `.stamp-wide` (wdth 125, uppercase) for section titles and the title block |
| Body | **IBM Plex Sans** | prose, help text, tool descriptions |
| Annotation | **IBM Plex Mono** | `.annot` — uppercase, 0.14em tracking. Every dimension, grid reference, callout number and title-block field |

Plex is here on purpose rather than by habit: it was drawn for a technology
company's engineering documentation, which is the register this sheet is written
in. Archivo carries a real width axis, so display lettering can be *stamped*
expanded the way a title block is.

## The signature

Two things, and nothing else competes with them:

1. **The hero assembly drawing** (`components/diagram/hero-assembly.tsx`). The
   claim "your files never leave your device" is a statement about topology, so
   it is drawn as one — with the route to the server plotted and then struck out,
   because the interesting thing about the design is the path that was deleted.
   The linework plots itself in on load, left to right, the way a pen plotter
   lays a sheet down.
2. **The title block** (`components/shell/site-footer.tsx`), carrying real
   values: sheets = tool count, scale = 1:1 because nothing is sent elsewhere to
   be worked on.

## Per-tool drawings

Nine archetypes, not eighty-eight illustrations. `lib/diagram.ts` derives which
one a tool gets from what the registry already knows — how many inputs, how many
outputs, what changed. A tool can therefore never be given a picture that
contradicts what it does. Adding a tool gets a correct drawing for free.

## Motion

The plot animation, once, on the hero. Nothing else animates beyond 140ms colour
transitions. Under `prefers-reduced-motion` the completed drawing is present from
the first frame: a half-plotted drawing is worse than a static one, so
`[data-plot]` has its dash offset forced to zero rather than merely being sped up.

## Custom CSS

All of it goes in `@layer components`. Unlayered CSS beats Tailwind utilities, so
a rule written outside the layer silently defeats every `className` override
placed on that element afterwards.

## Elevation

There isn't any. Drawings do not cast shadows — weight comes from line thickness.
`--shadow-*` survive as near-flat hairlines for the few places a border cannot
reach.
