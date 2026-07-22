# Visual review — `last-stop-diner` (#323)

Composite reviewed (only): `tile-review-last-stop-diner.png`  
Reviewer: step-6 subagent (separate context)  
Verdict: **accept**

## Issue / theme criteria

1. **Pass** — Deserted roadside diner under mustard toxic dusk with field silhouettes; not a garden or city.
2. **Pass** — Teal chrome, mustard/orange sky, greasy browns, field greens, restrained red awning; plum/mint does not dominate.
3. **Pass** — Near-flat dark parking-lot band at the bottom; both combat halves stay low-detail for sprites.
4. **Pass** — Party, Pipcaps, Boss, bars, and numbers read strongest; backdrop stays dark and subordinate.
5. **Pass** — No creature/duck/character scenery shapes, readable text, UI-like props, gore, or hot-magenta field.
6. **Pass** — Facade, bent blank sign, and table/stand cues read as diner/parking at native scale.

## Backdrop-contract feedback pop (stress composite)

| Feedback element | Verdict | Note |
| --- | --- | --- |
| Health bars (2px) | **pass** | Bright green/red bars remain the sharpest local signals over dark lot and dim facade |
| Damage numbers | **pass** | Yellow numerals remain readable above Party, Pipcaps, and Boss |
| Ability effect frames (`arc-slash`, `spell-bloom`, `heal-rise`) | **pass** | Luminous moonberry-glow frames pop above diner chrome and mustard sky |
| Status / actor-pool chips (status strip) | **pass** | Status-line chips stay in the 24px chrome above the battlefield and are not competed by scenery |
| Ground contact | **pass** | Sprites sit on near-flat dark parking band without floating |

Mustard dusk is intentional Fowl Harvest identity (`docs/fowl-harvest-theme.md`); it is darker and more restrained than combat feedback, not a Moonberry night-garden match.

Composite includes Party + five Pipcaps + Boss, 2px health bars, floating damage numerals, `arc-slash` / `spell-bloom` / `heal-rise` frames from `src/assets/effects/`, and status glyphs on the status strip.
