# The Unwound Boss body — asset contract (#574)

```markdown
Asset class: opponent body — Boss
Status: accepted for shipping (agent visual review accept; promote complete)
Runtime destination: src/assets/sprites/the-unwound.png plus manifest entry
Runtime shape: flexible per-asset RGBA, binary alpha, Boss opaque ceiling from layout.json (160×72)
Visual vocabulary: docs/unwound-belfry-theme.md; unwound-belfry-24@1
Geometry: strict side profile facing LEFT; bottom-centre foot anchor; generous source clearance; broad low Boss envelope (never tall tower)
Review context: native 1× cohort strip (The Fryer / The Vigil / The Tocsin / Tickmoth / Tollbat / Astrolabe-Spider / The Unwound) + native single on REVIEW_sheet_1x.png
Validator: pipeline/acquire.py measure + promote; CI npm run assets:verify
```

## Visual reference set

| Role | Path | Notes |
| --- | --- | --- |
| Identity | Issue #574 C1 / `docs/unwound-belfry-theme.md` §`the-unwound` | Canonical prompt + intended read |
| Style cohort | `src/assets/sprites/the-fryer.png`, `src/assets/sprites/the-vigil.png`, `src/assets/sprites/the-tocsin.png` | Boss-scale broad low chunky flat pixel weight |
| Style cohort | `src/assets/sprites/tickmoth.png`, `src/assets/sprites/tollbat.png`, `src/assets/sprites/astrolabe-spider.png` | Unwound Belfry ordinary peers for palette block size |

## Preserve

Awakened belfry mechanism (great clock movement + carillon) as one machine-beast, LEFT facing, cracked candle-ivory dial face with wrenched brass hands and alarm-red under-glow, gear-wheel body, hanging-bell ribcage, pendulum-arm limbs, uncoiled mainspring, gear-feet distinct at 1×, broad low Boss silhouette within 160×72 (never tall), `unwound-belfry-24` palette after quantize; alarm red confined to dial under-glow.
