# Equipment icon contract

Sibling of [`acquisition-contract.md`](acquisition-contract.md). Character stills and
Equipment icons share `moonberry-16` and the same offline Python toolchain, but
they **deliberately disagree** on acquisition gates, the committed boundary, and
where provider raws live. One combined document would need exceptions on nearly
every rule; this file owns the 34×34 icon path only.

## Committed boundary

| Layer | Artifact | Role |
| --- | --- | --- |
| Source | Text grid under `src/assets/icon-sources/<family>/source.grid` | Legend chars → named `moonberry-16` refs; **generated output, never hand-edited** |
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
- `palette_subset` — the `moonberry-16` names this family may quantize into (load-bearing; see below)
- `legend` — one character per line mapping to a palette name or `.` for transparent
- `grid` — equal-width rows using only legend characters

Off-palette colours are **unrepresentable**: a legend entry naming a colour outside
`moonberry-16`, or outside the declared `palette_subset`, is a **parse error**, not a
late validation failure.

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

Each family declares the subset of `moonberry-16` its ingest quantizer may use.
Without scoping, adding a ramp or applying a `recolor` map can **flatten** distinct
cells when the target name already appears in the source histogram (see measured
`BOW_TO_LONGBOW` mint→`berry-mid` merge in `#125`).

A `recolor` map whose **target** already appears in the source `palette_subset` is
**rejected** at build time.

## Families

Six Equipment Base families (Tier I source → Tier II `recolor` variant) are registered
in `pipeline/icons/registry.py`. Real family grids and raws land with the Icons slice
([#131](https://github.com/jsbellamy/nightglass/issues/131)). A synthetic `verify-canary`
family proves byte-identical rebuild in CI.

## Approval

Human approval happens in **PR review** on the 8× previews and family contact sheet
emitted by `npm run assets:build`, not on provider-resolution raws.

## Commands

```bash
npm run assets:build   # Character stills + icon rebuild from text sources
npm run assets:verify  # acquisition contract + effects + icon fixtures/rebuild
```

Implementation: `pipeline/icons/` (`build.py`, `ingest.py`, `verify.py`).
