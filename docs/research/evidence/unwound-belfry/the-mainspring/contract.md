# Asset contract — `the-mainspring` (#578)

```markdown
Asset class: backdrop
Status: candidate for shipping
Runtime destination: src/assets/backdrops/the-mainspring.png
Runtime shape: 480×86 RGB(A) PNG; opaque preferred; no magenta key
Visual vocabulary: docs/unwound-belfry-theme.md §the-mainspring + §Environment lighting;
  moonless belfry-night; palette-exempt scenery (not quantized to unwound-belfry-24)
Geometry: full battlefield band; nearly flat iron-grate ground in bottom fifth;
  gearworks identity in middle band; broad low-detail clearing on opponent half
Review context: native 480×86 Battle Tile with Party, five-opponent stress case,
  health bars, damage numbers, and current effects
Validator: python3 pipeline/backdrops.py build + verify; CI npm run assets:verify
```

Owning contracts: `docs/backdrop-contract.md`, `docs/unwound-belfry-theme.md`
(`the-mainspring`), `docs/agents/asset-generation.md`.
