# Dock child-window attachment — restore re-observation (#288)

Native observation for issue
[#288](https://github.com/jsbellamy/nightglass/issues/288): re-run the rows
that failed under
[`docs/research/evidence/275-dock-child-window-revert/README.md`](../275-dock-child-window-revert/README.md)
after #286 (readiness latch) and #287 (dock window-state denylist) landed.
Creation-time `parent: "tile"`, the creation probe, `dockChildAttachSupported`,
and the attached-path `onTileMoved` skip are restored; #286's memoised
`wrapDockWebviewWindow` readiness is kept (no `settleCreatedWindow`-only model).

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Platform | macOS (agent could not run `npm run tauri dev` in this session) |
| Build under test | Branch `issue-288-dock-child-restore` |
| Prior revert record | [`275-dock-child-window-revert`](../275-dock-child-window-revert/) |

## Results

Disposition: **agent-blocked native** per `docs/agents/acceptance-evidence.md`
§2 — merge blocked until a human runs `npm run tauri dev` on macOS and fills
the Result column.

| # | Criterion | Result | Notes |
| --- | --- | --- | --- |
| 14 | Condition 2 — flush `dockRect` above tile (8px gap), tile below monitor midpoint | *pending human* | Failed in revert note due to #287 persisted 480×336 vs `DOCK_HEIGHT` 480 |
| 14b | Post-drag open at current `dockRect`, not stale location | *pending human* | Failed in revert note due to #286 `tauri://created` latch |
| 16 | Monitor clamp (#266) — 800px dock fully on-screen at right edge | *pending human* | Could not verify in revert; tied to #287 width mismatch |
| 13 | Always-on-top with child attached | *pending human* | Passed in revert |
| 17 | No visible dock lag vs #273 | *pending human* | Passed in revert |
| 15 | Above/below flip while attached | *pending human* | Passed in revert |
| 18 | In-UI `.dock-close` / `dock-closed` / pump | *pending human* | Clarified in revert; not re-run after first revert |
| 19 | Click dock does not disturb tile | *pending human* | Clarified in revert; not re-run after first revert |

## Outcome

**Runtime attachment restored in code (#288).** Native §6 bar rows remain
**unverified** until human observation updates this table. If any row fails
after #286/#287, diagnose (including spike §5 coordinate space) before a second
revert.
