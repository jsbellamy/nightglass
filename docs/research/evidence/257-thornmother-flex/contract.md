# Contract declaration — Thornmother flexible (#257)

| Field | Value |
| --- | --- |
| Asset class | opponent (Boss — Thornmother Vane / `boss-3`) |
| Status | accepted for shipping (agent visual review accept; promote complete) |
| Runtime destination | `src/assets/sprites/boss-3.png` |
| Runtime shape | RGBA, binary alpha, `moonberry-16`, native 1×; opaque ≤ 160×72 |
| Visual vocabulary | `moonberry-16`; accepted Pipcap (#256) cohort + Bramblehorn Boss weight |
| Geometry | facing LEFT; Boss ceiling 160×72; centred solo-Boss foot anchor x=240; floor_y 80; boss_bar_bottom_y 7 |
| Review context | native Stage 3 Boss scene + final Hunter/Pipcap/Thornmother cohort composite |
| Validator | `pipeline/acquire.py measure --tag boss-3`; promote; `npm run assets:verify` |
