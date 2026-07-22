# Promote Fowl Harvest Boss cohort (#405)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent bodies — Boss (`the-fryer`, `scarequack`) + registry of five Fowl keys |
| Status | accepted for shipping (mechanical promote from archived raws; agent visual review accept) |
| Runtime destination | `src/assets/sprites/the-fryer.png`, `scarequack.png`; `manifest.json`; `src/ui/sprites.ts` |
| Runtime shape | flexible crop RGBA, binary alpha, `fowl-harvest-24@1`, bottom-centre anchors |
| Visual vocabulary | `docs/fowl-harvest-theme.md`; accepted Burger Drake / Cornquacker / The Combine cohort |
| Geometry | facing LEFT; Boss opaque ceiling 160×72; layout ceilings unchanged |
| Review context | `REVIEW_sheet_1x.png` / `COHORT_1x.png` (+ `@4x`) |
| Validator | `pipeline/acquire.py` rebuild for `the-fryer` + `scarequack`; `pipeline/test_contract.py`; `sprites.test.ts` |

Mechanical promotion only — no resizing, mirroring, repainting, or hand-editing of archived raws.

## Visual reference set (preserved)

| Role | Path | SHA-256 | Preserved choices |
| --- | --- | --- | --- |
| Cohort ordinary | `src/assets/sprites/burger-drake.png` | `c8a0e66c892465c9fa9355df19275a1c7385f10246286c4f11c2869272f9563f` | byte-identical |
| Cohort ordinary | `src/assets/sprites/cornquacker.png` | `326ec503bc95de96ab98ce82e54e91ca32577ee5d92eebdcb608bcb50a59a8ca` | byte-identical |
| Cohort Boss | `src/assets/sprites/the-combine.png` | `431f31f1a278a69e7fcd656f458789239a2339a443b3d96ab1cfbe13cd5aba15` | byte-identical |
| Archived Fryer | `assets-raw/grid_raw/the-fryer.png` | `c99d6f53403da5efdfdce764610304e1deeff1eb9d86c3f53c35ecc54fbbbc8d` | #387 accepted raw |
| Archived Scarequack | `assets-raw/grid_raw/scarequack.png` | `2c92a97aec8bdfb2ab819a33b0c2f0d4f2a897cb434b431e018dfa2b4f8feab9` | #388 accepted raw |
| Backdrops | `last-stop-diner`, `crooked-cornfield`, `harvest-yard` | (existing) | Fowl battlefield bands |

## Chosen runtimes

| Field | The Fryer | Scarequack |
| --- | --- | --- |
| Source raw | `assets-raw/grid_raw/the-fryer.png` | `assets-raw/grid_raw/scarequack.png` |
| Runtime | `src/assets/sprites/the-fryer.png` | `src/assets/sprites/scarequack.png` |
| Frame | 105×72 | 51×72 |
| Foot anchor | `[52, 72]` | `[25, 72]` |
| Runtime SHA-256 | `1f6e17bde9798ceb7d49d6da80b1e14b2cc913aab11cefeb73302cb06f936374` | `e1f0e34305ed474e7020e7c931353779753af52481eb212ba831e182f1119b3f` |
| Manifest frame sha256 | `9ea7ef188974507349317093d052a258285c8bd1e483f8ff205dc21c104ad3ca` | `9c49e53063a4416dbffd15f28d7e3f5d6ebadb6343ceadcb21eb072ecead112d` |

Offline rebuild from each archived raw is byte-identical to the committed runtime PNG.

## Registry

`src/ui/sprites.ts` registers all five Fowl Harvest body keys:

```text
ordinary: burger-drake, cornquacker
Boss: the-fryer, scarequack, the-combine
```

## Cohort review

Exact-native sheet `REVIEW_sheet_1x.png` (same pixels as `COHORT_1x.png`; nearest-neighbor `@4x` for inspection only):

```text
top:   silhouette strip — burger-drake | cornquacker | the-combine | the-fryer | scarequack
rows:  last-stop-diner | crooked-cornfield | harvest-yard
chrome: Party HP bars, ordinary HP / Boss bars, damage chips, effect frames
```

Step-6 subagent verdict: **accept** — see `visual-review.md`.

## Review disposition

| Step | Result |
| --- | --- |
| Deterministic rebuild / validate | **accept** |
| Existing three Fowl PNG + manifest entries | **byte-identical** |
| Agent visual review (cohort + three backdrops) | **accept** — see `visual-review.md` |
| HITL | not required by issue; human may still comment on PR |

## Out-of-manifest companions (justified)

| File | Why |
| --- | --- |
| `pipeline/test_contract.py` | Fryer/Scarequack are complete flexible Fowl Boss bundles; extend runtime byte-identity map, provenance/ceiling checks, and default rebuild discovery |
| `docs/research/evidence/fowl-harvest/promote-405/*` | Cohort + review sheets for step-6; no OpponentDef/Stage content changes in this slice |
