# Visual review — `stopped-clock-court` (#576)

**Composite reviewed (primary):** [`tile-review-stopped-clock-court.png`](./tile-review-stopped-clock-court.png)
(native 480×112 Battle Tile: status strip + battlefield band with Party, five opponents, Boss, 2px health bars, damage numerals, moonberry-glow effect frames)

**Also recorded:** runtime strip `src/assets/backdrops/stopped-clock-court.png` (issue Proof C2 strip seam)

**4× inspect sheet:** [`tile-review-stopped-clock-court@4x.png`](./tile-review-stopped-clock-court@4x.png)

**Reviewer:** step-6 subagent (Read tool on the single tile composite)

**Verdict: accept**

## Answers

1. **Immediate identity read:** Yes — moonless clock-plaza at a bell-tower’s foot; dark indigo sky, clustered street clocks and tower forms; no garden or rural cues.
2. **Materials present:** Tarnished brass/bronze, verdigris on roofs and cobbles, candle-ivory dial faces, deep indigo sky, single warm alarm-red lamp center-left.
3. **Distinct from Moonberry garden and Fowl Harvest rural:** Yes — urban/architectural clock court.
4. **Ground band clear for sprites:** Yes — dark cobblestone band continuous; sprites read grounded.
5. **Creature/body, readable text, hot magenta, or hidden-opponent silhouette:** None — dials abstract (no readable numerals); clocks read as architecture.
6. **Combat feedback pop:** Yes — green 2px health bars, yellow damage numerals, and effect frames are the brightest/sharpest signals over the muted plaza.

**Backdrop hotspots:** Sparse pale ivory dial pixels (measure `max_luma` ~225 on a handful of cells) sit beside/above bar lanes and do not materially compete with bars or numerals; alarm-red lamp stays localized and dim.

**Justification:** The backdrop delivers Stopped-Clock Court identity and materials, stays combat-subordinate under I7/C3, passes I6, and leaves health bars, damage numbers, and effects as the dominant read at native scale.
