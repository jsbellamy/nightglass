# Compact management fan-out prototype notes

## Question

What card dimensions, fan-out directions, screen-edge behavior, stacking rules,
open/close interactions, and simultaneous-card capacity let management windows
surround the fixed 480×112 Battle Tile while keeping its Battlefield
continuously visible and live on both macOS and Windows?

## Variants

- **A — Card Fan** — independent 264×312 cards, one per management surface,
  opened from the tile's status-line buttons. They fan horizontally away from
  the tile in open order, capacity three; opening a fourth closes the oldest.
  Cards flip below the tile when it is parked at the top edge, and the row
  clamps inward when the tile parks in a corner.
- **B — Command Dock** — a single 480×336 panel exactly the tile's width,
  docked flush above (or below, when top-parked) the tile, with a tab per
  management surface. Capacity one; opening another surface swaps the tab.
  The strongest "one window" feel and never risks covering other desktop work
  beyond the tile's own column.
- **C — Ledger Spine** — a 300px-wide accordion column beside the tile
  (right side by default, flipping left when the tile parks at the right
  edge). All five surfaces can be open at once as stacked collapsible
  sections; headers stay visible when collapsed and the column grows away
  from the parked edge, clamped to the screen.

All variants keep the Battle Tile fixed at 480×112 with live combat; opening
management never resizes, moves, or pauses it. Card pixel dimensions are shown
in each card header. The park-position control exercises bottom-centre,
bottom-right, top-centre, and top-left screen-edge behavior.

## Dimensions under test

| Variant | Card / panel | Simultaneous capacity |
| --- | --- | --- |
| A | 264×312 per card | 3 cards |
| B | 480×336 dock | 1 surface (5 tabs) |
| C | 300×(30–220) per section | 5 sections |

## Verdict

The user selected **B — Command Dock**. Management is a single 480×336
Management Dock exactly the Battle Tile's width, docked flush to the tile with
one tab per management surface. Capacity is one surface at a time; opening
another surface swaps the tab rather than adding a window. The dock opens
above the tile when it is parked at a bottom edge and below it when
top-parked, so the fixed 480×112 Battle Tile stays fully visible and live.
Because the dock never exceeds the tile's width, no horizontal screen-edge
clamping is needed beyond the tile's own park position.
