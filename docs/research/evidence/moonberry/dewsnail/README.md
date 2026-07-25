# Dewsnail ordinary-opponent body (#677)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`dewsnail`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/dewsnail.png` + manifest entry |
| Runtime shape | 30×16 RGBA, binary alpha, `moonberry-16@1`, native 1× |
| Visual vocabulary | `docs/moonberry-theme.md` § `dewsnail`; `moonberry-16@1` |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 16]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag dewsnail`; promote; CI `assets` job |

See also the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity (original sample) | Issue #677 C1 / `docs/moonberry-theme.md` § `dewsnail` | n/a (canonical text) | snail fused with dew-glass spiral shell and berry swirl band, LEFT facing, low/coiled ground crawler |
| Style cohort | `src/assets/sprites/pipcap.png` | `9fc03d2c05604818e2b45fb30d50186a9c53062777c9008fa677a65ce4da54d2` | shipped Moonberry ordinary-opponent peer; chunky flat pixel block size |
| Style cohort | `src/assets/sprites/brambling.png` | `5add87c3d42694cda0da0e328635bab67183e0d8b5308090a76910c3a69c8fe5` | shipped Moonberry ordinary-opponent peer; tall/spiky contrast for silhouette separation |
| Style cohort | `src/assets/sprites/lanternmoth.png` | `84ba9ce126f9dd22c74b611f5d53768ad9b294e946861d8c2f174b5e97e492fd` | shipped Moonberry ordinary-opponent peer; wide/top-heavy contrast for silhouette separation |
| Style cohort | `src/assets/sprites/huskbeetle.png` | `7693dd123050ec05decf79d81e0172efcfc7a41e1725d61c31490a36081820dc` | shipped Moonberry ordinary-opponent peer; low/wide angular contrast — Dewsnail must read coiled/smooth vs this domed silhouette |

**Style / Identity verdict:** Style preserved vs Pipcap / Brambling / Lanternmoth / Huskbeetle chunky flat Moonberry cohort (contour-plum outline, moonberry-16 palette, block density). Identity preserved as one living snail whose shell has set into a dew-glass spiral with berry swirl — not a snail carrying a separate glass ornament. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `dewsnail-c1` |
| Scratch (pre-promote measure) | `docs/research/evidence/moonberry/dewsnail/scratch/dewsnail-c1.png` |
| Archived | `assets-raw/grid_raw/dewsnail.png` |
| Sidecar | `assets-raw/grid_raw/dewsnail.source.json` (`acquisition: flexible`, `palette: moonberry-16@1`) |
| Fitted opaque | **30×16** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/dewsnail.png` (30×16 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| dewsnail-c1 | body | pass | none | fitted opaque 30×16 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `candidate-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `dewsnail.png` | `3214dacdd69f34b0d9c9aae533570b04be7bb9afa1c6bef9e14b751de1133bf6` |
| Runtime `src/assets/sprites/dewsnail.png` | `07b59a34bfa797e97eab3d7e3a1718a47506dca74d2ea3d43ff0827affc496ca` |
| Manifest frame sha256 | `08eba41942c0a639c8cfe8ce2999eb094d5ae7832a96c48cd285e5b260cf5465` |

Manifest geometry: `frame_size [30,16]`, `visual_bounds [0,0,30,16]`, `foot_anchor [15,16]`, `palette: moonberry-16`.

Offline byte-identity: local `build_archived_bundle(['dewsnail'])` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Per issue invariants I4, no `OpponentDef`, `src/ui/sprites.ts`, or Stage wiring in this slice.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 16]` (bottom-centre of the 30×16 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Pipcap / Brambling / Lanternmoth / Huskbeetle / Dewsnail at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete Dewsnail bundle must appear in the production discovery expected-tag tuple so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-wiring slice |
