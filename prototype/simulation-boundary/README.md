# Simulation boundary prototype

**Question:** What is the smallest headless state model that can drive deterministic
Automatic Combat, emit asset-agnostic Presentation Events, survive save/reload,
accelerate without changing the result, and turn Offline Progress into persistent
rewards followed by a fresh visible Stage Attempt?

This is a throwaway logic prototype, not production game code. Its combat values and
opponents are deliberately tiny. The useful part is the boundary between commands,
the versioned Snapshot, and Presentation Events.

Run it from the project root:

```sh
node prototype/simulation-boundary/tui.mjs
```

The most useful path is:

1. Press `t` a few times to see live Wind-up and Impact events.
2. Press `f` to advance the exact same Engine by ten seconds at once.
3. Press `v` to compare fine stepping, one accelerated step, and save/reload.
4. Press `o` to apply 60 seconds of Offline Progress and inspect the fresh Attempt.

The prototype uses one deterministic combat path. A persisted seeded RNG is touched
only when a Drop is awarded, keeping future randomized rewards reproducible without
making combat random.
