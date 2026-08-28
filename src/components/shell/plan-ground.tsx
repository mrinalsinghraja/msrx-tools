"use client";

import { usePathname } from "next/navigation";

import { CATEGORIES } from "@/lib/tools/categories";
import { toolsInCategory } from "@/lib/tools/registry";

/**
 * The structural framing plan every page is plotted on.
 *
 * This is the design. The previous version of the site drew engineering
 * diagrams and set them in boxes on the page, which is a stock-photo slot
 * however well the drawing inside it was derived. Here the plan is the ground
 * instead of an object: fixed to the viewport, sat under everything, and the
 * content surfaces above are translucent so it reads through them.
 *
 * Two things are drawn:
 *
 *   The field — a tiled column grid with nodes at the intersections and a
 *   diagonal brace in one bay of every four, which is what separates a framing
 *   plan from graph paper.
 *
 *   The margin band — grid bubbles carrying the category letters. These are the
 *   same letters as the header nav and the footer's sheet index, and the bubble
 *   for the category you are currently in is inked. That is what makes this a
 *   drawing of the site rather than a texture: the ground states where on the
 *   plan you are standing.
 *
 * Mounted once in the root layout, so it is on every route by construction and
 * cannot be forgotten on a new page.
 */
export function PlanGround() {
  const pathname = usePathname();
  const populated = CATEGORIES.filter((category) => toolsInCategory(category.id).length > 0);

  // The first path segment is the category slug on both `/pdf` and `/pdf/merge-pdf`.
  const segment = pathname.split("/")[1] ?? "";
  const activeIndex = populated.findIndex((category) => category.slug === segment);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      /*
        Promoted to its own compositor layer. A viewport-sized tiled SVG that
        never changes is exactly what a browser should rasterise once and then
        leave alone, rather than re-paint on every scroll frame.
      */
      style={{ transform: "translateZ(0)" }}
    >
      <svg
        data-plan
        className="h-full w-full"
        style={{ animation: "plan-in 900ms ease both" }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/*
            One bay is 256px. The tile is 512 so a brace lands in one bay out of
            four — regular enough to be a system, sparse enough not to be
            wallpaper. Major lines sit at 128 and 384 inside the tile so the
            nodes are never clipped by the tile edge.
          */}
          <pattern id="plan-bay" width="512" height="512" patternUnits="userSpaceOnUse">
            <g stroke="var(--color-plan-minor)" strokeWidth="1">
              {[0, 64, 192, 256, 320, 448, 512].map((n) => (
                <line key={`v${n}`} x1={n} y1="0" x2={n} y2="512" />
              ))}
              {[0, 64, 192, 256, 320, 448, 512].map((n) => (
                <line key={`h${n}`} x1="0" y1={n} x2="512" y2={n} />
              ))}
            </g>

            {/* Column lines: the beams. */}
            <g stroke="var(--color-plan-major)" strokeWidth="1">
              <line x1="128" y1="0" x2="128" y2="512" />
              <line x1="384" y1="0" x2="384" y2="512" />
              <line x1="0" y1="128" x2="512" y2="128" />
              <line x1="0" y1="384" x2="512" y2="384" />
            </g>

            {/* The brace, in one bay. A plan braces selected bays, not all. */}
            <line
              x1="128"
              y1="384"
              x2="384"
              y2="128"
              stroke="var(--color-plan-minor)"
              strokeWidth="1"
            />

            {/* Columns, at every grid intersection. */}
            <g fill="var(--color-plan-node)">
              {[128, 384].map((x) =>
                [128, 384].map((y) => (
                  <rect key={`${x}-${y}`} x={x - 2.5} y={y - 2.5} width="5" height="5" />
                )),
              )}
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#plan-bay)" />
      </svg>

      {/*
        The margin band. Wide screens only — below that the header's category
        strip carries the same letters, so nothing is lost, this is the sheet
        margin the wider format has room for.
      */}
      <div className="absolute inset-y-0 left-3 hidden w-7 flex-col justify-center gap-6 xl:flex">
        <span className="h-10 w-px self-center bg-plan-major" />
        {populated.map((category, index) => {
          const active = index === activeIndex;
          return (
            <span
              key={category.id}
              className={`flex size-7 items-center justify-center rounded-full border font-mono text-[10px] transition-colors ${
                active
                  ? "border-pen-new bg-pen-new text-on-pen"
                  : "border-plan-major bg-transparent text-graphite-faint/70"
              }`}
            >
              {String.fromCharCode(65 + index)}
            </span>
          );
        })}
        <span className="h-10 w-px self-center bg-plan-major" />
      </div>
    </div>
  );
}
