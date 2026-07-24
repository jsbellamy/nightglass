# Tickmoth ordinary-opponent body (#569)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`tickmoth`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/tickmoth.png` + manifest entry |
| Runtime shape | 30×24 RGBA, binary alpha, `unwound-belfry-24@1`, native 1× |
| Visual vocabulary | `docs/unwound-belfry-theme.md`; `unwound-belfry-24@1` |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 24]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag tickmoth`; promote; CI `assets` job |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #569 C1 / `docs/unwound-belfry-theme.md` §`tickmoth` | n/a (canonical text) | moth + cracked pocket-watch fusion, LEFT facing, dial-thorax, four indigo wings, coil abdomen |
| Style cohort | `src/assets/sprites/burger-drake.png` | `c8a0e66c892465c9fa9355df19275a1c7385f10246286c4f11c2869272f9563f` | ordinary-opponent LEFT-facing chunky flat pixel block size |
| Style cohort | `src/assets/sprites/cornquacker.png` | `326ec503bc95de96ab98ce82e54e91ca32577ee5d92eebdcb608bcb50a59a8ca` | ordinary-opponent peer; cohort block weight |

**Style / Identity verdict:** Style preserved vs Burger Drake / Cornquacker chunky flat pixel cohort. Identity preserved as moth anatomically fused with cracked pocket watch (not moth holding a watch). See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `tickmoth-c1` |
| Archived | `assets-raw/grid_raw/tickmoth.png` |
| Sidecar | `assets-raw/grid_raw/tickmoth.source.json` (`acquisition: flexible`, `palette: unwound-belfry-24@1`) |
| Fitted opaque | **30×24** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/tickmoth.png` (30×24 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| tickmoth-c1 | body | pass | none | fitted opaque 30×24 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `candidate-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `tickmoth.png` | `f8bf2708d05e494904bf50c328bc21025b0b59486150a76907f11009cfba506f` |
| Runtime `src/assets/sprites/tickmoth.png` | `0e8019a793ec7c18ec10711b9490f32193f01a60179e67e6a61c7948805e5840` |
| Manifest frame sha256 | `12ef99e835b4d26c4d3a71066e9bc6971b5b3f2431f4f3a5f874cce27724c4f0` |

Manifest geometry: `frame_size [30,24]`, `visual_bounds [0,0,30,24]`, `foot_anchor [15,24]`, `palette: unwound-belfry-24`.

Offline byte-identity: local `build_archived_bundle(['tickmoth'])` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Durable per-identity measure/palette assertions beyond discovery are deferred to the sprite-wiring slice; this slice only extends the production discovery expected-tag tuple so the complete Tickmoth bundle is not treated as unexpected.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 24]` (bottom-centre of the 30×24 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Burger Drake / Cornquacker / Tickmoth at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete Tickmoth bundle must appear in the production discovery expected-tag tuple (and a discovery presence check) so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-wiring slice |
