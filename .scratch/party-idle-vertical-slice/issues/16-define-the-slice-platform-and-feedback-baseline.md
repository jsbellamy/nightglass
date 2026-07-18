# Define the slice platform and feedback baseline

Type: grilling
Status: resolved
Assignee: jakebellamy
Blocked by: none

## Question

Now that the compact interface (fixed 480×112 Battle Tile plus the single
480×336 tabbed Management Dock) and the simulation architecture (boundary-driven
advancement with versioned Snapshots) are concrete, what vertical-slice-level
policies are fixed for save migration, accessibility, audio, performance
budgets, and detailed visual feedback — and which of these are explicitly
deferred past the slice?

## Answer

Resolved by grilling on 2026-07-18. Five policies fixed for the slice, each
with explicit deferrals:

### Save migration

- The Snapshot carries a single integer schema version. Exact match restores
  fully. On mismatch, tolerant field-by-field reconstruction recovers
  **durable progression only** (Character XP/Levels, Talents, Armory, Stage
  frontier, RNG state where readable), the in-flight Stage Attempt is
  discarded, and a fresh Wave 1 Attempt starts at the selected Stage — the
  same fresh-visible-Attempt path Offline Progress uses.
- If durable progression is unreadable, reset to a new game without crashing,
  and log it.
- **Deferred:** any real version-to-version migration chain, until a schema is
  worth preserving.

### Accessibility

- **Keyboard operability:** every Management Dock surface (Party, Loadout,
  Talents, Armory, Stage) fully usable by keyboard — tab switching, focus
  order, Enter/Space activation. The Battle Tile has no interaction and is
  exempt.
- **Contrast:** WCAG AA (4.5:1) for all Dock and status-line text, making the
  art direction's readability guardrails measurable.
- **Color independence:** no critical state (Knockout, cooldown-ready,
  Equipment Tier) encoded by color alone; always paired with icon, shape, or
  text.
- **Reduced motion:** respect the OS setting by damping decorative UI
  animation (tab transitions, glass shimmer); live combat animation stays.
- **Deferred:** screen-reader/ARIA support, remappable keybindings, UI text
  scaling, localization, and any colorblind pass beyond the
  color-independence rule.

### Audio

- A thin proof of the audio path driven purely by Presentation Events: impact
  cues (one per damage channel — Physical/Elemental), knockout, wave-started,
  stage-cleared, party-defeat, drop-awarded. Abilities share the channel
  cues; no per-Ability sounds. One optional ambient night-garden loop; no
  dynamic music.
- Controls: single mute toggle plus one master volume, persisted outside the
  Snapshot (presentation state, not game state). **Default muted** — audio is
  opt-in for an always-visible desktop companion; default volume low once
  enabled.
- Sourcing follows the art asset discipline: offline acquisition, licenses
  and provenance recorded, normalized assets shipped, nothing generated at
  build or runtime.
- **Deferred:** full soundtrack, per-Ability/per-Class sound identity,
  positional or ducking mixing, separate music/SFX sliders, any settings
  surface beyond mute + volume.

### Performance budgets

- **Animation cadence:** 30 fps cap for the Battle Tile; the Dock is
  event-driven and renders only on state change.
- **Engine pumping:** live advancement at a coarse fixed ~4 Hz cadence; the
  presentation layer interpolates between Presentation Event timestamps
  (chunk size is already outcome-neutral).
- **Standing cost:** sustained CPU under ~5% of one core with the fight
  visible and Dock closed; memory under ~250 MB; no GPU post-processing —
  the glass look comes from compositor/CSS, not shaders.
- **Backgrounding:** when hidden, occluded, or the display sleeps, stop
  rendering and drop pumping to a slow heartbeat; elapsed time catches up on
  the next pump.
- **Offline Progress:** capped accelerated computation completes in under
  ~2 seconds so launch never feels hung.
- **Enforcement:** documented manual measurement checklist (Activity
  Monitor / Task Manager) at slice sign-off, plus a CI timing test for the
  Offline Progress cap only. **Deferred:** automated perf regression testing,
  battery telemetry, per-platform tuning.

### Detailed visual feedback (Battle Tile)

- **Health bars:** 2px above each Party Member and ordinary opponent; the
  Boss gets one wider bar along the tile's top edge.
- **Impact:** brief brightness flash on the struck sprite plus floating
  damage numbers — small rising numerals tinted per channel (warm Physical,
  cool Elemental); rapid multi-hits within a short window merge into one
  summed numeral. Healing uses the same numerals in green with `+`.
- **Status Effects:** up to two tiny icons above the combatant's bar; more
  collapse into a "+n" chip.
- **Knockout:** collapse animation, then desaturated on the ground until
  Wave/Attempt reset — readable without color.
- **Wave/Stage/Party Defeat:** ~1.5s center-lane banner text in the effect
  lane; no modal, fight stays visible.
- **Drops:** small toast at the tile's edge that also badges the Dock's
  Armory tab; details live in the Dock.
- **Cooldowns/Action Cycles:** not shown in the tile — that telemetry lives
  in the Dock's Loadout surface. The tile stays a diorama, not a HUD.
- **Deferred:** screen shake, hit-stop, scrolling combat log, DPS meters,
  per-Ability bespoke feedback beyond the shared effect assets.
