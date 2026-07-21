# ADR-0005: Management Dock workspace geometry

**Status:** Accepted. Supersedes ADR-0002 (`docs/adr/0002-battle-tile-and-management-dock.md`) for dock dimensions and width coupling; ADR-0002's two-window model, fixed non-resizable dock, and `BroadcastChannel` bus round-trip remain in force.  
**Date:** 2026-07-21

## Context

The Management Dock's five surfaces each rendered all four Roster Characters into a 480×336 logical-pixel workspace. Four of five clipped a live control at the bottom edge with no scroll affordance, and the Armory showed zero inventory rows. Terminal scene review evidence is recorded under `docs/research/evidence/103-terminal-scene-review/`.

## Decision

The Management Dock is **800×480** logical pixels, **independent** of `TILE_WIDTH` (480). `dockRect` in `src/ui/dock-geometry.ts` left-aligns the dock to the Battle Tile's x origin when there is room and **clamps** x so the dock stays fully on the monitor when the wider workspace would extend past the right edge. Vertical placement is unchanged: above the tile when bottom-parked, below when top-parked, with `DOCK_GAP_PX` (8px). The two Tauri windows, the fixed (non-resizable) dock window, and the cross-window bus from ADR-0002 are unchanged — only the equal-width constraint and the 480×336 dimensions are superseded.

## Consequences

- `dockRect`'s returned `width` is always `DOCK_WIDTH`, not `tileRect.width`; changing tile width no longer implies a dock resize.
- Four hand-mirrored literals in `src/styles.css` (`html.dock-window` and `.dock-shell.management-dock`) must stay in lockstep with `DOCK_WIDTH` and `DOCK_HEIGHT` in `dock-geometry.ts`.
- Because the dock can be wider than the tile, clamping on x is required so the native dock window does not open off-screen.
