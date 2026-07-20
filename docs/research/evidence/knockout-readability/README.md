# Knockout-readability review artifact

Scenario key: `evidence: knockout-readability`.

Emitted by the rendered-evidence harness (`npm run test:evidence`) as
`tile-combat.png` — a real Chromium capture of the Battle Tile after a
knocked-out combatant is present, with non-colour CSS signals applied on
`.combatant-sprite` (filter) and `.combatant-stack` (transform).

## Judgement (nightglass#103)

**Readable — discharged.** See
[`../103-terminal-scene-review/README.md`](../103-terminal-scene-review/README.md)
§ Knockout-readability judgement. The knocked-out opponent is distinguishable
in the crowded tile via desaturation, collapse, and absent live health fill.

## Note on the PNG

This file must match the post-knockout harness frame emitted as `02-tile-combat.png` under
gitignored `e2e-screenshots/` after `npm run test:evidence`,
not the pre-knockout initial tile. #103 corrected a bad commit where the
artifact was byte-identical to `01-tile-initial.png`.
