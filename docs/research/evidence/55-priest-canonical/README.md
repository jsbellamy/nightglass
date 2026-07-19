# Priest canonical reference still (#55)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | Character (Party Class — Priest) |
| Status | candidate for shipping (HITL final gate) |
| Runtime destination | `src/assets/sprites/priest.png` |
| Runtime shape | 32×48 RGBA, binary alpha, bottom-center foot anchor |
| Visual vocabulary | frozen `moonberry-16` |
| Geometry | right-facing; 26×40 prompt safe box; magenta `#ff00ff` key |
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

## Rejected candidates (prompt changed)

| Candidate | Primary failure | Recovered |
| --- | --- | --- |
| priest-a | overshoot | 34×48 |
| priest-b | overshoot | 33×48 |

Retry order followed asset-generation table (overshoot → shrink into safe box; attach accepted Knight raw as style reference on C).

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
