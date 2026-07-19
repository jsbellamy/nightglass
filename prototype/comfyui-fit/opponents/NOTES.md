# Opponent art via logical-grid recovery — #30

## Question

Can the external-image-model prompt and Logical-Grid Recovery contract from
[#29](https://github.com/jsbellamy/nightglass/issues/29) produce a representative
Moonberry ordinary opponent and Boss that remain distinct from the Party and
readable at 1× in the 480×112 Battle Tile—including the five-opponent stress
case—without resizing, hand-cleaning, or weakening the Archived Raw Bundle,
magenta-key, anchor, palette, and validator gates?

Also: same `moonberry-16` body palette or a separately versioned opponent
palette? What is the minimum canonical opponent still set the three-Stage
vertical slice must specify?

## Artifact

Throwaway review under `prototype/comfyui-fit/opponents/` (wipe or absorb when
the ticket closes). One command to rebuild runtime frames:

```bash
python3 prototype/comfyui-fit/acquire.py pipcap boss
```

Review sheets (already written):

| File | What to judge |
| --- | --- |
| `review/STRESS_5x_pipcap_1x.png` | five ordinary opponents at 1× in the fixed Battle Tile |
| `review/BOSS_1x.png` | Boss silhouette vs Party at 1× |
| `review/INSPECT.png` | 1× stress + 6× / 1× zooms of Pipcap, Boss, Knight, Wizard |
| `review/BOSS_INSPECT.png` | Boss encounter + 6× zoom |

Archived raws / provenance / runtime:

- `grid_raw/pipcap.png` + `pipcap.source.json` → `runtime/pipcap.png`
- `grid_raw/boss.png` + `boss.source.json` → `runtime/boss.png`

## Measured gates

| Subject | Recovered grid | Opaque span | Baseline | Magenta / pitch / clip / validate |
| --- | --- | --- | --- | --- |
| Pipcap (ordinary) | 29×40 | 29×40 | 47 | ACCEPT |
| Boss | 32×41 | 31×41 | 47 | ACCEPT |

Both rebuild byte-identically offline through `acquire.normalize` with no
provider or network. Rejected earlier candidates for the same reasons #29
recorded: over-wide grids, weak Y pitch, and left-edge clipping — fixed
prompt-side (explicit 32×48 canvas, smaller silhouette, magenta clearance).

Ordinary screen-space budget (~28×40): Pipcap lands at **29×40**. Boss is taller
and fuller at **31×41** on the shared 32×48 canvas, still left-facing.

## Palette probe

Recovered cells are quantized nearest-in-RGB to `moonberry-16` (same path as
Party). Pre-quantize RGB variety is high for everyone (provider cell noise);
mean quantize distance for Pipcap (~37) and Boss (~35) sits beside Knight (~33).
Pipcap maps onto 10 palette entries; Boss onto 14. No separate body palette was
required for these two stills to clear the embedded-effects / on-palette
validator.

## Recommended still-set (draft — needs HITL)

For the three-Stage, two-Waves-plus-Boss slice, the minimum opponent still set
this prototype suggests:

1. **One ordinary family still** (Pipcap-class) — reused across Waves; Formation
   / count communicate density, not unique sprites per Wave.
2. **One Boss still** per Stage — three Boss stills if Stages must read as
   distinct climaxes; otherwise one Boss still reused with Stage backdrop /
   stats carrying differentiation.

Optional later (not required to answer this ticket): Stage-tinted ordinary
variants, downed poses, idle micro-loops.

## Verdict

**GO.** HITL accepted:

1. Pipcap and Boss clear the 1× readability / Party-distinctness gate in the
   five-opponent stress tile and Boss encounter without hand-cleaning or
   weakening the acquisition contract.
2. Opponents stay on the shared **`moonberry-16`** Character palette (no
   separate opponent body palette).
3. Minimum canonical opponent still set for the three-Stage slice:
   **one ordinary family still** (Pipcap-class, reused across Waves) plus
   **three Boss stills** (one distinct silhouette per Stage).
