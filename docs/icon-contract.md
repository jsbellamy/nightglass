# The 16×16 Equipment icon contract

Frozen by [#58](https://github.com/jsbellamy/nightglass/issues/58). Shares the
magenta-key recovery path in [`pipeline/acquire.py`](../pipeline/acquire.py)
with the Character stills in [`acquisition-contract.md`](./acquisition-contract.md);
this document owns only the icon-specific numbers and gates.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Equipment Base icon) |
| Status | candidate for shipping |
| Runtime destination | `src/assets/icons/<iconKey>.png` |
| Runtime shape | 16×16 RGBA; binary alpha (0 or 255); quantized to frozen `moonberry-16` |
| Visual vocabulary | `moonberry-16` (`pipeline/palette.json`); dark-plum one-cell outline; mint / berry / cream flat storybook night-garden reads (style cohort: Knight / Priest / Wizard stills) |
| Geometry | three-quarter display angle; **no** baseline / foot-anchor; recovered cells are **center-anchored** 1:1 on the 16×16 canvas; prompt safe box is a centered **12×12** (two clear magenta cells on every edge) |
| Review context | Armory list at 16×16-at-2×; Tier-pair review sheet grouping blade↔edge, focus↔prism, relic↔lantern, bow↔longbow, vest↔aegis, charm↔locket |
| Validator | `npm run assets:build` / `npm run assets:verify` — 16×16, binary alpha, on-palette, safe-box inset, provenance + byte-identical offline rebuild |

## Shape of the pipeline

```
  external image model (Cursor GenerateImage / …)
      |  ACQUISITION TIME -- online, non-deterministic, never at build/runtime
      |  exact prompt: 16×16 logical grid rendered large on flat #ff00ff
      v
  assets-raw/grid_raw/icons/<iconKey>.png + .source.json
      |  OFFLINE -- no provider, model, GPU, or network
      v
  fixed-key alpha -> detect grid -> sample cells -> center-anchor -> quantize
      v
  src/assets/icons/<iconKey>.png (16×16 RGBA) + manifest.json
```

The boundary is the archived raw bundle. The provider PNG is copied
byte-for-byte and its SHA-256 is frozen in the adjacent provenance sidecar.
Everything below that boundary is provider-neutral and reproducible.

## Prompt contract

Use the following fixed shell, substituting only the SUBJECT line per
Equipment Base (`src/data/equipment.ts` `iconKey`):

> TRUE chunky pixel art item icon ONLY. Canvas is exactly 16 logical columns by
> 16 logical rows rendered large — the 1024x1024 output represents exactly 16
> logical columns by 16 logical rows; every logical pixel is one uniform 64x64
> rendered-pixel square and every boundary aligns to that grid. SUBJECT, drawn
> as a single centered storybook night-garden fantasy item in three-quarter
> display angle, dark-plum one-cell outline, mint/berry/cream flat colors. Keep
> the silhouette within 12x12 logical cells, centered, with at least TWO full
> magenta cells of clearance on every edge. 8 flat colors max. Every unused cell
> is flat #ff00ff. No smaller pixels, gradients, anti-aliasing, dithering, soft
> edges, background, floor, shadow, glow, sparkle, particles, text, watermark,
> or transparency.

The 12×12 safe box is a prompt target. Image models routinely overshoot; the
grid detector decides whether the recovered cells fit the 16×16 acceptance
canvas. There is no resolution-side rescue and no reduction fallback.

## Chroma-key alpha

Identical to the Character contract: fixed `#ff00ff` key, ≥95% of the two-pixel
border within tolerance 40, runtime alpha binarized at 128 to only 0 or 255.

## Normalizer

Deterministic, in order:

1. **Verify the raw gates**: PNG, matching archived SHA-256, and flat magenta
   border.
2. **Key and binarize alpha** against fixed `#ff00ff`.
3. **Recover the logical grid** via the same `detect_pitch` / `sample_cells`
   comb-fit as Character stills. Both pitch scores must be at least 0.04. A grid
   wider or taller than 16 is rejected. **The raw is never resized.** There is
   no minimum-height gate (icons are not grounded figures).
4. **Center-anchor** the recovered cells 1:1 on the 16×16 canvas (no foot
   baseline).
5. **Quantize** opaque cells nearest-in-RGB to `moonberry-16` with no dithering.

## Validator

An icon frame is **rejected** for any of:

| Rule | Checked against | Meaning |
| --- | --- | --- |
| wrong dimensions | frame | not exactly 16×16 |
| non-RGBA | frame | mode is not RGBA |
| unapproved alpha | frame | any alpha value other than 0 or 255 |
| off-palette | frame | any opaque colour off `moonberry-16` |
| empty frame | frame | no opaque pixels |
| safe-box breach | frame | any opaque pixel outside the centered 12×12 (inset 2) |
| clipping | **raw** | the provider cut the subject off at the raw canvas edge |

## Manifest

Sibling of the sprite manifest at `src/assets/icons/manifest.json`. Each entry
records `frame_size: [16, 16]`, palette id `moonberry-16`, pixel SHA-256, and
the `source` provenance block (provider + archived raw SHA-256). No
`baseline_row` (icons are not foot-anchored).

## Reproducibility

`npm run assets:build` rebuilds every registered icon from
`assets-raw/grid_raw/icons/`. `npm run assets:verify` proves each committed
runtime PNG is byte-identical to an offline rebuild with the provider absent.
