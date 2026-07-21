# Native observation checklist

What the browser rendered-evidence seam (`npm run test:evidence`) cannot see,
and therefore must be observed manually in `npm run tauri dev` when the
triggering surfaces change. Consumed by the native-observation ticket; do not
expand this list to cover anything Playwright already asserts.

## Trigger

Record a native observation in the acceptance row **only** when the change
touches:

- `src-tauri/**` (Rust window/plugin code, capabilities)
- the `app.windows` block in `src-tauri/tauri.conf.json` (transparency,
  decorations, shadow, always-on-top, sizing minima/maxima)
- macOS-specific window visuals
- packaged presentation-effect URL resolution (`src/ui/effect-images.ts` or
  wiring that resolves Ability effect frames and Status Effect glyphs for the
  Tauri webview bundle)
- Dock child-window attachment (`parent: "tile"` in `src/ui/dock-window.ts`) —
  always-on-top stacking, `dockRect` geometry under child coordinates, and
  close / `dock-closed` semantics

Every other rendered criterion — tile/dock geometry, AA contrast, keyboard
floor, five-opponent fit, sprite native-1× sizing, in-UI Dock close over the
bus, and cross-page `BroadcastChannel` delivery — rides `npm run test:evidence`.

## Observe in `npm run tauri dev`

Scope is the genuinely native residual: **window lifecycle and OS close
semantics**. Playwright drives two pages in one Chromium context; it never
creates a Tauri `WebviewWindow` or exercises OS window chrome.

1. **Dock window lifecycle** — Opening the Dock from the Battle Tile creates a
   real second native window (not a second page in the same browser context).
   Closing that window via the OS close control (traffic-light / title-bar)
   tears the native window down.
2. **OS close semantics** — An OS-level close of the Dock window publishes
   `dock-closed` (or equivalent teardown) without remounting or resetting the
   tile webview; the tile pump keeps advancing.
3. **Native positioning** — The Dock window opens at the geometry implied by
   `dockRect` relative to the tile's outer position on the monitor (above or
   below with the configured gap), not at an arbitrary OS default.
4. **Native effect-image loading** — In the packaged Tauri webview (not
   `vite preview` alone), at least one visible Ability effect frame
   (`img.effect-frame`) and one Status Effect glyph (`img.status-icon`) load
   with real pixels — not broken-image placeholders. Browser
   `evidence: effect-image-loading` proves Vite bundling; this check proves the
   production webview outcome that dynamic `import.meta.url` resolution missed.
5. **Dock child-window attachment (macOS)** — With the Dock open as a creation-time
   child of the Battle Tile (`parent: "tile"`):
   - the tile remains above a normal foreground application window
     (always-on-top still holds with the child attached);
   - the dock sits flush above or below the tile at the `dockRect` position
     (8px `DOCK_GAP_PX`), confirming child `setPosition` accepts monitor-absolute
     logical coordinates; above/below flip and monitor clamp still hold when
     dragging the tile;
   - dragging the tile shows no visible dock lag relative to the #273 throttled
     baseline;
   - in-UI `.dock-close` still tears the dock down and publishes `dock-closed`
     without disturbing the tile's simulation or position.
   Any failure of always-on-top, `dockRect` geometry, or close semantics is a
   revert to the unattached #273 path (see issue #275 §6).

## Explicitly out of scope here

Do **not** re-check in Tauri anything the Playwright suite already covers under
`vite preview`:

- 480×112 tile / status-line height / combatant overlap and bounds
- native-1× sprite sizing (intrinsic vs rendered, excluding knockout transforms)
- AA contrast on status, dock toggle, and health text
- five-opponent stress layout after bus-injected `selectStage`
- Dock tab row fit, surface scroll, five surfaces, ArrowRight tab cycle
- in-UI `.dock-close` crossing the channel without disturbing the tile
- `dock-opened` → snapshot → populated Dock over a shared `BroadcastChannel`
- Ability effect frames and Status Effect glyphs under Vite (`evidence:
  effect-image-loading`)
