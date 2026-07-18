# Prototype the compact management fan-out

Type: prototype
Status: resolved
Blocked by: 01

## Question

What card dimensions, fan-out directions, screen-edge behavior, stacking rules,
open/close interactions, and simultaneous-card capacity let management windows
surround the fixed 480×112 Battle Tile while keeping its Battlefield continuously
visible and live on both macOS and Windows?

## Comments

- 2026-07-18 — Built the throwaway
  [management fan-out prototype](../../../prototype/management-fanout/README.md)
  with three structurally different fan-out models: **A — Card Fan**
  (independent 264×312 cards, capacity three, oldest yields), **B — Command
  Dock** (single 480×336 tile-width tabbed panel, capacity one), and **C —
  Ledger Spine** (300px accordion column beside the tile, all five surfaces
  stackable). A park-position control exercises bottom-centre, bottom-right,
  top-centre, and top-left edge behavior. Run
  `./prototype/management-fanout/run.sh` and open <http://127.0.0.1:4174>.
  Awaiting the user's verdict before resolving.

## Answer

The selected direction is **B — Command Dock**, represented by the throwaway
[management fan-out prototype](../../../prototype/management-fanout/README.md)
(`?variant=B`).

- Management is a single **Management Dock**: a 480×336 logical-pixel panel
  exactly the Battle Tile's width, docked flush to the tile with an 8px gap,
  in the same translucent-glass language as the tile.
- One tab per management surface (Party, Loadout, Talents, Armory, Stage).
  **Capacity is one surface at a time**; picking another surface swaps the
  active tab instead of opening another window.
- Open/close interactions: a status-line button opens the dock on its
  surface; pressing the active surface's button again, or the dock's ✕,
  closes the whole dock. Tabs inside the dock switch surfaces directly.
- Screen-edge behavior: the dock opens **above** the tile when the tile is
  parked at a bottom edge and **below** it when top-parked. Because it never
  exceeds the tile's width, no horizontal clamping or corner-flipping rules
  are needed beyond the tile's own park position.
- Opening the dock never resizes, moves, or pauses the Battle Tile; the
  480×112 Battlefield stays fully visible and live alongside it.
- Rejected: **A — Card Fan** (up to three independent 264×312 floating
  cards) and **C — Ledger Spine** (a 300px accordion column beside the
  tile). Both spill beyond the tile's column and demand extra edge-clamping
  and stacking rules the dock avoids.
