# Tollbat ordinary-opponent body (#570)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`tollbat`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/tollbat.png` + manifest entry |
| Runtime shape | 30×17 RGBA, binary alpha, `unwound-belfry-24@1`, native 1× |
| Visual vocabulary | `docs/unwound-belfry-theme.md`; `unwound-belfry-24@1` |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 17]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag tollbat`; promote; CI `assets` job |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #570 C1 / `docs/unwound-belfry-theme.md` §`tollbat` | n/a (canonical text) | bat + cracked bronze hand-bell fusion, LEFT facing, wide-winged heavy silhouette |
| Style cohort | `src/assets/sprites/tickmoth.png` | `0e8019a793ec7c18ec10711b9490f32193f01a60179e67e6a61c7948805e5840` | Belfry peer; small-winged contrast target |
| Style cohort | `src/assets/sprites/burger-drake.png` | `c8a0e66c892465c9fa9355df19275a1c7385f10246286c4f11c2869272f9563f` | ordinary-opponent LEFT-facing chunky flat pixel block size |
| Style cohort | `src/assets/sprites/cornquacker.png` | `326ec503bc95de96ab98ce82e54e91ca32577ee5d92eebdcb608bcb50a59a8ca` | ordinary-opponent peer; cohort block weight |

**Style / Identity verdict:** Style preserved vs Tickmoth / Burger Drake / Cornquacker chunky flat pixel cohort. Identity preserved as bat anatomically fused with cracked bronze bell (not bat holding a bell); wide-winged vs Tickmoth small-winged. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `tollbat-c2` |
| Archived | `assets-raw/grid_raw/tollbat.png` |
| Sidecar | `assets-raw/grid_raw/tollbat.source.json` (`acquisition: flexible`, `palette: unwound-belfry-24@1`) |
| Fitted opaque | **30×17** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/tollbat.png` (30×17 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| tollbat-c1 | body | pass | none | fitted opaque 30×15 vs 30×68 | visual retry | regenerate LEFT (faced RIGHT; not mirrored) |
| tollbat-c2 | body | pass | none | fitted opaque 30×17 vs 30×68 | advance | visual review → **accept** → promote |

Measurement JSON: `candidate-report.json` (accepted c2). c1 measure retained as `candidate-report-c1.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `tollbat.png` | `580f1e23b6c00c1762885ce2895bd1f29dd5e553da1e520d6cd7d9f86d6a9dbd` |
| Runtime `src/assets/sprites/tollbat.png` | `40fd50ec262fa3d7cf8fa5216095bc14cc9ec67ac6506a37820518671828df67` |
| Manifest frame sha256 | `6528394ee0a6f94538f7bd6ba631fdce1fc0b6d72ba5707ca2f21424f8d6bf8b` |

Manifest geometry: `frame_size [30,17]`, `visual_bounds [0,0,30,17]`, `foot_anchor [15,17]`, `palette: unwound-belfry-24`.

Offline byte-identity: local `build_archived_bundle(['tollbat'])` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Durable per-identity measure/palette assertions beyond discovery are deferred to the sprite-wiring slice; this slice only extends the production discovery expected-tag tuple so the complete Tollbat bundle is not treated as unexpected.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 17]` (bottom-centre of the 30×17 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Burger Drake / Cornquacker / Tickmoth / Tollbat at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete Tollbat bundle must appear in the production discovery expected-tag tuple (and a discovery presence check) so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-wiring slice |
