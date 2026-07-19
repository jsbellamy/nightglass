# Native Dock lifecycle observation (nightglass#102)

Human observation against
[`docs/agents/native-observation.md`](../../../agents/native-observation.md),
run via `npm run tauri dev`. This note is the durable citation for the two
native residual rows the browser harness cannot see.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-07-19 |
| Platform | macOS 26.5.1 (Build 25F80), Darwin 25.5.0, arm64 (Apple Silicon) |
| Tauri (Rust crate) | 2.11.5 (`src-tauri/Cargo.lock`) |
| `@tauri-apps/api` | 2.11.1 |
| `@tauri-apps/cli` | 2.11.4 |
| App windows | Tile + Dock both `decorations: false`, `transparent: true`, `alwaysOnTop: true` |

Dev session also logged: transparent windows without `macOSPrivateApi` enabled
(Tauri warning on launch). That does not block open/close, but it is part of
the native surface under observation.

Browser `http://localhost:1420` alone does **not** open a Dock window from the
tile toggle — expected: `createProductionDockWindowPort()` is a no-op outside
Tauri (`isTauriRuntime()` false). Playwright opens `/?window=dock` as a second
page; a single browser tab cannot create a `WebviewWindow`.

## Checklist results

Checklist source: `docs/agents/native-observation.md` § "Observe in `npm run
tauri dev`".

### 1. Dock window lifecycle — **partial**

- Opening the Dock from the Battle Tile **does** create a real second native
  window (separate Tauri `WebviewWindow`, label `dock`). See
  [`02-dock-open-misplaced.png`](./02-dock-open-misplaced.png).
- The Dock **opens and closes** from the tile's dock toggle / in-UI close.
- Content handshake (`dock-opened` → fresh Snapshot → populated surfaces)
  works: Party surface shows live HP/levels (not a blank second page).
- **Fails true geometry** — see item 3. The lifecycle criterion in #102 also
  asks that the Dock "renders at true geometry"; that part did not hold.

### 2. OS close semantics — **adapted; in-UI close observed**

Both windows ship with `decorations: false`, so there is **no traffic-light /
title-bar OS close control** to exercise. The checklist's "OS close control"
path is unreachable on this build as configured. The Dock's in-UI `.dock-close`
(✕) is visible in [`02-dock-open-misplaced.png`](./02-dock-open-misplaced.png).

What was observed instead (the production close path that exists today):

- Closing the Dock via the in-UI `.dock-close` (and/or re-toggling from the
  tile) tears the Dock down from the user's point of view and returns focus to
  the tile.
- The tile keeps running afterward (pump continues; no remount / reset of the
  tile webview). See [`01-tile-alone.png`](./01-tile-alone.png) →
  [`03-after-dock-close.png`](./03-after-dock-close.png).

Playwright already covers in-UI close over `BroadcastChannel`
(`evidence: cross-webview-delivery`). This native pass only confirms the same
close path still behaves under real `WebviewWindow` show/hide, not that an OS
chrome close exists.

No `closeRequested` / `tauri://destroyed` listener is wired in
`src/ui/dock-window.ts` today; `close()` hides the Dock window rather than
destroying it. A future decorations-on or Cmd-W path would need that seam
before the checklist's literal OS-close item can pass.

### 3. Native positioning — **fail**

Expected (from `dockRect` in `src/ui/dock-geometry.ts`): Dock opens **above or
below** the tile's outer rect on the monitor, same x, with `DOCK_GAP_PX` (8),
not at an arbitrary OS default.

Observed: Dock opens **pinned to the bottom-right of the screen**, not stacked
above (or below) the Battle Tile.
Evidence: [`02-dock-open-misplaced.png`](./02-dock-open-misplaced.png).

Likely contributors to investigate in a follow-up (not fixed here):

- `open()` calls `setPosition` / `show` without waiting for `tauri://created`
  (the `once` hook exists on the port wrapper but is unused by `open()`).
- Tile `outerPosition` / monitor size are physical pixels on Retina; Dock
  `setPosition` uses `LogicalPosition` — a scale-factor mismatch would park the
  window far from the tile.

## Incidental finding (out of #102 scope)

Combat **effect / status glyphs** render as blue squares with a `?` inside —
the classic broken-image placeholder — rather than the authored PNGs under
`src/assets/effects/`. Combatant body sprites still appear; the failure is
specific to effect/`img` loads in the native webview.
Evidence: [`04-effects-broken.png`](./04-effects-broken.png) (also visible on
the tile in [`02-dock-open-misplaced.png`](./02-dock-open-misplaced.png)).
Recorded so it is not lost; fixing it is not part of this ticket.

## Screenshots

Committed in this directory (Tauri `npm run tauri dev`, not browser localhost):

- [x] [`01-tile-alone.png`](./01-tile-alone.png) — Battle Tile only, Dock closed
- [x] [`02-dock-open-misplaced.png`](./02-dock-open-misplaced.png) — Tile + Dock;
  Dock bottom-right of the desktop
- [x] [`03-after-dock-close.png`](./03-after-dock-close.png) — Dock closed; tile
  still pumping
- [x] [`04-effects-broken.png`](./04-effects-broken.png) — blue `?` placeholders
  over party combatants

## Verdict for acceptance

| #102 criterion | Disposition |
| --- | --- |
| Ran `npm run tauri dev` against the #96 checklist | Met |
| Dock native lifecycle (second window + handshake + true geometry) | Partial — window + handshake yes; **true geometry no** |
| Dock close semantics (cross back; tile pump undisturbed) | Met for in-UI close; OS chrome close N/A (`decorations: false`) |
| Committed note under `docs/research/evidence/` with screenshots | Met — this directory |
| Platform + Tauri version recorded | Met (table above) |
