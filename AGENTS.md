# Agent guide

This is the source of truth for every agent working on Nightglass, regardless
of which tool or model is driving. Tool-specific files (for example
`CLAUDE.md`) layer on top of this document; put changes to shared guidance
here or in the docs it routes to, not in a tool-specific file.

## Agent skills

### Issue tracker

Issues are tracked as GitHub issues on `jsbellamy/nightglass`. See
`docs/agents/issue-tracker.md`.

### Triage labels

The standard `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, and `wontfix` vocabulary is used. See
`docs/agents/triage-labels.md`.

### Domain docs

This is a single-context project with `CONTEXT.md` at the root and architectural
decisions under `docs/adr/`. See `docs/agents/domain.md`.

### Reading discipline

Read the report, not the render.

Nearly everything an agent needs to judge is already recorded as text: a
validator report, a manifest, a sidecar, an evidence table, a doc index. The
text costs a fraction of the artifact it describes, and an image or a large
document read early in a task is re-read on every later request of that task —
in an agentic loop a "request" is a tool-call round trip, not a user prompt, so
a long task pays that cost dozens of times over.

Open the artifact itself when judgement genuinely requires seeing it — a
native-scale visual review, a rendering question no measurement answers. Open
one composite rather than a directory, and open it late. Where a runtime
supports subagents, run that review in one: it opens the artifact, answers the
question, and returns text, so the artifact never enters the main task's
context.

Applications of this rule live with the work they govern:
`docs/agents/asset-generation.md` (the acquisition loop),
`docs/research/archive/README.md` (settled research).

### Research archive

`docs/research/archive/` holds settled investigations: fit studies, audits, and
option comparisons whose conclusions already live in the contracts under `docs/`.
Read `docs/research/archive/README.md` to decide whether an entry is worth
opening; open the entry itself only to answer a question about *why* a settled
decision went the way it did.

Implementation work never needs the archive. If an issue cannot be completed
without reading an archived audit, the finding it depends on belongs in the
owning contract — file that gap rather than routing future agents through the
archive.

`docs/research/evidence/` is not archive. It is live acceptance evidence, cited
by the contracts and by `docs/agents/acceptance-evidence.md`.

### Code style and test seams

`docs/agents/code-style.md` is this repo's documented coding standard: the
layout and style rules for `src/core` / `src/data` / `src/ui`, and the
standing seam agreement for the `/tdd` (red-green) workflow. Engine changes
are test-first at its seams, and code review judges every diff against its
rules — a breach is a documented-standard violation, not a judgement call.

### Asset generation

Before creating or changing any raster asset, follow the acquisition loop in
`docs/agents/asset-generation.md`. It routes each asset class to its authoritative
contract and defines the evidence required before an asset task is complete.

Battlefield body facing is fixed by combatant role, not chosen per asset:
**Party Characters face RIGHT; Opponents (ordinary monsters and Bosses) face
LEFT.** Prompts, evidence, and visual review must all agree with that rule.

For an ordinary asset task, run only the asset class's targeted acquisition,
build, and promotion checks locally. Never run the repository-wide
`npm run assets:verify` inside a candidate generation or retry loop. Push the
completed asset batch and treat the CI `assets` job as the authoritative
full-catalog verification. Run `assets:verify` locally only when changing the
pipeline, an acquisition contract, the palette, a manifest schema, or shared
derivation logic that can affect existing assets.

### Acceptance evidence

Criterion-by-criterion publication gate: which seam proves a rendered,
cross-window, or native criterion, the three dispositions for unsupported
rows, and the orchestrator's independent browser-scene step. See
`docs/agents/acceptance-evidence.md`.

### Native observation

Browser rendered-evidence (`npm run test:evidence`) covers layout, contrast,
keyboard, and cross-page bus delivery under `vite preview`. The residual that
must be observed in `npm run tauri dev` is listed in
`docs/agents/native-observation.md` (window lifecycle and close semantics only).

**Fast evidence-test iteration.** While fixing a failure, target the run instead
of paying the full suite on every edit. Playwright supports:

```bash
npx playwright test --last-failed          # re-run only what failed
npx playwright test e2e/stress.spec.ts     # one spec file
npx playwright test -g "test name"         # one test by name
npx playwright test --only-changed         # specs touched in the working tree
```

The full `npm run test:evidence` suite still gates every PR — use the commands
above to reach green faster, not to skip the gate.

`playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so a preview
server already listening on port 4173 is reused and later runs skip build and
boot. Rebuild (`npm run build` or restart preview) only after changing `src/`.

While iterating, call `npx playwright test` directly. `test:evidence` prefixes
`playwright install chromium`, which re-checks the browser download every
invocation (~0.6 s when cached). Reserve the npm script for the final full run.

Measured setup costs on this repo: `npm run build` ~1.6 s; cached
`playwright install chromium` ~0.6 s; the full evidence suite ~90 s. The suite is
slow because tests wait on real-time simulation, not because of build overhead —
running fewer tests matters more than shaving setup.

## Git workflow

One branch per issue (`issue-<N>-<slug>`, based on `main`); never work
directly on `main`. Finish with a pull request that includes `Closes #<N>` and
an acceptance matrix: every issue checkbox as an evidence row citing evidence
at the seam named by `docs/agents/acceptance-evidence.md`.

## Delegating work

These instructions are model-neutral: do not require a particular provider,
model, or effort setting to delegate work. A reusable issue-implementation
subagent is defined in `.agents/issue-implementer.md`; tool-specific runtimes
may provide their own pinned variant (for example
`.claude/agents/issue-implementer.md`) — prefer the variant native to the
runtime you are in. The orchestrator independently owns the acceptance gate in
`docs/agents/acceptance-evidence.md` — green CI and a scope-matching file list
are necessary but never sufficient.
