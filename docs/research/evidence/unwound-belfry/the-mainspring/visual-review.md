# Visual review — `the-mainspring` (#578)

Composite reviewed (only): `tile-review-the-mainspring.png`  
Reviewer: step-6 subagent (separate context, composer-2.5)  
Verdict: **accept**

## Issue / theme criteria

1. **Pass** — Enormous interlocking brass cogs, a central mainspring coil, pendulum/movement-frame cues, and depth-filled mechanism read as a clock-heart chamber, not Court, Hall, field, or diner.
2. **Pass** — Tarnished brass, verdigris streaks, faint cold-glass catches, candle-ivory seep, and moonless indigo shadow read as Unwound Belfry night; no Moonberry garden or Fowl mustard dusk cast.
3. **Pass** — The bottom fifth is a nearly flat, dark iron-grate floor band with enough width for a very wide Boss silhouette.
4. **Pass** — Party, opponents, Boss, 2px health bars, damage numerals, and luminous effect frames are the strongest signals; nothing sharp, bright, or high-contrast sits behind the health bars or Boss bar.
5. **Pass** — No creature/body, readable text/logos, hot-magenta field, or active sparks/fire/gore in the backdrop.
6. **Pass** — The opponent/Boss half is especially dark and low-detail, leaving a broad clearing for a wide Boss silhouette.

## Backdrop-contract feedback pop (stress composite)

| Feedback element | Verdict | Note |
| --- | --- | --- |
| Health bars (2px) | **pass** | Green party and red enemy 2px bars read clearly against the dark grate and shadowed gears |
| Damage numbers | **pass** | Yellow numerals (8 / 24 / 4) stay legible without competing with backdrop detail |
| Ability effect frames (`arc-slash`, `spell-bloom`, `heal-rise`) | **pass** | Glow frames remain visible and dominant on the party half |
| Status / actor-pool chips (status strip) | **pass** | P1–P3, Opp 5, and Boss chips stay clean above the battlefield |
| Ground contact | **pass** | All actors sit naturally on the flat iron-grate floor band |

Moonless belfry-night materials are intentional Unwound Belfry identity
(`docs/unwound-belfry-theme.md`); the strip is palette-exempt scenery and stays
darker / more restrained than combat feedback.

Composite includes Party + five Pipcaps + Boss, 2px health bars, floating damage
numerals, `arc-slash` / `spell-bloom` / `heal-rise` frames from
`src/assets/effects/`, and status glyphs on the status strip.
