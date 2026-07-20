# ADR-0003: Interpolated presentation clock

**Status:** Accepted  
**Date:** 2026-07-19

## Context

The Engine advances on a fixed **250 ms** sim tick (`PUMP_INTERVAL_MS` in
`src/ui/pump.ts`). The Battle Tile render pump targets ~30 fps between ticks.
Presentation animation (`lungeOffset`, `hurtOffset`, effect timing in
`src/ui/presentation.ts`) samples time on every render frame.

Before this decision, `BattleTile.render` passed `snapshot.simNowMs` into
`presentation.render`. Sim time only moves at tick boundaries, so every frame
within a 250 ms window saw the same `tMs`. Motion therefore updated at sim
cadence (~4 Hz) while pixels updated at display cadence (~30 Hz), which reads as
uneven frame rate.

ADR-0001 keeps the Engine caller-pumped and chunk-size-neutral; smoothing must
not change sim ticks or Snapshot contents (`docs/agents/code-style.md`:
transient presentation state stays out of the Snapshot).

## Decision

Use **two clocks**:

1. **Sim clock** — `snapshot.simNowMs`, advanced only when the Engine pumps.
2. **Presentation clock** — an interpolated wall-clock value passed as `nowMs`
   into `BattleTile.render` and forwarded to `presentation.render`.

`mountTileShell` in `src/main.ts` caches the last tick Snapshot and the wall
time it was taken (`lastSnapshot`, `lastSnapshotAtMs`). On each render frame:

```ts
const elapsed = Math.max(0, clockNow() - lastSnapshotAtMs);
presentationNowMs = floor(lastSnapshot.simNowMs + min(elapsed, PUMP_INTERVAL_MS));
```

**One-tick clamp:** never extrapolate more than `PUMP_INTERVAL_MS` ahead of the
cached `simNowMs`. If a tick is late (GC, throttling, slow `advanceBy`),
unclamped interpolation would run ahead of the sim and **rewind** when the tick
lands. Holding at `simNowMs + PUMP_INTERVAL_MS` until the sim catches up is
preferred to visible backward motion.

**No rewind:** across a normal tick sequence, when a tick lands `simNowMs`
advances by at least one tick while `elapsed` resets near zero, so the
presentation clock is monotonic.

**Integer milliseconds:** the result is `Math.floor`’d so animation math stays
aligned with `docs/animation-contract.md` (integer-pixel, integer-millisecond).

`BattleTile.render(snapshot, nowMs?)` defaults `nowMs` to `snapshot.simNowMs`
when omitted. Event-driven `applyEvents` renders still use sim time directly.

Issue **#199** (audio release timing) will hang off this same presentation-clock
seam.

## Consequences

- Smooth combat motion without changing Engine tick size or Snapshot shape.
- Tests can drive the clock via injectable `now` and pump schedule fakes in
  `src/main.test.ts`.
- Any new per-frame presentation work should take `nowMs` from the tile render
  path, not `snapshot.simNowMs`, unless it intentionally tracks sim boundaries
  only.
