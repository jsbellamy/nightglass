# Define the Automatic Combat rules

Type: grilling
Status: resolved
Blocked by: none

## Question

What timing, movement, targeting, resource, cooldown, priority, damage, healing, buff, Knockout, revival, Wave-transition, and opponent-AI rules make Automatic Combat deterministic, legible, and strategically shaped by Formation and Ability Loadouts?

## Answer

### Action timing and priority

Automatic Combat uses continuous time and independent Action Cycles rather than turns or a Party-wide global cooldown. When free to act, a combatant chooses an action and proceeds through Wind-up, Impact, and Recovery. An Ability's cooldown begins at Impact. After Recovery, the combatant chooses again. Taking damage does not interrupt an action.

Each Character has an ordered three-slot Ability Loadout. Duplicate Abilities are forbidden. At the beginning of an Action Cycle, the Character evaluates its slots from first to third and chooses the first Ability that is off cooldown and has a valid target. Empty and invalid slots are skipped. If none qualify, the Character uses a free basic attack. Ability definitions own their fixed targeting conditions; the slice has no player-authored thresholds or combat scripting.

Combat has no Mana, stamina, energy, ammunition, or other spendable resource. Every non-basic Ability has a positive authored cooldown. An instant Ability has zero Wind-up, not zero cooldown.

Wind-up and Recovery durations are fixed when an action is chosen. Cooldown duration is fixed when Impact occurs. Later timing modifiers affect only newly scheduled phases and never reschedule an action or cooldown already in progress. Damage, Healing, and target validity use current combat state at Impact rather than a Wind-up snapshot.

### Configuration changes during combat

Party membership and Equipment are fixed for a complete Stage Attempt; edits apply to the next Attempt. Formation, Talent, and Ability Loadout edits made during a Wave are queued and apply when the next Wave or Boss begins. Talent Points are reallocated manually one point at a time, with prerequisite dependencies enforced. Removing an Ability Talent makes its Ability unavailable and removes it from its loadout slot at that boundary.

Cooldown state belongs to the Character and Ability, not a loadout slot. Removing an Ability never pauses or resets its cooldown. Reordering an Ability that remains equipped has no penalty. An Ability newly inserted at a Wave boundary—including one made available by a Talent edit—receives an Activation Delay: its next ready time is the later of its existing cooldown-ready time or the insertion time plus its full authored cooldown. This is the only respec or loadout-switching penalty. Abilities configured at the start of a fresh Stage Attempt begin ready.

Failure Policy changes apply at the next Party Defeat. Manual Stage selection explicitly abandons the current Stage Attempt and begins a fresh one.

### Movement and targeting

Combat uses logical order, never live sprite coordinates, for targeting. Party proximity is Front, then Middle, then Back. Opponents have a stable authored nearest-to-farthest order. Basic attacks and hostile Abilities without an explicit exception target the closest living opponent. Ordinary opponents' single-target hostile actions always target the closest living Party Member. Attack lunges, projectiles, knock reactions, and returns to position are visual presentation only and never alter logical order.

An Ability selects its target when Wind-up begins and revalidates that target at Impact. If the original target is invalid, the Ability retargets once using its same targeting rule. If no replacement is valid, it has no effect but still begins its cooldown. Healing targets the living Party Member with the lowest health percentage; ties resolve Front, Middle, then Back. Revival targets Knocked Out Party Members using the same Formation tie-break. Opponent ties use their stable nearest-to-farthest order. Individual Abilities may explicitly target self, all allies, all opponents, or another deterministic set.

### Deterministic resolution

The slice has no misses, random damage variance, critical hits, dodges, random procs, or random target selection. Identical initial state and configuration produce identical results.

Physical Damage is reduced by Armor. Elemental Damage carries an Element identity but, in the slice, every Element is reduced by the same Elemental Resistance value. A damaging action declares its channel and a fixed raw amount derived from its Class-kit values. Final damage is:

`max(1, floor(raw × 100 / (100 + mitigation)))`

Healing uses a fixed amount, ignores Armor and Elemental Resistance, cannot raise health above its maximum, and creates no shield from excess Healing.

Same-timestamp events resolve as a batch. Status Effects ending at that timestamp expire first. All due Impacts and periodic ticks then read the same pre-resolution state; their damage, Healing, Status Effects, and revivals are applied together. Knockouts and Party Defeat are evaluated after the batch. An action that reaches Impact still resolves if its actor is Knocked Out by another effect in that batch. Newly free combatants choose actions only after the batch completes.

### Status Effects and control

A Status Effect has a fixed duration beginning at Impact. Reapplying the same named effect refreshes its duration without stacking its magnitude; differently named effects coexist. Flat modifiers combine first, then percentage modifiers add together and apply once. Effects refer to current statistics rather than snapshotting values at application. Periodic effects tick at fixed declared intervals and receive no partial final tick.

Stun is the slice's only control effect. It cancels an unfinished Wind-up and prevents new actions for its duration. Recovery, cooldowns, and other Status Effects continue elapsing during Stun. Reapplication refreshes rather than stacks it. Bosses are Stun-immune. Slows, silence, roots, knockback, and threat manipulation are outside the slice.

### Knockout and revival

Reaching zero health immediately causes Knockout and cancels an unfinished Wind-up. Because the canceled action never reaches Impact, its cooldown does not begin. Existing cooldowns and timed effects continue elapsing while the Character is Knocked Out.

A Revival Ability declares the health it restores. A revived Character becomes available after a fixed one-second Recovery. Revival may occur repeatedly when an appropriate Ability is available. Knockouts persist between Waves. Party Defeat occurs immediately after a resolution batch leaves all three Party Members Knocked Out; unresolved future actions and effects are canceled.

### Waves, Stages, and failure

Defeating the final opponent starts a fixed two-second Wave transition. No new Action Cycles begin during it, but existing Wind-ups and Recoveries finish, and cooldowns, Status Effects, and periodic ticks continue. There is no automatic Healing or revival. Health and Knockouts persist. Queued Formation and Ability Loadout edits apply before the next opponents enter in authored nearest-to-farthest order.

Defeating a Boss clears the Stage Attempt. The automatically chosen next Stage Attempt begins fully restored. Every fresh Stage Attempt fully restores health, clears Knockouts and Status Effects, and resets all cooldowns.

After Party Defeat, the Battlefield holds for a two-second defeat presentation. Retry begins the same Stage at Wave 1. Retreat begins the immediately preceding unlocked Stage at Wave 1 and cannot go below Stage 1; subsequent failures continue stepping down. Earned Character XP and Drops are never rolled back. Clearing a retreated Stage resumes normal forward advancement.

### Opponent AI

Opponents use the same independent Action Cycle and first-valid priority model, with authored ordered Ability lists and a basic-attack fallback. Ordinary opponents never bypass the closest living Party Member with a single-target hostile action and have no threat table or aggro randomness. A Boss Ability may target multiple Formation positions or use another explicit deterministic rule, but every exception must be visibly telegraphed. When the closest combatant is defeated, the next living combatant in logical order immediately becomes closest.
