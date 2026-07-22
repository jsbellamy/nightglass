# Equipment icon contract

Sibling of [`acquisition-contract.md`](acquisition-contract.md). Character stills and
Equipment icons share `moonberry-16` and the same offline Python toolchain, but
they **deliberately disagree** on acquisition gates, the committed boundary, and
where provider raws live. One combined document would need exceptions on nearly
every rule; this file owns the 34×34 icon path only.

## Committed boundary

| Layer | Artifact | Role |
| --- | --- | --- |
| Source | Text grid under `src/assets/icon-sources/<family>/source.grid` | Legend chars → named swatches from the source's declared palette (`moonberry-16` today for committed Equipment); **generated output, never hand-edited** |
| Runtime | `src/assets/icons/<iconKey>.png` + `manifest.json` | 34×34 inventory icons consumed by the UI |
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

## Geometry

```
CANVAS   = 34    # runtime PNG
DRAWABLE = 32    # centered band inside the canvas
RING     = 1     # derived contour-plum-deepest outline (build-time only; never prompt for it)
MAX_BODY = 30    # structural: DRAWABLE − 2×RING — not a tunable gate
```

Stage 2 strips exterior ink, optionally applies a family `recolor` map, derives the
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

Each family declares the subset of its source palette its ingest quantizer may use
(`moonberry-16` for all committed Equipment families until a later slice threads
Fowl through runtime paint).
Without scoping, adding a ramp or applying a `recolor` map can **flatten** distinct
cells when the target name already appears in the source histogram (see measured
`BOW_TO_LONGBOW` mint→`berry-mid` merge in `#125`).

A `recolor` map whose **target** already appears in the source `palette_subset` is
**rejected** at build time.

## Families

Six Equipment Base families (Tier I source → Tier II `recolor` variant) are registered
in `pipeline/icons/registry.py`. Family text-grid sources live under
`src/assets/icon-sources/`; twelve runtime PNGs (six families × two tiers) ship under
`src/assets/icons/` ([#131](https://github.com/jsbellamy/nightglass/issues/131)).
A synthetic `verify-canary` family proves byte-identical rebuild in CI.

**Talent / Ability Talent** icons are additional **one-variant** families under the
same geometry, ingest, and build contract: a single `IconVariant` with an empty
`recolor` map, `iconKey` equal to the content id, and no Tier II. They are
symbolic skill glyphs for Management Dock Talent Tree chrome — not Equipment
Bases and not wearable Armory pieces. Knight's first batch
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
