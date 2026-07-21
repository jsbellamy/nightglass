# The 24×32 acquisition contract

Sibling of the frozen medium contract
[`acquisition-contract.md`](acquisition-contract.md). Settled by
[#211](https://github.com/jsbellamy/nightglass/issues/211) for the **small**
monster size tier. Reference implementation:
[`pipeline/acquire.py`](../pipeline/acquire.py) (`FRAMES["small"]`), matching
`MONSTER_FRAMES.small` in [`src/core/types.ts`](../src/core/types.ts). Tests:
[`pipeline/test_contract.py`](../pipeline/test_contract.py).

**Spec** (must match the code tables exactly): canvas **24×32**,
`baseline_row` **31**. **Tuning** (prompt / recovery preference, not a code
table identity): safe box **20×26**, min logical height **26**.

## Shape of the pipeline

```
  external image model (Grok / GPT)
      |  ACQUISITION TIME -- online, non-deterministic, never at build/runtime
      |  exact prompt: 24×32 logical grid rendered large on flat #ff00ff
      v
  grid_raw/*.png + *.source.json          <-- archived raw bundle
      |  OFFLINE -- no provider, model, GPU, or network
      v
  fixed-key alpha -> detect grid -> sample cells -> anchor -> quantize
      v
  runtime/*.png (24×32 RGBA) + manifest.json
```

The boundary is the archived raw bundle. The provider's PNG is copied there
byte-for-byte and its SHA-256 is frozen in the adjacent provenance sidecar.
Everything below that boundary is provider-neutral and reproducible.

Local ComfyUI is reference-only per #22. Its output may inform look exploration
but may not enter `grid_raw/` or any shipped asset.

## Prompt contract

Use the following fixed shell around a body-specific subject description.
Before submitting it, replace `<FACING>` from combatant role: **RIGHT for a
Party Character; LEFT for an Opponent, including every ordinary monster and
Boss.** No other value is valid, and the submitted prompt must not retain the
placeholder.

> A full-body game Character sprite of **<SUBJECT>**, strict side profile facing
> **<FACING>**, chunky pixel art. Drawn on an **exact 24×32 logical pixel grid
> rendered large**; every logical pixel is one clean flat square block, with no smaller
> detail, smooth gradient, anti-aliasing, blur, or dithering. Keep the complete
> silhouette, including equipment, within a conservative **20×26 logical-cell
> safe box**, with at least one logical cell of clearance on every edge. Flat solid
> magenta **`#ff00ff`** background, nothing else in frame. Selective one-logical-
> pixel dark warm outline, 10–16 clustered Moonberry colours, no shadow, glow,
> particles, text, or watermark.

The 20×26 safe box is a **tuning** prompt target, deliberately smaller than the
**spec** 24×32 acceptance canvas because image models routinely overshoot
requested logical bounds. The grid detector—not the prompt—decides whether the
result fits. Render resolution does not fix a figure authored on too many
logical cells. Future tasks start from the conservative safe box and retry from
measured grid reports. There is no resolution-side rescue and no reduction
fallback.

**Silhouette carries the read.** At 24×32 the silhouette must carry the read
almost alone. Detail that survives at 32×48 will not survive here, so prompt for
compact, high-contrast subjects with a distinctive outline. The palette floor of
10 colours is harder to justify on a small frame, so the low end of the 10–16
range is expected rather than exceptional.

Body prompts must name the identity-bearing silhouette, equipment,
role-correct facing, and palette. Wrong-facing candidates are rejected; do not
mirror the raw to repair them. The exact accepted prompts and raw hashes live
beside the raws in
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
   0.04. A grid wider than 24, taller than 32, or shorter than the **tuning** min
   logical height **26** is rejected. **The raw is never resized.**
4. **Bottom-center foot-anchor** the recovered cells 1:1 on the **spec** 24×32
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
| wrong dimensions | frame | not exactly 24×32 |
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

For this tier the **spec** `baseline_row` is **31** (bottom row of the 24×32
canvas when feet sit on the floor). Frame size is recorded as `[24, 32]`.

## Reproducibility and identity proof

The medium-tier #29 proof established the provider-neutral pipeline. Small-tier
acquisition uses the same offline path parameterized by `FRAMES["small"]`
(24×32, min logical height 26). With no provider client, model, GPU library,
socket, or network imported, the Pillow-only pipeline:

- recovers a grid that fits the 24×32 contract (or rejects on measured
  overshoot / underfill);
- clears both X/Y pitch-score gates;
- produces valid 24×32 RGBA, binary-alpha, `moonberry-16` frames with
  **spec** `baseline_row` **31** when feet occupy the bottom row; and
- rebuilds a committed runtime PNG byte-for-byte once an accepted small raw is
  archived.

Exact accepted prompts and raw/runtime hashes for small-tier subjects live in
the `*.source.json` sidecars beside each archived raw under
[`assets-raw/grid_raw/`](../assets-raw/grid_raw/) when those assets ship.

## Known limits

- Grid detection rejects rather than repairs smooth art, anti-aliased art, or a
  subject authored on too many logical cells. Prompt iteration is the remedy.
- The key tolerance assumes hot magenta never enters a Character palette. If
  `moonberry-16` ever gains a nearby colour, the alpha route must be re-decided.
- The embedded-effects rule remains a palette check. It catches the disjoint
  `moonberry-glow` ramp but cannot identify an effect drawn entirely in
  `moonberry-16`.
- At this tier the silhouette must do most of the identification work; fine
  equipment detail that reads at medium will not survive. Prefer compact subjects
  and the low end of the 10–16 colour range.
