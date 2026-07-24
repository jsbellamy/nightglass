# Asset contract — `carillon-hall` (#577)

```markdown
Asset class: backdrop
Status: candidate for shipping
Runtime destination: src/assets/backdrops/carillon-hall.png
Runtime shape: 480×86 RGB(A) PNG; opaque preferred; no magenta key
Visual vocabulary: docs/unwound-belfry-theme.md §carillon-hall + §Environment lighting;
  moonless belfry-night; palette-exempt scenery (not quantized to unwound-belfry-24)
Geometry: full battlefield band; nearly flat plank-and-stone floor in bottom fifth;
  hanging bells / brass frame / ropes / stone arches in middle band
Review context: native 480×86 strip (issue C2); optional Battle Tile stress composite
Validator: python3 pipeline/backdrops.py build + verify; CI npm run assets:verify
```

Accepted candidate: `carillon-hall-candidate-a` (provider raw archived at
`assets-raw/backdrops/carillon-hall.png`).
