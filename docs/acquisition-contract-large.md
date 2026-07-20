# The 48×72 acquisition contract

Sibling of the frozen medium contract
[`acquisition-contract.md`](acquisition-contract.md). Settled by
[#211](https://github.com/jsbellamy/nightglass/issues/211) for the **large**
monster size tier (Boss-scale opponents). Reference implementation:
[`pipeline/acquire.py`](../pipeline/acquire.py) (`FRAMES["large"]`), matching
`MONSTER_FRAMES.large` in [`src/core/types.ts`](../src/core/types.ts). Tests:
[`pipeline/test_contract.py`](../pipeline/test_contract.py).

**Spec** (must match the code tables exactly): canvas **48×72**,
`baseline_row` **71**. **Tuning** (prompt / recovery preference, not a code
table identity): safe box **40×60**, min logical height **60**.

## Shape of the pipeline

```
  external image model (Grok / GPT)
      |  ACQUISITION TIME -- online, non-deterministic, never at build/runtime
      |  exact prompt: 48×72 logical grid rendered large on flat #ff00ff
      v
  grid_raw/*.png + *.source.json          <-- archived raw bundle
      |  OFFLINE -- no provider, model, GPU, or network
      v
  fixed-key alpha -> detect grid -> sample cells -> anchor -> quantize
      v
  runtime/*.png (48×72 RGBA) + manifest.json
```

The boundary is the archived raw bundle. The provider's PNG is copied there
byte-for-byte and its SHA-256 is frozen in the adjacent provenance sidecar.
Everything below that boundary is provider-neutral and reproducible.

Local ComfyUI is reference-only per #22. Its output may inform look exploration
but may not enter `grid_raw/` or any shipped asset.

## Prompt contract

Use the following fixed shell around a Class-specific subject description:

> A full-body game Character sprite of **<SUBJECT>**, strict side profile facing
> right, chunky pixel art. Drawn on an **exact 48×72 logical pixel grid rendered
> large**; every logical pixel is one clean flat square block, with no smaller
> detail, smooth gradient, anti-aliasing, blur, or dithering. Keep the complete
> silhouette, including equipment, within a conservative **40×60 logical-cell
> safe box**, with at least one logical cell of clearance on every edge. Flat solid
> magenta **`#ff00ff`** background, nothing else in frame. Selective one-logical-
> pixel dark warm outline, 10–16 clustered Moonberry colours, no shadow, glow,
> particles, text, or watermark.

The 40×60 safe box is a **tuning** prompt target, deliberately smaller than the
**spec** 48×72 acceptance canvas because image models routinely overshoot
requested logical bounds. The grid detector—not the prompt—decides whether the
result fits. Render resolution does not fix a figure authored on too many
logical cells. Future tasks start from the conservative safe box and retry from
measured grid reports. There is no resolution-side rescue and no reduction
fallback.

**The top 8 logical rows are a soft dead zone.** A large monster stands on the
battlefield floor at `bottom: 6px` and rises to y=8, while `.boss-health-bar`
renders at `top: 4px` with `z-index: 5` — above the combatant's `z-index: 3`.
Silhouette detail in the top rows will be crossed by a 2px bar. Horns, crowns,
and antennae read best if the busiest part of the silhouette sits below that
band.

**More canvas is more logical pixels, not bigger ones.** The whole point of the
tier is added detail at the same pixel density. A large still that is visibly an
upscaled medium still fails the contract — reject and reprompt.

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
   0.04. A grid wider than 48, taller than 72, or shorter than the **tuning** min
   logical height **60** is rejected. **The raw is never resized.**
4. **Bottom-center foot-anchor** the recovered cells 1:1 on the **spec** 48×72
   canvas.
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
| wrong dimensions | frame | not exactly 48×72 |
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

For this tier the **spec** `baseline_row` is **71** (bottom row of the 48×72
canvas when feet sit on the floor). Frame size is recorded as `[48, 72]`.

## Reproducibility and identity proof

The medium-tier #29 proof established the provider-neutral pipeline. Large-tier
acquisition uses the same offline path parameterized by `FRAMES["large"]`
(48×72, min logical height 60). With no provider client, model, GPU library,
socket, or network imported, the Pillow-only pipeline:

- recovers a grid that fits the 48×72 contract (or rejects on measured
  overshoot / underfill);
- clears both X/Y pitch-score gates;
- produces valid 48×72 RGBA, binary-alpha, `moonberry-16` frames with
  **spec** `baseline_row` **71** when feet occupy the bottom row; and
- rebuilds a committed runtime PNG byte-for-byte once an accepted large raw is
  archived.

Exact accepted prompts and raw/runtime hashes for large-tier subjects live in
the `*.source.json` sidecars beside each archived raw under
[`assets-raw/grid_raw/`](../assets-raw/grid_raw/) when those assets ship (Boss
regen against this contract is
[#212](https://github.com/jsbellamy/nightglass/issues/212)).

## Known limits

- Grid detection rejects rather than repairs smooth art, anti-aliased art, or a
  subject authored on too many logical cells. Prompt iteration is the remedy.
- The key tolerance assumes hot magenta never enters a Character palette. If
  `moonberry-16` ever gains a nearby colour, the alpha route must be re-decided.
- The embedded-effects rule remains a palette check. It catches the disjoint
  `moonberry-glow` ramp but cannot identify an effect drawn entirely in
  `moonberry-16`.
- An upscaled medium still is not a large still: reject candidates that only
  enlarge medium-tier cells instead of using the extra canvas for detail.
- Top-of-frame silhouette busyness fights the boss health bar; keep the busiest
  silhouette mass below the top-8 soft dead zone.
