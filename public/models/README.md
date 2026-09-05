# Models served from this origin

## u2netp.onnx

The small ("portable") variant of **U²-Net**, used by the AI Background Remover
to tell subject from background.

| | |
|---|---|
| Size | 4,574,861 bytes |
| SHA-256 | `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8` |
| Input | `float32[1,3,320,320]`, ImageNet-normalised NCHW |
| Output | seven tensors; the first, `float32[1,1,320,320]`, is the mask |
| Licence | Apache-2.0 |
| Upstream | <https://github.com/xuebinqin/U-2-Net> |
| Retrieved from | <https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx> |

### Why this model and not a better one

The full U²-Net scores higher on fine detail and is 176 MB, which is not a
download to hand someone who wanted to cut out one photograph. The portable
variant is 4.4 MB for most of the quality.

BRIA's RMBG-1.4 is better than both and is licensed **CC BY-NC** — non-commercial
only. This site is free to use, which is not the same thing as non-commercial,
and it sits on a domain alongside other work. Apache-2.0 removes the question
entirely, so the slightly weaker model is the deliberate choice rather than the
convenient one.

### Why it is committed rather than downloaded at build time

`public/vendor/` is generated from npm packages and gitignored. This model is not
an npm package, and a build that reaches out to a GitHub release is a build that
fails the day that URL moves. Four megabytes in the repository buys a build that
works offline and produces the same bytes every time.

The hash above is checked by `src/lib/engines/__tests__/matte.test.ts` — if the
file is ever replaced, that test says so rather than the tool quietly getting
worse.
