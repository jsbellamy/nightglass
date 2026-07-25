# Pendulum Rat ordinary-opponent body (#681)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`pendulum-rat`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/pendulum-rat.png` + manifest entry |
| Runtime shape | 30×23 RGBA, binary alpha, `unwound-belfry-24@1`, native 1× |
| Visual vocabulary | `docs/unwound-belfry-theme.md`; `unwound-belfry-24@1` |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 23]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag pendulum-rat`; promote; CI `assets` job |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #681 C1 / `docs/unwound-belfry-theme.md` §`pendulum-rat` | n/a (canonical text) | belfry rat + brass pendulum-tail escapement fusion, LEFT facing, long low quadruped, incisor/ears/escapement wheel/rod/bob |
| Style cohort | `src/assets/sprites/tickmoth.png` | `0e8019a793ec7c18ec10711b9490f32193f01a60179e67e6a61c7948805e5840` | Belfry peer; small-winged contrast target |
| Style cohort | `src/assets/sprites/tollbat.png` | `332cd1848440fa70e6e317ef4dbccb02077afcce2ecbf194e4ee0e18335a9577` | Belfry peer; wide-winged contrast target |
| Style cohort | `src/assets/sprites/astrolabe-spider.png` | `64fc78fd3a9453b5b0c2d8aaf180b18ea9cd7cbb18c6b74806b5722a73a8c80b` | Belfry peer; low many-legged contrast target (four legs vs eight) |

**Style / Identity verdict:** Style preserved vs Tickmoth / Tollbat / Astrolabe-Spider chunky flat pixel cohort (block size, moonless-indigo contour, unwound-belfry-24 palette). Identity preserved as belfry rat anatomically fused with clock escapement pendulum tail (not rat carrying a pendulum); long/low/horizontal on four legs vs Astrolabe-Spider eight-legged sprawl. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `pendulum-rat-c3` |
| Archived | `assets-raw/grid_raw/pendulum-rat.png` |
| Sidecar | `assets-raw/grid_raw/pendulum-rat.source.json` (`acquisition: flexible`, `palette: unwound-belfry-24@1`) |
| Fitted opaque | **30×23** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/pendulum-rat.png` (30×23 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| pendulum-rat-c1 | body | pass | none | fitted opaque 30×10 vs 30×68 | off-ramp | retry — alarm-red eye glint lost at quantize |
| pendulum-rat-c2 | body | pass | none | fitted opaque 30×20 vs 30×68 | off-ramp | retry — alarm-red eye glint lost at quantize |
| pendulum-rat-c3 | body | pass | none | fitted opaque 30×23 vs 30×68 | advance | visual review → **accept** → promote |

Rejected c1/c2 documented above (off-ramp: alarm-red glint lost at quantize). Measurement JSON: `candidate-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `pendulum-rat.png` | `0dd1a6f86968ff6a2d8478651bf35d6fc4a0303ce1da031e9e0ca21ad42256a1` |
| Runtime `src/assets/sprites/pendulum-rat.png` | `4522f578c71878a0fa6edb2938abb23ef05482eddce639a7e06d70f337c60a45` |
| Manifest frame sha256 | `5de21d952359d59da6b0c85f8904b93c523c7ecfb132b118d557693a1bb020f0` |

Manifest geometry: `frame_size [30,23]`, `visual_bounds [0,0,30,23]`, `foot_anchor [15,23]`, `palette: unwound-belfry-24`.

Offline byte-identity: local `build_archived_bundle(['pendulum-rat'])` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Durable per-identity measure/palette assertions beyond discovery are deferred to the sprite-registration slice; this slice only extends the production discovery expected-tag tuple so the complete Pendulum Rat bundle is not treated as unexpected.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 23]` (bottom-centre of the 30×23 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Tickmoth / Tollbat / Astrolabe-Spider / Pendulum Rat at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete Pendulum Rat bundle must appear in the production discovery expected-tag tuple (and a discovery presence check) so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-registration slice |
