# Scarequack Boss body — archived raw only (#388)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — Boss (`scarequack`) |
| Status | candidate for shipping, **unpromoted** (shared runtime promotion is #405) |
| Runtime destination | later `src/assets/sprites/scarequack.png` (not written by this slice) |
| Runtime shape | provisional normalize for review: 51×72 RGBA, `fowl-harvest-24@1` |
| Visual vocabulary | `docs/fowl-harvest-theme.md`; `fowl-harvest-24@1`; The Combine + ordinary Fowl cohort |
| Geometry | facing LEFT; opaque ceiling 160×72; fitted opaque **51×72**; foot anchor after promotion |
| Review context | `REVIEW_sheet_1x.png` / `COHORT_1x.png` (+ `@4x`) |
| Validator | `pipeline/acquire.py measure --tag scarequack` |

See also `contract.md` and the issue prompt in `prompt.txt`. Accepted generation prompt (c2 red-eye retry) is archived in the sidecar.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #388 prompt + `docs/fowl-harvest-theme.md` scarequack intended read | n/a (canonical text) | duck–scarecrow–fencepost fusion, tall crooked silhouette, LEFT facing, condiment-red lantern eye |
| Cohort provenance | `assets-raw/grid_raw/the-combine.source.json` | n/a (convention) | Fowl Boss flexible sidecar shape |
| Cohort evidence | `docs/research/evidence/fowl-harvest/the-combine/` | n/a | Boss scale / cohesion discipline |
| Style | `src/assets/sprites/the-combine.png` | `431f31f1a278a69e7fcd656f458789239a2339a443b3d96ab1cfbe13cd5aba15` | Boss weight / Fowl contour |
| Style | `src/assets/sprites/burger-drake.png` | `c8a0e66c892465c9fa9355df19275a1c7385f10246286c4f11c2869272f9563f` | Ordinary cohort block size |
| Style | `src/assets/sprites/cornquacker.png` | `326ec503bc95de96ab98ce82e54e91ca32577ee5d92eebdcb608bcb50a59a8ca` | Tall ordinary peer |

**Style / Identity verdict:** Style preserved vs The Combine + ordinary Fowl cohort. Identity preserved as tall crooked duck–scarecrow–fencepost fusion with condiment-red lantern eye. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `scarequack-c2` |
| Archived | `assets-raw/grid_raw/scarequack.png` |
| Sidecar | `assets-raw/grid_raw/scarequack.source.json` (`acquisition: flexible`, `palette: fowl-harvest-24@1`) |
| Fitted opaque | **51×72** (≤ 160×72) |
| Cursor stamp cleanup | `false` |
| Runtime | **not committed** — provisional normalize used only for the cohort composite |

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| scarequack-c1 | body (Boss) | pass | none | fitted opaque 52×72 vs 160×72 | advance → visual Spec fail | retry — lantern eye read yellow/orange, not condiment-red |
| scarequack-c2 | body (Boss) | pass | none | fitted opaque 51×72 vs 160×72 | advance | visual review → **accept** → archive raw + sidecar |

Measurement JSON: `scarequack-c1-report.json`, `scarequack-c2-report.json`. Archive measure: `post-archive-measure.json`. Archive disposition: `promote-report.json` (`archived_raw_only`).

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `scarequack.png` | `2c92a97aec8bdfb2ab819a33b0c2f0d4f2a897cb434b431e018dfa2b4f8feab9` |

Interim note: `scarequack` remains in `MISSING_BODY_BUNDLE_INTERIM_RAW_TAGS` so the complete archive is discoverable but omitted from `default_build_raw_tags()` until #405. CI `assets` job remains authoritative for the production catalog.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure | **accept** (advance) |
| Agent visual review (cohort strip) | **accept** — see `visual-review.md` (c2) |
| Shared runtime promote | deferred to #405 |

## Review sheets

| File | Judge |
| --- | --- |
| `REVIEW_sheet_1x.png` (+ `@4x`) | Step-6 subagent composite (cohort strip) |
| `COHORT_1x.png` (+ `@4x`) | Same strip: burger / cornquacker / combine / scarequack |
| `NATIVE_single_1x.png` (+ `@4x`) | Provisional normalized body alone |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/acquire.py` | Exclude interim tags from `discover_body_build_raw_tags` so an archived Scarequack raw does not enter production rebuild before #405 |
| `pipeline/test_contract.py` | Expect discoverable Scarequack archive while still omitting it from default rebuild |
| `COHORT_*`, `NATIVE_single_*`, `REVIEW_sheet_*` | One-composite native/4× sheets for step-6 review without shipping runtime |
