# Evidence: #125 AI-assisted Equipment icon ingest

Working notes for the optional AI path exercised during
[Prototype two native 34×34 Equipment icon families](https://github.com/jsbellamy/nightglass/issues/125).

## Round ladder

| Round | dewlight-focus | bramblesong-bow |
| --- | --- | --- |
| A | **overshoot** 27×35 | **off-ramp** 17.4% far (brown wood) |
| B | **overshoot** 23×31 | accepted 11×30, far 6.9% |
| C | accepted 17×25, far 6.6% (underfilled vs 26–30 target) | (kept B) |

Rejected raws: [`rejected-a/`](./rejected-a/), [`rejected-b/`](./rejected-b/).
Accepted raws + sidecars: [`accepted-raws/`](./accepted-raws/).
Ingest report: [`ingest-report.json`](./ingest-report.json).

## Stage-2 @8× previews (approval target)

| Tier I | Tier II (recolor) |
| --- | --- |
| [dewlight-focus@8x.png](./dewlight-focus@8x.png) | [starfruit-prism@8x.png](./starfruit-prism@8x.png) |
| [bramblesong-bow@8x.png](./bramblesong-bow@8x.png) | [nightvine-longbow@8x.png](./nightvine-longbow@8x.png) |

Contact sheet: [family-sheet@8x.png](./family-sheet@8x.png)

## Lessons folded into `docs/agents/asset-generation.md`

1. Prompt materials that exist on `moonberry-16` — never "brown wood".
2. Measure recovered grid immediately; shrink on overshoot with the measured WxH in the next prompt.
3. Gate **off-ramp** distance before treating quantize as success.
4. Prefer long axis 26–30; 17×25 focus is ingest-legal but underfilled for shipping.
5. Approve Stage-2 @8× preview, not the provider PNG; Tier II is recolor.
