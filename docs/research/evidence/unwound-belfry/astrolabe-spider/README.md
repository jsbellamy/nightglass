# Astrolabe-Spider ordinary-opponent body (#571)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`astrolabe-spider`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/astrolabe-spider.png` + manifest entry |
| Runtime shape | 30×15 RGBA, binary alpha, `unwound-belfry-24@1`, native 1× |
| Visual vocabulary | `docs/unwound-belfry-theme.md`; `unwound-belfry-24@1` |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 15]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag astrolabe-spider`; promote; CI `assets` job |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #571 C1 / `docs/unwound-belfry-theme.md` §`astrolabe-spider` | n/a (canonical text) | spider + broken brass astrolabe fusion, LEFT facing, low many-legged silhouette |
| Style cohort | `src/assets/sprites/tickmoth.png` | `0e8019a793ec7c18ec10711b9490f32193f01a60179e67e6a61c7948805e5840` | Belfry peer; small-winged contrast target |
| Style cohort | `src/assets/sprites/tollbat.png` | `332cd1848440fa70e6e317ef4dbccb02077afcce2ecbf194e4ee0e18335a9577` | Belfry peer; wide-winged contrast target |
| Style cohort | `src/assets/sprites/burger-drake.png` | `c8a0e66c892465c9fa9355df19275a1c7385f10246286c4f11c2869272f9563f` | ordinary-opponent LEFT-facing chunky flat pixel block size |

**Style / Identity verdict:** Style preserved vs Tickmoth / Tollbat / Burger Drake chunky flat pixel cohort. Identity preserved as spider anatomically fused with broken brass astrolabe (not spider standing on an instrument); low many-legged vs winged peers. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `astrolabe-spider-c1` |
| Archived | `assets-raw/grid_raw/astrolabe-spider.png` |
| Sidecar | `assets-raw/grid_raw/astrolabe-spider.source.json` (`acquisition: flexible`, `palette: unwound-belfry-24@1`) |
| Fitted opaque | **30×15** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/astrolabe-spider.png` (30×15 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| astrolabe-spider-c1 | body | pass | none | fitted opaque 30×15 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `candidate-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `astrolabe-spider.png` | `e1f2a82ebeee6e3f4be17a3e34649bdb37829040bd800efa61dc0737a0f52d6f` |
| Runtime `src/assets/sprites/astrolabe-spider.png` | `64fc78fd3a9453b5b0c2d8aaf180b18ea9cd7cbb18c6b74806b5722a73a8c80b` |
| Manifest frame sha256 | `fc85147fd88b55b6b41d5fbabb55c6fa5a2743674ae9d6a73a47f8d322404a51` |

Manifest geometry: `frame_size [30,15]`, `visual_bounds [0,0,30,15]`, `foot_anchor [15,15]`, `palette: unwound-belfry-24`.

Offline byte-identity: local `build_archived_bundle(['astrolabe-spider'], out_dir=…)` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Durable per-identity measure/palette assertions beyond discovery are deferred to the sprite-wiring slice; this slice only extends the production discovery expected-tag tuple so the complete Astrolabe-Spider bundle is not treated as unexpected.

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
| `COHORT_1x.png` (+ `@4x`) | Burger Drake / Tickmoth / Tollbat / Astrolabe-Spider at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete Astrolabe-Spider bundle must appear in the production discovery expected-tag tuple (and a discovery presence check) so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-wiring slice |
