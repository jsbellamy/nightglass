# Crooked Cornfield backdrop — asset contract (#324)

```markdown
Asset class: backdrop
Status: candidate for shipping
Runtime destination: src/assets/backdrops/crooked-cornfield.png
Runtime shape: 480×86 RGB(A) PNG; opaque preferred; no magenta key
Visual vocabulary: docs/fowl-harvest-theme.md; toxic rural dusk; palette-exempt scenery
Geometry: full battlefield band; nearly flat ground in bottom fifth; identity in middle band
Review context: native 480×86 Battle Tile with current Party, five-opponent stress case, health bars, damage numbers, and current effects
Validator: python3 pipeline/backdrops.py build + verify; CI npm run assets:verify
```

Visual theme id: `fowl-harvest`. Discovered via complete archived bundle under `assets-raw/backdrops/`.
