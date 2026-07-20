# Hunter canonical reference still (#56)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | Character (Party Class — Hunter) |
| Status | candidate for shipping — **agent accept pending HITL** |
| Runtime destination | `src/assets/sprites/hunter.png` |
| Runtime shape | 32×48 RGBA, binary alpha, bottom-center foot anchor |
| Visual vocabulary | frozen `moonberry-16` |
| Geometry | right-facing; issue #56 prompt (26×40 safe box + two magenta cells clearance) |
| Review context | 480×112 Battle Tile, five-opponent stress |
| Validator | `npm run assets:verify` |

## Chosen raw

| Field | Value |
| --- | --- |
| Sample | `hunter-n` → archived as `assets-raw/grid_raw/hunter.png` |
| Recovered grid | **32×40** |
| Pitch scores | X 0.098 / Y 0.096 (≥ 0.04) |
| Baseline | 47 |
| Style cohort | Priest / Knight / Wizard party peers; Pipcap stress opponents |
| Style reference input | `assets-raw/grid_raw/priest.png` (`34712fbd19213319951ec00330e88242de4a6ba7b5b0822a43eb90a80478d635`) |

Accepted prompt (issue #56 opening, candidate **hunter-n**) is archived byte-for-byte in
`assets-raw/grid_raw/hunter.source.json`.

## Rejected candidates (prompt changed)

Retry order followed `docs/agents/asset-generation.md` (overshoot → shrink; pitch-fail →
style reference; clip-fail → clearance). Issue #56 supplies a Knight-shaped `TRUE chunky
pixel art…` prompt with an explicit **26×40** safe box — that is the issue prompt, not a
verbatim paste of the `docs/acquisition-contract.md` fixed shell.

| Candidate | Primary failure | Recovered / signal |
| --- | --- | --- |
| hunter-a | overshoot | 40×47 |
| hunter-b | overshoot | 35×46 |
| hunter-c | overshoot | 36×42 |
| hunter-d | (gates pass; not chosen) | 31×45, baseline 22 |
| hunter-e | overshoot | 39×46 |
| hunter-f | overshoot | 35×40 |
| hunter-g | chroma border | flat-key gate |
| hunter-h | overshoot | 38×48 |
| hunter-i | pitch-fail | x=0.038, y=0.032 |
| hunter-j | overshoot | 40×41 |
| hunter-k | overshoot | 36×45 |
| hunter-l | pitch-fail | x=0.046, y=0.030 |
| hunter-m | pitch-fail | x=0.064, y=0.026 |
| hunter-n (accepted) | — | 32×40 |

Rejected raws and minimal sidecars live under
`docs/research/evidence/56-hunter-canonical/rejected/`.

## Validator output and byte identity

```text
$ npm run assets:verify
  [PASS] Hunter grid is recoverable without reduction -- grid [32, 40]
  [PASS] offline rebuild matches committed hunter.png byte-for-byte
  [PASS] manifest records moonberry-16 palette for every sprite
all contract tests passed
```

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `hunter.png` | `226f5e361ce3186628730f2911beafe6481690604e94fe1ebc8631530a3c680a` |
| Runtime PNG `src/assets/sprites/hunter.png` | `92f55da998ce248c4e16b65e927ee9400969bd06479fd439e615ffeb24b36fc5` |
| Manifest frame sha256 | `32e3cae818dc350e320ecca903da81645842ea620c9c2e261a071f7ceb60746a` |

## Review disposition

| Step | Result |
| --- | --- |
| Agent pipeline / validator | **accept** (gates green) |
| Agent visual review (1× tile + cohort) | **accept** (best effort; sheets below) |
| HITL final gate | **pending** — human approves or requests retry on PR |

## Review sheets

| File | Judge |
| --- | --- |
| `STRESS_5x_hunter_1x.png` | Hunter on party side vs five Pipcaps at 1× in 480×112 |
| `INSPECT.png` | Stress tile + 6×/1× zooms of Hunter, Knight, Wizard, Priest, Pipcap |
| `COHORT_1x.png` | Knight / Wizard / Priest / Hunter silhouette distinctness at 1× |

## Style / identity notes

- Taut drawn-bow triangle vs Knight shield block, Wizard staff verticals, Priest soft robe mass
- Mint tunic, plum hood-down read, berry scarf tail, bramble shortbow + nocked thorn arrow
- Right-facing Party profile; quantizes to frozen `moonberry-16` only
