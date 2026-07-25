# Lanternmoth ordinary-opponent body (#675)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`lanternmoth`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/lanternmoth.png` + manifest entry |
| Runtime shape | 30×29 RGBA, binary alpha, `moonberry-16@1`, native 1× |
| Visual vocabulary | `docs/moonberry-theme.md` § `lanternmoth`; `moonberry-16@1` |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 29]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag lanternmoth`; promote; CI `assets` job |

See also the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #675 C1 / `docs/moonberry-theme.md` § `lanternmoth` | n/a (canonical text) | orchard moth with swollen cream lantern-bulb abdomen, LEFT facing, wide/top-heavy winged |
| Style cohort | `src/assets/sprites/pipcap.png` | `9fc03d2c05604818e2b45fb30d50186a9c53062777c9008fa677a65ce4da54d2` | shipped Moonberry ordinary-opponent peer; chunky flat pixel block size |
| Style cohort | `src/assets/sprites/brambling.png` | `5add87c3d42694cda0da0e328635bab67183e0d8b5308090a76910c3a69c8fe5` | shipped Moonberry ordinary-opponent peer; tall/spiky contrast for silhouette separation |
| Palette context (optional) | `src/assets/sprites/boss-1.png`, `boss-2.png`, `boss-3.png` | n/a | moonberry-16 tone reference at generation |

**Style / Identity verdict:** Style preserved vs Pipcap / Brambling chunky flat Moonberry cohort. Identity preserved as moth whose abdomen is a fused cream lantern-bulb (not moth carrying a lantern). See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `lanternmoth-c1` |
| Scratch (pre-promote measure) | `docs/research/evidence/moonberry/lanternmoth/scratch/lanternmoth-c1.png` |
| Archived | `assets-raw/grid_raw/lanternmoth.png` |
| Sidecar | `assets-raw/grid_raw/lanternmoth.source.json` (`acquisition: flexible`, `palette: moonberry-16@1`) |
| Fitted opaque | **30×29** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/lanternmoth.png` (30×29 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| lanternmoth-c1 | body | pass | none | fitted opaque 30×29 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `candidate-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `lanternmoth.png` | `8e19f3590e86c31e1200d28adff4a2ce43f7540c5f0e5ce04364bce3afcef95e` |
| Runtime `src/assets/sprites/lanternmoth.png` | `84ba9ce126f9dd22c74b611f5d53768ad9b294e946861d8c2f174b5e97e492fd` |
| Manifest frame sha256 | `5e91651a50c2413d2a636fe5f759c5c1a0c6a136f2828aa6f5a8b8896cf49575` |

Manifest geometry: `frame_size [30,29]`, `visual_bounds [0,0,30,29]`, `foot_anchor [15,29]`, `palette: moonberry-16`.

Offline byte-identity: local `build_archived_bundle(['lanternmoth'])` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Per issue invariants I4, no `OpponentDef`, `src/ui/sprites.ts`, or Stage wiring in this slice.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 29]` (bottom-centre of the 30×29 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Pipcap / Brambling / Lanternmoth at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Complete Lanternmoth bundle must appear in the production discovery expected-tag tuple (after `knight` in runtime-key order) so CI does not fail the catalog equality gate; durable per-identity measure assertions remain the sprite-wiring slice |
