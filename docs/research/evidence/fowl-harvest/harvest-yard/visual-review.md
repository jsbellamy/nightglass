# Visual review — `harvest-yard` (#322)

Composite reviewed (Step 6, subagent only):
[`tile-review-harvest-yard.png`](./tile-review-harvest-yard.png)
(native 480×112 Battle Tile stress case). `@4x` sheet:
[`tile-review-harvest-yard@4x.png`](./tile-review-harvest-yard@4x.png).

## Candidate table

| Candidate | Asset class | Raw gates | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- |
| harvest-yard-candidate-a | backdrop | pass (reduce 480×86, no magenta) | 1536×1024 → crop → 480×86 | identity underfill — trailer / twin floodlights / red beacon not distinct at native | retry prop legibility |
| harvest-yard-candidate-b | backdrop | pass | 1536×1024 → crop → 480×86 | pass | advance → visual review → accept |

Rejected candidate A is durable as the table row above; its PNG remains only as
a provenance direct input for B under `scratch/` (hashed in the sidecar).

## Step-6 verdict (candidate B)

**accept**

Subagent answers (verbatim summary retained for the gate):

1. Harvest Yard identity under toxic rural dusk — yes (silos, shed, conveyor;
   chains/sacks weak at 1×).
2. Trailer, floodlights, beacon distinct at native — yes (fixes A).
3. Fowl Harvest materials, not Moonberry plum/mint dominance — pass.
4. Combat signals strongest — yes.
5. Nearly flat ground band — yes.
6. Opponent half quiet enough for ~160×72 Boss — yes.
7. No forbidden backdrop content — none observed.
8. Soft chunky atmospheric strip style — yes.
