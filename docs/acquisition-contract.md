# The 32×48 acquisition contract

Frozen by [#21](https://github.com/jsbellamy/nightglass/issues/21). Reference
implementation: [`prototype/comfyui-fit/acquire.py`](../prototype/comfyui-fit/acquire.py),
tests: [`test_contract.py`](../prototype/comfyui-fit/test_contract.py).

## Shape of the pipeline

```
  provider (ComfyUI / AutoSprite / hand-authored)
      |  ACQUISITION TIME -- online, GPU, non-deterministic, never at build/runtime
      |  alpha is baked here
      v
  raw_rgba/*.png  +  *.workflow.json     <-- the archived raw bundle
      |  OFFLINE -- no provider, no model, no network
      v
  normalize -> validate -> manifest
      v
  runtime/*.png (32x48 RGBA) + manifest.json
```

The boundary is the archived raw bundle. Everything above it is provider-specific
and disposable; everything below it is provider-neutral and reproducible.

## The alpha path

**BiRefNet at acquisition time**, decided in #21 over per-image chroma keying.

BiRefNet is a **core** ComfyUI node (`comfy/background_removal/`, MIT-licensed,
weights recorded in [#18](https://github.com/jsbellamy/nightglass/issues/18)) — no
custom node, so the custom-node security gate stays clean. It writes RGBA into
the raw bundle; the offline normalizer then consumes ordinary RGBA and never
knows a matting model existed.

Measured over the 10 archived Moonberry frames, BiRefNet beat per-image chroma on
detached debris (35 vs 48 px) and interior holes (128 vs 138 px), with zero
background rectangles in either arm. The decisive argument is not those margins
but robustness: chroma keying requires a controlled background, and the Moonberry
mint sits only ~71 RGB units from the cerulean backdrop — uncomfortably close to
the keyer's tolerance of 60, so it risks eating the character's own palette.
BiRefNet has no such coupling, and generalizes to the motion and effect frames
where the background is not controlled.

BiRefNet's soft matte is **binarized at 128** by the normalizer, so it confers no
halo on the runtime frame.

## Normalizer

Deterministic, in order:

1. **Binarize alpha** at 128 — before reduction, so no soft matte survives.
2. **Crop** to the subject's alpha bounding box.
3. **Reduce** nearest-neighbor, aspect preserved, to fit 32×48. No resampling
   filter, no gamma correction.
4. **Bottom-center foot-anchor** onto the 32×48 canvas.
5. **Quantize** opaque pixels nearest-in-RGB to
   [`palette.json`](../prototype/comfyui-fit/palette.json) (`moonberry-16`).
   **No dithering** — neither stochastic nor ordered — so output is a pure
   function of input.

## Validator

A frame is **rejected** for any of:

| Rule | Checked against | Meaning |
| --- | --- | --- |
| wrong dimensions | frame | not exactly 32×48 |
| non-RGBA | frame | mode is not RGBA |
| unapproved alpha | frame | any alpha value other than 0 or 255 |
| embedded effects | frame | any opaque colour off `moonberry-16`; Ability effects are separate assets and must not be baked into a Character frame |
| empty frame | frame | no opaque pixels |
| clipping | **raw** | the generator cut the subject off at the raw canvas edge |
| unstable baseline | sequence | the foot baseline row differs between frames of one animation, which would make the Character slide vertically in the Battle Tile |

**Clipping is checked against the raw, not the frame.** `normalize` scales to fit,
so a subject touching the 32×48 canvas edge is the expected result rather than
damage — and once reduced, a cut-off character is indistinguishable from a whole
one. The evidence only exists upstream.

## Manifest

All timings are **integer milliseconds**; floats, zero, and negatives are
rejected, as are cues outside `0..total_ms`. Each manifest records the action,
frame size, palette id, `baseline_row`, per-frame `duration_ms` and pixel
`sha256`, named `cues_ms` (e.g. `impact`), and the `source` provenance block.

## Reproducibility

Verified in #21: rebuilding the canonical frames in a clean venv containing only
Pillow — no `torch`, no `comfy`, network unused — produces **byte-identical PNG
files** to the build made inside the ComfyUI venv, across two different Pillow
versions (12.2 and 12.3).

Quantization measurably earns its place. A FLUX render reduced to 32×48 is not
cel-flat — before quantization the canonical Knight frame holds **716 distinct
colours across 835 opaque pixels**, with 91% of pixels differing from all four
neighbours. Quantizing to `moonberry-16` collapses that to **15 colours and 30%
isolated pixels**, without any dithering.

## Known limits

- The **embedded-effects rule is a palette check**, so it catches off-palette
  glows but would not catch an effect drawn entirely in approved colours. That is
  acceptable while effects are authored separately (per
  [#20](https://github.com/jsbellamy/nightglass/issues/20)) and should be
  revisited if that changes.
- **Interior holes (~128 px across 10 frames) and detached debris (~35 px) are
  reduction artifacts, not alpha artifacts** — they appear near-identically in
  both alpha arms. Thin features such as a sword blade drop out under
  nearest-neighbor reduction. No alpha path fixes this; it needs deliberate
  authoring at native scale, consistent with the readability caveat already
  recorded in #15.
- **~30% of opaque pixels remain isolated after quantization** — a residue of
  reducing a detailed 512×768 render to 32×48, not a palette defect. It is the
  same root cause as the readability caveat in #15 and wants authoring at native
  scale rather than a contract change.
- `moonberry-16` is derived from two static references. It will likely need
  extending once motion and a fuller cast exist; the palette is versioned
  (`"version": 1`) for that reason.
