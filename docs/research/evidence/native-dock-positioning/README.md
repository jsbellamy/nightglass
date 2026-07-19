# Native Dock positioning observation (nightglass#113)

Successor observation for the **Native positioning** row in
[`docs/agents/native-observation.md`](../../../agents/native-observation.md),
after the scale-factor and `ready()` fixes in #113.

The historical failure note under
[`docs/research/evidence/102-native-dock-lifecycle/`](../102-native-dock-lifecycle/README.md)
must remain unchanged; this folder holds only the post-fix evidence.

## Human capture checklist

Run `npm run tauri dev` on a **scaled display** (Retina or non-1.0 UI scale). Record:

| Field | Value |
| --- | --- |
| Date | |
| Platform | |
| Display scale factor | (from System Settings / `scaleFactor()` in devtools if logged) |
| Tauri (Rust crate) | (`src-tauri/Cargo.lock`) |
| `@tauri-apps/api` | (`package-lock.json`) |

### Native positioning

1. Park the Battle Tile toward the **bottom** of the monitor; open the Management Dock from the tile toggle.
2. Confirm the Dock sits **above** the tile with the configured **8px** gap (`DOCK_GAP_PX`), aligned to the tile’s horizontal origin — not at an OS default position.
3. Repeat with the tile parked toward the **top**; confirm the Dock opens **below** with the same gap.
4. Attach screenshots to this folder (e.g. `01-dock-above-tile.png`, `02-dock-below-tile.png`).

Merge for #113 is blocked until this row is filled in and screenshots are committed here.
