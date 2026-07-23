# #467 — Hold the Line Status Effect glyph

Procedural 7×7 Status Effect glyph authored as a point set in
`pipeline/effects/author.py` (no provider generation). Color is
`glow-mint-bright` from `moonberry-glow`; distinction is silhouette-only.

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | interface (Status Effect glyph) |
| Status | candidate for shipping |
| Runtime destination | `src/assets/effects/status/hold-the-line.png` |
| Runtime shape | 7×7 RGBA, binary alpha, glow-only opaque pixels |
| Visual vocabulary | `moonberry-glow` via `pipeline/effects/palette_glow.json` |
| Geometry | point-set silhouette; no facing |
| Review context | `STATUS_SHEET_8x.png` + `COHORT_1x.png` / `COHORT_8x.png` |
| Validator | `python3 pipeline/effects/verify.py` gate 4 + determinism rebuild |

## Reads

| Id | Silhouette |
| --- | --- |
| `hold-the-line` | grounded double-shield wall — two compact upright shield/wall faces joined at the base |

## Style cohort

Existing procedural status glyphs (moonberry-glow binary-alpha): `braced`,
`guarded`, `warded`, `sheltered`, `stun` (plus the full twelve on the sheet).

## Evidence

- `layout.txt` — sheet index map
- `STATUS_SHEET_8x.png` — all thirteen glyphs @8× nearest
- `COHORT_1x.png` — style cohort + new glyph at native 1×
- `COHORT_8x.png` — same cohort @8× for inspectability
- `HOLD_THE_LINE_8x.png` — new glyph alone @8×
- Pipeline: `python3 pipeline/effects/verify.py` — determinism PASS (99 files
  rebuilt byte-identically) and status gate PASS (13 glyphs, 7×7, glow-only,
  binary-alpha, shape-distinct frozensets)

## Byte-identical rebuild (local)

| File | SHA-256 | Match |
| --- | --- | --- |
| `hold-the-line.png` | `bbc4e10bddbcdbd27485a0f631292e029f22c6dd3e0ffa0a06bacc955fbb543e` | identical after `author.py` |

The other twelve Status Effect glyphs and the 34×34 Ability Talent icon remain
byte-identical to `main`. CI `assets` job is the authoritative full-catalog
proof after push.

## Rejected candidates

None — single authored point set advanced after uniqueness check against the
twelve existing frozensets.

## Step-6 visual review

Subagent verdict: **accept**.

- Reads as grounded double-shield wall (wide base + two upright faces).
- Style matches moonberry-glow binary-alpha cohort.
- Silhouette distinct from braced (single diamond/chevron) and guarded (hollow frame).
