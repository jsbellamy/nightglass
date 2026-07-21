# Native Dock 800×480 window sizing (nightglass#266)

Successor observation for **Native positioning** at the post–ADR-0005 Management Dock workspace size (`DOCK_WIDTH` 800, `DOCK_HEIGHT` 480).

## Human capture checklist

Run `npm run tauri dev`. Record:

| Field | Value |
| --- | --- |
| Date | |
| Platform | |
| Display scale factor | |
| Tauri (Rust crate) | (`src-tauri/Cargo.lock`) |
| `@tauri-apps/api` | (`package-lock.json`) |

### Native positioning (800×480)

1. Park the Battle Tile toward the **bottom** of the monitor; open the Management Dock from the tile toggle.
2. Confirm the Dock native window is **800×480** logical pixels and sits **above** the tile with **8px** gap, with x from `dockRect` (left-aligned to the tile when there is room, clamped when the dock would extend past the monitor edge).
3. Repeat with the tile toward the **top**; confirm the Dock opens **below** at the same size.
4. Attach screenshots (e.g. `01-dock-above-800x480.png`, `02-dock-below-clamped.png`).

**Agent note:** This row was not filled during automated implementation (no interactive `tauri dev` session). Merge is blocked until a human completes the checklist above.
