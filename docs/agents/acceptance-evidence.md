# Acceptance evidence

Criterion-by-criterion publication gate for Nightglass. `AGENTS.md` routes here;
`.agents/issue-implementer.md` step 5 applies it. This document answers *what
proves a criterion*. `docs/agents/code-style.md` answers *where to write a
test* — do not merge the two.

## The rule

A criterion asserting **rendered geometry**, **colour/contrast**,
**cross-window delivery**, or **native windowing** must cite one of:

1. a named browser-harness scenario (`npm run test:evidence`),
2. a pure test that can see the same fact (`npm test`) — the narrowest seam
   when layout, cascade, or a second webview are not required,
3. a scenario-keyed review artifact, or
4. a native observation under `docs/agents/native-observation.md`.

Forbid only happy-dom / unit tests that cannot see the claim (for example
layout, cascade, or a second webview). Engine, content-validator, pure-math,
save-boot, and asset-pipeline criteria keep their existing seams
(`docs/agents/code-style.md`); this rule does not re-route them.

"Rendered" does **not** imply "needs pixels." Native-1× scaling is provable by
a pure test relating `SPRITE_SOURCES` / PNG IHDR headers to the
`.combatant-sprite` rule in `styles.css`. The missing thing was the *seam*,
not the renderer. Prefer the narrowest seam that can prove the claim.

## Citation naming

Acceptance rows cite scenarios by registered slug — never by paraphrasing a
test file. The slug must appear in the test title (or `describe` title) that
proves it, so the row is addressable without opening the suite. (Closes the
named-scenario blind spot from the acceptance-evidence seams audit.)

The **complete machine-readable catalogue** of `evidence:` slugs is
`EVIDENCE_SLUG_CATALOG` in `e2e/helpers/evidence-scenarios.ts`, enforced by
`e2e/scenario-registry.spec.ts`. `EVIDENCE_CITATION_ONLY_SLUGS` lists slugs
proved outside Playwright titles; `EVIDENCE_REVIEW_ARTIFACT_ONLY_SLUGS` lists
guide citations that intentionally never bind to a harness title (knockout
readability). Authoring steps live in `docs/agents/e2e-authoring.md`.

| Prefix | Seam | Runner |
| --- | --- | --- |
| `evidence: <slug>` | The rendered-evidence seam — Playwright under `e2e/`, or a pure test that can see the same fact | `npm run test:evidence` (Playwright) or `npm test` (pure) |
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
here, and the registry in `e2e/helpers/evidence-scenarios.ts` is the complete
machine-readable slug catalogue.

| Named check | Cite as | Automated / review evidence |
| --- | --- | --- |
| Tile geometry (480×112, status line, combatant fit / no overlap, five-opponent stress, status-line Drop notification clearance) | `evidence: tile-geometry` | `e2e/scenarios/tile.spec.ts` via `npm run test:evidence`; orchestrator reviews harness-emitted PNGs under `e2e-screenshots/` (gitignored; CI uploads the folder — no per-scene paths are checked in) |
| Cross-webview delivery (`dock-opened` → snapshot → populated Dock; in-UI close without disturbing the tile) | `evidence: cross-webview-delivery` | Same suite: two pages in one context (`/` and `/?window=dock`) sharing `BroadcastChannel` |
| AA contrast (status, dock toggle, health text) | `evidence: aa-contrast` | Same suite: computed-style contrast ≥ WCAG AA floor |
| Dock surfaces (Armory → Character → Stage tabs on one row; each surface populated; Character **Build** then **Stats** at **800×480** with recovered **Variant C** board — Character header owns Level/Talent Points; simultaneous Loadout + Talent columns on **Build** with four-visible/ten-reachable **Available skills** tray and compact attached Talent steppers; full left Character rail; no outer Character scroll) | `evidence: dock-surfaces` | Same suite; orchestrator reviews harness-emitted `e2e-screenshots/` after `npm run test:evidence` (top-level `04-dock-*` plus Character **Build** / **Stats** review scenes at 800×480) |
| Dock navigation ownership (shared left Character rail on Armory + Character; Stage computed `display:none` / zero width / inert; no compact Armory selector; fresh Dock opens on Armory) | `evidence: dock-navigation-ownership` | Same suite: computed-style and bounding-box assertions (not `HTMLElement.hidden` alone) |
| Character Stats breakdown (**Build** → **Stats** navigation; Vitals / Offense / Defense groups; **canonical five** totals with Base / Equipment / Talent source rows; **XP-only** Stats body without repeating Level or Talent Points; pending marker fit; no fake focus targets; no invented crit/speed/utility/threat/cooldown telemetry) | `evidence: character-stats-breakdown` | Same suite |
| Character Loadout assignment (**Basic Attack** → Slots **I–III** → **Available skills** natural focus order; four-icon horizontal **Available skills** strip with **10-choice** stress — **four visible**, **ten reachable**; icon-only strip tiles with heading name disclosure; unslotted-only pool; three compact slots without outer-panel scroll; displacement; slot swap; drag and select-then-slot parity) | `evidence: character-loadout-assignment` | `e2e/scenarios/character-loadout.spec.ts` via `npm run test:evidence` on the evidence-only **character-loadout-evidence** fixture (also retains `evidence: character-loadout-no-scroll` on the shared fit scene; orchestrator reviews harness-emitted **Build** / **Stats** review scenes at 800×480) |
| Character information popovers (Ability + Talent hover ≡ focus text with keyboard access to the same mechanical detail; Dock-bounded right/left placement; non-interactive; clears when anchor loses hover/focus; coordinate and side stability across live pump deliveries) | `evidence: character-information-popovers` | Same suite |
| Talent direct actions (attached **−** \| rank/max \| **+** stepper on Stat Talent rows; tile face → **−** → **+** keyboard order; direct one-rank actions; chosen/rank/gate states; atomic Ability Talent replace; inner `talent-tree-scroll` retained) | `evidence: talent-direct-actions` | Same suite (also retains `evidence: character-talents-tree-scroll` on the shared tree scene) |
| Five-opponent presentation concurrency (Stage 3 stress wave) | `evidence: five-actor-pools` | `e2e/stress.spec.ts` via `npm run test:evidence` |
| Reduced-motion accessibility floor (actor pool visible; lunge/recoil offsets disabled) | `evidence: reduced-motion` | `e2e/reduced-motion.spec.ts` via `npm run test:evidence` |
| Equipment icon content tier (Armory grid tiles) | `evidence: equipment-icon-content-tier` | `e2e/scenarios/armory.spec.ts` via `npm run test:evidence` (DOM geometry assertions in the shared equipment-icon scenario) |
| Equipment icon chrome tier (no chrome consumer remains after Armory strip deletion; Armory worn strip content-tier icons carry the slug with an explicit tier change note) | `evidence: equipment-icon-chrome-legibility` | Same scenario in `e2e/scenarios/armory.spec.ts`; committed review artifact at `docs/research/evidence/124-equipment-icon-consumers/armory-worn-strip.png` |
| Talent icon content tier (Talent Tree grid cells) | `evidence: talent-icon-content-tier` | `src/ui/talents-surface.test.ts` (happy-dom icon `img` + overlay assertions); committed review artifact at `docs/research/evidence/305-talent-icon-consumers/talents-grid-knight.png` |
| Ability (Loadout) icon class (34×34 runtime, 32×32 logical source, transparent alpha, source-local colours — not `moonberry-16` / `fowl-harvest-24`) | `docs/icon-contract.md` → **Ability icons**; `docs/agents/asset-generation.md` contract pointers | Asset acquisition and `npm run assets:verify` when Ability icon families land; UI rows cite `evidence: character-loadout-assignment` for strip/slot geometry |
| Native-1× scaling (intrinsic ≡ rendered, excluding deliberate knockout transforms) | `evidence: native-1x-scaling` | Browser assertion in the suite **or** a pure test of `SPRITE_SOURCES` / PNG IHDR vs `.combatant-sprite` — either is sufficient; happy-dom alone is not |
| Knockout readability (non-colour signal readable in the crowded tile) | `evidence: knockout-readability` | Scenario-keyed review artifact only — committed at `docs/research/evidence/knockout-readability/tile-combat.png` (emitted by the harness; judged in the terminal scene review). Harness CSS non-colour signals may support the claim but must not carry this slug and do not retire the judgement |
| Dock window port (open/close/toggle sequencing, reposition math, dock `setPosition`; tile `setPosition` only when `dockRect` clamp-snap changes `tileX`) | `manual-check: dock-position-only`, `manual-check: dock-pump-continuity`, `manual-check: dock-no-tile-resize`, `manual-check: dock-shell-port-wiring` | Vitest over injected `DockWindowPort` deps — proves call sequencing, center/clamp geometry, and conditional tile snap wiring, **not** native window chrome |
| Native dock lifecycle / OS close / positioning / child-window attachment | checklist items in `docs/agents/native-observation.md` | Manual `npm run tauri dev` when `src-tauri/**`, `app.windows`, capabilities, or Dock child-window attachment (`parent: "tile"` in `src/ui/dock-window.ts`) change |
| Presentation effect images (Ability frames and Status Effect glyphs load under Vite) | `evidence: effect-image-loading` | `e2e/scenarios/tile.spec.ts` via `npm run test:evidence`: visible `img.effect-frame` and `img.status-icon` with `complete` and non-zero natural dimensions; no page errors |
| Native effect-image loading (packaged Tauri webview) | `Native effect-image loading` in `docs/agents/native-observation.md` | Manual `npm run tauri dev` when packaged presentation-effect URL resolution changes (`src/ui/effect-images.ts` or its wiring); committed observation under `docs/research/evidence/native-effect-images/` |

## Retired worked examples (Tier-3)

These named checks were falsified by the Character workspace wave (#478–#482) and the
successor **Build** / **Stats** harness from #516. They are **retired**, not rewritten
to today's DOM. Cite the successor slug when a live row needs the same intent.

| Retired intent | Do not cite | Successor |
| --- | --- | --- |
| Inline Ability mechanical text on Loadout tiles | Any harness row that required persistent `.ability-description` inside pool/slot tiles | `evidence: character-information-popovers` |
| Sticky Talent detail panel owning description and allocate/deallocate (`aside.talent-detail` / `[data-talent-detail]`) | Contrast or keyboard samples targeting `.talent-detail` action chrome | `evidence: talent-direct-actions`, `evidence: character-information-popovers` |
| Compact Armory Character selector chips (`[data-armory-character-selector]` / `.armory-character-selector`) | Dock or Armory evidence that required a second Character chip row on Armory | `evidence: dock-navigation-ownership` |
| Three separate Character sub-tabs **Loadout** / **Talents** / **Stats** | Worked examples or harness journeys that cycle Loadout → Talents → Stats as distinct Character sub-tabs (instead of **Build** with simultaneous columns, then **Stats**) | `evidence: dock-surfaces`, `evidence: character-stats-breakdown` |
| Full unlocked Ability pool duplicating slotted Abilities | Rows requiring a complete unlocked pool that still lists Abilities currently in Loadout slots (instead of unslotted-only **Available skills**) | `evidence: character-loadout-assignment`, `evidence: character-loadout-no-scroll` |
| Large detached Talent **+** / **−** action blocks below rows | Layout or contrast samples targeting standalone action blocks separate from the attached rank stepper beside each Stat Talent row | `evidence: talent-direct-actions`, `evidence: character-talents-tree-scroll` |
| Loadout focus order **Basic Attack → Available skills → slots 1–3** | Harness or contract rows requiring pool-before-slots tab order | `evidence: character-loadout-assignment` (Variant C: **Basic Attack → Slots I–III → Available skills**) |

## Three dispositions

Every live acceptance row gets exactly one disposition. An unnamed case is how
a stale or unsupported row gets silently ticked.

1. **Unsupportable row** — stop; do not open a completion PR. Report the issue
   as incomplete.
2. **Native check the agent cannot run** (`src-tauri/**`, `app.windows`,
   capabilities, or Dock child-window attachment in `src/ui/dock-window.ts`) —
   open the PR, state the missing native evidence explicitly,
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
