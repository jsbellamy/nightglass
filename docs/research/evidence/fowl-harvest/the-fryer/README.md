# The Fryer Boss body — unpromoted archived raw (#387)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent body — Boss (`the-fryer`) |
| Status | candidate for shipping, **unpromoted** (raw + sidecar only; runtime via #405) |
| Runtime destination | later `src/assets/sprites/the-fryer.png` (not written here) |
| Runtime shape | after #405: flexible RGBA, binary alpha, `fowl-harvest-24@1`, ≤ 160×72 opaque |
| Visual vocabulary | `docs/fowl-harvest-theme.md`; `fowl-harvest-24@1`; Fowl cohort + The Combine |
| Geometry | facing LEFT; opaque ceiling 160×72; bottom-centre foot anchor after promotion |
| Review context | `REVIEW_sheet_1x.png` / `COHORT_1x.png` (+ `@4x`) |
| Validator | `pipeline/acquire.py measure --tag the-fryer`; archive promote; CI `assets` job |

See also `contract.md` and the exact prompt in `prompt.txt`.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Identity | Issue #387 prompt + theme intended read | n/a (canonical text) | duck–fryer anatomical fusion, LEFT facing, broad boss weight |
| Cohort | `src/assets/sprites/burger-drake.png` | `c8a0e66c892465c9fa9355df19275a1c7385f10246286c4f11c2869272f9563f` | Fowl Harvest block size, contour, saturation |
| Cohort | `src/assets/sprites/cornquacker.png` | `326ec503bc95de96ab98ce82e54e91ca32577ee5d92eebdcb608bcb50a59a8ca` | Tall ordinary peer; cohort tone |
| Cohort | `src/assets/sprites/the-combine.png` | `431f31f1a278a69e7fcd656f458789239a2339a443b3d96ab1cfbe13cd5aba15` | Accepted Fowl Boss peer |
| Boss scale | `src/assets/sprites/boss-3.png` | `308644b487a06641a01f95b14a5371298412372fdce7333b53a4642026836bdf` | Weight / side-profile discipline only |

**Style / Identity verdict:** Style preserved vs Fowl Harvest cohort. Identity preserved as broad duck–deep-fryer fusion at Boss scale. See `visual-review.md`.

## Chosen raw

| Field | Value |
| --- | --- |
| Candidate | `the-fryer-c1` |
| Archived | `assets-raw/grid_raw/the-fryer.png` |
| Sidecar | `assets-raw/grid_raw/the-fryer.source.json` (`acquisition: flexible`, `palette: fowl-harvest-24@1`) |
| Fitted opaque | **105×72** (≤ 160×72) |
| Cursor stamp cleanup | `false` |
| Runtime | **deferred to #405** — not written by this slice |

Accepted prompt is archived byte-for-byte in the sidecar / `prompt.txt` (issue fenced prompt; no measurement clauses).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| the-fryer-c1 | body (Boss) | pass | none | fitted opaque 105×72 vs 160×72 | advance | visual review → **accept** → archive promote (no runtime) |

No rejected candidates. Measurement JSON: `the-fryer-c1-report.json`. Promote report: `promote-report.json` (temp `out_dir`). Post-archive measure: `post-promote-measure.json`.

## Validator / provenance

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `the-fryer.png` | `c99d6f53403da5efdfdce764610304e1deeff1eb9d86c3f53c35ecc54fbbbc8d` |

Sidecar records provider, acquisition tool, exact prompt, raw SHA-256, `identity_profile`, facing `left`, role `boss`, palette `fowl-harvest-24@1`, and style-reference hashes. Rebuild discovery finds the complete archive but omits runtime rebuild until `src/assets/sprites/the-fryer.png` exists (#405).

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic measure + archive provenance | **accept** |
| Agent visual review (cohort strip; Style + Identity rows) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `REVIEW_sheet_1x.png` (+ `@4x`) | Step-6 subagent (Style / Identity) |
| `COHORT_1x.png` (+ `@4x`) | Same strip for evidence browsing |
| `NATIVE_single_1x.png` (+ `@4x`) | Normalized preview only (not committed runtime) |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/acquire.py` | Complete unpromoted archives must not enter `default_build_raw_tags` until a committed runtime PNG exists; shrink `MISSING_BODY_BUNDLE_INTERIM_RAW_TAGS` to Scarequack-only after Fryer raw lands |
| `pipeline/test_contract.py` | Discovery / interim / production-tag expectations for archived-but-unpromoted Fryer |
| `docs/fowl-harvest-theme.md` | Record finished generation prompt now that #387 acquired the raw |
