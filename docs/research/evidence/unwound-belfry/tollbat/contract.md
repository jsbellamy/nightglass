# Tollbat ordinary-opponent body — contract declaration (#570)

Asset class: opponent body — ordinary opponent (`tollbat`)
Status: accepted for shipping (agent visual review accept; promote complete)
Runtime destination: `src/assets/sprites/tollbat.png` + `manifest.json` entry
Runtime shape: 30×17 RGBA, binary alpha, `unwound-belfry-24@1`, native 1×
Visual vocabulary: `docs/unwound-belfry-theme.md`; `unwound-belfry-24@1`
Geometry: facing LEFT; opaque ceiling 30×68; bottom-centre foot anchor `[15, 17]`
Review context: native 1× cohort strip (Burger Drake / Cornquacker / Tickmoth / Tollbat) + native single on REVIEW_sheet_1x.png
Validator: `pipeline/acquire.py measure --tag tollbat`; promote; CI `assets` job
