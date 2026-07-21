# Hunter flexible Party body proof (#255)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | Character (Party Character — Hunter) |
| Status | candidate for shipping |
| Runtime destination | `src/assets/sprites/hunter.png` |
| Runtime shape | 40×46 RGBA, binary alpha, `moonberry-16`, native 1× |
| Visual vocabulary | `moonberry-16`; Knight-cohort Moonberry night-garden |
| Geometry | facing RIGHT; opaque ceiling 40×68; bottom-centre foot anchor `[20, 46]` |
| Review context | `COHORT_1x.png`; `FORMATION_STRESS_review_1x.png` (Back/Middle/Front + five-Opponent) |
| Validator | `pipeline/acquire.py measure --tag hunter`; promote; `npm run assets:verify` |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | Pre-replacement SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity (original sample) | `assets-raw/grid_raw/hunter.png` (pre) / durable copy `identity-hunter-pre.png` | `d5cdbb892abeeedac796e1a48a136cefe2eb55bda72be7f04e37748ce45ffc97` | taut bramble shortbow + nocked thorn arrow; mint tunic; plum hood-down; berry scarf tail; leaf-scale shoulder; cream trousers; compact alert stance |
| Style cohort (issue-mandated) | `assets-raw/grid_raw/knight.png` | `9dfcdd69592cec858d9ff4d53429a2a3b48815918f4b463083e7201d69546cb5` | chunky flat Moonberry palette/contour weight and storybook cohort language |
| Party runtime peers | `src/assets/sprites/knight.png`, `priest.png`, `wizard.png` | — | Formation pitch spacing and silhouette distinctness at 1× |

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `hunter-flex-a` |
| Archived | `assets-raw/grid_raw/hunter.png` |
| Sidecar | `assets-raw/grid_raw/hunter.source.json` (`acquisition: flexible`) |
| Fitted opaque | **40×46** (≤ 40×68) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/hunter.png` (40×46 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| hunter-flex-a | body | pass | none | fitted opaque 40×46 vs 40×68 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `hunter-flex-a-report.json`. Promote report: `promote-report.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `hunter.png` | `7e828a24f02ec992ba65c98d61d3ef1fe617abb3f71754ce1af7d4facb4ae622` |
| Runtime `src/assets/sprites/hunter.png` | `8aca82d0a1bdff48145cafe3b597de572e651df05a0b13b21f7c9e4acdfaced0` |
| Manifest frame sha256 | `ab8a42558724cf7d1007965c5d4aace303b7ee8709abb3ada4177af8b7744178` |

Manifest geometry: `frame_size [40,46]`, `visual_bounds [0,0,40,46]`, `foot_anchor [20,46]`.

Offline byte-identity: CI `assets` job / local `npm run assets:verify` after push.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (cohort + Formation/stress) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `COHORT_1x.png` | Party cohort silhouette / style / identity at 1× |
| `FORMATION_hunter_{back,middle,front}_1x.png` | Hunter in each Formation slot |
| `STRESS_5opp_hunter_1x.png` | five-Opponent stress |
| `FORMATION_STRESS_review_1x.png` | stacked contact sheet used for Formation/stress subagent review |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `src/ui/sprites.test.ts` | Hardcoded Hunter `frame_size [32, 48]` broken by flexible geometry; aligned to manifest like Priest |
| `pipeline/test_contract.py` | First flexible archived body; legacy `recover_grid` / rebuild loops now skip or dispatch via `normalize_archived` |
| `docs/research/evidence/255-hunter-flex/identity-hunter-pre.png` | Durable byte copy of the pre-replacement identity reference (sidecar path `assets-raw/grid_raw/hunter.png` is overwritten on promote) |
