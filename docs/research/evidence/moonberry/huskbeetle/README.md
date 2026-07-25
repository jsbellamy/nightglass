# Huskbeetle ordinary-opponent body (#676)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`huskbeetle`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/huskbeetle.png` + manifest entry |
| Runtime shape | 30×14 RGBA, binary alpha, `moonberry-16@1`, native 1× |
| Visual vocabulary | `docs/moonberry-theme.md` § `huskbeetle`; `moonberry-16@1` |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 14]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag huskbeetle`; promote; CI `assets` job |

See also the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity (original sample) | Issue #676 C1 / `docs/moonberry-theme.md` § `huskbeetle` | n/a (canonical text) | beetle fused with split moonberry husk shell, LEFT facing, low/wide/domed ground crawler |
| Style cohort | `src/assets/sprites/pipcap.png` | `9fc03d2c05604818e2b45fb30d50186a9c53062777c9008fa677a65ce4da54d2` | shipped Moonberry ordinary-opponent peer; chunky flat pixel block size |
| Style cohort | `src/assets/sprites/brambling.png` | `5add87c3d42694cda0da0e328635bab67183e0d8b5308090a76910c3a69c8fe5` | shipped Moonberry ordinary-opponent peer; tall/spiky contrast for silhouette separation |
| Style cohort | `src/assets/sprites/lanternmoth.png` | `84ba9ce126f9dd22c74b611f5d53768ad9b294e946861d8c2f174b5e97e492fd` | shipped Moonberry ordinary-opponent peer; wide/top-heavy contrast for silhouette separation |

**Style / Identity verdict:** Style preserved vs Pipcap / Brambling / Lanternmoth chunky flat Moonberry cohort (contour-plum outline, moonberry-16 palette, block density). Identity preserved as beetle whose wing-cases are replaced by a split moonberry husk — one living fused creature, not a beetle under a rind umbrella. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `huskbeetle-c1` |
| Scratch (pre-promote measure) | `docs/research/evidence/moonberry/huskbeetle/scratch/huskbeetle-c1.png` |
| Archived | `assets-raw/grid_raw/huskbeetle.png` |
| Sidecar | `assets-raw/grid_raw/huskbeetle.source.json` (`acquisition: flexible`, `palette: moonberry-16@1`) |
| Fitted opaque | **30×14** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/huskbeetle.png` (30×14 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| huskbeetle-c1 | body | pass | none | fitted opaque 30×14 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `candidate-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `huskbeetle.png` | `8b59921d3732efa585b48dc697053f78a1939391f973d4cc2689062ff2183974` |
| Runtime `src/assets/sprites/huskbeetle.png` | `7693dd123050ec05decf79d81e0172efcfc7a41e1725d61c31490a36081820dc` |
| Manifest frame sha256 | `3c65bed86f648de3c918744dea6ad4903f926cae7ae6fabe68b224803e306d3d` |

Manifest geometry: `frame_size [30,14]`, `visual_bounds [0,0,30,14]`, `foot_anchor [15,14]`, `palette: moonberry-16`.

Offline byte-identity: local `build_archived_bundle(['huskbeetle'])` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Per issue invariants I4, no `OpponentDef`, `src/ui/sprites.ts`, or Stage wiring in this slice.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 14]` (bottom-centre of the 30×14 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Pipcap / Brambling / Lanternmoth / Huskbeetle at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete Huskbeetle bundle must appear in the production discovery expected-tag tuple (after `hunter` in runtime-key order) so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-wiring slice |
