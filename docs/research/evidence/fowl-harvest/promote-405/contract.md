# Contract declaration — #405 promote

Asset class: opponent body — Boss (`the-fryer`, `scarequack`) plus shared Fowl registry
Status: candidate for shipping (mechanical promote from accepted archived raws)
Runtime destination: src/assets/sprites/the-fryer.png, scarequack.png; manifest.json; src/ui/sprites.ts
Runtime shape: flexible-fit RGBA, binary alpha, fowl-harvest-24@1, bottom-centre foot anchors
Visual vocabulary: docs/fowl-harvest-theme.md; fowl-harvest-24@1; burger-drake + cornquacker + the-combine + three Fowl backdrops
Geometry: facing LEFT; Boss opaque ceiling 160×72; layout.json role ceilings unchanged
Review context: native 1× cohort composite (silhouette strip + three 480×86 backdrop bands)
Validator: pipeline/acquire.py rebuild -- tags the-fryer,scarequack; pipeline/test_contract.py; src/ui/sprites.test.ts

## Style / identity references

| Role | Path | Purpose |
| --- | --- | --- |
| Archived raw | `assets-raw/grid_raw/the-fryer.png` | Immutable Fryer source (#387) |
| Archived raw | `assets-raw/grid_raw/scarequack.png` | Immutable Scarequack source (#388) |
| Cohort | `src/assets/sprites/burger-drake.png`, `cornquacker.png`, `the-combine.png` | Byte-identical peers |
| Backdrops | `last-stop-diner`, `crooked-cornfield`, `harvest-yard` | Battlefield bands |
