# Prototype the simulation boundary

Type: prototype
Status: resolved
Blocked by: 06, 09

## Question

What smallest headless simulation model proves deterministic Automatic Combat, live animation-event projection, accelerated Offline Progress, saveable Stage progression, and clean restart into a fresh visible Stage Attempt?

## Answer

Accepted the boundary demonstrated by the [simulation boundary prototype](../../../prototype/simulation-boundary/README.md) after hands-on review. Its durable verdict is recorded in the prototype's [notes](../../../prototype/simulation-boundary/NOTES.md).

The vertical slice should use a headless, caller-pumped Simulation Engine with one advancement operation for both live and accelerated time. The caller supplies an elapsed duration; the Engine advances between exact scheduled boundaries such as Impact, Recovery completion, and Wave transition. Advancement chunk size is not game state: many small live calls and one large accelerated call must resolve the same timestamp batches in the same order.

The Simulation Engine boundary consists of:

- commands that mutate owned game state, including elapsed-time advancement and player configuration changes;
- a versioned, serializable Snapshot containing persistent progression and the complete in-flight Stage Attempt;
- ordered, timestamped Presentation Events returned from commands for transient audiovisual projection.

The Snapshot owns the simulation clock, persisted reward-RNG state, next stable sequence identifiers, Stage progression, Character progression and rewards, and every fact required to resume the current Stage Attempt: Stage, Wave, phase, Party and opponent health/Knockouts, scheduled Action Cycle phases, and cooldown-ready times. It excludes DOM state, animation frames, audio state, timers, window state, and already-consumed Presentation Events. Persisting the next Presentation Event sequence lets a reloaded caller continue deduplicating events without saving the event stream itself.

Presentation Events describe domain facts such as `action-started`, `impact`, `knockout`, `wave-started`, `stage-cleared`, `drop-awarded`, and `stage-attempt-started`. They carry stable entity identifiers, simulation timestamps, and outcome values, but never sprite names, effect names, DOM elements, audio cues, or renderer instructions. The presentation layer maps those facts to Character animation, Ability effects, sound, and interface feedback.

Save/reload is Snapshot encode and restore at this boundary. Restoring preserves in-flight Action Cycle timing, cooldowns, the deterministic reward stream, progression, and the next event sequence. Combat contains no RNG; the persisted seeded reward RNG advances only when randomized rewards are awarded, so future Drops remain reproducible without coupling combat to loot rolls.

Offline Progress invokes the same accelerated advancement path up to the configured cap, computes a summary from durable progression deltas, and commits those deltas. It does not expose or resume the transient Stage Attempt produced while accelerating. After emitting the Offline Progress summary, the Engine discards that transient battle and begins a fully restored, Wave 1 Stage Attempt at the resulting selected Stage, with cleared cooldowns and Status Effects. That new Attempt supplies the first visible combat after return.

The prototype's built-in 30-second equivalence proof produced byte-equivalent Snapshots and 198 identical Presentation Events across fine live stepping, one accelerated call, and advancement split around JSON save/reload. Its Offline Progress path also demonstrated committed clears, Character XP, Drops, and reward-RNG state followed by a fresh visible Stage Attempt.

The prototype terminal shell, placeholder combat numbers, and simplified opponents are throwaway. Production work should port the accepted boundary and invariants into TypeScript, then implement the already-defined Automatic Combat, Class Kit, progression, and Equipment rules behind it.
