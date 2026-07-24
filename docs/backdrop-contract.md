# Stage backdrop contract

Asset class for battlefield scenery behind Party and opponent combatants in the
Battle Tile. Shipped Moonberry Stage scenes use keys `backdrop-1` through
`backdrop-3`; additional keys (for example Fowl Harvest backdrops in
`docs/fowl-harvest-theme.md` and Unwound Belfry backdrops in
`docs/unwound-belfry-theme.md`) are discovered from complete archived bundles.
Frozen by [#59](https://github.com/jsbellamy/nightglass/issues/59); bundle
discovery generalized in
[#319](https://github.com/jsbellamy/nightglass/issues/319).

```markdown
Asset class: backdrop
Status: candidate for shipping
Runtime destination: src/assets/backdrops/<key>.png
  (keyed by StageDef.backdropKey; Battle Tile CSS background-image)
Runtime shape: 480×86 RGB(A) PNG; opaque preferred; no magenta key
Visual vocabulary: declared per backdrop — Moonberry night-garden for the three
  shipped Stage scenes (`backdrop-1` … `backdrop-3`); Fowl Harvest toxic rural
  dusk for themed keys documented in `docs/fowl-harvest-theme.md`; Unwound Belfry
  moonless belfry-night for themed keys documented in
  `docs/unwound-belfry-theme.md`. EXEMPT from body palettes (`moonberry-16`,
  `fowl-harvest-24`, `unwound-belfry-24`, and future named body palettes)
Geometry: full battlefield band under the 24px status line; near-flat ground
  band in the bottom fifth; detail concentrated in the upper two thirds;
  no characters, creatures, or UI-like elements
Review context: Battle Tile native 1× with five-opponent stress case —
  bars, damage numbers, moonberry-glow effects, and actor pools must pop
Validator: python3 pipeline/backdrops.py (build + verify); npm run assets:verify
```

## Shape of the pipeline

```
  external image model (Cursor GenerateImage / provider)
      |  ACQUISITION TIME — online, non-deterministic, never at build/runtime
      |  wide night-garden SCENE prompt; generated large (16:9-ish ok)
      v
  assets-raw/backdrops/<key>.png + <key>.source.json   <-- Archived Raw Bundle
      |  OFFLINE — no provider, model, GPU, or network
      |  complete bundle = both files exist for the same <key>
      |  build discovers keys from *.source.json stems (lexicographic order)
      v
  center-crop to 480:86 aspect → Image.resize(..., NEAREST) → 480×86
      v
  src/assets/backdrops/<key>.png
```

The archived raw is immutable evidence. Everything below that boundary is
provider-neutral and reproducible. `assets:build` / `assets:verify` rebuild
from the raw and prove byte identity against the committed runtime PNG.

## Resize exemption

Backdrops deliberately **do** resize. The Character/opponent acquisition
contract forbids resizing a failed logical-grid raw into an accepted canvas
because every logical pixel is identity. Scenery has no logical-pixel identity
to protect: the provider delivers a large atmospheric painting, and the
deterministic reduce step crops to the battlefield aspect ratio (centered
window on tall ~16:9 provider dumps) and nearest-neighbour downscales to the
exact 480×86 runtime band. Prefer prompting for a panoramic strip so the crop
retains Stage identity; do not bottom-anchor alone (that yields ground-only
mud without orchard / bramble / terrace cues).

The provenance sidecar records:

- `source_resolution` — `[width, height]` of the archived raw
- `reduction` — crop box (if any) and the exact resize from crop size to
  `480×86` with resampling `NEAREST`

Do not reintroduce the body pipeline's no-resize rule here.

## Palette exemption

Body palettes (`moonberry-16` for Party Characters and the Moonberry opponent
cohort; `fowl-harvest-24` for Fowl Harvest opponent bodies per
`docs/fowl-harvest-theme.md`; `unwound-belfry-24` for Unwound Belfry opponent
bodies per `docs/unwound-belfry-theme.md`) apply only to Character and opponent
**bodies**.
Backdrops are **free** of those palettes, bound instead to their declared Visual
Theme read so combatants, `moonberry-glow` effects, 2px health bars, and damage
numbers remain the brightest signals in the tile. Judgement is the tile review
sheet under the five-opponent stress case — not a quantize gate.

## Bundle discovery

`pipeline/backdrops.py` discovers archived bundles under `assets-raw/backdrops/`:

- candidate key = stem of `<key>.source.json` (the `<key>` before `.source.json`)
- complete bundle = `<key>.source.json` and `<key>.png` both exist
- build order = keys sorted lexicographically
- runtime destination = `src/assets/backdrops/<key>.png`

An orphan PNG without a sidecar, or a sidecar without a matching PNG, is a
verification failure — not silently ignored. Adding a new backdrop asset issue
is create-only: drop the raw and sidecar pair; discovery picks it up without
editing a fixed key list.

## Prompt shell

Base shell from issue #59 (substitute the SCENE line per Stage):

```
A wide storybook night-garden fantasy backdrop painting, soft muted pixel-art
style, very low contrast, dark dreamy palette of deep plum, twilight slate,
muted mint and faint berry, gentle moonlight from the upper left. SCENE.
Composition: a nearly flat dark ground band across the bottom fifth, all
detail and silhouettes kept soft and dim in the upper two thirds, nothing
bright, nothing sharp, no focal creature. No characters, no animals, no text,
no watermark, no UI, no borders, no vignette frame.
```

**Approved acquisition addendum (provider 16:9 dumps).** Cursor `GenerateImage`
cannot emit ~5.58:1 strips directly. The accepted #59 raws use the base shell's
SCENE and constraints wrapped in an ultra-wide panoramic framing clause so the
centered 480:86 crop retains Stage identity (tree/lantern, bramble, terrace)
rather than ground-only mud. Exact strings live in
`assets-raw/backdrops/<key>.source.json` and are the provenance source of truth;
future acquisitions may use the base shell alone when the provider can emit a
near-band aspect.

SCENE lines:

| key | Stage | SCENE |
| --- | --- | --- |
| `backdrop-1` | Orchard Understory | Beneath dwarf orchard trees hung with dim paper lanterns, plump leaf shapes and mossy roots fading into misty rows |
| `backdrop-2` | Moonlit Bramble | A winding bramble hollow of curling thorn vines and pale night blossoms under a thin crescent moon, faint fireflies |
| `backdrop-3` | Nightbloom Terrace | Terraced garden steps of giant luminous night-bloom flowers climbing toward a wide low moon, distant stitched banners |

## Provenance sidecar

Adjacent `assets-raw/backdrops/<key>.source.json` must include at least:

- `provider`, `acquisition_tool`
- `prompt` (exact string used)
- `raw_sha256` (matches the archived PNG)
- `asset_class`: `"backdrop"`
- `runtime_destination`: `src/assets/backdrops/<key>.png`
- `source_resolution`, `reduction` (filled after the accepted reduce)

## Review gate

One tile review sheet per Stage under
`docs/research/evidence/59-stage-backdrops/`, compositing the runtime backdrop
with Party + five Pipcaps + Boss, health bars, damage numbers, effect frames,
and status icons. Accept only when every feedback element pops and the ground
band reads near-flat so sprites sit without floating artifacts.
