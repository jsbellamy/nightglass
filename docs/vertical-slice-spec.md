# Nightglass — vertical-slice specification

**Status: build-ready.** This document assembles every decision resolved on the
[Chart the party idle vertical slice](https://github.com/jsbellamy/nightglass/issues/17)
wayfinder map into one specification for the vertical slice. It is the input to
implementation planning; the map's tickets hold the reasoning and evidence
behind each section and are linked throughout. Terminology follows
[`CONTEXT.md`](../CONTEXT.md), the canonical domain language.

The slice is a separate original-IP party idle desktop game: a Tauri/TypeScript
app for macOS and Windows in which the player composes a three-Character Party
from a four-Class Roster, watches a continuously visible Automatic Combat fight
inside a compact always-on-top Battle Tile, and progresses through three Stages
of Waves, Bosses, Character XP, Talents, and Equipment Drops — including capped
Offline Progress while the app is closed.

---

## 1. Scope boundaries

### In the slice

- Four Characters (Knight, Wizard, Priest, Hunter), Party of three, one Reserve
  earning 50% Character XP.
- Three Stages of two Waves plus a Boss; Character Levels 1–6; one six-point
  Talent Tier per Class; three Equipment Slots and two Equipment Tiers.
- Deterministic continuous-time Automatic Combat; per-Character three-slot
  Ability Loadouts; free manual point-by-point Talent respec.
- The fixed 480×112 Battle Tile plus the single 480×336 tabbed Management Dock.
- Snapshot save/reload, capped Offline Progress, the accessibility floor, the
  default-muted audio proof, and the performance budgets of §10.
- The Moonberry Guild visual language, the grid-recovery acquisition pipeline,
  and the frozen-pose, effect-led animation contract.

### Out of the slice (map-level exclusions)

- Any direct use of Ragnarok Online art, monsters, places, lore, branding, or
  other protected identity. (RO informs only bright fantasy tone, chibi
  proportions, and broad Class fantasies.)
- Literal embedding inside an operating-system taskbar; the slice uses an
  always-on-top edge-parked window.
- Equipment-driven changes to Character sprites; combat appearance is fixed.
- Multiplayer, online trading, a player marketplace, live services, or
  monetization systems.
- Full-game content quantity, progression beyond Level 6, Tier II Equipment's
  successors, and the intended six-Equipment-Slot expansion.

### Deferred by resolved decisions (per-section deferrals)

Prestige/meta-progression, combat RNG of any kind, resources/mana, control
effects beyond Stun, save migration chains, screen-reader support, per-Ability
audio, automated performance regression testing, and Equipment crafting,
selling, sets, or binding — each recorded with its owning section below.

### Accepted risk

The commercial terms of the external image provider (output ownership,
redistribution, attribution) were **deliberately not verified**; the dev
accepted the risk and closed
[the commercial-terms gate](https://github.com/jsbellamy/nightglass/issues/28)
unresolved. This spec records no conclusion about generated-asset rights.

---

## 2. Presentation shell — Battle Tile and Management Dock

Decisions: [Battlefield workspace](https://github.com/jsbellamy/nightglass/issues/1),
[management fan-out](https://github.com/jsbellamy/nightglass/issues/12).

### Battle Tile

- A fixed **480×112 logical-pixel**, always-on-top, edge-parked surface with
  translucent glass and minimal chrome; a horizontal side-on Battlefield, not a
  conventional app window. Park positions include bottom and top screen edges.
- A 24px status/control line leaves an ~86px-tall Battlefield. Party Members
  occupy the left third in Front/Middle/Back order facing right; opponents
  occupy the right third facing left; the open centre is the effect lane for
  projectiles, movement, and impacts.
- Sprite budgets: Party Member **32×48** screen pixels rendered at 1×; ordinary
  opponent roughly **28×40**. Runtime downscaling is prohibited; only integer
  display scale is allowed.
- **Five ordinary opponents** is the compact-layout stress case (readability
  gate, not a promise every Wave contains five).
- Nothing may resize, replace, or implicitly pause the Battle Tile. The fight
  is continuously visible and live.

### Management Dock

- A single **480×336 logical-pixel** tabbed panel exactly the tile's width,
  docked flush to the tile with an 8px gap, in the same glass language. It
  opens **above** a bottom-parked tile and **below** a top-parked one; because
  it never exceeds the tile's width, no other edge-clamping rules exist.
- One tab per management surface — **Party, Loadout, Talents, Armory, Stage** —
  with a capacity of **one surface at a time**; choosing another surface swaps
  the tab. A status-line button opens the dock; pressing the active surface's
  button again, or the dock's ✕, closes the whole dock.
- Opening, switching, or closing the dock never resizes, moves, or pauses the
  Battle Tile.

---

## 3. Visual language

Decision: [original-IP art direction](https://github.com/jsbellamy/nightglass/issues/3).

- The slice uses **Moonberry Guild**: storybook night-garden fantasy, plum
  contour lines, mint/berry/cream colour families, plump leaf and stitched
  silhouettes, orchard-like Stage backdrops, whimsical botanical opponents, and
  luminous petal/halo Ability effects.
- Sunsteel Caravan survives only as a readability gate: bold contours and warm
  contrast must hold at the native 32×48-at-1× scale. Skyglass Company's
  crystalline magitech language is rejected.
- Every art proof is judged inside the 480×112 Battle Tile against the
  five-opponent stress case.
- Character bodies use the 16-colour **`moonberry-16`** palette; Ability
  effects use the deliberately **disjoint `moonberry-glow`** ramp. The
  disjointness is load-bearing — it is what lets the acquisition validator
  reject effects baked into Character frames — and must be preserved as the
  effect set grows.

---

## 4. Asset pipeline

Decisions: [ComfyUI production fit](https://github.com/jsbellamy/nightglass/issues/22),
[grid-recovery re-cut](https://github.com/jsbellamy/nightglass/issues/29),
[body-motion route](https://github.com/jsbellamy/nightglass/issues/24),
[separate effects](https://github.com/jsbellamy/nightglass/issues/20).
Frozen contracts: [`docs/acquisition-contract.md`](acquisition-contract.md),
[`docs/animation-contract.md`](animation-contract.md).

### Acquisition (canonical detail in `acquisition-contract.md`)

- Shipped stills — canonical Character references and one still per Ability
  effect — come from an **external commercial image model** prompted to draw a
  logical pixel grid rendered large on a flat `#ff00ff` background, ingested by
  **logical-grid recovery** (SideScape's `detectPitch` comb fit plus
  `sampleCells` cell voting). **No resize or reduction fallback exists.**
- Provider PNGs are archived byte-for-byte in the **Archived Raw Bundle** with
  prompt-and-SHA-256 provenance sidecars. Builds consume the bundle offline; no
  provider, model, GPU, or network is present at build or runtime, and rebuilds
  must be byte-identical.
- Recovered frames are 32×48 RGBA, binary alpha via fixed-magenta chroma key,
  bottom-center foot-anchored, undithered-quantized to `moonberry-16`, and pass
  the validator (dimensions, alpha, palette, embedded effects, clipping against
  the raw, stable baseline, integer-ms manifest timings, provenance).
- **Local ComfyUI is reference-only.** Its output may inform look exploration
  but may not enter the raw bundle. Accepted proof assets so far: the 32×45
  right-facing Knight and 29×45 Wizard (hashes in the
  [#29 resolution](https://github.com/jsbellamy/nightglass/issues/29)).

### Animation (canonical detail in `animation-contract.md`)

- **No generated Character body motion.** All generated body-motion routes
  (AutoSprite preset, Wan2.2, Qwen pose edits, prompt-only img2img) were
  trialled and rejected for identity or coherence failure. Characters are
  frozen canonical poses; actions are communicated by separate Ability effects,
  deterministic presentation transforms, target reactions, timing, and audio.
- The layer model composites, bottom-up: **mark layer** (actor-pool glow, under
  the body), **body** (canonical frame plus `lunge`/`flash`/`downed`
  transforms), **effect layer** (own canvas, `moonberry-glow`).
- The **actor pool** — a soft glow at the acting Character's feet — is the
  attribution channel and is **required in both the motion and reduced-motion
  arms**; reduced motion subtracts only flavour, never information.
- Two anchor kinds suffice for all four Classes: `strike_target` (melee blows
  drawn where they land) and `lane_travel` (projectiles lerped caster→target).
  The Priest heal bakes its rise into a tall still revealed by `band(lo, hi)`.
  `strike_self` is unusable in a static Formation.
- Each effect is **one still plus deterministic offline derivation** (`sweep`,
  `scale`, `fade`, `spin`, `band`) — cross-frame generation is eliminated.
- A whole-sprite idle bob is structurally illegal (it translates the foot
  anchor). Idle micro-loops and the downed pose are **hand-authored or
  absent**; authored loops get per-Formation-slot phase offsets (0/533/1066 ms).
- The `lunge` rides on top at `out_px 3` with a **66ms hold** so full extension
  survives 30fps sampling; the hurt flash is damped to `0.6` — flash strength
  is attention budget spent against attribution.

### Asset ownership summary

| Asset class | Source | Status |
| --- | --- | --- |
| Canonical Character references (one pose per Class) | external image model via grid recovery | shipped |
| Ability effect stills (one per effect) | external image model via grid recovery | shipped |
| Derived effect frames, recolours, transforms | deterministic offline derivation | shipped |
| Idle micro-loops (optional), downed poses | hand-authored | shipped |
| Character body-motion clips | — | rejected |
| Anything from local ComfyUI | ComfyUI | reference-only |

---

## 5. Automatic Combat rules

Decision: [Automatic Combat rules](https://github.com/jsbellamy/nightglass/issues/6)
(its Answer is the canonical rule text; this section is normative summary).

- **Continuous time, independent Action Cycles.** A free combatant chooses an
  action, proceeds through Wind-up → Impact → Recovery, then chooses again.
  Cooldown begins at Impact. Damage does not interrupt actions. No turns, no
  global cooldown, no spendable resources — every non-basic Ability has a
  positive authored cooldown.
- **First-valid slot priority.** Each Character evaluates its ordered
  three-slot Ability Loadout and uses the first Ability off cooldown with a
  valid target, else the free basic attack. Duplicates forbidden; no
  player-authored thresholds or scripting.
- **Deterministic resolution.** No misses, variance, crits, dodges, procs, or
  random targeting. Physical Damage is reduced by Armor, Elemental Damage by
  the single shared Elemental Resistance:
  `max(1, floor(raw × 100 / (100 + mitigation)))`. Healing ignores mitigation
  and cannot overheal. Same-timestamp events resolve as a batch (expiries
  first; all Impacts/ticks read the same pre-resolution state; Knockouts and
  Party Defeat evaluated after).
- **Logical targeting, never sprite coordinates.** Party proximity is Front →
  Middle → Back; opponents have a stable authored nearest-to-farthest order.
  Hostile single-target actions hit the closest living target; Healing targets
  lowest health percentage (ties Front → Middle → Back); revival uses the same
  tie-break. Targets are chosen at Wind-up, revalidated at Impact, retargeted
  once, and a failed Ability still starts its cooldown.
- **Status Effects.** Fixed durations from Impact; reapplication refreshes
  rather than stacks; flat modifiers combine before summed percentage
  modifiers; periodic ticks at declared intervals with no partial final tick.
  **Stun** is the only control effect (cancels Wind-up, blocks new actions;
  Recovery/cooldowns/effects keep elapsing; Bosses are Stun-immune).
- **Knockout and revival.** Zero health causes immediate Knockout, cancelling
  an unfinished Wind-up (no cooldown starts). Cooldowns and effects keep
  elapsing while down. Revival restores declared health with a fixed 1s
  Recovery. Knockouts persist between Waves. Party Defeat occurs when a batch
  leaves all three Party Members Knocked Out.
- **Edit boundaries.** Party membership and Equipment are fixed per Stage
  Attempt. Formation, Talent, and Loadout edits queue and apply at the next
  Wave/Boss boundary. Cooldown state belongs to the Character+Ability; a newly
  inserted Ability gets an **Activation Delay** of its full cooldown — the only
  switching penalty.
- **Waves and failure.** Wave transitions take a fixed 2s (no new Action
  Cycles; everything else keeps elapsing; no free Healing). A fresh Stage
  Attempt fully restores health, Knockouts, effects, and cooldowns. After
  Party Defeat and a 2s defeat hold, the Failure Policy applies: **Retry**
  restarts the Stage; **Retreat** steps down one Stage (floor: Stage 1).
  Earned Character XP and Drops are never rolled back.
- **Opponent AI** uses the same Action-Cycle and first-valid model with
  authored Ability lists. Ordinary opponents never bypass the closest living
  Party Member; Boss exceptions must be visibly telegraphed.

---

## 6. Class Kits

Decision: [four Class kits](https://github.com/jsbellamy/nightglass/issues/7)
(its Answer holds every authored number: Level 1 base statistics, all sixteen
Core Abilities, four basic attacks, eight Ability Talents, coefficients,
timings, and cooldowns; content data transcribes it directly).

- Shared structure: one fixed basic attack (outside the loadout, its fallback),
  **four Core Abilities** available immediately, a three-slot Ability Loadout
  with no slot restrictions, and **one Talent Tier**: a Stat Row of two
  five-rank Stat Talents accepting five points freely split, then an Ability
  Row taking the sixth point in one of two mutually exclusive Ability Talents.
- Identities: **Knight** — frontline durability and Party protection
  (secondary: Physical Damage, Stun). **Wizard** — burst and multi-target
  Elemental Damage (secondary: defensive magic). **Priest** — Healing, revival,
  Buffs (secondary: single-target Elemental Damage). **Hunter** — sustained
  single-target Physical Damage (secondary: Armor reduction, Stun).
- **Every three-Class Party is clear-capable** with suitable configuration;
  Stages cannot require a specific Class, Healing, Stun, or damage channel.
- Two damage channels: Physical and Elemental. Hidden derived Powers:
  `Power = floor((base + flat bonuses) × (1 + summed percentage bonuses))`;
  `raw = floor(Power × coefficient)`. Healing scales from Elemental Power. The
  UI shows per-Ability raw results, never consolidated Power totals.
- Levels grant no automatic statistics — each Level's power is its Talent Point
  plus Equipment progression.

---

## 7. Progression

Decision: [vertical-slice progression](https://github.com/jsbellamy/nightglass/issues/5).

- **Three Stages**, each two ordinary Waves then a Boss. Clearing Stage 1 or 2
  unlocks and auto-begins the next; clearing Stage 3 auto-begins another
  Stage 3 Attempt (the farming frontier). Manual selection of any unlocked
  Stage abandons the current Attempt without revoking earned XP.
- **Levels 1–6**, one Talent Point per Level including Level 1. Cumulative XP
  thresholds: 0 / 100 / 250 / 450 / 650 / 850. Encounter budgets: Stage 1
  `20/20/60`, Stage 2 `30/30/90`, Stage 3 `40/40/120` — allocated among
  opponents in content data, awarded as they are defeated, no completion or
  first-clear bonuses. Party Members receive full awards; the Reserve 50%.
  Failed-Attempt XP is retained.
- Clean-path pacing: Level 2 after Stage 1, 3 after Stage 2, 4 after Stage 3,
  then Levels 5 and 6 from two further Stage 3 clears; tune the full arc to
  roughly **20–30 minutes** of visible play including a few failures. At
  Level 6, Equipment Drops carry continued value.
- Persistent progression is limited to: unlocked Stages, Character XP/Levels,
  Talent allocations, and Equipment. **No** prestige, rebirth, account Level,
  ratings, quests, dailies, or difficulty tiers.

---

## 8. Equipment, Drops, and the Armory

Decision: [Equipment, Drops, and storage](https://github.com/jsbellamy/nightglass/issues/8)
(its Answer holds the full authored numbers: guaranteed statistics, Affix
bands, rarity odds; content data transcribes it directly).

- Three Equipment Slots — **Weapon** (Class-specific: blade, focus, relic,
  bow), **Armor Equipment**, **Charm** (both universal). Icons and statistics
  only; never a combat-appearance change. The Reserve equips normally.
- A Drop = authored **Equipment Base** + **Item Level** (its source Stage) +
  **Rarity** (Common 0 / Uncommon 1 / Rare 2 / Epic 3 Affixes, no repeats, no
  bespoke Epic effects) + rolled **Affixes** from the eight-statistic pool
  (weapons roll their offensive pair plus the defensive four; Armor Equipment
  the defensive four; Charms all eight).
- Two **Equipment Tiers**, six Bases each (12 Bases, 12 icons, authored
  original-IP names): Tier I for Item Levels 1–2, Tier II from the Stage 3
  frontier. Tiers change guaranteed-stat scale and Affix bands; Rarity is
  independent, so a great Tier I piece can beat a weak Tier II piece.
- **Drop cadence:** one per Wave clear, two per Boss (second has an Uncommon
  floor); rewards commit at encounter completion and survive later defeat or
  abandonment. Type selection: uniform slot category, then uniform Class for
  weapons. Rarity odds shift per Stage (S1 `55/35/9/1`, S2 `40/40/17/3`,
  S3 `25/45/24/6`).
- **Loot RNG is a persisted stream separate from deterministic combat.** Pieces
  are fully rolled and saved when awarded — reload cannot reroll; Offline
  Progress consumes the same stream; seeds are fixable for tests.
- **Armory:** one shared, capacity-free collection including equipped pieces
  (which carry an exclusive Character-and-slot assignment). Filters: slot,
  Weapon Class, Tier, Rarity, assigned/available, Locked, Unseen; sorts:
  newest, Rarity, Tier, name; default Unseen-first then newest. Comparison is
  side-by-side from a Character's slot with statistic deltas and resulting raw
  Ability changes — no aggregate score, no auto-equip. Equipped and Locked
  pieces cannot be discarded; bulk Discard confirms, listing Rare/Epic
  selections explicitly.
- Drops never pause combat or open a modal: an icon-and-Rarity toast over the
  tile, an Armory-tab badge, and an Unseen marker. Characters start with empty
  slots. **No** binding, sets, requirements, selling, salvage, crafting,
  upgrading, or Affix rerolling.

---

## 9. Architecture

Decisions: [SideScape foundation](https://github.com/jsbellamy/nightglass/issues/9),
[simulation boundary](https://github.com/jsbellamy/nightglass/issues/10).

### Simulation Engine boundary

- A headless, **caller-pumped** Simulation Engine with one advancement
  operation for live and accelerated time: the caller supplies elapsed
  duration; the Engine advances between exact scheduled boundaries. **Chunk
  size is not game state** — many small calls and one large call must resolve
  identical timestamp batches in identical order.
- The boundary is: **commands** (advancement, player configuration) → a
  **versioned serializable Snapshot** → ordered timestamped **Presentation
  Events**.
- The Snapshot owns the simulation clock, persisted loot-RNG state, next
  stable sequence identifiers, all progression, and the complete in-flight
  Stage Attempt (phases, health, Knockouts, cooldown-ready times). It excludes
  DOM, animation, audio, timer, and window state and consumed events.
- Presentation Events carry domain facts (`action-started`, `impact`,
  `knockout`, `wave-started`, `stage-cleared`, `drop-awarded`,
  `stage-attempt-started`, …) with stable entity ids, simulation timestamps,
  and outcomes — never sprite names, effect names, DOM elements, or audio
  cues. The presentation layer owns the mapping to assets.
- The Engine never touches timers, the DOM, Tauri, audio, or animation assets;
  time and RNG are injected.

### Offline Progress

Runs the same accelerated advancement path to the configured cap, computes and
commits durable progression deltas, presents the summary (including Drops),
discards the transient accelerated battle, and begins a **fully restored fresh
Wave 1 Stage Attempt** at the resulting Stage — the first visible combat after
return.

### SideScape reuse posture

Reuse the architectural shapes — caller-pumped Engine, injected RNG/clock,
tolerant field-by-field save reconstruction, pre-mount Offline Progress, pure
window-geometry functions behind platform ports, asset registries/validators,
Vitest/Playwright/Rust checks, and the macOS/Windows Tauri release matrix
(semantic bump, version stamping, cached dual-platform build, Windows NSIS,
draft releases, renamed identifiers, full CI gate). **Reject** SideScape's
domain modules, 600ms Tick, save key/shape, geometry constants, square sprite
registry, art, AppKit/WebKit overlay, macOS private APIs, global Tauri API,
null CSP, and broad opener permission — add native workarounds and
capabilities only on demonstrated need.

### Proven equivalence

The [simulation-boundary prototype](../prototype/simulation-boundary/README.md)
produced byte-equivalent Snapshots and 198 identical Presentation Events across
fine live stepping, one accelerated call, and advancement split around JSON
save/reload, plus a working Offline Progress commit-then-fresh-Attempt path.
Production ports the boundary and invariants to TypeScript; the prototype shell
is throwaway.

---

## 10. Platform policies

Decision: [platform and feedback baseline](https://github.com/jsbellamy/nightglass/issues/16).

### Save recovery

Single integer schema version. Exact match restores fully; mismatch triggers
tolerant field-by-field recovery of **durable progression only** (the in-flight
Attempt is discarded; a fresh Wave 1 Attempt starts). Unreadable progression
resets to a new game without crashing, logged. No migration chain in the slice.

### Accessibility floor

Full keyboard operability for every Dock surface (the interaction-free Battle
Tile is exempt); WCAG AA 4.5:1 contrast for Dock and status-line text; no
critical state encoded by colour alone; OS reduced-motion damps decorative UI
animation while live combat (with its required actor-pool channel) stays.
Deferred: ARIA, remappable keys, text scaling, localization.

### Audio

Presentation-Event-driven proof only: one impact cue per damage channel,
knockout, wave-started, stage-cleared, party-defeat, drop-awarded; optional
ambient night-garden loop. **Default muted**; single mute plus master volume
persisted outside the Snapshot. Sourcing follows the asset discipline (offline
acquisition, recorded licenses/provenance, nothing generated at build/runtime).

### Performance budgets

30fps Battle Tile cap; event-driven Dock; live Engine pumping at a coarse fixed
~4Hz with presentation interpolating between event timestamps; sustained CPU
under ~5% of one core (fight visible, Dock closed); memory under ~250MB; no GPU
post-processing (glass via compositor/CSS); rendering stops and pumping drops
to a slow heartbeat when hidden; Offline Progress completes in under ~2s.
Enforcement: a manual measurement checklist at slice sign-off plus a CI timing
test for the Offline Progress cap only.

### Battle Tile feedback (diorama, not HUD)

2px health bars over each combatant (one wide top-edge bar for the Boss);
brightness flash plus per-channel-tinted floating damage numbers with
short-window merging (green `+` for Healing); up to two Status icons then a
"+n" chip; collapse-then-desaturate Knockout readable without colour; ~1.5s
centre-lane banners for Wave/Stage/Party Defeat; Drop toasts badging the
Armory tab. Cooldown and Action Cycle telemetry lives only in the Dock's
Loadout surface. Deferred: screen shake, hit-stop, combat log, DPS meters.

---

## 11. Content inventory

What content data and assets the slice must author, derived from §§3–8:

| Content | Quantity | Source of truth |
| --- | --- | --- |
| Class Kits (bases, basic attacks, 4 Core Abilities, Talent Tier each) | 4 | [#7](https://github.com/jsbellamy/nightglass/issues/7) |
| Stages (2 Waves + Boss, opponent rosters, XP allocation) | 3 | [#5](https://github.com/jsbellamy/nightglass/issues/5) |
| Opponent stills: one ordinary family (Pipcap-class, reused across Waves) + one distinct Boss silhouette per Stage | 1 + 3 (Pipcap and one Boss accepted) | [#30](https://github.com/jsbellamy/nightglass/issues/30) |
| Canonical Character references | 4 (Knight, Wizard accepted; Priest, Hunter to acquire) | [#29](https://github.com/jsbellamy/nightglass/issues/29) |
| Ability effect stills + derivation recipes | one still per distinct effect | [#20](https://github.com/jsbellamy/nightglass/issues/20), [#4](https://github.com/jsbellamy/nightglass/issues/4) |
| Hand-authored idle micro-loops (optional) and downed poses | up to 4 + 4 | [#4](https://github.com/jsbellamy/nightglass/issues/4) |
| Equipment Bases with names and icons | 12 | [#8](https://github.com/jsbellamy/nightglass/issues/8) |
| Stage backdrops | 3 | [#3](https://github.com/jsbellamy/nightglass/issues/3) |
| Audio cues + optional ambient loop | 7 + 1 | [#16](https://github.com/jsbellamy/nightglass/issues/16) |

---

## 12. Acceptance evidence

Each decision area was resolved with recorded evidence; implementation inherits
these as its acceptance baseline.

| Area | Evidence |
| --- | --- |
| Battle Tile readability at 480×112, five-opponent stress | [live-battlefield prototype](../prototype/live-battlefield/README.md) ([#1](https://github.com/jsbellamy/nightglass/issues/1)) |
| Art direction at native scale | [art-direction prototype](../prototype/art-direction/NOTES.md) ([#3](https://github.com/jsbellamy/nightglass/issues/3)) |
| Management Dock never disturbs the tile | [management-fanout prototype](../prototype/management-fanout/README.md) ([#12](https://github.com/jsbellamy/nightglass/issues/12)) |
| Simulation equivalence: live = accelerated = save/reload; Offline Progress path | [simulation-boundary prototype](../prototype/simulation-boundary/NOTES.md) — byte-equivalent Snapshots, 198 identical events ([#10](https://github.com/jsbellamy/nightglass/issues/10)) |
| Acquisition: byte-identical offline rebuild, provider-neutral, validator gates | `prototype/comfyui-fit/test_contract.py` all-green with no provider/network; accepted Knight/Wizard hashes ([#29](https://github.com/jsbellamy/nightglass/issues/29), [#21](https://github.com/jsbellamy/nightglass/issues/21)) |
| Effects read at 1× under stress; separation enforced; deterministic | `prototype/comfyui-fit/effects/verify.py` 6/6 gates ([#20](https://github.com/jsbellamy/nightglass/issues/20)) |
| Animation contract: attribution, cue alignment, 30fps legibility, anchors | [presentation-contract prototype](../prototype/presentation-contract/NOTES.md) `verify.py` 7/7 gates ([#4](https://github.com/jsbellamy/nightglass/issues/4)) |
| Opponent art through grid recovery: Pipcap (29×40) and Boss (32×41) accepted, shared `moonberry-16`, byte-identical offline rebuild | [opponent-art prototype](../prototype/comfyui-fit/opponents/NOTES.md) ([#30](https://github.com/jsbellamy/nightglass/issues/30)) |
| Body-motion rejections (closed evidence, not dependencies) | [#13](https://github.com/jsbellamy/nightglass/issues/13), [#19](https://github.com/jsbellamy/nightglass/issues/19), [#26](https://github.com/jsbellamy/nightglass/issues/26), [#24](https://github.com/jsbellamy/nightglass/issues/24) |
| SideScape reuse/reject inventory | [foundation research](research/sidescape-foundation.md) ([#9](https://github.com/jsbellamy/nightglass/issues/9)) |

Slice sign-off additionally requires: the §10 manual performance checklist, the
CI Offline Progress timing test, the accessibility floor verified on both
platforms, and every shipped asset passing its contract validator from the
Archived Raw Bundle offline.

---

## 13. Known open items

Carried forward deliberately; none blocks implementation planning.

- **Priest and Hunter canonical references** and **two of the three Boss
  stills** are not yet acquired; the pipeline is proven on Knight, Wizard,
  Pipcap, and one Boss
  ([#30](https://github.com/jsbellamy/nightglass/issues/30) confirmed the
  opponent canvases through grid recovery).
- **`moonberry-16` extension**: opponents and Bosses share the palette (#30);
  extending it for Priest, Hunter, and backdrops is unresolved, and
  `moonberry-glow` disjointness must be preserved as effects grow.
- **Presentation concurrency** is validated at three simultaneous actor pools,
  not five; whether five stay legible (or must dim) awaits opponent art and a
  real Wave.
- **Naming, setting details, and brand identity** beyond the Moonberry
  language remain undecided ("Nightglass" is the repo name, not a confirmed
  product name).
- **Provider commercial terms** — accepted risk, see §1.
- The stale `prototype/comfyui-fit/canonical/*.png` pair predates the frozen
  contract and should be deleted or regenerated (flagged in
  [#20](https://github.com/jsbellamy/nightglass/issues/20)).
