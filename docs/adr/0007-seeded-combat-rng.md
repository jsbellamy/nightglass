# ADR-0007: Seeded combat RNG stream

**Status:** Accepted  
**Date:** 2026-07-24

## Context

Automatic Combat uses independent Action Cycles with fixed Wind-up, Recovery, and
cooldown durations. When every combatant shares the same period, Wave and Boss
boundaries can start six or seven Action Cycles on the same sim tick — measured
in playtests on identical Opponent kits that remain permanently phase-locked for
the rest of an Encounter. That synchronized burst is hard to read: impacts,
floating numbers, and cooldown pips stack into a single visual frame.

Combat therefore needs a small amount of controlled randomness to desynchronize
opening Action Cycles without abandoning deterministic replay. Critical Hits add
a second, equally bounded draw so damage variance stays seed-stable and testable.

## Decision

Add a second persisted RNG stream, `combatRngState`, beside the existing
`lootRngState`. The combat stream is drawn only for the **Initiative Roll** at
each Encounter boundary and for the **Critical Hit** roll on qualifying damage
results, in a fixed combatant/effect order.

Derive the combat stream's initial seed from the existing `lootSeed` argument
passed into engine creation rather than widening `createEngine` with another
constructor parameter. Loot sequences must stay reproducible when combat draws
change, and vice versa.

Record both stream states in the Snapshot so saves, reloads, and Offline
Progress continue byte-identical event sequences for a pinned seed.

## Consequences

- Loot and combat randomness are independently replayable: tuning or replaying
  combat does not perturb Drop rolls, and loot-only tests stay isolated.
- Chunk-neutrality (ADR-0001) now depends on the Initiative Roll acting as a
  scheduling boundary: advancing time in arbitrary chunks must not skip or
  reorder the one-time per-Encounter roll before a combatant's first Action
  Cycle of that Encounter.
- Tests pin a seed and assert exact damage numbers and timestamps, including
  Critical Hit outcomes and post-roll Action Cycle start times; ranges are not
  used.
- Implementation slices that touch combat resolution, Snapshot shape, or Battle
  Tile cooldown feedback cite this ADR and the amended contracts in
  `CONTEXT.md` and `docs/vertical-slice-spec.md`.
