# Pipcap flexible ordinary-Opponent body proof (#256)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent (ordinary monster — Pipcap) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/pipcap.png` |
| Runtime shape | 30×32 RGBA, binary alpha, `moonberry-16`, native 1× |
| Visual vocabulary | `moonberry-16`; accepted Hunter (#255) Moonberry cohort |
| Geometry | facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 32]` |
| Review context | `COHORT_1x.png`; `FIVE_COPY_stress_1x.png`; `SCENE_party_5pipcap_1x.png`; `REVIEW_sheet_1x.png` |
| Validator | `pipeline/acquire.py measure --tag pipcap`; promote; `npm run assets:verify` |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity (pre-replacement) | `assets-raw/grid_raw/pipcap.png` (pre) / durable copy `identity-pipcap-pre.png` | `61521e221604d6106dc890e3feafec8326b704c7626e1400fa858cea429cb5a7` | whimsical mushroom goblin; broad cream-spotted cap; berry gill fringe; stem body; mint leaf clothing; dark-plum eye/feet; forward cap-bash stance |
| Style (#255 Hunter raw) | `assets-raw/grid_raw/hunter.png` | `7e828a24f02ec992ba65c98d61d3ef1fe617abb3f71754ce1af7d4facb4ae622` | chunky flat Moonberry palette, outline weight, storybook cohort |
| Style (Hunter runtime) | `src/assets/sprites/hunter.png` | `8aca82d0a1bdff48145cafe3b597de572e651df05a0b13b21f7c9e4acdfaced0` | native 1× Party peer for cohort strip |
| Cohort / scene peers | `src/assets/sprites/knight.png`, `priest.png`, `wizard.png` | — | Formation + five-Opponent stress layout per `layout.json` |

**Style / Identity verdict:** Identity preserved (spotted cream cap dominant, berry gill fringe, stem body, mint leaf, plum accents, cap-bash squat, LEFT facing). Style preserved vs accepted Hunter Moonberry cohort (chunky flat colour, outline weight, storybook read). See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `pipcap-flex-a` |
| Archived | `assets-raw/grid_raw/pipcap.png` |
| Sidecar | `assets-raw/grid_raw/pipcap.source.json` (`acquisition: flexible`) |
| Fitted opaque | **30×32** (≤ 30×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/pipcap.png` (30×32 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| pipcap-flex-a | body | pass | none | fitted opaque 30×32 vs 30×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `pipcap-flex-a-report.json`. Promote report: `promote-report.json`.

## Five-copy stress proof

Authoritative fit uses `layout.json` `ordinary_opponent_stress` anchors `[312, 346, 380, 414, 452]` on the 480×86 Battlefield. Opaque body rectangles (not transparent frames) recorded in `five-copy-geometry.json`:

- `inside_battlefield`: **true**
- `body_overlaps`: **[]** (no adjacent Pipcap opaque overlap)
- foot anchor `[15, 32]` places feet on `floor_y` 80

Composite: `FIVE_COPY_stress_1x.png`. Party-present scene: `SCENE_party_5pipcap_1x.png`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `pipcap.png` | `3f4d7a89cb61e562974056a96eb83db6de1d87c2e970085b123ffa56381b1cb1` |
| Runtime `src/assets/sprites/pipcap.png` | `9fc03d2c05604818e2b45fb30d50186a9c53062777c9008fa677a65ce4da54d2` |
| Manifest frame sha256 | `4bd576700223d6af0913db208e42093036d890a74f699d4d010e94974e029ad1` |

Manifest geometry: `frame_size [30,32]`, `visual_bounds [0,0,30,32]`, `foot_anchor [15,32]`.

Offline byte-identity: local `npm run assets:verify` on this branch; CI `assets` job remains the authoritative full-catalog rebuild after push.

## Foot-anchor / effects / UI independence

Pipcap manifest records `foot_anchor: [15, 32]` (bottom-centre of the 30×32 frame). Presentation places bodies via `sprite.footAnchor` (`src/ui/battle-tile.ts`); health/status UI and strike/travel/feedback anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + five-copy + party scene) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` | Pipcap vs Hunter vs Knight at 1× |
| `FIVE_COPY_stress_1x.png` | five Pipcaps at stress anchors |
| `SCENE_party_5pipcap_1x.png` | Party present with five Pipcaps |
| `REVIEW_sheet_1x.png` | stacked contact sheet used for step-6 subagent review |
| `STAGE_tile_five_opponents.png` | Playwright `evidence: tile-geometry` five-Opponent scene |
| `STAGE_stress_five_pools.png` | Playwright `evidence: five-actor-pools` Stage 3 stress |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Pipcap is now flexible; drop legacy `recover_grid` [29,40] assertion; add flexible provenance + 30×68 ceiling checks (same pattern as Hunter #255) |
| `docs/research/evidence/256-pipcap-flex/identity-pipcap-pre.png` | Durable byte copy of the pre-replacement identity reference (sidecar path `assets-raw/grid_raw/pipcap.png` is overwritten on promote) |
