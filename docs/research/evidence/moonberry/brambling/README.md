# Brambling ordinary-opponent body (#674)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`brambling`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/brambling.png` + manifest entry |
| Runtime shape | 30×61 RGBA, binary alpha, `moonberry-16@1`, native 1× |
| Visual vocabulary | `docs/moonberry-theme.md` § `brambling`; `moonberry-16@1` |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 61]` |
| Review context | `COHORT_1x.png`; `NATIVE_single_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag brambling`; promote; CI `assets` job |

See also the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #674 C1 / `docs/moonberry-theme.md` § `brambling` | n/a (canonical text) | briar-imp of living thorn-cane, berry-cluster fists, LEFT facing, tall/narrow/spiky |
| Style cohort | `src/assets/sprites/pipcap.png` | `9fc03d2c05604818e2b45fb30d50186a9c53062777c9008fa677a65ce4da54d2` | sole shipped Moonberry ordinary-opponent peer; chunky flat pixel block size |
| Style cohort (archived raw) | `assets-raw/grid_raw/pipcap.png` | `3f4d7a89cb61e562974056a96eb83db6de1d87c2e970085b123ffa56381b1cb1` | peer acquisition reference |
| Palette context (optional) | `src/assets/sprites/boss-1.png`, `boss-2.png`, `boss-3.png` | n/a | moonberry-16 tone reference at generation |

**Cohort note:** Only one shipped Moonberry ordinary-opponent peer exists (`pipcap`); the cohort is a single peer.

**Style / Identity verdict:** Style preserved vs Pipcap chunky flat Moonberry cohort. Identity preserved as hunched briar-imp of living thorn-cane with berry-cluster fists (not bush with a face). See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `brambling-c1` |
| Scratch (pre-promote measure) | `docs/research/evidence/moonberry/brambling/scratch/brambling-c1.png` |
| Archived | `assets-raw/grid_raw/brambling.png` |
| Sidecar | `assets-raw/grid_raw/brambling.source.json` (`acquisition: flexible`, `palette: moonberry-16@1`) |
| Fitted opaque | **30×61** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/brambling.png` (30×61 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| brambling-c1 | body | pass | none | fitted opaque 30×61 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `candidate-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `brambling.png` | `f90b6152fe0862683b7027348219b57ebe08b071655b6d4daf5316adc4552937` |
| Runtime `src/assets/sprites/brambling.png` | `5add87c3d42694cda0da0e328635bab67183e0d8b5308090a76910c3a69c8fe5` |
| Manifest frame sha256 | `c657daa723552a12de88bfc3e466eb7e958a01bff629c5d5ab84ef0e697bba6c` |

Manifest geometry: `frame_size [30,61]`, `visual_bounds [0,0,30,61]`, `foot_anchor [15,61]`, `palette: moonberry-16`.

Offline byte-identity: local `build_archived_bundle(['brambling'])` matched shipped runtime bytes. CI `assets` job remains the authoritative full-catalog rebuild after push. Per issue invariants I4, no `OpponentDef`, `src/ui/sprites.ts`, or Stage wiring in this slice.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 61]` (bottom-centre of the 30×61 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + native single on `REVIEW_sheet_1x.png`) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Pipcap / Brambling at 1× |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |
