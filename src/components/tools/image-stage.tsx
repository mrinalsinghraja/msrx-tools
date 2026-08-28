"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { OptionValue, OptionValues, ToolSpec } from "@/lib/tools/types";
import { cn } from "@/lib/utils";

/**
 * The image itself, with a draggable selection over it.
 *
 * Cropping by typing four numbers into four boxes and hoping is not cropping,
 * it is guessing — and the guess is only checked after the file has been
 * produced and downloaded. This puts the picture on screen and lets the region
 * be drawn on it.
 *
 * The selection is held as a percentage of the image throughout, never as
 * pixels. A rectangle drawn on screen means the same thing whatever the source
 * resolution, and percentages are what makes the preview beside it correct at
 * any scale.
 */

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Handle = "nw" | "ne" | "sw" | "se" | "move" | "new";

const HANDLE_HIT = 14;

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

function ratioOf(key: string): number | null {
  const [w, h] = key.split(":").map(Number);
  return w && h ? w / h : null;
}

export function ImageStage({
  tool,
  file,
  values,
  onChange,
}: {
  tool: ToolSpec;
  file: { name: string; bytes: Uint8Array };
  values: OptionValues;
  onChange: (id: string, value: OptionValue) => void;
}) {
  const region = tool.stage?.region;
  const boxRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<{ src: string; width: number; height: number } | null>(null);
  const [drag, setDrag] = useState<{ handle: Handle; startX: number; startY: number; origin: Region } | null>(null);

  const url = useMemo(
    () => URL.createObjectURL(new Blob([file.bytes as unknown as BlobPart])),
    [file],
  );
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  // Tagged with the URL it came from: a stale size would let the aspect lock
  // reshape the new image using the old one's proportions.
  const natural = measured?.src === url ? measured : null;

  const read = useCallback(
    (id: string | undefined, fallback: number) => {
      if (!id) return fallback;
      const raw = values[id];
      const value = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(value) ? value : fallback;
    },
    [values],
  );

  // Values are read back as percentages, which is what the stage always writes.
  const current: Region = region
    ? {
        x: clamp(read(region.x, 10), 0, 100),
        y: clamp(read(region.y, 10), 0, 100),
        width: clamp(read(region.width, 80), 1, 100),
        height: clamp(read(region.height, 80), 1, 100),
      }
    : { x: 0, y: 0, width: 100, height: 100 };

  const aspect = region?.aspect ? ratioOf(String(values[region.aspect] ?? "free")) : null;

  const write = useCallback(
    (next: Region) => {
      if (!region) return;
      // Writing the unit alongside the numbers is not tidiness: leaving it on
      // pixels would silently reinterpret a percentage as a pixel count, which
      // is the exact class of bug the option contract exists to prevent.
      if (region.unit && String(values[region.unit]) !== "percent") onChange(region.unit, "percent");
      onChange(region.x, Math.round(next.x * 10) / 10);
      onChange(region.y, Math.round(next.y * 10) / 10);
      onChange(region.width, Math.round(next.width * 10) / 10);
      onChange(region.height, Math.round(next.height * 10) / 10);
    },
    [onChange, region, values],
  );

  function pointIn(box: DOMRect, clientX: number, clientY: number) {
    return {
      x: clamp(((clientX - box.left) / box.width) * 100, 0, 100),
      y: clamp(((clientY - box.top) / box.height) * 100, 0, 100),
    };
  }

  useEffect(() => {
    if (!drag || !region) return;

    function onMove(event: PointerEvent) {
      if (!drag) return;
      const box = boxRef.current?.getBoundingClientRect();
      if (!box) return;
      const point = pointIn(box, event.clientX, event.clientY);

      let next: Region;

      if (drag.handle === "move") {
        const dx = point.x - drag.startX;
        const dy = point.y - drag.startY;
        next = {
          ...drag.origin,
          x: clamp(drag.origin.x + dx, 0, 100 - drag.origin.width),
          y: clamp(drag.origin.y + dy, 0, 100 - drag.origin.height),
        };
      } else {
        // Every corner drag is expressed as two opposite points, so the anchor
        // is whichever corner is not moving and the rectangle is normalised
        // afterwards. That is what lets a drag cross its own start point.
        const anchorX = drag.handle === "nw" || drag.handle === "sw" ? drag.origin.x + drag.origin.width : drag.origin.x;
        const anchorY = drag.handle === "nw" || drag.handle === "ne" ? drag.origin.y + drag.origin.height : drag.origin.y;
        const ax = drag.handle === "new" ? drag.startX : anchorX;
        const ay = drag.handle === "new" ? drag.startY : anchorY;

        next = {
          x: Math.min(ax, point.x),
          y: Math.min(ay, point.y),
          width: Math.abs(point.x - ax),
          height: Math.abs(point.y - ay),
        };
      }

      if (aspect && natural) {
        // The ratio is of the finished picture, and a percentage of a wide
        // image is not the same distance as a percentage of a tall one — so the
        // lock has to be applied in pixels and converted back.
        const pixelWidth = (next.width / 100) * natural.width;
        const pixelHeight = (next.height / 100) * natural.height;
        if (pixelWidth / pixelHeight > aspect) {
          next.width = ((pixelHeight * aspect) / natural.width) * 100;
        } else {
          next.height = ((pixelWidth / aspect) / natural.height) * 100;
        }
        next.x = clamp(next.x, 0, 100 - next.width);
        next.y = clamp(next.y, 0, 100 - next.height);
      }

      next.width = clamp(next.width, 1, 100 - next.x);
      next.height = clamp(next.height, 1, 100 - next.y);
      write(next);
    }

    function onUp() {
      setDrag(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, aspect, natural, region, write]);

  function begin(handle: Handle) {
    return (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const box = event.currentTarget.closest("[data-stage]")?.getBoundingClientRect();
      if (!box) return;
      const point = pointIn(box, event.clientX, event.clientY);
      setDrag({ handle, startX: point.x, startY: point.y, origin: current });
    };
  }

  /** Keyboard nudging, so the selection is not mouse-only. */
  function onKeyDown(event: React.KeyboardEvent) {
    if (!region) return;
    const step = event.shiftKey ? 10 : 1;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = map[event.key];
    if (!delta) return;
    event.preventDefault();
    write({
      ...current,
      x: clamp(current.x + delta[0], 0, 100 - current.width),
      y: clamp(current.y + delta[1], 0, 100 - current.height),
    });
  }

  const pixels = natural
    ? {
        x: Math.round((current.x / 100) * natural.width),
        y: Math.round((current.y / 100) * natural.height),
        width: Math.round((current.width / 100) * natural.width),
        height: Math.round((current.height / 100) * natural.height),
      }
    : null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="annot">{region ? "Select the area" : "Your image"}</h2>
        {natural ? (
          <span className="font-mono text-xs text-graphite-faint">
            {natural.width} × {natural.height}
            {pixels && region ? ` · selection ${pixels.width} × ${pixels.height}` : ""}
          </span>
        ) : null}
      </div>

      <div className="well overflow-hidden rounded-lg p-3">
        <div
          ref={boxRef}
          data-stage=""
          className={cn(
            "relative mx-auto max-h-[26rem] w-fit max-w-full select-none",
            region && "cursor-crosshair",
          )}
          onPointerDown={region ? begin("new") : undefined}
        >
          {/* A blob URL built from the visitor's own file. next/image would want a
              loader and a host, and there is neither. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={file.name}
            draggable={false}
            onLoad={(event) =>
              setMeasured({
                src: url,
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            className="block max-h-[26rem] w-auto max-w-full rounded"
          />

          {region ? (
            <>
              {/* Everything outside the selection is dimmed, so the region reads
                  as what survives rather than as a rectangle lying on top. */}
              <div className="pointer-events-none absolute inset-0">
                <div
                  className="absolute inset-0 bg-[#0b0d10]/55"
                  style={{
                    clipPath: `polygon(0% 0%, 0% 100%, ${current.x}% 100%, ${current.x}% ${current.y}%, ${current.x + current.width}% ${current.y}%, ${current.x + current.width}% ${current.y + current.height}%, ${current.x}% ${current.y + current.height}%, ${current.x}% 100%, 100% 100%, 100% 0%)`,
                  }}
                />
              </div>

              <div
                role="group"
                tabIndex={0}
                aria-label="Selected area. Arrow keys move it, shift for larger steps."
                onKeyDown={onKeyDown}
                onPointerDown={begin("move")}
                className="absolute cursor-move outline outline-2 outline-pen-fill focus-visible:outline-4"
                style={{
                  left: `${current.x}%`,
                  top: `${current.y}%`,
                  width: `${current.width}%`,
                  height: `${current.height}%`,
                }}
              >
                {/* Thirds, which is what people actually compose against. */}
                <div className="pointer-events-none absolute inset-0 opacity-40">
                  <div className="absolute inset-y-0 left-1/3 w-px bg-white" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-white" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white" />
                </div>

                {(["nw", "ne", "sw", "se"] as const).map((handle) => (
                  <span
                    key={handle}
                    onPointerDown={begin(handle)}
                    style={{ width: HANDLE_HIT, height: HANDLE_HIT }}
                    className={cn(
                      "absolute rounded-full border-2 border-pen-fill bg-sheet",
                      handle === "nw" && "-left-1.5 -top-1.5 cursor-nwse-resize",
                      handle === "ne" && "-right-1.5 -top-1.5 cursor-nesw-resize",
                      handle === "sw" && "-bottom-1.5 -left-1.5 cursor-nesw-resize",
                      handle === "se" && "-bottom-1.5 -right-1.5 cursor-nwse-resize",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {region ? (
        <p className="text-xs leading-relaxed text-graphite-faint">
          Drag on the picture to draw a new area, drag inside it to move it, or drag a corner to
          resize. The number boxes follow along, and the arrow keys nudge the selection when it has
          focus.
          {batchNote(tool)}
        </p>
      ) : null}
    </section>
  );
}

/** Said once, where it matters: the stage shows one file and the run does all of them. */
function batchNote(tool: ToolSpec) {
  return tool.accepts?.multiple
    ? " The area you draw here is applied to every file you have added."
    : "";
}
