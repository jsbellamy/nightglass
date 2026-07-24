# Asset contract — `the-oculus` (#579)

```markdown
Asset class: backdrop
Status: candidate for shipping
Runtime destination: src/assets/backdrops/the-oculus.png
Runtime shape: 480×86 RGB(A) PNG; opaque preferred; no magenta key
Visual vocabulary: docs/unwound-belfry-theme.md §the-oculus + §Environment lighting;
  moonless belfry-night; palette-exempt scenery (not quantized to unwound-belfry-24)
Geometry: full battlefield band; nearly flat stone-parapet ground in bottom fifth;
  armillary / observatory identity in middle band; quiet opponent half for wide Boss
Review context: native 480×86 Battle Tile with Party, five-opponent stress case,
  health bars, damage numbers, and sample moonberry-glow effects
Validator: python3 pipeline/backdrops.py build + verify; CI npm run assets:verify
```

Accepted candidate: `c2` (provider raw archived at
`assets-raw/backdrops/the-oculus.png`).
