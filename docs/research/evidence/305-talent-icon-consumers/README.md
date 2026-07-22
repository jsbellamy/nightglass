# Talent icon consumer review artifact

Scenario key: `evidence: talent-icon-content-tier`.

Committed capture of the Management Dock Character surface Talent Tree grid
(Knight) showing content-tier (34×34) icon faces in 48×48 cells with Stat rank
badges and the chosen Ability talent mark overlay.

## Judgement (nightglass#312)

**Legible — Talent Tree chrome grid.** Stat Row cells show rank overlay (`n/5`)
without cell-face prose; Ability Row cells show empty vs chosen chrome; sticky
detail prose/actions remain in the aside (not shown in this crop).

## Note on the PNG

`talents-grid-knight.png` is a Chromium capture of `.talent-grid` after seeding
the Dock with a leveled Knight snapshot (five Fortitude ranks, Hold the Line
chosen). Regenerate with a local `vite preview` and the one-off capture script
used during the #312 PR if the grid layout changes.

Unit/DOM assertions in `src/ui/talents-surface.test.ts` prove icon `img`
presence and overlay selectors; this artifact supports visual review of icon
identity at consumer scale.
