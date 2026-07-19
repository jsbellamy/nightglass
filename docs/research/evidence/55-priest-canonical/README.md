# Priest canonical reference still (#55)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | Character (Party Class — Priest) |
| Status | candidate for shipping — **agent accept pending HITL** |
| Runtime destination | `src/assets/sprites/priest.png` |
| Runtime shape | 32×48 RGBA, binary alpha, bottom-center foot anchor |
| Visual vocabulary | frozen `moonberry-16` |
| Geometry | right-facing; acquisition-contract **26×40** safe box (issue #55 shell); candidate C tightened per overshoot retry |
| Review context | 480×112 Battle Tile, five-opponent stress |
| Validator | `npm run assets:verify` |

## Chosen raw

| Field | Value |
| --- | --- |
| Sample | `priest-c.png` → archived as `assets-raw/grid_raw/priest.png` |
| Recovered grid | **27×46** |
| Pitch scores | X 0.075 / Y 0.070 (≥ 0.04) |
| Baseline | 47 |
| Style cohort | Knight + Wizard party peers; Pipcap + Boss-1 for tile scale |
| Style reference input | `assets-raw/grid_raw/knight.png` (`9dfcdd69…`) |

## Rejected candidates (prompt changed)

| Candidate | Primary failure | Recovered |
| --- | --- | --- |
| priest-a | overshoot | 34×48 |
| priest-b | overshoot | 33×48 |

Retry order followed `docs/agents/asset-generation.md` (overshoot → shrink into safe box; attach accepted Knight raw as style reference on C). Issue #55 opening prompt used the contract grid shell verbatim; candidate C prompt applies the acquisition-contract **overshoot** retry move (tighter than 26×40 after measured 33×48).

## Validator output and byte identity

```text
$ npm run assets:verify
  [PASS] Priest grid is recoverable without reduction -- grid [27, 46]
  [PASS] offline rebuild matches committed priest.png byte-for-byte
  [PASS] manifest records moonberry-16 palette for every sprite
all contract tests passed
```

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `priest.png` | `34712fbd19213319951ec00330e88242de4a6ba7b5b0822a43eb90a80478d635` |
| Runtime `priest.png` (committed) | `8b6da0ea8b74aea5…` (frame pixels; manifest frame sha256 in `manifest.json`) |

## Review disposition

| Step | Result |
| --- | --- |
| Agent pipeline / validator | **accept** (gates green) |
| Agent visual review (1× tile + cohort) | **accept** (best effort; sheets below) |
| HITL final gate | **pending** — human approves or requests retry on PR #118 |

## Review sheets

| File | Judge |
| --- | --- |
| `STRESS_5x_priest_1x.png` | Priest on party side vs five Pipcaps at 1× in 480×112 |
| `INSPECT.png` | Stress tile + 6×/1× zooms of Priest, Knight, Wizard, Pipcap, Boss-1 |
| `COHORT_1x.png` | Knight / Priest / Wizard silhouette distinctness at 1× |

## Style / identity notes (preserved)

- Soft cream-gold layered robe + mint stole vs Knight armored shield wedge
- Berry-pink sash / head accent + lantern crook staff with moonpetal charm
- Right-facing Party profile; round soft healer silhouette vs Wizard pointed hat
- Quantized to frozen `moonberry-16` only (no palette extension)
