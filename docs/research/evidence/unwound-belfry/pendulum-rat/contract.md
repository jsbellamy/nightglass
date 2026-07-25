# Pendulum Rat ordinary-opponent body — asset contract (#681)

```markdown
Asset class: opponent body — ordinary opponent
Status: accepted for shipping (agent visual review accept; promote complete)
Runtime destination: src/assets/sprites/pendulum-rat.png plus manifest entry
Runtime shape: flexible per-asset RGBA, binary alpha, ordinary-opponent opaque ceiling from layout.json (30×68)
Visual vocabulary: docs/unwound-belfry-theme.md; unwound-belfry-24@1
Geometry: strict side profile facing LEFT; bottom-centre foot anchor; generous source clearance
Review context: native 1× cohort strip (Tickmoth / Tollbat / Astrolabe-Spider / Pendulum Rat) + native single on REVIEW_sheet_1x.png
Validator: pipeline/acquire.py measure + promote; CI assets job
```

## Visual reference set

| Role | Path | Notes |
| --- | --- | --- |
| Identity | Issue #681 C1 / `docs/unwound-belfry-theme.md` §`pendulum-rat` | Canonical prompt + intended read |
| Style cohort | `src/assets/sprites/tickmoth.png`, `src/assets/sprites/tollbat.png`, `src/assets/sprites/astrolabe-spider.png` | Unwound Belfry block size, moonless-indigo contour, unwound-belfry-24 palette; long/low/horizontal on four legs vs Astrolabe-Spider eight-legged sprawl |

## Preserve

Belfry rat + brass pendulum-tail escapement anatomical fusion, LEFT facing, incisor / ears / escapement wheel / rod / bob distinct at 1×, `unwound-belfry-24` palette after quantize.
