# Stage 2/3 Boss stills (#57) — Gloomcap Matron + Thornmother Vane

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | opponent (Boss stills) |
| Status | candidate for shipping — **agent accept pending HITL** |
| Runtime destination | `src/assets/sprites/boss-2.png`, `src/assets/sprites/boss-3.png` |
| Runtime shape | 32×48 RGBA, binary alpha, bottom-center foot anchor |
| Visual vocabulary | frozen `moonberry-16` |
| Geometry | left-facing; issue #57 prompts (safe-box + two magenta cells clearance) |
| Review context | 480×112 Battle Tile; three-Boss lineup at native 1× |
| Validator | `npm run assets:verify` |

## Chosen raws

| Field | boss-2 (Gloomcap Matron) | boss-3 (Thornmother Vane) |
| --- | --- | --- |
| Sample | `boss-2-g` → `assets-raw/grid_raw/boss-2.png` | `boss-3-c` → `assets-raw/grid_raw/boss-3.png` |
| Recovered grid | **29×43** | **21×40** |
| Pitch scores | X 0.169 / Y 0.169 (≥ 0.04) | X 0.098 / Y 0.071 (≥ 0.04) |
| Baseline | 47 | 47 |
| Style cohort | Stage 1 Boss (`boss-1`), Pipcap, Knight | same |
| Style reference inputs | `assets-raw/grid_raw/boss.png`, `pipcap.png`, `knight.png` | same |

Accepted prompts (issue #57, flattened) are archived in
`assets-raw/grid_raw/boss-2.source.json` and `boss-3.source.json`.
Evidence copies of accepted provider PNGs: `accepted/boss-2-g/`, `accepted/boss-3-c/`.

Vane width **21** is under the prompt target ~26 columns; silhouette still reads tall/sharp/vertical and distinct from Matron and Bramblehorn on the lineup sheet.

## Rejected candidates

Retry order followed `docs/agents/asset-generation.md` (clip-fail → clearance; pitch-fail → style reference; overshoot → shrink). Recurring clip-fail: a single bottom-left corner pixel near `#ff00ff` outside key tolerance 40 (not true subject overshoot).

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| boss-2-a | clip-fail | left edge; also overshoot 33×45 (secondary) |
| boss-2-b | clip-fail | left edge; near-magenta feet keyed out (baseline 35) |
| boss-2-c | pitch-fail | y=0.036; also left-edge stray |
| boss-2-d | clip-fail | single bottom-left near-magenta corner pixel |
| boss-2-e | (gates pass; not chosen) | 29×44 — superseded by clearer Matron read in g |
| boss-2-f | pitch-fail | x=0.037, y=0.029; also stray-corner clip |
| boss-2-g (accepted) | — | 29×43 |
| boss-3-a | (gates pass; not chosen) | 25×48 — softer gown identity vs thorn-queen target |
| boss-3-b | clip-fail | top/left edge FG |
| boss-3-c (accepted) | — | 21×40 |
| boss-3-d | clip-fail | single bottom-left near-magenta corner pixel |
| boss-3-e | clip-fail | single bottom-left near-magenta corner pixel |
| boss-3-f | (gates pass; not chosen) | 20×40 — more underfilled than c |

Rejected raws live under `docs/research/evidence/57-boss-stills/rejected/`.

## Validator output and byte identity

```text
$ npm run assets:verify
  [PASS] Boss-2 Gloomcap Matron grid is recoverable without reduction -- grid [29, 43]
  [PASS] Boss-3 Thornmother Vane grid is recoverable without reduction -- grid [21, 40]
  [PASS] offline rebuild matches committed boss-2.png byte-for-byte
  [PASS] offline rebuild matches committed boss-3.png byte-for-byte
  [PASS] manifest records moonberry-16 palette for every sprite
all contract tests passed
```

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `boss-2.png` | `3ecdcdd3e5716b55e03bbee1b67916b1f6cab1221a31f7d4940d7f62e7f539d6` |
| Runtime PNG `src/assets/sprites/boss-2.png` | `fef4ea7ddfa6598142a403c76860cc27df0de8f16b4ec89fd9f934b4f508ddcc` |
| Manifest frame sha256 (boss-2) | `b867558d3e26d9cf569353211d97265758d681a83add38e92a71a7af97bf12e7` |
| Archived raw `boss-3.png` | `02543340a945e8f1cd52e15a2bb013069c2749a08fd35c0732a24cdbfdcca1ca` |
| Runtime PNG `src/assets/sprites/boss-3.png` | `29c35e2149e0137f84844dd44914b1657017a5980d32cbd2144f794cb240ff67` |
| Manifest frame sha256 (boss-3) | `0c968a4f2ada7e986d06b2ffe903da1cdfbdec274920461afe5e8b9a8a9d4484` |

## Review disposition

| Step | Result |
| --- | --- |
| Agent pipeline / validator | **accept** (gates green) |
| Agent visual review (1× lineup + cohort) | **accept** (best effort; sheets below) |
| HITL final gate | **pending** — human approves or requests retry on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `LINEUP_3x_boss_1x.png` | Three Bosses on a 480×112 band at native 1× — silhouettes must be distinct |
| `LINEUP_strip_1x.png` | Tight 1× contact strip of `boss-1` / `boss-2` / `boss-3` |

## Style / identity notes

- **Matron:** wide heavy mushroom elder; cream-gold spotted cap, berry gill fringe, mint leaf shawl; Pipcap kinship without sharing Bramblehorn’s crouched vine silhouette
- **Vane:** tall sharp vertical thorn-queen; cream crown, berry vine/thorn body, mint leaf-blade arms; unmistakably the final Stage threat
- Left-facing Boss profile; quantizes to frozen `moonberry-16` only
