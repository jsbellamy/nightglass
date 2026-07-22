# Burger Drake ordinary-opponent body — asset contract (#325)

```markdown
Asset class: opponent body — ordinary opponent
Status: accepted for shipping (agent visual review accept; promote complete)
Runtime destination: src/assets/sprites/burger-drake.png plus manifest entry
Runtime shape: flexible per-asset RGBA, binary alpha, ordinary-opponent opaque ceiling from layout.json (30×68)
Visual vocabulary: docs/fowl-harvest-theme.md; fowl-harvest-24@1
Geometry: strict side profile facing LEFT; bottom-centre foot anchor; both feet visible; generous source clearance
Review context: native 1× single and five-copy Battlefield composition; nearest-neighbor 4× cohort sheet
Validator: pipeline/acquire.py measure + promote; CI npm run assets:verify
```

## Visual reference set

| Role | Path | Notes |
| --- | --- | --- |
| Identity | `docs/fowl-harvest-theme.md` `burger-drake` prompt + intended read | Canonical; no separate portrait file in repo |
| Style / scale | `src/assets/sprites/pipcap.png` | Ordinary opponent native scale peer |
| Style / Party readability | `src/assets/sprites/hunter.png`, `src/assets/sprites/knight.png` | Chunky flat pixel cohort |

## Preserve

Top hat, monocle, burger torso fusion, LEFT facing, `fowl-harvest-24` palette after quantize.
