# Prototype the live Battlefield workspace

Type: prototype
Status: resolved
Blocked by: none

## Question

What compact window dimensions, Battlefield composition, Formation spacing, opponent capacity, and expanding management layout keep three animated Party Members and their Ability effects readable on macOS and Windows while preserving the always-visible live fight?

## Answer

The selected direction is **A — Taskbar Strip**, represented by the throwaway
[live Battlefield workspace prototype](../../../prototype/live-battlefield/README.md).

- The permanent **Battle Tile** is a fixed 480×112 logical-pixel,
  always-on-top, edge-parked surface. It uses translucent glass, minimal chrome,
  and a horizontal side-on Battlefield instead of reading as a conventional app
  window.
- A 24px status/control line leaves an approximately 86px-tall Battlefield.
  Three Party Members occupy the left third in Front/Middle/Back order;
  opponents occupy the right third; the open centre is reserved for projectiles,
  movement, and impacts.
- The prototype remains readable with five ordinary opponents. Five is the
  compact-layout stress case, not a promise that every Wave should contain five.
- A Party Member is budgeted as a 32×48 screen-pixel canvas and an ordinary
  opponent as roughly 28×40. The prototype renders the Character budget at 1×:
  a 32×48 authored/normalized frame becomes 32×48 screen pixels. Runtime
  downscaling is prohibited. The later animation asset-contract decision may
  refine native tiers, but must preserve this screen-space constraint and use
  integer display scale only.
- Opening management must never resize, replace, or pause the Battle Tile. The
  prototype proves that a small overlay can borrow space inside the fixed tile
  while combat stays visible and live.
- The user still prefers management windows to fan out around the Battle Tile.
  Their exact geometry is intentionally moved to the new “Prototype the compact
  management fan-out” decision; it does not weaken the fixed 480×112 Battle Tile
  boundary.

The rejected first pass ranged from 860×330 to 1260×720 and felt far too large.
The selected scale is grounded by SideScape's 320×220 compact footprint and Task
Bar Hero's nearly chrome-free, taskbar-height combat presentation, while avoiding
SideScape's 48-native Character rendered into a 96px screen box.
