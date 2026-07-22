# Step-6 visual review — crooked-cornfield (#324)

Composite reviewed (single sheet): [`tile-review-crooked-cornfield.png`](./tile-review-crooked-cornfield.png)

Owning accept bar (`docs/backdrop-contract.md` Review context / Review gate): Battle Tile native 1× with five-opponent stress case — bars, damage numbers, moonberry-glow effects, **actor pools**, and status-line feedback must pop; near-flat ground band so sprites sit without floating.

Subagent verdict (text only; implementing agent did not open the raster):

VERDICT: accept

1. Identity: Yes — oppressive crooked cornfield with wilted/bent stalks, failed irrigation, and toxic dusk reads at native 1×.
2. Landmarks: Corn, broken/rusted irrigation pipe, teal runoff, fence line, distant water tower, and dim red warning lamp are all readable.
3. Palette: Toxic rural dusk (yellow-green crops, mustard-orange sky, teal drainage, rust) — not Moonberry plum/mint.
4. Combat clarity: Yes — 2px health bars, damage numbers (18/9), luminous effects, and saturated sprites are the strongest signals over the muted backdrop.
5. Ground band: Yes — near-flat dark farm-track band in the bottom fifth; sprites sit grounded, not floating.
6. Forbidden content: None — no faces in corn, no ducks/extra creatures, no env text/UI, no gore, no hot-magenta field.
7. Cohort separation: Clear — desolate toxic cornfield/farm, not Moonberry orchard, bramble, or terrace.

Implementer note against the full accept bar (same composite): status-line HP chips and actor-pool dots remain distinct bright signals above the scenery; the Boss status bar segment stays readable against the thin dusk sky. No rework of the raster was required.
