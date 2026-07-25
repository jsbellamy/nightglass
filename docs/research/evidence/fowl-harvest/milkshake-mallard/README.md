# Milkshake Mallard ordinary-opponent body (#678)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`milkshake-mallard`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/milkshake-mallard.png` + manifest entry |
| Runtime shape | 29×68 RGBA, binary alpha, `fowl-harvest-24@1`, native 1× |
| Visual vocabulary | `docs/fowl-harvest-theme.md`; `fowl-harvest-24@1`; Burger Drake + Cornquacker cohort |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[14, 68]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag milkshake-mallard`; promote; CI `assets` job |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #678 C1 / `docs/fowl-harvest-theme.md` §`milkshake-mallard` | n/a (canonical text) | duck fused with tall diner shake cup, straw crest, cream spill collar, LEFT facing, smooth cylindrical tall silhouette |
| Style cohort | `src/assets/sprites/burger-drake.png` | `c8a0e66c892465c9fa9355df19275a1c7385f10246286c4f11c2869272f9563f` | Fowl Harvest block size, oil-black/bruise-plum contour, saturation discipline |
| Style cohort | `src/assets/sprites/cornquacker.png` | `326ec503bc95de96ab98ce82e54e91ca32577ee5d92eebdcb608bcb50a59a8ca` | tall ordinary peer; cohort block weight; silhouette contrast (lumpy leafy vs smooth cylindrical) |

**Style / Identity verdict:** Style preserved vs Burger Drake / Cornquacker chunky flat pixel cohort. Identity preserved as duck anatomically fused with tall smooth diner shake cup (not duck in a cup). Tall smooth cylindrical silhouette distinguishable from Cornquacker's lumpy leafy silhouette. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `milkshake-mallard-c1` |
| Archived | `assets-raw/grid_raw/milkshake-mallard.png` |
| Sidecar | `assets-raw/grid_raw/milkshake-mallard.source.json` (`acquisition: flexible`, `palette: fowl-harvest-24@1`) |
| Fitted opaque | **29×68** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/milkshake-mallard.png` (29×68 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| milkshake-mallard-c1 | body | pass | none | fitted opaque 29×68 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `milkshake-mallard-c1-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `milkshake-mallard.png` | `985c4c599a54775d0c97abfeb0612eed7333442995ddf6340d00d85efca22f3e` |
| Runtime `src/assets/sprites/milkshake-mallard.png` | `0d45299f4e0c4db672d6d25c3d0618c67701e7ef6c8cf84321c772fc1cad9447` |
| Manifest frame sha256 | `9314043d57108031aff8c28c8fddc74b57de13ae5b8906bd6c4dd32fe1e83e02` |

Manifest geometry: `frame_size [29,68]`, `visual_bounds [0,0,29,68]`, `foot_anchor [14,68]`, `palette: fowl-harvest-24`.

Offline byte-identity: local `pipeline/acquire.py milkshake-mallard` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Durable per-identity measure/palette assertions beyond discovery are deferred to the sprite-registration slice; this slice only extends the production discovery expected-tag tuple so the complete Milkshake Mallard bundle is not treated as unexpected.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [14, 68]` (bottom-centre of the 29×68 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Burger Drake / Cornquacker / Milkshake Mallard at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete Milkshake Mallard bundle must appear in the production discovery expected-tag tuple and discovery presence check so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-wiring slice |
