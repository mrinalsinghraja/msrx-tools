"""
Recolours the supplied MSRX Tools logo into the drawing sheet's own ink.

The artwork arrives as an RGB PNG with a baked near-white ground and a wide
white margin, which is why it had to be framed as a white plate to sit on the
film at all — and a bright white card carrying a glossy app-icon reads as a
sticker from another product, not as part of the sheet.

Nothing about the form changes. The mark is cropped to its own ink, the white
ground is turned into real transparency, and the colour ramp is moved into the
palette this site already uses: brand cyan stays, because #22d3ee is literally
`--color-pen-fill` in globals.css, and the violet end travels to the deep pen
instead. The wordmark becomes graphite, like every other piece of lettering here.

Two editions come out, because a transparent mark inked in graphite disappears on
the dark sheet. Run: python3 scripts/logo-sheet-edition.py
"""

import colorsys
from pathlib import Path

from PIL import Image

SOURCE = Path("public/brand/msrx-tools-logo.png")
OUT_LIGHT = Path("public/brand/msrx-tools-logo-sheet.png")
OUT_DARK = Path("public/brand/msrx-tools-logo-sheet-dark.png")

# The gradient's own span in the source artwork: cyan through to violet.
HUE_START, HUE_END = 180.0, 290.0

EDITIONS = {
    OUT_LIGHT: {
        # Brand cyan is kept at the cyan end — it is already a token here.
        "ramp": ((0x22, 0xD3, 0xEE), (0x09, 0x5D, 0x68)),
        "ink": (0x14, 0x17, 0x1A),  # --color-graphite
    },
    OUT_DARK: {
        "ramp": ((0x7E, 0xE6, 0xF2), (0x22, 0xD3, 0xEE)),
        "ink": (0xEC, 0xEE, 0xF0),  # --color-graphite, dark theme
    },
}

MARGIN = 18  # a hairline of air around the ink, in source pixels


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    width, height = source.size
    pixels = source.load()

    # Crop to the ink. The source carries roughly a fifth of its width in white
    # margin, which is padding we would rather control in CSS.
    left, top, right, bottom = width, height, 0, 0
    depths = []
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            depth = 255 - min(r, g, b)
            if depth < 12:
                continue
            depths.append(depth)
            left, right = min(left, x), max(right, x)
            top, bottom = min(top, y), max(bottom, y)

    depths.sort()
    # A high percentile rather than the maximum, so one stray dark pixel cannot
    # set the scale and wash the whole mark out.
    full = depths[int(len(depths) * 0.92)]

    box = (
        max(0, left - MARGIN),
        max(0, top - MARGIN),
        min(width, right + 1 + MARGIN),
        min(height, bottom + 1 + MARGIN),
    )

    for path, edition in EDITIONS.items():
        out = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
        target = out.load()

        for y in range(box[1], box[3]):
            for x in range(box[0], box[2]):
                r, g, b = pixels[x, y]
                depth = 255 - min(r, g, b)
                if depth < 4:
                    continue

                # Coverage, not luminance: the ground is white, so how far a
                # pixel sits from white is how much ink is on it.
                alpha = min(255, round(depth / (full * 0.62) * 255))
                hue, lightness, saturation = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)

                # "TOOLS" is set in a dark navy that is saturated enough to look
                # like gradient ink to a naive test, so lightness decides too:
                # the gradient is light, the lettering is not.
                if saturation > 0.30 and lightness > 0.28:
                    position = (hue * 360 - HUE_START) / (HUE_END - HUE_START)
                    colour = lerp(*edition["ramp"], min(1.0, max(0.0, position)))
                else:
                    colour = edition["ink"]

                target[x - box[0], y - box[1]] = (*colour, alpha)

        out.save(path, optimize=True)
        print(f"{path}  {out.size[0]}x{out.size[1]}")


if __name__ == "__main__":
    main()
