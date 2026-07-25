# Sundial Gargoyle ordinary-opponent body (#682)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`sundial-gargoyle`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/sundial-gargoyle.png` + manifest entry |
| Runtime shape | 30×25 RGBA, binary alpha, `unwound-belfry-24@1`, native 1× |
| Visual vocabulary | `docs/unwound-belfry-theme.md`; `unwound-belfry-24@1` |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 25]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag sundial-gargoyle`; promote; CI `assets` job |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #682 C1 / `docs/unwound-belfry-theme.md` §`sundial-gargoyle` | n/a (canonical text) | crouched stone gargoyle + broken bronze gnomon fusion, LEFT facing, squat/heavy/angular silhouette |
| Style cohort | `src/assets/sprites/tickmoth.png` | `0e8019a793ec7c18ec10711b9490f32193f01a60179e67e6a61c7948805e5840` | Belfry peer; winged insect contrast target |
| Style cohort | `src/assets/sprites/tollbat.png` | `332cd1848440fa70e6e317ef4dbccb02077afcce2ecbf194e4ee0e18335a9577` | Belfry peer; bell-bodied contrast target |
| Style cohort | `src/assets/sprites/astrolabe-spider.png` | `64fc78fd3a9453b5b0c2d8aaf180b18ea9cd7cbb18c6b74806b5722a73a8c80b` | Belfry peer; thin caliper-leg contrast target |
| Style cohort | `src/assets/sprites/pendulum-rat.png` | `4522f578c71878a0fa6edb2938abb23ef05482eddce639a7e06d70f337c60a45` | Belfry peer; long low horizontal contrast target |

**Style / Identity verdict:** Style preserved vs Tickmoth / Tollbat / Astrolabe-Spider / Pendulum Rat chunky flat pixel cohort (block size, moonless-indigo contour, unwound-belfry-24 palette). Identity preserved as crouched stone gargoyle anatomically fused with broken sundial gnomon (not gargoyle beside a sundial); squat/heavy/angular vs Pendulum Rat long low line and Astrolabe-Spider thin legs. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `sundial-gargoyle-c1` |
| Archived | `assets-raw/grid_raw/sundial-gargoyle.png` |
| Sidecar | `assets-raw/grid_raw/sundial-gargoyle.source.json` (`acquisition: flexible`, `palette: unwound-belfry-24@1`) |
| Fitted opaque | **30×25** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/sundial-gargoyle.png` (30×25 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| sundial-gargoyle-c1 | body | pass | none | fitted opaque 30×25 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `candidate-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `sundial-gargoyle.png` | `84fc42f15b8277d5abcd1740fc069b832f8b70f42223202860328276893dd0ed` |
| Runtime `src/assets/sprites/sundial-gargoyle.png` | `7406750c169124d977b143656ee737b8e1fd3de3ce54177875b27b037f785e20` |
| Manifest frame sha256 | `367c57ce2b9cc941173295ba5f57147114d3701682ad7adf594930df59cdb093` |

Manifest geometry: `frame_size [30,25]`, `visual_bounds [0,0,30,25]`, `foot_anchor [15,25]`, `palette: unwound-belfry-24`.

Offline byte-identity: local `python3 pipeline/acquire.py sundial-gargoyle` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Durable per-identity measure/palette assertions beyond discovery are deferred to the sprite-registration slice; this slice extends the production discovery expected-tag tuple so the complete Sundial Gargoyle bundle is not treated as unexpected.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 25]` (bottom-centre of the 30×25 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Tickmoth / Tollbat / Astrolabe-Spider / Pendulum Rat / Sundial Gargoyle at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete Sundial Gargoyle bundle must appear in the production discovery expected-tag tuple (and a discovery presence check) so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-registration slice |
