# Thornmother flexible solo-Boss body proof (#257)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent (Boss — Thornmother Vane / `boss-3`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/boss-3.png` |
| Runtime shape | 36×72 RGBA, binary alpha, `moonberry-16`, native 1× |
| Visual vocabulary | `moonberry-16`; accepted Pipcap (#256) cohort + Bramblehorn Boss weight |
| Geometry | facing LEFT; opaque ceiling 160×72; bottom-centre foot anchor `[18, 72]`; solo Boss x=240 |
| Review context | `SCENE_boss_stage3_1x.png`; `COHORT_1x.png`; `COHORT_wave_hunter_pipcap_thornmother_1x.png` / `REVIEW_sheet_1x.png` |
| Validator | `pipeline/acquire.py measure --tag boss-3`; promote; `npm run assets:verify` |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity (pre-replacement) | `assets-raw/grid_raw/boss-3.png` (pre) / durable copy `identity-thornmother-pre.png` | `02543340a945e8f1cd52e15a2bb013069c2749a08fd35c0732a24cdbfdcca1ca` | tall sharp thorn-queen; cream nightbloom crown; berry vine/thorn gown; mint leaf-blade arms; dark-plum contour; LEFT facing |
| Opponent cohort (#256 Pipcap raw) | `assets-raw/grid_raw/pipcap.png` | `3f4d7a89cb61e562974056a96eb83db6de1d87c2e970085b123ffa56381b1cb1` | chunky flat Moonberry palette and outline weight |
| Opponent cohort (Pipcap runtime) | `src/assets/sprites/pipcap.png` | `9fc03d2c05604818e2b45fb30d50186a9c53062777c9008fa677a65ce4da54d2` | native 1× ordinary Opponent peer |
| Boss language (Bramblehorn) | `assets-raw/grid_raw/boss.png` | `ae87deb3e047d6a80f2db3194f666479a89acd980141659f6a9c8178ca63829a` | authored Boss weight without copying crouched vine shape |
| Wave cohort peers | `src/assets/sprites/hunter.png`, `pipcap.png` | hunter `8aca82d0…`; pipcap above | final Hunter + Pipcap + Thornmother wave proofs |

**Style / Identity verdict:** Identity preserved (cream crown, berry vine/thorn gown, mint leaf-blade arms, plum contour, tall regal LEFT-facing thorn-queen). Style preserved vs accepted Pipcap Moonberry cohort; Boss-language weight retained without Bramblehorn silhouette copy. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `thornmother-flex-a` |
| Archived | `assets-raw/grid_raw/boss-3.png` |
| Sidecar | `assets-raw/grid_raw/boss-3.source.json` (`acquisition: flexible`) |
| Fitted opaque | **36×72** (≤ 160×72) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/boss-3.png` (36×72 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| thornmother-flex-a | body | pass | none | fitted opaque 36×72 vs 160×72 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `thornmother-flex-a-report.json`. Promote report: `promote-report.json`.

## Stage 3 Boss composition proof

Authoritative layout from `layout.json`: Battlefield 480×86, `floor_y` 80, `boss_bar_bottom_y` 7, solo Boss foot anchor x **240**. Opaque body rectangle recorded in `boss-scene-geometry.json`:

- `inside_battlefield`: **true**
- `crosses_boss_bar`: **false** (opaque top y=8 > bar bottom 7)
- `boss_vs_party_overlaps`: **[]**
- foot anchor `[18, 72]` places feet on `floor_y` 80

Composite: `SCENE_boss_stage3_1x.png`. Final wave cohort: `COHORT_wave_hunter_pipcap_thornmother_1x.png`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `boss-3.png` | `30e3b6d081726c00761455c3b65e0e0649d57bcbadea8f22a96c302f96896b3d` |
| Runtime `src/assets/sprites/boss-3.png` | `308644b487a06641a01f95b14a5371298412372fdce7333b53a4642026836bdf` |
| Manifest frame sha256 | `d50d15ed713e1cd7ce104311dfb1669ea04fa36494444256e19e0b21dd1922b5` |

Manifest geometry: `frame_size [36,72]`, `visual_bounds [0,0,36,72]`, `foot_anchor [18,72]`.

Offline byte-identity: local `npm run assets:verify` on this branch; CI `assets` job remains the authoritative full-catalog rebuild after push.

## Foot-anchor / effects / UI independence

Thornmother manifest records `foot_anchor: [18, 72]` (bottom-centre of the 36×72 frame). Presentation places bodies via `sprite.footAnchor` (`src/ui/battle-tile.ts`); Boss anchor x from `footAnchorXForCombatant` → `LAYOUT.anchors_x.boss[0]` (240). Health/status UI and strike/travel/feedback anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (Boss scene + wave cohort) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `SCENE_boss_stage3_1x.png` | solo Thornmother at x=240 with bar band |
| `COHORT_1x.png` | Hunter / Pipcap / Thornmother strip at 1× |
| `COHORT_wave_hunter_pipcap_thornmother_1x.png` | Party (Hunter middle) + five Pipcaps + solo Boss |
| `REVIEW_sheet_1x.png` | same as wave cohort; step-6 subagent input |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Boss-3 is now flexible; drop legacy `recover_grid` [21,40] assertion; add flexible provenance + 160×72 ceiling checks (same pattern as Hunter #255 / Pipcap #256) |
| `src/ui/sprites.test.ts` | Hardcoded Boss `frame_size [32, 48]` broken by flexible Thornmother geometry; aligned to manifest like Hunter/Priest |
| `docs/research/evidence/257-thornmother-flex/identity-thornmother-pre.png` | Durable byte copy of the pre-replacement identity reference (sidecar path `assets-raw/grid_raw/boss-3.png` is overwritten on promote) |
