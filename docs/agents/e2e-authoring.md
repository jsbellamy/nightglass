# E2E evidence authoring

Agent recipe for adding or changing Playwright acceptance evidence. Policy and
citation rules live in `docs/agents/acceptance-evidence.md`; the machine-readable
catalogue is `e2e/helpers/evidence-scenarios.ts`. Drift enforcement is
`e2e/scenario-registry.spec.ts` (run via `npm run test:evidence`).

## Cold-start recipe (Tile exemplar)

Use `e2e/scenarios/tile.spec.ts` as the reference shape: registry declaration,
Evidence Session fixture, numeric assertions, and optional review scenes.

1. **Choose the fixture** — match an existing `EvidenceFixtureId` in
   `e2e/helpers/evidence-session.ts` (`live-tile`, `live-tile-and-dock`,
   `isolated-dock`, `live-tile-seeded-snapshot`, `reduced-motion-live-tile`).
   Tile combat uses `live-tile`; cross-window Dock work uses `live-tile-and-dock`;
   deterministic Armory-only state uses `isolated-dock`.

2. **Register the scenario** — add one `EvidenceScenario` row in
   `e2e/helpers/evidence-scenarios.ts` with stable `id`, `slugs` from
   `EVIDENCE_SLUG_CATALOG`, `spec.path`, `fixture`, `reviewScenes`, and
   `summary`. Slugs that are cited only from pure tests (for example
   `talent-icon-content-tier`) belong in `EVIDENCE_CITATION_ONLY_SLUGS`.
   Review-artifact-only rows (for example knockout readability) use
   `EVIDENCE_REVIEW_ARTIFACT_ONLY_SLUGS` in the acceptance guide, not on
   Playwright titles.

3. **Declare the case** — in the spec file listed on the registry entry, call
   `declareEvidenceScenario("<id>", async ({ browser }) => { ... })` exactly
   once. Never hand-write `evidence: …` strings in `test()` titles.

4. **Run targeted iteration** — while editing:

   ```bash
   npm run test:evidence:slug -- "evidence: tile-geometry"
   npm run test:evidence:scenario -- e2e/scenarios/tile.spec.ts
   npm run test:evidence:changed
   ```

5. **Capture review scenes** — when a criterion needs human eyes, register a
   `reviewScenes` id and emit it only through
   `captureReviewScene(page, "<scenario-id>", "<scene-id>")` from
   `e2e/helpers/review-scenes.ts`. Ordinary runs write to gitignored
   `e2e-screenshots/<scenario-id>/<scene-id>.png`. Playwright must never
   screenshot directly into `docs/research/evidence/`.

6. **Full gate** — before publishing:

   ```bash
   npm run test:evidence
   ```

   Confirm `git status --porcelain` is empty (ignored scenes do not dirty the
   tree).

7. **Scene review** — open the emitted PNGs under `e2e-screenshots/` for the
   scenario you changed. Numeric assertions in the spec remain the automated
   floor; scenes are for judgement rows.

8. **Optional durable promotion** — when the artifact *is* the evidence (not
   merely support), copy a registry-declared source scene to the scenario's
   `durableDestination` under `docs/research/evidence/`, review it, and commit
   that file as a deliberate evidence change. There is no automatic promotion;
   CI and normal `npm run test:evidence` runs never write tracked paths.

## Fixture choice (quick map)

| Intent | Fixture | Example spec |
| --- | --- | --- |
| Battle Tile only | `live-tile` | `e2e/scenarios/tile.spec.ts` |
| Tile + Management Dock bus | `live-tile-and-dock` | `e2e/scenarios/dock.spec.ts` |
| Dock without live Tile pump races | `isolated-dock` | `e2e/scenarios/armory.spec.ts` |

## Registry drift

`e2e/scenario-registry.spec.ts` fails on duplicate or missing
`declareEvidenceScenario` bindings, unknown or orphan slugs, hand-written
`evidence:` titles, unsafe screenshot paths, direct writes under
`docs/research/evidence/`, duplicate review output paths, and registered review
scenes that the spec does not emit. Acceptance-guide `evidence:` citations must
resolve to the registry, except the explicit review-artifact-only knockout
disposition documented in `docs/agents/acceptance-evidence.md`.

## Local runner notes

`playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so a preview
server already on port 4173 is reused. Rebuild (`npm run build` or restart
preview) after changing `src/`. While iterating, the `test:evidence:*` scripts
still prefix `playwright install chromium` (~0.6 s when cached); reserve
`npm run test:evidence` for the final full gate (~90 s of real-time simulation).

Playwright also supports `npx playwright test --last-failed` when a broader run
already failed and you want only the red cases back.
