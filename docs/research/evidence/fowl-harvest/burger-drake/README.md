# Burger Drake ordinary-opponent body (#325)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — ordinary opponent (`burger-drake`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/burger-drake.png` + manifest entry |
| Runtime shape | 30×35 RGBA, binary alpha, `fowl-harvest-24@1`, native 1× |
| Visual vocabulary | `docs/fowl-harvest-theme.md`; `fowl-harvest-24@1` |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 35]` |
| Review context | `COHORT_1x.png`; `FIVE_COPY_stress_1x.png`; `SCENE_party_5burger_1x.png`; `REVIEW_sheet_1x.png` (+ `@4x` sheets) |
| Validator | `pipeline/acquire.py measure --tag burger-drake`; promote; CI `npm run assets:verify` |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | `docs/fowl-harvest-theme.md` `burger-drake` prompt + intended read | n/a (canonical text; no separate portrait in repo) | top hat, monocle, burger torso fusion, LEFT facing, duck→burger→dapper read |
| Style / scale | `src/assets/sprites/pipcap.png` | `9fc03d2c05604818e2b45fb30d50186a9c53062777c9008fa677a65ce4da54d2` | ordinary-opponent native scale peer |
| Style / Party | `src/assets/sprites/hunter.png` | `8aca82d0a1bdff48145cafe3b597de572e651df05a0b13b21f7c9e4acdfaced0` | chunky flat pixel outline / readability |
| Style / Party | `src/assets/sprites/knight.png` | `6ae9b30bf9157e0cb5054c72a79b3cccc115f2a9aad8b4ab417bf288c3d9d4b6` | Party cohort readability |

**Style / Identity verdict:** Identity preserved (duck head, burger anatomical torso, top hat, monocle, LEFT facing). Style preserved vs Pipcap scale and Hunter/Knight chunky Moonberry cohort readability, quantized to `fowl-harvest-24@1`. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `burger-drake-c1` |
| Archived | `assets-raw/grid_raw/burger-drake.png` |
| Sidecar | `assets-raw/grid_raw/burger-drake.source.json` (`acquisition: flexible`, `palette: fowl-harvest-24@1`) |
| Fitted opaque | **30×35** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/burger-drake.png` (30×35 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| burger-drake-c1 | body | pass | none | fitted opaque 30×35 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `burger-drake-c1-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Five-copy stress proof

Authoritative fit uses `layout.json` `ordinary_opponent_stress` anchors `[312, 346, 380, 414, 452]` on the 480×86 Battlefield. Opaque body rectangles recorded in `five-copy-geometry.json`:

- `inside_battlefield`: **true**
- `body_overlaps`: **[]**
- foot anchor `[15, 35]` places feet on `floor_y` 80

Composite: `FIVE_COPY_stress_1x.png`. Party-present scene: `SCENE_party_5burger_1x.png`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `burger-drake.png` | `38b00e461bf57a73bd4a09cdabe7aabaef1b149e31c48f019ef338a2c693cba1` |
| Runtime `src/assets/sprites/burger-drake.png` | `c8a0e66c892465c9fa9355df19275a1c7385f10246286c4f11c2869272f9563f` |
| Manifest frame sha256 | `d58aa8162a89f922b082cfe630b45e886315859facb09515aade7fcb5893f10a` |

Manifest geometry: `frame_size [30,35]`, `visual_bounds [0,0,30,35]`, `foot_anchor [15,35]`, `palette: fowl-harvest-24`.

Offline byte-identity: targeted `pipeline/test_contract.py` after promotion; CI `assets` job remains the authoritative full-catalog rebuild after push.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [15, 35]` (bottom-centre of the 30×35 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + five-copy + party scene) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` (+ `@4x`) | Knight / Hunter / Pipcap / Burger Drake at 1× |
| `FIVE_COPY_stress_1x.png` | five Burger Drakes at stress anchors |
| `SCENE_party_5burger_1x.png` | Party present with five Burger Drakes |
| `REVIEW_sheet_1x.png` (+ `@4x`) | stacked contact sheet used for step-6 subagent review |
| `NATIVE_single_1x.png` (+ `@4x`) | single runtime body |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Burger Drake is now a complete flexible Fowl body bundle; extend discovery expected tags, runtime byte-identity map, and flexible provenance/ceiling checks (same pattern as Pipcap #256 / Hunter #255) |
