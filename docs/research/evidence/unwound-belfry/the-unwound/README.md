# The Unwound Boss body (#574)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — Boss (`the-unwound`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/the-unwound.png` + manifest entry |
| Runtime shape | 134×72 RGBA, binary alpha, `unwound-belfry-24@1`, native 1× |
| Visual vocabulary | `docs/unwound-belfry-theme.md`; `unwound-belfry-24@1` |
| Geometry | facing LEFT; opaque ceiling 160×72; bottom-centre foot anchor `[67, 72]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag the-unwound`; promote; CI `assets` job |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #574 C1 / `docs/unwound-belfry-theme.md` §`the-unwound` | n/a (canonical text) | awakened belfry mechanism, LEFT facing, broad low Boss silhouette, dial under-glow alarm |
| Style cohort | `src/assets/sprites/the-fryer.png` | `1f6e17bde9798ceb7d49d6da80b1e14b2cc913aab11cefeb73302cb06f936374` | Boss-scale broad low chunky flat pixel weight |
| Style cohort | `src/assets/sprites/the-vigil.png` | `f28e9a3cf233af672c9d1be8da693ed6d89a9fb41e0a0968c45c087c01b002d6` | Belfry Boss peer; cohort contour / block discipline |
| Style cohort | `src/assets/sprites/the-tocsin.png` | `3bc80df72a3d21400fc25ed5e0d8424515072926249e36710921a5fad184e34d` | Belfry Boss peer; cohort contour / block discipline |
| Style cohort | `src/assets/sprites/tickmoth.png` | `0e8019a793ec7c18ec10711b9490f32193f01a60179e67e6a61c7948805e5840` | Belfry peer; palette block size |
| Style cohort | `src/assets/sprites/tollbat.png` | `332cd1848440fa70e6e317ef4dbccb02077afcce2ecbf194e4ee0e18335a9577` | Belfry peer; palette block size |
| Style cohort | `src/assets/sprites/astrolabe-spider.png` | `64fc78fd3a9453b5b0c2d8aaf180b18ea9cd7cbb18c6b74806b5722a73a8c80b` | Belfry peer; palette block size |

**Style / Identity verdict:** Style preserved vs Fryer / Vigil / Tocsin Boss weight and Belfry ordinary peer block size. Identity preserved as broad low awakened belfry mechanism (not a figure operating a machine). See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `the-unwound-c1-confine` (deterministic dial-under-glow alarm remapping of provider `the-unwound-c1`) |
| Archived | `assets-raw/grid_raw/the-unwound.png` |
| Sidecar | `assets-raw/grid_raw/the-unwound.source.json` (`acquisition: flexible`, `palette: unwound-belfry-24@1`) |
| Fitted opaque | **134×72** (≤ 160×72) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/the-unwound.png` (134×72 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses). Provider generation used that prompt; `c1-confine` remaps only opaque source pixels whose nearest `unwound-belfry-24` swatch is `alarm-*` and that fall outside the densest dial-under-glow connected component within the dial-ivory keep-bbox, to the nearest non-alarm swatch — preserving geometry and identity while satisfying C4 confinement.

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| the-unwound-c1 | body (Boss) | pass | none | fitted opaque 134×72 vs 160×72 | advance | Spec C4: alarm scatter outside dial under-glow → confine remap |
| the-unwound-c1-confine | body (Boss) | pass | none | fitted opaque 134×72; alarm-* only in dial under-glow | advance | visual review → **accept** → promote |

Measurement JSON: `candidate-report.json` (c1), `the-unwound-c1-confine-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `the-unwound.png` | `ab42369a93b7c66dda08d407117754b7e97cda2ed1135346845b92838dfbbf6a` |
| Runtime `src/assets/sprites/the-unwound.png` | `c3bc89e7e22c913f101ce4b1a6268e8e90e2aaf6aa1abdbef7e7852e817d7863` |
| Manifest frame sha256 | `d5da019b044acff95eaa89ffbfaa35521c423bcb445bfa8e9cdceeb7d71f3a7b` |

Manifest geometry: `frame_size [134,72]`, `visual_bounds [0,1,134,72]`, `foot_anchor [67,72]`, `palette: unwound-belfry-24`.

Offline byte-identity: local `build_archived_bundle(['the-unwound'], out_dir=…)` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Durable per-identity measure/palette assertions beyond discovery are deferred to the sprite-wiring slice; this slice only extends the production discovery expected-tag tuple so the complete The Unwound bundle is not treated as unexpected.

C4 alarm confinement (shipped runtime): 15 `alarm-*` pixels all in dial under-glow band (x 36–38, y 20–28); OUTSIDE dial band = [].

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [67, 72]` (bottom-centre of the 134×72 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG. Broad low silhouette clears the Boss-bar band.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** after confine remapping — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | The Fryer / The Vigil / The Tocsin / Tickmoth / Tollbat / Astrolabe-Spider / The Unwound at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete The Unwound bundle must appear in the production discovery expected-tag tuple (and a discovery presence check) so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-wiring slice |
