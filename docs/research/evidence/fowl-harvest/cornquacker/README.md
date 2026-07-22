# Cornquacker ordinary-opponent body (#326)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`cornquacker`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/cornquacker.png` + manifest entry |
| Runtime shape | 30×50 RGBA, binary alpha, `fowl-harvest-24@1`, native 1× |
| Visual vocabulary | `docs/fowl-harvest-theme.md`; `fowl-harvest-24@1`; Burger Drake cohort |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 50]` |
| Review context | `COHORT_1x.png`; `FIVE_COPY_stress_1x.png`; `SCENE_party_5corn_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag cornquacker`; promote; CI `npm run assets:verify` |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | `docs/fowl-harvest-theme.md` `cornquacker` prompt + intended read | n/a (canonical text) | corn-cob head/neck, husk body fusion, red eye, LEFT facing, tall-narrow silhouette |
| Primary cohort | `src/assets/sprites/burger-drake.png` | `c8a0e66c892465c9fa9355df19275a1c7385f10246286c4f11c2869272f9563f` | Fowl Harvest block size, contour, saturation |
| Scale / Party | `src/assets/sprites/knight.png` | `6ae9b30bf9157e0cb5054c72a79b3cccc115f2a9aad8b4ab417bf288c3d9d4b6` | Party cohort readability |

**Style / Identity verdict:** Style preserved vs Burger Drake Fowl Harvest cohort. Identity preserved as tall-narrow corn-duck fusion (vs Burger Drake squat-broad). See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `cornquacker-c1` |
| Archived | `assets-raw/grid_raw/cornquacker.png` |
| Sidecar | `assets-raw/grid_raw/cornquacker.source.json` (`acquisition: flexible`, `palette: fowl-harvest-24@1`) |
| Fitted opaque | **30×50** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/cornquacker.png` (30×50 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| cornquacker-c1 | body | pass | none | fitted opaque 30×50 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `cornquacker-c1-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Five-copy stress proof

Authoritative fit uses `layout.json` `ordinary_opponent_stress` anchors `[312, 346, 380, 414, 452]` on the 480×86 Battlefield. Opaque body rectangles recorded in `five-copy-geometry.json`:

- `inside_battlefield`: **true**
- `body_overlaps`: **[]**
- foot anchor `[15, 50]` places feet on `floor_y` 80

Composite: `FIVE_COPY_stress_1x.png`. Party-present scene: `SCENE_party_5corn_1x.png`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `cornquacker.png` | `49a52bf80afa9398295245413b2b9c54f7625cc423b55a0c96f7d9e8f52f6267` |
| Runtime `src/assets/sprites/cornquacker.png` | `326ec503bc95de96ab98ce82e54e91ca32577ee5d92eebdcb608bcb50a59a8ca` |
| Manifest frame sha256 | `021359e2db6f0fd2381bc11d1bd93c6d3b0690956cfff5c31764d263cb89b213` |

Manifest geometry: `frame_size [30,50]`, `visual_bounds [0,0,30,50]`, `foot_anchor [15,50]`, `palette: fowl-harvest-24`.

Offline byte-identity: targeted `pipeline/test_contract.py` after promotion; CI `assets` job remains the authoritative full-catalog rebuild after push.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 50]` (bottom-centre of the 30×50 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + five-copy + party scene) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Knight / Burger Drake / Cornquacker / Pipcap at 1× |
| `FIVE_COPY_stress_1x.png` | five Cornquackers at stress anchors |
| `SCENE_party_5corn_1x.png` | Party present with five Cornquackers |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Cornquacker is now a complete flexible Fowl body bundle; extend discovery expected tags, runtime byte-identity map, and flexible provenance/ceiling checks (same pattern as Burger Drake #325 / #337) |
