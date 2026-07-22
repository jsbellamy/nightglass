# The Combine Boss body + Fowl Harvest cohesion (#327)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — Boss (`the-combine`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/the-combine.png` + manifest entry |
| Runtime shape | 110×72 RGBA, binary alpha, `fowl-harvest-24@1`, native 1× |
| Visual vocabulary | `docs/fowl-harvest-theme.md`; `fowl-harvest-24@1`; accepted Burger Drake + Cornquacker cohort |
| Geometry | facing LEFT; opaque ceiling 160×72; bottom-centre foot anchor `[55, 72]` |
| Review context | `NINE_PANEL_cohesion_1x.png` (+ `@4x`); Boss harvest-yard scene; cohort strip |
| Validator | `pipeline/acquire.py measure --tag the-combine`; promote; CI `npm run assets:verify` |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | `docs/fowl-harvest-theme.md` `the-combine` prompt + intended read | n/a (canonical text) | duck–combine anatomical fusion, LEFT facing, broad boss weight |
| Cohort | `src/assets/sprites/burger-drake.png` | `c8a0e66c892465c9fa9355df19275a1c7385f10246286c4f11c2869272f9563f` | Fowl Harvest block size, contour, saturation |
| Cohort | `src/assets/sprites/cornquacker.png` | `326ec503bc95de96ab98ce82e54e91ca32577ee5d92eebdcb608bcb50a59a8ca` | Tall ordinary peer; cohort tone |
| Boss scale | `src/assets/sprites/boss-3.png` | `308644b487a06641a01f95b14a5371298412372fdce7333b53a4642026836bdf` | Weight / side-profile discipline only |

**Style / Identity verdict:** Style preserved vs Burger Drake + Cornquacker Fowl Harvest cohort. Identity preserved as broad duck–harvester–corn fusion at Boss scale. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `the-combine-c1` |
| Archived | `assets-raw/grid_raw/the-combine.png` |
| Sidecar | `assets-raw/grid_raw/the-combine.source.json` (`acquisition: flexible`, `palette: fowl-harvest-24@1`) |
| Fitted opaque | **110×72** (≤ 160×72) |
| Cursor stamp cleanup | `false` |
| Runtime | `src/assets/sprites/the-combine.png` (110×72 RGBA, binary alpha) |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| the-combine-c1 | body (Boss) | pass | none | fitted opaque 110×72 vs 160×72 | advance | visual review → **accept** → promote |

No rejected candidates. Measurement JSON: `the-combine-c1-report.json`. Promote report: `promote-report.json`. Post-promote measure: `post-promote-measure.json`.

## Nine-panel cohesion gate

Exact-native matrix `NINE_PANEL_cohesion_1x.png` (nearest-neighbor `NINE_PANEL_cohesion_4x.png` for inspection only):

```text
rows:    burger-drake | cornquacker | the-combine
columns: last-stop-diner | crooked-cornfield | harvest-yard
```

Every panel includes the three-Character Party, role-correct opponent placement, health/Boss bars, damage numbers, and current `moonberry-glow` effect frames. Ordinary rows include a five-copy stress inset. Written verdict covers every cohesion bullet in `visual-review.md`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `the-combine.png` | `460b2d8419e0261af4303496e6ee08e133f34cb46e44059b51dffe91d4318da1` |
| Runtime `src/assets/sprites/the-combine.png` | `431f31f1a278a69e7fcd656f458789239a2339a443b3d96ab1cfbe13cd5aba15` |
| Manifest frame sha256 | `f23ddb02e9f700cf2e635a8e0f1f5f9bb692712faa4c2ef5e197bab945633aba` |

Manifest geometry: `frame_size [110,72]`, `visual_bounds [0,0,110,72]`, `foot_anchor [55,72]`, `palette: fowl-harvest-24`.

Offline byte-identity: targeted `pipeline/test_contract.py` after promotion; CI `assets` job remains the authoritative full-catalog rebuild after push.

## Foot-anchor / effects / UI independence

Manifest records `foot_anchor: [55, 72]` (bottom-centre of the 110×72 frame). Presentation places bodies via `sprite.footAnchor`; health/status UI and effect anchors remain independent of body width. No renderer body mirroring — LEFT facing is authored in the PNG.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure/promote | **accept** |
| Agent visual review (nine-panel cohesion) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `NINE_PANEL_cohesion_1x.png` (+ `@4x`) | Final 3×3 cohesion gate (exact-native judgement) |
| `REVIEW_sheet_1x.png` (+ `@4x`) | Same matrix path used for step-6 subagent |
| `BOSS_SCENE_harvest-yard_1x.png` (+ `@4x`) | Primary Boss setting with Party / bar / effects |
| `COHORT_1x.png` (+ `@4x`) | Burger / Cornquacker / Combine / boss-3 weight strip |
| `NATIVE_single_1x.png` (+ `@4x`) | Single runtime body |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | The Combine is now a complete flexible Fowl Boss bundle; extend discovery expected tags, runtime byte-identity map, and flexible provenance/ceiling checks (same pattern as Burger Drake #325 / Cornquacker #326) |
| `BOSS_SCENE_harvest-yard_*`, `COHORT_*`, `NATIVE_single_*`, `REVIEW_sheet_*` | Companion native/4× sheets for Boss identity and cohort context alongside the required nine-panel gate |
