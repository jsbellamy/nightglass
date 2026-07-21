# Dock child-window attachment — §6 revert (#275)

Native observation against PR
[#281](https://github.com/jsbellamy/nightglass/pull/281) / issue
[#275](https://github.com/jsbellamy/nightglass/issues/275). The spike
([`docs/research/archive/dock-child-window-fit.md`](../../archive/dock-child-window-fit.md),
#274) remains the *why* record; this note records the **shipped outcome**:
revert to the #273 throttled `onTileMoved` path.

Issue #275 §6: any failure of always-on-top, `dockRect` geometry under child
coordinates, or close semantics means revert runtime attachment and keep #273
as shipped behaviour. That path was taken after Condition 2 failed.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-07-21 |
| Platform | macOS (human observation on PR #281) |
| Build under test | PR #281 branch `issue-275-dock-child-window` with creation-time `parent: "tile"` |
| Observation comment | https://github.com/jsbellamy/nightglass/pull/281#issuecomment-5032941584 |

## Results

| # | Criterion | Result | Notes |
| --- | --- | --- | --- |
| 13 | Always-on-top with child attached | **pass** | Tile remained above a normal foreground app |
| 14 | Condition 2 — flush `dockRect` / child `setPosition` | **fail** | Below-tile spawn OK. Above-tile spawn opens far from the tile. After dragging the tile (e.g. ~60% above midpoint → ~30% below) then opening the Dock, it appears at the **previous** location — stale open position vs current tile |
| 15 | Above/below flip while attached | **pass** | Compositor follow / flip during drag worked |
| 16 | Monitor clamp (#266) | **could not verify** | Tied to #14 stale geometry |
| 17 | No visible dock lag vs #273 | **pass** | Attachment delivered the lag win |
| 18 | In-UI `.dock-close` / `dock-closed` / pump | *(clarified for record; not re-run after revert)* | Click in-UI `.dock-close` — dock tears down, `dock-closed` publishes, tile pump keeps advancing |
| 19 | Click dock does not disturb tile | *(clarified for record; not re-run after revert)* | Clicking inside the dock must not move/pause/resize the Battle Tile |

## Outcome

**§6 revert.** Runtime child attachment (`parent: "tile"`, creation probe,
`dockChildAttachSupported`, attached-path listener skip) is removed. Production
behaviour is again the #273 throttled `onTileMoved` → `applyPosition` path.
Spike archive is not erased.

Root cause for Condition 2 was not further diagnosed after the revert bar
fired; the spike’s §5 ambiguity (child `set_outer_position` coordinate space)
is consistent with wrong/stale open geometry under Tauri child windows.
