# Verdict

Accepted after hands-on review.

The validated boundary is:

- one caller-pumped `advanceBy` path for live and accelerated time;
- a versioned Snapshot containing persistent progression plus the in-flight Attempt;
- timestamped, asset-agnostic Presentation Events returned by commands;
- persisted reward RNG kept separate from deterministic combat;
- Offline Progress committing progression, discarding its transient fight, and starting
  a fresh visible Stage Attempt.

The terminal shell, placeholder combat values, and simplified opponents remain
throwaway. Preserve the boundary and demonstrated invariants when implementing the
production Simulation Engine.
