# Visual review — `harvest-yard` (#322)

Composite reviewed (Step 6, subagent only):
[`tile-review-harvest-yard.png`](./tile-review-harvest-yard.png)
(native 480×112 Battle Tile stress case). `@4x` sheet:
[`tile-review-harvest-yard@4x.png`](./tile-review-harvest-yard@4x.png).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| harvest-yard-candidate-a | backdrop | pass | none | 1536×1024 → 480×86 | identity underfill — trailer / floodlights / beacon not distinct at native | retry |
| harvest-yard-candidate-b | backdrop | pass | none | 1536×1024 → 480×86 | Spec unmet — chains / feed sacks weak at native | retry |
| harvest-yard-candidate-c | backdrop | pass | none | 1536×1024 → 480×86 | contrast — floodlight peaks near-white (max lum ~249) | retry |
| harvest-yard-candidate-d | backdrop | pass | none | 1536×1024 → 480×86; max lum ~131 | pass | accept |

Rejected A–C are durable as table rows. Scratch retains candidate C only as the
hashed identity direct input for D (`scratch/harvest-yard-candidate-c.png`).

## Step-6 verdict (candidate D)

**accept**

1. Floodlights/cream pools dim; combat bars/numbers remain strongest (runtime
   max lum ~131 vs HP-bar green ~232 in composite).
2. Chains + feed sacks distinct enough at native 1×.
3. Silos, shed, conveyors, trailer, floodlight poles, beacon still read.
4. Fowl Harvest toxic dusk materials — not Moonberry plum/mint.
5. Flat ground; opponent half quiet for wide Boss.
6. No forbidden backdrop content (no hot-magenta field).
7. Soft atmospheric strip style.
