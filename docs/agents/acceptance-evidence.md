# Acceptance evidence

Criterion-by-criterion publication gate for Nightglass. `AGENTS.md` routes here;
`.agents/issue-implementer.md` step 5 applies it. This document answers *what
proves a criterion*. `docs/agents/code-style.md` answers *where to write a
test* — do not merge the two.

## The rule

A criterion asserting **rendered geometry**, **colour/contrast**,
**cross-window delivery**, or **native windowing** may **not** be met from a
happy-dom or unit test. It must cite one of:

1. a named browser-harness scenario (`npm run test:evidence`),
2. a scenario-keyed review artifact, or
3. a native observation under `docs/agents/native-observation.md`.

Engine, content-validator, pure-math, save-boot, and asset-pipeline criteria
keep their existing seams (`docs/agents/code-style.md`); this rule does not
re-route them.

"Rendered" does **not** imply "needs pixels." Native-1× scaling is provable by
a pure test relating `SPRITE_SOURCES` / PNG IHDR headers to the
`.combatant-sprite` rule in `styles.css`. The missing thing was the *seam*,
not the renderer. Prefer the narrowest seam that can prove the claim; forbid
only happy-dom / unit tests that cannot see layout, cascade, or a second
webview.

## Citation naming

Acceptance rows cite scenarios by registered slug — never by paraphrasing a
test file. The slug must appear in the test title (or `describe` title) that
proves it, so the row is addressable without opening the suite. (Closes the
named-scenario blind spot from the acceptance-evidence seams audit.)

| Prefix | Seam | Runner |
| --- | --- | --- |
| `evidence: <slug>` | Playwright scenarios under `e2e/` | `npm run test:evidence` |
| `manual-check: <slug>` | Port-injected `DockWindowPort` / shell tests | `npm test` |

A title may list several slugs when one scenario body proves several named
checks; the acceptance row still cites the single slug that matches its claim.
Do not put a slug on a title that does not prove that claim — for example
`evidence: knockout-readability` belongs on a review-artifact citation, not on
a harness CSS assertion.

Native residual rows cite the checklist item name from
`docs/agents/native-observation.md`, plus platform and observed result — not
an `evidence:` or `manual-check:` slug.

## Worked examples

Known scenarios and the narrowest evidence that proves them. Cite the **Named
check** column (or its `evidence:` / `manual-check:` slug) from an acceptance
row. The table is worked examples of the rule above, not a closed checklist:
a hundred-and-first row still follows the rule even when it is not listed
here.

| Named check | Cite as | Automated / review evidence |
| --- | --- | --- |
| Tile geometry (480×112, status line, combatant fit / no overlap, five-opponent stress, status-line Drop notification clearance) | `evidence: tile-geometry` | `e2e/rendered-evidence.spec.ts` via `npm run test:evidence`; review screenshots `e2e-screenshots/01-tile-initial.png`, `02-tile-combat.png`, `05-tile-five-opponents.png`, `06-tile-drop-notification.png` |
| Cross-webview delivery (`dock-opened` → snapshot → populated Dock; in-UI close without disturbing the tile) | `evidence: cross-webview-delivery` | Same suite: two pages in one context (`/` and `/?window=dock`) sharing `BroadcastChannel` |
| AA contrast (status, dock toggle, health text) | `evidence: aa-contrast` | Same suite: computed-style contrast ≥ WCAG AA floor |
| Dock surfaces (five tabs, one row, scroll not clip, each surface populated) | `evidence: dock-surfaces` | Same suite; review screenshots `e2e-screenshots/03-dock-initial.png`, `04-dock-*-*.png` |
| Native-1× scaling (intrinsic ≡ rendered, excluding deliberate knockout transforms) | `evidence: native-1x-scaling` | Browser assertion in the suite **or** a pure test of `SPRITE_SOURCES` / PNG IHDR vs `.combatant-sprite` — either is sufficient; happy-dom alone is not |
| Knockout readability (non-colour signal readable in the crowded tile) | `evidence: knockout-readability` | Scenario-keyed review artifact only — committed at `docs/research/evidence/knockout-readability/tile-combat.png` (emitted by the harness; judged in the terminal scene review). Harness CSS non-colour signals may support the claim but must not carry this slug and do not retire the judgement |
| Dock window port (open/close/toggle sequencing, reposition math, tile APIs untouched) | `manual-check: dock-position-only`, `manual-check: dock-pump-continuity`, `manual-check: dock-no-tile-resize` | Vitest over injected `DockWindowPort` deps — proves call sequencing and geometry wiring, **not** native window chrome |
| Native dock lifecycle / OS close / positioning | checklist items in `docs/agents/native-observation.md` | Manual `npm run tauri dev` only when `src-tauri/**`, `app.windows`, or capabilities change |

## Three dispositions

Every live acceptance row gets exactly one disposition. An unnamed case is how
a stale or unsupported row gets silently ticked.

1. **Unsupportable row** — stop; do not open a completion PR. Report the issue
   as incomplete.
2. **Native check the agent cannot run** (`src-tauri/**`, `app.windows`,
   capabilities) — open the PR, state the missing native evidence explicitly,
   and **block merge** until a human adds the evidence row.
3. **Row falsified by a landed successor** — do not tick, do not stop; flag in
   the PR for editorial disposition (see Tier-3 policy).

## Tier-3 policy

When a live acceptance sentence has been falsified by a landed successor:

**Retire the sentence.** If it was a proxy for a live intent, promote that
intent to a real guard — never to a fresher sentence.

Rewriting a stale row to today's truth is forbidden: it creates an unenforced
mirror of state and erases the record of what was originally asked. Editorial
retirement (and any intent promotion) is owned by the wave's editorial ticket,
not by silently editing the checkbox during an unrelated implementation PR.

## Review artifacts

Review artifacts are **scenario-keyed, not row-keyed**. One human pass per
rendered scene, however many acceptance rows that scene proves.

- **Attached to the PR by default** (the harness emits `e2e-screenshots/`).
- **Committed under `docs/research/evidence/`** only where the artifact *is*
  the evidence — e.g. knockout readability, recorded native observations —
  so a judgement row stays durably citable after CI links rot.
- No pixel-diff gate. Screenshots are for human eyes on a scene; numeric
  assertions constrain only what was measured.

## Orchestrator step

The orchestrator independently owns this gate before merge. Green CI and a
scope-matching file list are necessary but never sufficient.

For criteria that ride the browser seam, the independent step is:

1. Re-run `npm run test:evidence`.
2. **Look at the emitted scenes** in `e2e-screenshots/` (and any committed
   review under `docs/research/evidence/` the PR cites).

It is **not** a matrix audit of PR-body checkmarks. A matrix-only pass let
insufficient-evidence rows through while everything was closed and green. CI
already vouches for Engine, content, and pipeline seams; spend the
orchestrator pass on the seam CI cannot vouch for — rendered scenes.

Do not merge — and therefore do not allow `Closes #<N>` to close the issue —
when any acceptance row is missing, contradicted, untested at the right seam,
or only claimed by the implementer.
