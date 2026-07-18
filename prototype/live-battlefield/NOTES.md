# Live Battlefield prototype notes

## Question

What compact window dimensions, Battlefield composition, Formation spacing,
opponent capacity, and expanding management layout keep three animated Party
Members and their Ability effects readable while preserving the live fight?

## First iteration — rejected

- Horizon Dock: 1180×306 → 1180×650.
- Command Rail: 980×390 → 1240×680.
- Orbit Workspace: 860×330 → 1260×720.

User verdict: all were too large. The game should preserve the compact footprint
of Task Bar Hero or SideScape.

## Evidence that changed the prototype

- Task Bar Hero presents combat in an almost chrome-free strip aligned with the
  taskbar. Its visible actors are roughly 40–50 screen pixels tall.
- SideScape's outer compact footprint is 320×220, but its 48×48-native player is
  rendered with `SPRITE_GRAIN = 2`, occupying a 96×96 screen box. The user
  identified source-asset size and subsequent downscaling as the main problem to
  avoid here.

## Second iteration variants

- **A — Taskbar Strip:** fixed 480×112; Party management borrows the upper 44px
  while combat remains live below.
- **B — SideScape Tile:** fixed 320×220; a compact drawer overlays the live
  Battlefield.
- **C — Glass Tile:** fixed 384×160; a small dashboard floats over the upper
  Battlefield while combat continues underneath.

All three impose a 32×48 Character source/display canvas at 1×. There is no
runtime downscale; larger silhouettes must be solved inside that authored canvas
or explicitly assigned a different native tier by the later asset-contract work.

Each variant can show one, three, or five opponents. CSS placeholder actors and
separate attack, projectile, impact, and healing effects keep this experiment
focused on scale and composition rather than art direction.

## Provisional observations

- Pending review of the compact second iteration.

## Verdict

The user selected **A — Taskbar Strip**. The production boundary is a fixed
480×112 Battle Tile with 32×48 Party Member screen budgets at 1× and up to five
ordinary opponents as the layout stress case. Management should eventually fan
out around the Battle Tile, but its exact geometry requires a separate prototype.
