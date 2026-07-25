# Evidence: #30 opponent art via logical-grid recovery

Linked from [Opponent art via logical-grid recovery](https://github.com/jsbellamy/nightglass/issues/30).
Production pipeline: `pipeline/acquire.py` with raws in `assets-raw/grid_raw/`.
Later flex proofs: [`256-pipcap-flex/`](../256-pipcap-flex/), [`57-boss-stills/`](../57-boss-stills/).

## Question

Can the #29 Logical-Grid Recovery contract produce a representative Moonberry
ordinary opponent and Boss that stay distinct from the Party and readable at 1×
in the 480×112 Battle Tile — including the five-opponent stress case — without
resizing, hand-cleaning, or weakening validator gates?

## Measured gates

| Subject | Recovered grid | Opaque span | Verdict |
| --- | --- | --- | --- |
| Pipcap (ordinary) | 29×40 | 29×40 | ACCEPT |
| Boss | 32×41 | 31×41 | ACCEPT |

Both rebuild byte-identically offline through `pipeline/acquire.py` with no
provider or network. Opponents stay on the shared **`moonberry-16`** body palette.

## Review sheets

| File | What to judge |
| --- | --- |
| [`STRESS_5x_pipcap_1x.png`](./STRESS_5x_pipcap_1x.png) | five ordinary opponents at 1× in the fixed Battle Tile |
| [`BOSS_1x.png`](./BOSS_1x.png) | Boss silhouette vs Party at 1× |
| [`INSPECT.png`](./INSPECT.png) | 1× stress + 6× / 1× zooms of Pipcap, Boss, Knight, Wizard |
| [`BOSS_INSPECT.png`](./BOSS_INSPECT.png) | Boss encounter + 6× zoom |

## Verdict

**GO.** Minimum canonical opponent still set for the three-Stage slice: **one
ordinary family still** (Pipcap-class, reused across Waves) plus **three Boss
stills** (one distinct silhouette per Stage).
