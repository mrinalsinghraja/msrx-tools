# The Workbench — MSRX Tools design system

This file is the source of truth. `src/app/globals.css` implements it; if the two
disagree, this document is wrong and should be corrected, not ignored.

## The idea

The site is a workbench. A warm paper ground with a faint grain, tools laid out on
it as physical plates, and one recessed well where the work happens. It is
utilitarian rather than decorative — this is a place people come to get something
done and leave.

## Two rules that are not negotiable

**1. The accent never carries small text.**
Brand cyan `#06b6d4` measures 2.4:1 on white and fails WCAG for text at any size
that matters. It fills marks, rules, chips, slider ranges and icon plates.
`--color-accent-ink` (`#075a66`, 7.1:1 on white) carries the words. Dark mode
inverts this: the bright cyan becomes readable on a dark ground and both tokens
point at it.

**2. Depth has direction.**
A plate sits *on* the bench and casts a shadow outward (`.plate`). The workspace is
cut *into* the bench and shadows inward (`.well`). Nothing is both, and nothing
floats without a reason. There is exactly one elevation ladder —
`--shadow-raise` → `--shadow-lift` → `--shadow-float` — and no ad-hoc shadows.

## Type

| Role | Face | Where |
|---|---|---|
| Display | Space Grotesk | h1–h3, section labels, card titles, buttons |
| Body | Inter | prose, help text, descriptions |
| Mono | JetBrains Mono | every input, every result, every figure |

Section labels are uppercase, `text-sm`, `tracking-[0.1em]`, in `--color-ink-soft`.
They are labels for a machine panel, not headings in a document.

Results are always monospace. A formatted JSON document in a proportional face is
unreadable, and consistency across 139 tools matters more than any one tool's ideal.

## Colour tokens

Never write a hex value in a component. Every colour comes from a token so the
dark-mode block in `globals.css` can override all of them in one place.

Dark mode overrides the generated custom properties on plain `:root` inside a
media query. **`@theme` is only valid at the top level** — a nested one silently
does nothing, which is a bug that looks like a working file.

## The signature

The `.bench-rule` under a section heading: a 3px bar whose first 2.5rem is accent
and whose remainder is the line colour. It reads as a machined edge rather than a
hairline, and it is the one recurring ornament. Two motifs maximum; this is one of
them, and the recessed well is the other.

## Custom CSS

All of it goes in `@layer components`. Unlayered CSS beats Tailwind utilities, so a
rule written outside the layer silently defeats every `className` override placed
on that element afterwards.

## Density

Tool cards are dense and scannable — 139 tools means the grid is the navigation.
Card blurbs are capped at 90 characters by the registry test so they stay one line
on desktop.

## Motion

160ms ease on colour, border and shadow. Nothing else animates. The whole thing is
wrapped in a `prefers-reduced-motion` guard.
