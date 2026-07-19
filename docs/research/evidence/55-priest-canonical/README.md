# Priest canonical reference still (#55)

## Contract declaration

| Field | Value |
| --- | --- |
| Asset class | Character (Party Class — Priest) |
| Status | candidate for shipping — **agent accept pending HITL** |
| Runtime destination | `src/assets/sprites/priest.png` |
| Runtime shape | 32×48 RGBA, binary alpha, bottom-center foot anchor |
| Visual vocabulary | frozen `moonberry-16` |
| Geometry | right-facing; issue #55 Knight-shaped prompt (26×40 safe box + two magenta cells clearance); candidate C tightened per overshoot retry |
| Review context | 480×112 Battle Tile, five-opponent stress |
| Validator | `npm run assets:verify` |

## Chosen raw

| Field | Value |
| --- | --- |
| Sample | `priest-c.png` → archived as `assets-raw/grid_raw/priest.png` |
| Recovered grid | **27×46** |
| Pitch scores | X 0.075 / Y 0.070 (≥ 0.04) |
| Baseline | 47 |
| Style cohort | Knight + Wizard party peers; Pipcap + Boss-1 for tile scale |
| Style reference input | `assets-raw/grid_raw/knight.png` (`9dfcdd69592cec858d9ff4d53429a2a3b48815918f4b463083e7201d69546cb5`) |

Accepted prompt (candidate C) is archived byte-for-byte in
`assets-raw/grid_raw/priest.source.json`.

## Rejected candidates (prompt changed)

Retry order followed `docs/agents/asset-generation.md` (overshoot → shrink into
safe box; attach accepted Knight raw as style reference on C). Issue #55 supplies
a Knight-shaped `TRUE chunky pixel art…` prompt with an explicit **26×40** safe
box — that is the issue prompt, not a verbatim paste of the
`docs/acquisition-contract.md` fixed shell (`A full-body game Character sprite
of **<SUBJECT>**…`).

| Candidate | Primary failure | Recovered | Exact prompt |
| --- | --- | --- | --- |
| priest-a | overshoot | 34×48 | Issue #55 opening prompt (below) |
| priest-b | overshoot | 33×48 | Overshoot-retry template (below) |
| priest-c (accepted) | — | 27×46 | See `priest.source.json` |

### priest-a prompt (issue #55 opening)

```
TRUE chunky pixel art sprite ONLY. Canvas is exactly 32 logical columns by 48
logical rows rendered large — the 1024x1536 output represents exactly 32 logical
columns by 48 logical rows; every logical pixel is one uniform 32x32
rendered-pixel square and every boundary aligns to that grid. One full-body
chibi Priest of a storybook night-garden fantasy guild, strict side profile
facing RIGHT: flowing cream-gold layered robe with stitched hem, mint-green
leaf-motif stole and cuffs, berry-pink sash and small round cap, dark-plum
one-cell outline, calm face, both hands holding a short rounded lantern-staff
angled up-right with a small glowing moonpetal charm. Keep the combined
silhouette within 26x40 logical cells, centered, with at least TWO full magenta
cells of clearance on LEFT, RIGHT, TOP, and BOTTOM — do not touch or crop any
edge. Use 10-12 flat colors, one-cell outlines, staff at least two cells thick.
Every unused cell is flat #ff00ff. No smaller pixels, gradients, anti-aliasing,
dithering, floor, shadow, glow, particles, extra characters, text, watermark,
transparency, cropped equipment, or hot magenta in the Priest.
```

### priest-b prompt (overshoot retry after 34×48)

```
TRUE chunky pixel art sprite ONLY. Canvas is exactly 32 logical columns by 48
logical rows rendered large — the 1024x1536 output represents exactly 32 logical
columns by 48 logical rows; every logical pixel is one uniform 32x32
rendered-pixel square and every boundary aligns to that grid. The previous
candidate recovered as 34x48. Preserve its identity and pose, simplify its
detail, and redraw the complete silhouette inside the contract's 26x40
logical-cell safe box with clearance on every edge. One full-body chibi Priest
of a storybook night-garden fantasy guild, strict side profile facing RIGHT:
flowing cream-gold layered robe with stitched hem, mint-green leaf-motif stole
and cuffs, berry-pink sash and small round cap, dark-plum one-cell outline,
calm face, both hands holding a short rounded lantern-staff angled up-right
with a small glowing moonpetal charm. Keep the combined silhouette SMALLER —
within 26x40 logical cells, centered, with at least TWO full magenta cells of
clearance on LEFT, RIGHT, TOP, and BOTTOM — do not touch or crop any edge. Use
10-12 flat colors, one-cell outlines, staff at least two cells thick. Shrink
hair and robe volume. Every unused cell is flat #ff00ff. No smaller pixels,
gradients, anti-aliasing, dithering, floor, shadow, glow, particles, extra
characters, text, watermark, transparency, cropped equipment, or hot magenta in
the Priest.
```

## Validator output and byte identity

```text
$ npm run assets:verify
  [PASS] Priest grid is recoverable without reduction -- grid [27, 46]
  [PASS] offline rebuild matches committed priest.png byte-for-byte
  [PASS] manifest records moonberry-16 palette for every sprite
all contract tests passed
```

| Artifact | SHA-256 |
| --- | --- |
| Archived raw `priest.png` | `34712fbd19213319951ec00330e88242de4a6ba7b5b0822a43eb90a80478d635` |
| Runtime PNG file `src/assets/sprites/priest.png` | `1decef54968ce8437afbf1d27c6755560542db69d89e554c8eacad1aa4ac2b2a` |
| Manifest frame sha256 (`manifest.json`) | see `frames[0].sha256` under `priest` |

## Review disposition

| Step | Result |
| --- | --- |
| Agent pipeline / validator | **accept** (gates green) |
| Agent visual review (1× tile + cohort) | **accept** (best effort; sheets below) |
| HITL final gate | **pending** — human approves or requests retry on PR #118 |

## Review sheets

| File | Judge |
| --- | --- |
| `STRESS_5x_priest_1x.png` | Priest on party side vs five Pipcaps at 1× in 480×112 |
| `INSPECT.png` | Stress tile + 6×/1× zooms of Priest, Knight, Wizard, Pipcap, Boss-1 |
| `COHORT_1x.png` | Knight / Priest / Wizard silhouette distinctness at 1× |

## Style / identity notes (preserved)

- Soft cream-gold layered robe + mint stole vs Knight armored shield wedge
- Berry-pink sash / head accent + lantern crook staff with moonpetal charm
- Right-facing Party profile; round soft healer silhouette vs Wizard pointed hat
- Quantized to frozen `moonberry-16` only (no palette extension)
