# ADR-0001: Single Engine seam

**Status:** Accepted  
**Date:** 2026-07-19

## Context

Nightglass simulation behavior must be testable without DOM, Tauri, or real time.
`docs/agents/code-style.md` defines one **Engine seam**:
`createEngine(content, saved?, lootSeed?)` → commands → `advanceBy(ms)` (ordered
Presentation Events) → `snapshot()`, driven with fixture Content and a seeded loot
stream. Chunk neutrality is part of that contract: many small `advanceBy` calls
and one large call must yield identical event batches and Snapshots where timing
matters.

The implementation lives almost entirely in `src/core/engine.ts` (~1,346 lines).
The public surface is intentionally small: the `Engine` interface (from line 71),
`createEngine`, and `SCHEMA_VERSION`. Reviews sometimes suggest splitting the file
into per-subsystem modules.

## Decision

Keep one deep Engine module behind that single seam. Do not split `engine.ts` into
orchestrated sub-engines: the interface-to-implementation ratio is already the
healthiest boundary in the repo, and fragmentation would widen what callers must
know without hiding the real ordering and state coupling inside `advanceBy`.

Internal logic stays reachable only through `advanceBy` and the command methods on
`Engine`. That is why `src/core/engine.test.ts` is large (~2,394 lines): broad
behavior is exercised through the public seam, and that test cost is accepted
deliberately.

The only sanctioned widening of the interface beyond commands and snapshots is
**legality predicates** — `canAllocateTalent`, `canDeallocateTalent`, and
`canEquip` — planned so the UI can enable controls without cloning Engine state
or treating thrown errors as control flow. Until those land, tests and UI continue
to use the command surface alone.

## Consequences

- New simulation rules belong inside `engine.ts` (or helpers it owns), not in UI
  callers.
- Refactors that only move code between files are low value unless they shrink the
  exported contract.
- Large `engine.test.ts` is expected; prefer extending the seam tests over reaching
  into private helpers.
- Legality predicates, when added, remain read-only queries; they must not mutate
  state or bypass `advanceBy`.
