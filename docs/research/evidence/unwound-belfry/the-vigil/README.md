# The Vigil Boss body (#572)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — Boss (`the-vigil`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/the-vigil.png` + manifest entry |
| Runtime shape | 94×72 RGBA, binary alpha, `unwound-belfry-24@1`, native 1× |
| Visual vocabulary | `docs/unwound-belfry-theme.md`; `unwound-belfry-24@1` |
| Geometry | facing LEFT; opaque ceiling 160×72; bottom-centre foot anchor `[47, 72]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag the-vigil`; promote; CI `assets` job |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #572 C1 / `docs/unwound-belfry-theme.md` §`the-vigil` | n/a (canonical text) | great owl + stopped tower-clock fusion, LEFT facing, broad low Boss silhouette, cracked-dial face with alarm-red eye |
| Style cohort | `src/assets/sprites/the-fryer.png` | `1f6e17bde9798ceb7d49d6da80b1e14b2cc913aab11cefeb73302cb06f936374` | Boss-scale broad low chunky flat pixel weight |
| Style cohort | `src/assets/sprites/scarequack.png` | `e1f0e34305ed474e7020e7c931353779753af52481eb212ba831e182f1119b3f` | Boss peer; cohort contour / block discipline |
| Style cohort | `src/assets/sprites/tickmoth.png` | `0e8019a793ec7c18ec10711b9490f32193f01a60179e67e6a61c7948805e5840` | Belfry peer; palette block size |
| Style cohort | `src/assets/sprites/tollbat.png` | `332cd1848440fa70e6e317ef4dbccb02077afcce2ecbf194e4ee0e18335a9577` | Belfry peer; palette block size |
| Style cohort | `src/assets/sprites/astrolabe-spider.png` | `64fc78fd3a9453b5b0c2d8aaf180b18ea9cd7cbb18c6b74806b5722a73a8c80b` | Belfry peer; palette block size |

**Style / Identity verdict:** Style preserved vs Fryer / Scarequack Boss weight and Belfry ordinary peer block size. Identity preserved as broad low owl–stopped-tower-clock fusion (not owl beside a clock). See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `the-vigil-c1` |
| Archived | `assets-raw/grid_raw/the-vigil.png` |
| Sidecar | `assets-raw/grid_raw/the-vigil.source.json` (`acquisition: flexible`, `palette: unwound-belfry-24@1`) |
| Fitted opaque | **94×72** (≤ 160×72) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/the-vigil.png` (94×72 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| the-vigil-c1 | body (Boss) | pass | none | fitted opaque 94×72 vs 160×72 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `candidate-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `the-vigil.png` | `20e59ff1230f9a428b86d9285525acb457af927f3ea8201b7353cbd579932160` |
| Runtime `src/assets/sprites/the-vigil.png` | `762f97e80152c2ed93f845e004b9bdba43298586dc43629e61e29c99586f2c51` |
| Manifest frame sha256 | `518f9f05b6fb99bac67496e11cd7aef84be868487a3b256869f20921c20cc955` |

Manifest geometry: `frame_size [94,72]`, `visual_bounds [0,0,94,72]`, `foot_anchor [47,72]`, `palette: unwound-belfry-24`.

Offline byte-identity: local `build_archived_bundle(['the-vigil'], out_dir=…)` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Durable per-identity measure/palette assertions beyond discovery are deferred to the sprite-wiring slice; this slice only extends the production discovery expected-tag tuple so the complete The Vigil bundle is not treated as unexpected.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [47, 72]` (bottom-centre of the 94×72 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG. Broad low silhouette clears the Boss-bar band.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | The Fryer / Scarequack / Tickmoth / Tollbat / Astrolabe-Spider / The Vigil at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete The Vigil bundle must appear in the production discovery expected-tag tuple (and a discovery presence check) so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-wiring slice |
