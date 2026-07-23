# Management Dock icon contract

Sibling of [`acquisition-contract.md`](acquisition-contract.md). Character stills and
Management Dock raster icons share the same offline Python toolchain where applicable, but
**icon classes deliberately disagree** on acquisition gates, palette rules, the committed
boundary, and where provider raws live. One combined document would need exceptions on nearly
every rule; this file owns the 34×34 Management Dock icon paths.

## Icon classes

| Class | Examples | Palette rule | This document |
| --- | --- | --- | --- |
| **Equipment Base** | Armory inventory tiles, worn strip | **Strict** named palette (`moonberry-16` or `fowl-harvest-24`) with `palette_subset` parse gates | Sections below through **Families** |
| **Talent / Ability Talent** | Talent Tree skill glyphs | **Strict** `moonberry-16` subset (same geometry and ingest as Equipment) | **Families** — Talent batches |
| **Ability (Loadout)** | Class Kit **Basic Attack**, Core Abilities in Loadout slots and **Available skills** | **Not** `moonberry-16` / `fowl-harvest-24`; mechanic-appropriate **source-local** colours | **Ability icons** |
| **Verify canary** | `verify-canary` fixture family | `moonberry-16` | CI byte-identity only |

Equipment and Talent icons **must** keep named-palette validation mandatory. Ability icons
**must not** be forced through Equipment or Visual Theme battlefield palettes.

## Committed boundary

| Layer | Artifact | Role |
| --- | --- | --- |
| Source | Text grid under `src/assets/icon-sources/<family>/source.grid` | Legend chars → named swatches from the family's declared palette (`moonberry-16` for committed Moonberry Equipment and Talent icons; `fowl-harvest-24` for Fowl Equipment once acquired); **generated output, never hand-edited** |
| Runtime | `src/assets/icons/<iconKey>.png` + `manifest.json` | 34×34 inventory icons consumed by the UI; manifest records the family's selected `palette` id and palette-specific `outline` swatch name |
| Review | `src/assets/icons/preview/<iconKey>@8x.png`, `family-sheet@8x.png` | PR-review approval targets (binary PNG diff) |

Provider raws are **evidence, not build inputs**. Archive them under
`docs/research/evidence/` with a `.source.json` sidecar (`provider`, `prompt`,
`raw_sha256`, ingest report). Do **not** put icon raws in `assets-raw/grid_raw/`
— that bundle is the Character acquisition contract in
[`acquisition-contract.md`](acquisition-contract.md).

Ingest is production code: it is the only way a text source comes into existence,
and `npm run assets:verify` exercises it against synthetic fixture raws as well as
rebuilding committed sources.

## Text source form

Each `source.grid` file contains:

- `source_key` — family Tier I key
- `palette` — named palette id (`moonberry-16` or `fowl-harvest-24` today); **omitted
  only on committed legacy Equipment sources**, which parse as `moonberry-16`. New ingest
  output always emits this line.
- `palette_subset` — swatch names from the selected palette this family may quantize into
  (load-bearing; see below)
- `legend` — one character per line mapping to a palette name or `.` for transparent
- `grid` — equal-width rows using only legend characters

Off-palette colours are **unrepresentable**: a legend entry naming a colour outside the
selected palette, or outside the declared `palette_subset`, is a **parse error**, not a
late validation failure. Unknown palette ids and cross-palette swatch names fail at parse
or ingest with no fallback palette.

Regeneration is the only repair path for a bad source — edit the ingest inputs and
re-run ingest, never pixels in the grid file.

**Named-palette icons only.** The `palette`, `palette_subset`, and off-palette parse rules
in this section apply to **Equipment Base** and **Talent / Ability Talent** sources. **Ability
(Loadout)** sources follow **Ability icons** below and do not use `moonberry-16` or
`fowl-harvest-24` scoping.

## Ability icons (Loadout Basic / Core Abilities)

**Ability icons** are a distinct icon class for **Basic Attack** and slottable **Core
Abilities** shown on the Character **Build** Loadout (Basic row, Slots I–III, and the
**Available skills** strip). They share the **same canvas geometry, outline discipline,
lighting read, scale, and legibility targets** as Equipment and Talent glyphs, but they are
**not** Equipment Bases and **not** Talent Tree symbols.

| Requirement | Value |
| --- | --- |
| Runtime PNG | **34×34** canvas, **transparent** alpha (no opaque knockout fill in the shipped PNG) |
| Logical source geometry | **32×32** drawable grid centered in the canvas (same `DRAWABLE` / `RING` / `MAX_BODY` as Equipment) |
| Colour | **Source-local** flat fills chosen for the Ability’s mechanic and identity — frost blues for a lance, ember oranges for a cleave, and so on. **Do not** quantize Ability icons into `moonberry-16` or `fowl-harvest-24` solely to reuse Equipment ingest. |
| Rebuild | Deterministic offline rebuild from committed text sources (or an equivalent declared encoder) must be **byte-identical** in CI, matching the Equipment/Talent icon pipeline promise. |
| Visual parity | Chunky pixel blocks, derived outline ring, and Management Dock legibility at native scale — aligned with `docs/fowl-harvest-ui-contract.md` Loadout chrome. |

Provider prompts for Ability icons use the **32×32 logical grid shell** and magenta clearance
discipline from `docs/agents/asset-generation.md`, but replace Moonberry/Fowl material
sentences with **mechanic-appropriate source-local colour names** (still flat, 8–12 colours
max, no gradients). Archive provider raws under `docs/research/evidence/` with the same
sidecar discipline as Equipment; do not route Ability raws through `assets-raw/grid_raw/`.

When an Ability icon shares a content id with a Talent Tree glyph, treat them as **separate
asset identities**: the Talent Tree ships under **Talent / Ability Talent** (named
`moonberry-16`); the Loadout tile ships under **Ability icons** (source-local).

## Geometry

```
CANVAS   = 34    # runtime PNG
DRAWABLE = 32    # centered band inside the canvas
RING     = 1     # derived outline ring (build-time only; never prompt for it)
MAX_BODY = 30    # structural: DRAWABLE − 2×RING — not a tunable gate
```

Outline swatch is palette-specific: `contour-plum-deepest` on `moonberry-16`,
`oil-ink` on `fowl-harvest-24`. Stage 2 strips exterior ink using each palette's
dark contour swatches, optionally applies a family `recolor` map, derives the
outline ring, and centers the body inside the 34×34 canvas.

## Ingest gates

Thresholds were provisional at n=2 on the
[`#125` evidence](research/evidence/125-equipment-icons-34/ai-gen/ingest-report.json)
accepted icons (`dewlight-focus`, `bramblesong-bow`). **Recalibrated in
[#131](https://github.com/jsbellamy/nightglass/issues/131)** after all six families
landed — see `docs/research/evidence/126-equipment-icons/` for measurements.

| Gate | Value | Status |
| --- | --- | --- |
| `MAX_BODY` | 30 | Structural (see geometry) |
| `MIN_LONG_AXIS` | 20 | Held at n=6 (`#131`) |
| Off-ramp distance | ≤20% of subject cells farther than ~40 RGB from nearest allowed swatch | Retuned in `#131` (n=2 was 15%; measured peak 16.4%) |
| Grid-recovery score | `pipeline/acquire.py` `MIN_GRID_SCORE` (0.04 on `main`) | Held at n=6 (`#131`) |
| Colour count cap | *dropped* | Vacuous on `moonberry-16` |

Grid recovery imports `detect_pitch`, `sample_cells`, and related primitives from
`pipeline/acquire.py` — no forked copies. Icon pitch bounds differ from Character
stills (no `MIN_LOGICAL_HEIGHT=40`); that difference stays in `pipeline/icons/`.

## Palette scoping and recolor

Each registered family declares a `palette_id` (`moonberry-16` or `fowl-harvest-24`
today) and the subset of that palette its ingest quantizer may use. Parse, paint,
recolor, outline derivation, runtime PNG, preview, and manifest all use the same
selected palette. Recolor map keys and values must name swatches from that palette
only; cross-palette targets are rejected at registry validation. Without scoping,
adding a ramp or applying a `recolor` map can **flatten** distinct cells when the
target name already appears in the source histogram (see measured `BOW_TO_LONGBOW`
mint→`berry-mid` merge in `#125`).

A `recolor` map whose **target** already appears in the source `palette_subset` is
**rejected** at build time.

## Runtime manifest

Each `manifest.json` entry records:

```json
{
  "canvas": [34, 34],
  "palette": "fowl-harvest-24",
  "outline": "oil-ink",
  "source_family": "<key>",
  "sha256": "<digest>"
}
```

`palette` and `outline` always match the family's selected palette. Moonberry entries
use `"outline": "contour-plum-deepest"`; Fowl entries use `"outline": "oil-ink"`.
The family contact sheet may include icons from both palettes.

## Provider prompt shells

Moonberry Equipment acquisition uses the **icon grid shell** in
[`docs/agents/asset-generation.md`](agents/asset-generation.md) (32×32 logical grid,
magenta clearance, Moonberry material sentence).

Fowl Equipment acquisition uses the same geometry and clearance discipline with
**fowl-harvest-24** materials:

> TRUE chunky pixel art inventory icon ONLY. Drawn on an **exact 32×32 logical pixel
> grid rendered large**; every logical pixel is one clean flat square block — no
> smaller detail, smooth gradient, anti-aliasing, blur, or dithering. A single
> centered Fowl Harvest rural-mutation item in three-quarter display angle:
> **\<SUBJECT\>**. Subject's long side spans about **26–30 logical pixels**, with at
> least **two** full magenta cells of clearance on every edge. Flat solid magenta
> **`#ff00ff`** background, nothing else in frame. Selective one-logical-pixel oily
> near-black contour (`oil-ink` read). Use **only** named **fowl-harvest-24**
> swatches (duck/corn golds, beak and rust oranges, patty/toast browns, field/husk
> greens, diner cream, restrained condiment red, storm slate, oily near-black) —
> **8–12 flat colors max**. Structural members at least **3 logical pixels** thick.
> No shadow, glow, sparkle, particles, text, watermark, or transparency.

Do not prompt for the derived outline ring; build derives `oil-ink` (Fowl) or
`contour-plum-deepest` (Moonberry) deterministically.

## Families

Six Equipment Base families (Tier I source → Tier II `recolor` variant) are registered
in `pipeline/icons/registry.py`. Family text-grid sources live under
`src/assets/icon-sources/`; twelve runtime PNGs (six families × two tiers) ship under
`src/assets/icons/` ([#131](https://github.com/jsbellamy/nightglass/issues/131)).
A synthetic `verify-canary` family proves byte-identical rebuild in CI.

**Talent / Ability Talent** icons are additional **one-variant** families under the
same **named-palette** geometry, ingest, and build contract as Equipment: a single
`IconVariant` with an empty `recolor` map, `iconKey` equal to the content id, and no Tier II.
They are symbolic skill glyphs for Management Dock Talent Tree chrome — not Equipment
Bases, not wearable Armory pieces, and **not** Loadout **Ability icons** (see **Ability
icons**). Knight's first batch
(`fortitude`, `swordcraft`, `hold-the-line`, `falling-star`) lands in
[#305](https://github.com/jsbellamy/nightglass/issues/305); later Class batches
extend the same registry without changing gates.

## Approval

Human approval happens in **PR review** on the 8× previews and family contact sheet
emitted by `npm run assets:build`, not on provider-resolution raws.

## Commands

```bash
npm run assets:build   # Character stills + icon rebuild from text sources
npm run assets:verify  # acquisition contract + effects + icon fixtures/rebuild
```

Implementation: `pipeline/icons/` (`build.py`, `ingest.py`, `verify.py`).
