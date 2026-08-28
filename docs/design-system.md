# Plotted on the plan — the MSRX Tools design system

This file is the source of truth. `src/app/globals.css` implements it; if the two
disagree, this document is wrong and should be corrected, not ignored.

## The idea, and the mistake it corrects

The site is a structural drawing. **Not a blueprint** — the glowing-cyan-on-navy
blueprint is the reflex answer to "engineering theme" and it is not what modern
structural drawings look like. Real ones are plotted on near-white film in thin
precise linework, annotated in two pens, and signed off in a title block.

The first attempt at this direction got the vocabulary right and the *placement*
wrong. It drew engineering diagrams and set each one in a bordered box in the
corner of a page — the hero got an assembly drawing, every tool page got one of
nine derived archetypes. However well-derived the drawing inside it was, a
picture in a box beside a heading is a stock-photo slot, and it reads as one.

**So the plan stopped being an object on the page and became the ground the page
is plotted on.** It is fixed behind every route, and the surfaces above it are
translucent so it reads through them. A substrate cannot be mistaken for stock
art, because it is not art placed on the page — it is what the page is on.

## Three rules that are not negotiable

**1. A drafting device must encode something true.**
This is what separates the direction from a costume:

| Device | What it encodes |
|---|---|
| Margin grid bubbles (A, B, C…) | the category axis. Same letters as the header nav and the footer sheet index, and **the bubble for the category you are in is inked** |
| Dimension chain | a real quantity: on the home page, the distance a file travels |
| Specification block | the tool's registry entry — accepts, returns, engine, size, uploads |
| Title block | the footer: project, sheet count, scale, revision |
| Poché hatch | the workspace — material the section plane cuts through |
| Revision strike | the upload path that was deleted |

A device that only decorates gets cut. The numbered callout bubbles went with the
hero drawing: once there was no drawing above them to annotate, the numbers were
leaders pointing at nothing.

**2. Two pens, and the bright one never writes.**
`--pen-new` (#0e7c8a) draws the work and carries text. `--pen-rev` (#c1362f) is
the revision pen and appears **at most once per page** — on the home page it is
the struck-through upload path, and nowhere else. `--pen-fill` (#22d3ee) is brand
cyan: it fills marks and never sets type.

Anything sitting on a pen fill uses `--color-on-pen`, paired with the pen so the
two invert together. White on a pen fill is correct in light mode and unreadable
in dark; the token is what makes the rule survive both.

**3. The ground stays under.**
It should be felt at a glance and only resolve into a real framing plan when
looked at. `--color-plan-*` is deliberately separate from `--color-construction`:
construction linework is drawn *on* the sheet at readable weight, the plan is
drawn *under* it and has to survive being nearly invisible. Tying them together
means every attempt to strengthen a border also shouts the background.

## The plan ground

`components/shell/plan-ground.tsx`, mounted once in the root layout so every
route sits on it by construction and a new page cannot be added without it.

- **The field** — a tiled SVG pattern. One bay is 256px; the tile is 512 so a
  diagonal brace lands in one bay out of four. Bracing selected bays rather than
  all of them is what separates a framing plan from graph paper. Columns are
  small filled squares at every grid intersection.
- **The margin band** — grid bubbles at the left sheet margin, wide screens only.
  Below `xl` the header's category strip carries the same letters, so no
  information is lost; the margin is what the wider format has room for.
- The layer is promoted with `translateZ(0)`. A viewport-sized tiled SVG that
  never changes should be rasterised once, not re-painted on every scroll frame.

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
| Annotation | **IBM Plex Mono** | `.annot` — uppercase, 0.14em tracking. Every dimension, grid reference, spec label and title-block field |

Plex is here on purpose rather than by habit: it was drawn for a technology
company's engineering documentation, which is the register this sheet is written
in. Archivo carries a real width axis, so display lettering can be *stamped*
expanded the way a title block is.

## The signature

Three things, and nothing else competes with them:

1. **The plan ground** — the direction itself.
2. **The hero dimension and revision note.** The claim "your files never leave
   your device" is a statement about distance travelled, so it is stated as a
   dimension: one line, at the measure of the text, with the measurement broken
   into it. Under it, the revision note strikes the path that was deleted. Both
   are HTML at text scale — no box, no picture.
3. **The specification block** (`components/tools/spec-block.tsx`), the panel on
   every tool page. Every row is read from the registry, so a row can never
   disagree with the tool it describes and a new tool gets a correct panel free.
   It replaced the per-tool illustration and is strictly more useful than it was.

## Motion

The plan fades in once, on load. Nothing else animates beyond 140ms colour
transitions. Under `prefers-reduced-motion` the ground is present from the first
frame.

## Custom CSS

All of it goes in `@layer components`. Unlayered CSS beats Tailwind utilities, so
a rule written outside the layer silently defeats every `className` override
placed on that element afterwards.

## Elevation

There isn't any. Drawings do not cast shadows — weight comes from line thickness,
and depth comes from the ground reading through a translucent surface. `.plate`
and `.pane` are deliberately not opaque; making them solid is what would turn the
plan back into wallpaper behind a page instead of a substrate under one.
