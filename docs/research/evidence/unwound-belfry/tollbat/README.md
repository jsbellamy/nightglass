# Tollbat ordinary-opponent body (#570)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`tollbat`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/tollbat.png` + manifest entry |
| Runtime shape | 30×18 RGBA, binary alpha, `unwound-belfry-24@1`, native 1× |
| Visual vocabulary | `docs/unwound-belfry-theme.md`; `unwound-belfry-24@1` |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 18]` |
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

**Style / Identity verdict:** Style preserved vs Tickmoth / Burger Drake / Cornquacker chunky flat pixel cohort. Identity preserved as bat anatomically fused with cracked bronze bell (not bat holding a bell); wide-winged vs Tickmoth small-winged; crack, clapper tongue, and alarm-red eye remain distinct at 1× after C2 rework. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `tollbat-c3` |
| Archived | `assets-raw/grid_raw/tollbat.png` |
| Sidecar | `assets-raw/grid_raw/tollbat.source.json` (`acquisition: flexible`, `palette: unwound-belfry-24@1`) |
| Fitted opaque | **30×18** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/tollbat.png` (30×18 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| tollbat-c1 | body | pass | none | fitted opaque 30×15 vs 30×68 | visual retry | regenerate LEFT (faced RIGHT; not mirrored) |
| tollbat-c2 | body | pass | none | fitted opaque 30×17 vs 30×68 | Spec retry | regenerate for crack / clapper / alarm-red eye at 1× |
| tollbat-c3 | body | pass | none | fitted opaque 30×18 vs 30×68 | advance | visual review → **accept** → promote |

Measurement JSON: `candidate-report.json` (accepted archived-raw re-measure of c3; same fitted size as `candidate-report-c3.json` scratch measure). c1/c2 measures retained as `candidate-report-c1.json` / `candidate-report-c2.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `tollbat.png` | `5d2d90d0b09c67f8762521712ef9e33201e8081621bd42a8567cf9c2335bf861` |
| Runtime `src/assets/sprites/tollbat.png` | `332cd1848440fa70e6e317ef4dbccb02077afcce2ecbf194e4ee0e18335a9577` |
| Manifest frame sha256 | `5e5481a1efa6686c8df751e9db2ae1c338bf6b6deb3a708ef675f643fcf56d79` |

Manifest geometry: `frame_size [30,18]`, `visual_bounds [0,0,30,18]`, `foot_anchor [15,18]`, `palette: unwound-belfry-24`.

Offline byte-identity: local `normalize_archived` / temp-dir `build_archived_bundle(['tollbat'], out_dir=…)` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Durable per-identity measure/palette assertions beyond discovery are deferred to the sprite-wiring slice; this slice only extends the production discovery expected-tag tuple so the complete Tollbat bundle is not treated as unexpected.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 18]` (bottom-centre of the 30×18 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

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
