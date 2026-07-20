# The 32×48 acquisition contract

Frozen by [#21](https://github.com/jsbellamy/nightglass/issues/21) and amended
by [#29](https://github.com/jsbellamy/nightglass/issues/29) after the provider
decision in [#22](https://github.com/jsbellamy/nightglass/issues/22). Reference
implementation: [`pipeline/acquire.py`](../pipeline/acquire.py),
tests: [`pipeline/test_contract.py`](../pipeline/test_contract.py).

## Shape of the pipeline

```
  external image model (Grok / GPT)
      |  ACQUISITION TIME -- online, non-deterministic, never at build/runtime
      |  exact prompt: 32×48 logical grid rendered large on flat #ff00ff
      v
  grid_raw/*.png + *.source.json          <-- archived raw bundle
      |  OFFLINE -- no provider, model, GPU, or network
      v
  fixed-key alpha -> detect grid -> sample cells -> anchor -> quantize
      v
  runtime/*.png (32×48 RGBA) + manifest.json
```

The boundary is the archived raw bundle. The provider's PNG is copied there
byte-for-byte and its SHA-256 is frozen in the adjacent provenance sidecar.
Everything below that boundary is provider-neutral and reproducible.

Local ComfyUI is reference-only per #22. Its output may inform look exploration
but may not enter `grid_raw/` or any shipped asset.

## Prompt contract

Use the following fixed shell around a Class-specific subject description:

> A full-body game Character sprite of **<SUBJECT>**, strict side profile facing
> right, chunky pixel art. Drawn on an **exact 32×48 logical pixel grid rendered
> large**; every logical pixel is one clean flat square block, with no smaller
> detail, smooth gradient, anti-aliasing, blur, or dithering. Keep the complete
> silhouette, including equipment, within a conservative **26×40 logical-cell
> safe box**, with at least one logical cell of clearance on every edge. Flat solid
> magenta **`#ff00ff`** background, nothing else in frame. Selective one-logical-
> pixel dark warm outline, 10–16 clustered Moonberry colours, no shadow, glow,
> particles, text, or watermark.

The 26×40 safe box is a prompt target, deliberately smaller than the 32×48
acceptance canvas because image models routinely overshoot requested logical
bounds. The grid detector—not the prompt—decides whether the result fits. Render
resolution does not fix a figure authored on too many logical cells. During the
#29 proof, the first two otherwise-good right-facing Knight renders recovered as
42×48 and 37×48 and were rejected. Tightening the prompt to an explicit 32×48
canvas produced the accepted 32×45 Knight. The accepted Wizard recovered as
29×45. Future tasks start from the conservative safe box and retry from measured
grid reports. There is no resolution-side rescue and no reduction fallback.

Class prompts must name the identity-bearing silhouette, equipment, facing, and
palette. The exact accepted prompts and raw hashes live beside the raws in
[`assets-raw/grid_raw/`](../assets-raw/grid_raw/).

## Chroma-key alpha

BiRefNet is replaced by a fixed `#ff00ff` chroma key. `moonberry-16` contains no
hot magenta, so the key is disjoint from valid Character pigment. The raw must
have a controlled magenta background and nothing else in frame.

Image providers can introduce small RGB variation even in a visually flat PNG.
The operational gate is therefore fixed and bounded rather than sampled from the
subject: at least 95% of the two-pixel border must be within 40 of `#ff00ff` in
every RGB channel. Pixels within that same fixed tolerance are background.
Existing alpha is binarized at 128; the resulting runtime alpha is only 0 or
255. A raw with an uncontrolled background fails before grid recovery.

This path deliberately does not generalize to uncontrolled backgrounds. That is
the cost accepted in #22 in exchange for removing BiRefNet and ComfyUI from the
shipped pipeline.

## Normalizer

Deterministic, in order:

1. **Verify the raw gates**: PNG, matching archived SHA-256, and flat magenta
   border. A resize, re-export, or hand edit changes the hash and is rejected.
2. **Key and binarize alpha** against fixed `#ff00ff` at the rules above.
3. **Recover the logical grid** using the SideScape `detectPitch` / `sampleCells`
   method: comb-fit fractional X/Y pitch from foreground edge energy, then
   majority-vote the central 60% of each cell. Both pitch scores must be at least
   0.04. A grid wider than 32, taller than 48, or shorter than 40 is rejected.
   **The raw is never resized.**
4. **Bottom-center foot-anchor** the recovered cells 1:1 on the 32×48 canvas.
5. **Quantize** opaque cells nearest-in-RGB to
   [`pipeline/palette.json`](../pipeline/palette.json) (`moonberry-16`). No
   dithering—stochastic or ordered—is permitted.

Step 3 is ported from SideScape's
`scripts/art/trace-core.mjs`; its fractional pitch avoids requiring the provider
render to be an exact integer multiple of the logical canvas.

## Validator

A frame is **rejected** for any of:

| Rule | Checked against | Meaning |
| --- | --- | --- |
| wrong dimensions | frame | not exactly 32×48 |
| non-RGBA | frame | mode is not RGBA |
| unapproved alpha | frame | any alpha value other than 0 or 255 |
| embedded effects | frame | any opaque colour off `moonberry-16`; Ability effects remain separate assets |
| empty frame | frame | no opaque pixels |
| clipping | **raw** | the provider cut the subject off at the raw canvas edge |
| unstable baseline | sequence | the foot baseline differs between frames |

The new acquisition gates—recoverable logical grid, flat magenta background, and
unchanged raw bytes—run before these surviving frame and sequence rules.
Clipping remains a raw-level rule because cell recovery discards the evidence
that a provider cut off the source.

## Manifest

The #21 schema is unchanged. Timings are integer milliseconds; floats, zero, and
negatives are rejected, as are cues outside `0..total_ms`. Each manifest records
the action, frame size, palette id, `baseline_row`, per-frame `duration_ms` and
pixel `sha256`, named `cues_ms`, and the `source` provenance block. The source
block identifies the external provider and archived raw SHA-256 rather than a
ComfyUI workflow and seed.

## Reproducibility and identity proof

The #29 proof archived one Knight and one Wizard provider PNG with their exact
prompts and hashes. With no provider client, model, GPU library, socket, or
network imported, the Pillow-only pipeline:

- recovers the Knight as 32×45 and the Wizard as 29×45;
- clears both X/Y pitch-score gates;
- produces valid 32×48 RGBA, binary-alpha, `moonberry-16` frames with baseline
  row 47; and
- rebuilds the committed Wizard PNG byte-for-byte, not merely pixel-equivalent.

The accepted Knight keeps the mint leaf armour, berry plume/scarf, cream accents,
shield device, and dark-plum contour language while fixing the old canonical
source's weak pose: it is a right-facing compact guard with sword and shield both
deployed. The Wizard keeps the pointed berry hat, mint robe/scarf, cream hair,
berry ornaments, wand, and right-facing Class silhouette. Their evidence and
raw/runtime hashes are recorded in the `*.source.json` sidecars beside each
archived raw under [`assets-raw/grid_raw/`](../assets-raw/grid_raw/).

## Known limits

- Grid detection rejects rather than repairs smooth art, anti-aliased art, or a
  subject authored on too many logical cells. Prompt iteration is the remedy.
- The key tolerance assumes hot magenta never enters a Character palette. If
  `moonberry-16` ever gains a nearby colour, the alpha route must be re-decided.
- The embedded-effects rule remains a palette check. It catches the disjoint
  `moonberry-glow` ramp but cannot identify an effect drawn entirely in
  `moonberry-16`.
- `moonberry-16` still derives from two Class identities. [#30](https://github.com/jsbellamy/nightglass/issues/30)
  confirmed ordinary opponents and Bosses can stay on the same palette. Priest and
  Hunter Class stills ship at 32×48 with acceptance evidence at
  [`docs/research/evidence/55-priest-canonical/`](research/evidence/55-priest-canonical/)
  and [`docs/research/evidence/56-hunter-canonical/`](research/evidence/56-hunter-canonical/).
