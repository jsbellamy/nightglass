# Knockout-readability review artifact

Scenario key: `evidence: knockout-readability`.

Emitted by the rendered-evidence harness (`npm run test:evidence`) as
`tile-combat.png` — a real Chromium capture of the Battle Tile after a
knocked-out combatant is present, with non-colour CSS signals applied on
`.combatant-sprite` (filter) and `.combatant-stack` (transform).

This artifact supports the human judgement that the knocked-out state is
readable in the crowded tile. It does **not** discharge that row: the
judgement is made in the terminal scene review (nightglass#103).
