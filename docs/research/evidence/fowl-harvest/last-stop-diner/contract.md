# Asset contract — `last-stop-diner` (#323)

```markdown
Asset class: backdrop
Status: candidate for shipping
Runtime destination: src/assets/backdrops/last-stop-diner.png
Runtime shape: 480×86 RGB(A) PNG; opaque preferred; no magenta key
Visual vocabulary: docs/fowl-harvest-theme.md; toxic rural dusk; palette-exempt scenery
Geometry: full battlefield band; nearly flat ground in bottom fifth; identity in middle band
Review context: native 480×86 Battle Tile with current Party, five-opponent stress case, health bars, damage numbers, and current effects
Validator: python3 pipeline/backdrops.py build + verify; CI npm run assets:verify
```

Owning contracts: `docs/backdrop-contract.md`, `docs/fowl-harvest-theme.md` (`last-stop-diner`), `docs/agents/asset-generation.md`.
