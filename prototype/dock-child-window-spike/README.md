# Dock child-window spike (throwaway)

Tao 0.35.3 harness (same window stack Tauri 2.11.5 pins) to observe macOS
`addChildWindow` behaviour with two undecorated `alwaysOnTop` windows.

```bash
cargo run
```

Stdout lines are cited in `docs/research/archive/dock-child-window-fit.md` as
**observed** evidence for compositor follow, `set_outer_position`, and hide/show.
