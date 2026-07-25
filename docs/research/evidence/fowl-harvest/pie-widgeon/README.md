# Pie Widgeon ordinary-opponent body (#680)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`pie-widgeon`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/pie-widgeon.png` + manifest entry |
| Runtime shape | 30×15 RGBA, binary alpha, `fowl-harvest-24@1`, native 1× |
| Visual vocabulary | `docs/fowl-harvest-theme.md`; `fowl-harvest-24@1`; Burger Drake + Cornquacker + Milkshake Mallard + Balewaddle cohort |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 15]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag pie-widgeon`; promote; CI `assets` job |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #680 C1 / `docs/fowl-harvest-theme.md` §`pie-widgeon` | n/a (canonical text) | duck fused with lattice-crust pie in tin, LEFT facing, low wide disc-flat silhouette, crimped rim, lattice strips, red filling, tin edge |
| Style cohort | `src/assets/sprites/burger-drake.png` | `c8a0e66c892465c9fa9355df19275a1c7385f10246286c4f11c2869272f9563f` | Fowl Harvest block size, oil-black/bruise-plum contour, saturation discipline |
| Style cohort | `src/assets/sprites/cornquacker.png` | `326ec503bc95de96ab98ce82e54e91ca32577ee5d92eebdcb608bcb50a59a8ca` | tall ordinary peer; cohort block weight; silhouette contrast (tall leafy vs low disc-flat) |
| Style cohort | `src/assets/sprites/milkshake-mallard.png` | `0d45299f4e0c4db672d6d25c3d0618c67701e7ef6c8cf84321c772fc1cad9447` | tall smooth cylindrical peer; silhouette contrast (tall smooth vs low disc-flat) |
| Style cohort | `src/assets/sprites/balewaddle.png` | `ed25be369866b937c0b7f59ad9738b373fedcbaa5cd2d0ecbae5718e4cb03a88` | squat blocky peer; silhouette contrast (taller-massed block vs low disc-flat) |

**Style / Identity verdict:** Style preserved vs Burger Drake / Cornquacker / Milkshake Mallard / Balewaddle chunky flat pixel cohort. Identity preserved as duck anatomically fused with lattice-crust pie in tin (not duck behind/eating pie). Low wide disc-flat silhouette distinguishable as the flattest and widest of the five Fowl silhouettes. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `pie-widgeon-c1` |
| Archived | `assets-raw/grid_raw/pie-widgeon.png` |
| Sidecar | `assets-raw/grid_raw/pie-widgeon.source.json` (`acquisition: flexible`, `palette: fowl-harvest-24@1`) |
| Fitted opaque | **30×15** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/pie-widgeon.png` (30×15 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| pie-widgeon-c1 | body | pass | none | fitted opaque 30×15 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `pie-widgeon-c1-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `pie-widgeon.png` | `ea1a45b99f1245db520d9f1f890122e2b7ccd473ed1321c89444529ade93e824` |
| Runtime `src/assets/sprites/pie-widgeon.png` | `8cd9e0a9672289e28845f3ca40aa5570c61b094a280dbf4b9c6118cfef6009c7` |
| Manifest frame sha256 | `82446ce81d394ac1d8195c31386a648ffb8f6a483be7eacd10b30b9bcc73b4e5` |

Manifest geometry: `frame_size [30,15]`, `visual_bounds [0,0,30,15]`, `foot_anchor [15,15]`, `palette: fowl-harvest-24`.

Offline byte-identity: local `pipeline/acquire.py pie-widgeon` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Durable per-identity measure/palette assertions beyond discovery are deferred to the sprite-registration slice; this slice only extends the production discovery expected-tag tuple so the complete Pie Widgeon bundle is not treated as unexpected.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 15]` (bottom-centre of the 30×15 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Burger Drake / Cornquacker / Milkshake Mallard / Balewaddle / Pie Widgeon at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete Pie Widgeon bundle must appear in the production discovery expected-tag tuple and discovery presence check so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-registration slice |
