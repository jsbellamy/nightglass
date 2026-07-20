# Code style and test seams

How Nightglass code is structured and where its tests go. When the `/tdd`
skill asks which seams to test, this document is the standing answer — no
per-session seam negotiation is needed unless the work falls outside it.
Authority for the architecture itself is `docs/vertical-slice-spec.md` §9; this
doc translates it into testing practice.

## Layout

- `src/core/` — the headless Simulation Engine: pure TypeScript, no DOM,
  Tauri, timers, audio, or asset imports. Time and RNG are injected.
- `src/data/` — content data (Class Kits, Stages, Equipment) plus the
  aggregate content validator. Content modules import shared types only, never
  Engine internals; adding content must not require Engine changes.
- `src/ui/` — DOM renderers driven by Snapshots and Presentation Events. The
  presentation layer owns the mapping from events to sprites, effects, and
  audio; events never carry asset names.
- `pipeline/` — the Python asset acquisition pipeline (see
  `docs/agents/asset-generation.md`).

## Seams

Test at these public boundaries, nowhere internal:

- **Engine seam** — `createEngine(content, saved?, lootSeed?)` → commands →
  `advanceBy(ms)` (returning ordered Presentation Events) → `snapshot()`.
  Drive it with fixture Content and a seeded loot stream; pump time
  synchronously. **Chunk neutrality is itself a seam property**: where timing
  behavior is in scope, assert that many small `advanceBy` calls and one large
  call produce identical event batches and Snapshots.
- **Pure functions** — math with an independent worked example (mitigation,
  Power, XP thresholds, Dock window geometry) gets direct unit tests. Expected
  values come from the spec's worked numbers, never recomputed with the code's
  own formula.
- **Content validator** — data correctness is asserted in aggregate over the
  whole `Content` object (encounter budgets, id references resolving, registry
  completeness against content), not per-module.
- **Save seam** — tolerant recovery is tested through boot: schema mismatch
  keeps durable progression, discards the in-flight Attempt, and starts a
  fresh Wave 1 Attempt; unreadable saves reset without crashing.
- **UI seam** — DOM integration tests (Vitest + happy-dom) mount a renderer,
  feed it Snapshots and recorded Presentation Events, and assert on the DOM.
  The rendered-evidence harness (`npm run test:evidence`, under `e2e/`) owns
  the accessibility floor (keyboard, contrast) and other browser-seam
  criteria named in `docs/agents/acceptance-evidence.md`; ordinary UI slices
  do not duplicate it.

## Style rules

- Strict TypeScript; `npm run typecheck` green before publishing.
- Invalid Engine commands throw — never silently no-op.
- The Presentation Event vocabulary is append-only: add event types, never
  rename or repurpose one, so recorded fixtures and the presentation mapping
  stay valid.
- The Snapshot is versioned and serializable; everything transient (DOM,
  animation, audio, timers, consumed events) stays out of it.
- Combat is deterministic — no RNG in combat resolution. The persisted loot
  stream is the only randomness; tests assert exact damage numbers and
  timestamps, not ranges.
- Test names read as behavior specifications in `CONTEXT.md` vocabulary
  ("Knockout at zero health emits `knockout` and starts recovery"), not
  implementation descriptions. Registered `evidence:` / `manual-check:`
  citation slugs from `docs/agents/acceptance-evidence.md` may prefix a
  title; the remainder of the name stays a behavior specification.
- Every abstraction, parameter, and hook is needed by the implementing issue's
  acceptance criteria (promoted from the Speculative Generality smell —
  a hard standard here, not a judgement call, because wave issues are precise
  enough to check against). An **interim** named by the issue body is the
  sanctioned form of building ahead; anything else built for an imagined
  future need is a violation.
- A validator emits a machine-readable report alongside its human-readable
  output, on both the pass and fail paths. An agent reads gate results from the
  report; the printed lines are for people. A print-only validator forces every
  later reader to re-run the script or open the artifact it was measuring.
