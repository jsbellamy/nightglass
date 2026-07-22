# ADR-0002: Battle Tile and Management Dock as two windows over a bus

**Status:** Partially superseded by ADR-0005 (`docs/adr/0005-dock-workspace-geometry.md`) for dock dimensions and width coupling only. The two-window model, the fixed non-resizable dock, and the `BroadcastChannel` bus round-trip remain in force.  
**Date:** 2026-07-19

## Context

The vertical slice exposes combat on an always-on-top **Battle Tile** and party
management on a separate **Management Dock** (`CONTEXT.md`: Battle Tile at 480×112,
Management Dock at 480×336, docked flush above or below the tile). Geometry is
centralized in `src/ui/battle-tile-layout.ts` (`TILE_WIDTH` 480, `TILE_HEIGHT` 112,
`STATUS_LINE_HEIGHT` 24, `BATTLEFIELD_HEIGHT` 86) and `src/ui/dock-geometry.ts`
(`DOCK_WIDTH` 480, `DOCK_HEIGHT` 336, `dockRect` parking above or below from the
monitor midpoint).

Backdrop art follows a 480×86 band (`docs/backdrop-contract.md`), which can look
like a conflict with the tile's 480×112 outer size until the layout split is
understood.

## Decision

Use **two Tauri windows**, not one resizable shell:

- **Battle Tile** — fixed 480×112 logical pixels, always on top, owns the live
  Battlefield.
- **Management Dock** — fixed 480×336, same width as the tile, positioned flush
  above or below per `dockRect` in `src/ui/dock-geometry.ts` (8px gap).

Opening, closing, or switching Dock tabs must never resize, move, or implicitly
pause the Battle Tile. That requirement is easier to guarantee with independent
window geometry than with a single frame whose client area would have to change.

Because the Engine lives in the tile process, cross-window work uses a
`BroadcastChannel` bus (`src/ui/bus.ts`, channel `nightglass`). The bus carries
commands, Snapshots, and Presentation Events between tile and dock. Every dock
interaction is therefore a round-trip over the bus rather than a direct in-process
Engine call — an intentional consequence of the two-window split.

**Height decomposition:** `TILE_HEIGHT` (112) = `STATUS_LINE_HEIGHT` (24) +
`BATTLEFIELD_HEIGHT` (86). The status line sits above the 86px battlefield band
where stage backdrops are authored. `CONTEXT.md`'s 480×112 describes the full
tile chrome; 480×86 describes only the battlefield asset — they do not contradict.

## Consequences

- New dock surfaces must publish commands and consume Snapshots and Presentation
  Events on the bus;
  they must not assume shared memory with the tile's Engine instance.
- Layout or evidence tests should import dimensions from `battle-tile-layout.ts` and
  `dock-geometry.ts`, not duplicate magic numbers. Dock dimensions and the
  equal-width coupling stated in Context/Decision above are superseded by
  ADR-0005; current dock size and centering live there and in `dock-geometry.ts`.
- Features that require resizing the combat view while management is open are out
  of scope for this window model unless a future ADR supersedes this one.
