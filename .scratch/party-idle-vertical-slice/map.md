# Chart the party idle vertical slice

## Destination

A build-ready vertical-slice specification and validated technical and asset direction for a separate original-IP party idle desktop game, with no major product, combat, interface, architecture, or production-pipeline decisions left unresolved before implementation planning.

## Notes

- This map plans and validates decisions; it does not implement the production game.
- Use `/grilling` and `/domain-modeling` for product decisions, `/prototype` for concrete HITL experiments, and `/research` for external or codebase investigations.
- Treat `CONTEXT.md` as the canonical domain language and update it as terms resolve.
- The game uses original IP. Ragnarok Online is a reference for bright fantasy tone, chibi proportions, and broad Class fantasies only; do not copy its art, monsters, places, lore, or distinctive abilities.
- The Roster contains one Knight, Wizard, Priest, and Hunter. The player selects three Party Members and arranges them in Front, Middle, and Back Formation positions; the Reserve earns half Character XP.
- Automatic Combat uses per-Character Ability Loadouts and respeccable Talent Trees. Ordinary opponents target the closest living Party Member.
- Stages contain Waves and a Boss. Health and Knockouts persist within a Stage Attempt. Party Defeat occurs when every Party Member is Knocked Out. The Failure Policy toggles between retrying and retreating one Stage after failure.
- Equipment Drops are in scope, but Equipment does not change a Class's fixed combat appearance.
- The Battlefield lives inside a fixed 480×112 Battle Tile with a continuously visible live fight. Management is a single 480×336 tile-width tabbed Management Dock flush beside the tile, one surface at a time, never resizing, replacing, or implicitly pausing it.
- Character animation and Ability effects are composed from separate assets.
- ComfyUI on the available RTX 5090 is the preferred first proof-of-fit; AutoSprite remains a later capped paid comparison if the local trial cannot establish acceptable Character motion or a vendor comparison is still useful. Both stay behind offline provider adapters: preserve raw exports, prompts, workflow manifests, model and dependency hashes, and licenses; ship only normalized, validated deterministic assets; never call a generator at build or runtime.
- The app is a separate Tauri/TypeScript project targeting macOS and Windows. Reuse suitable SideScape patterns and its dual-platform release workflow from `../sidescape`, without importing SideScape's game domain.
- Capped Offline Progress is in scope and begins a fresh visible Stage Attempt after presenting its summary.

## Decisions so far

<!-- Resolved ticket pointers are appended here. -->

- [Prototype the live Battlefield workspace](https://github.com/jsbellamy/nightglass/issues/1) — Selected a fixed 480×112 glass Battle Tile with 32×48-at-1× Party Members, a five-opponent stress capacity, a central effect lane, and separately fanned-out management.
- [Research AutoSprite's production fit](https://github.com/jsbellamy/nightglass/issues/2) — Conditionally approved a capped Pro trial behind an offline provider adapter; square vendor exports, quality drift, legal disclaimers, and undocumented operational guarantees prohibit direct production use.
- [Research local ComfyUI production fit](https://github.com/jsbellamy/nightglass/issues/14) — Prefer a bounded local RTX 5090 proof-of-fit before paying for AutoSprite; ComfyUI is an offline acquisition candidate whose output must pass the same deterministic 32×48 contract plus license, provenance, and custom-node security gates.
- [Prototype the original-IP art direction](https://github.com/jsbellamy/nightglass/issues/3) — Selected Moonberry Guild's storybook night-garden language, with Sunsteel's bold contours and warm contrast retained only as native-scale readability guardrails.
- [Scope the vertical-slice progression](https://github.com/jsbellamy/nightglass/issues/5) — Fixed a three-Stage, two-Waves-plus-Boss slice with a Level 1–6 Character XP arc, six-point Talent tier, retained failure XP, and Stage 3 replay frontier.
- [Define the Automatic Combat rules](https://github.com/jsbellamy/nightglass/issues/6) — Fixed deterministic continuous-time Action Cycles, ordered three-slot loadouts, logical Formation targeting, two-channel mitigation, Status/Knockout rules, per-Wave tactical edits, and Stage failure transitions.
- [Define the four Class kits](https://github.com/jsbellamy/nightglass/issues/7) — Fixed four complete deterministic Class Kits, unrestricted three-slot loadouts, Physical/Elemental scaling, and a threshold-based six-point Talent Tier with manual per-Wave respec.
- [Define Equipment, Drops, and storage](https://github.com/jsbellamy/nightglass/issues/8) — Fixed a three-slot, two-Tier randomized Equipment loop with guaranteed encounter rewards, persisted loot RNG, a capacity-free Armory, explicit comparison, and safe manual disposal.
- [Research the SideScape foundation](https://github.com/jsbellamy/nightglass/issues/9) — Reuse SideScape's caller-pumped Engine boundary, tolerant persistence, pure window ports, asset validation, and dual-platform release scaffold while replacing its domain, timing, geometry, security defaults, and proof-specific native workarounds.
- [Prototype the simulation boundary](https://github.com/jsbellamy/nightglass/issues/10) — Validated one boundary-driven advancement path for live, accelerated, and reloaded simulation; versioned Snapshots resume exact Attempts, Presentation Events remain asset-agnostic, and Offline Progress commits rewards before a fresh visible Attempt.
- [Prototype the compact management fan-out](https://github.com/jsbellamy/nightglass/issues/12) — Selected a single 480×336 tile-width tabbed Management Dock, flush above (or below when top-parked) the Battle Tile, one surface at a time, never resizing or pausing the live fight.
- [Define the slice platform and feedback baseline](https://github.com/jsbellamy/nightglass/issues/16) — Fixed slice policies: progression-only tolerant save recovery with no migration chain, a keyboard/contrast/color-independence/reduced-motion accessibility floor, default-muted event-driven audio, 30 fps / ~5% CPU / 2 s Offline Progress budgets, and a diorama-not-HUD feedback set with merged damage numbers and Dock-only cooldown telemetry.

## Not yet specified

- Naming, setting details, and full brand identity remain fog beyond the original-IP and art-direction boundaries needed for the slice.
- The implementation wave and ticket breakdown remain beyond this planning map until the build-ready specification exists.

## Out of scope

- Direct use of Ragnarok Online art, monsters, places, lore, branding, or other protected identity.
- Literal embedding inside an operating-system taskbar; the slice uses an always-on-top edge-parked window.
- Modular Equipment-driven changes to Character sprites.
- Multiplayer, online trading, a player marketplace, live services, or monetization systems.
- Full production implementation or a full game's quantity of Stages, opponents, Equipment, and Abilities.
- Full-game progression beyond Level 6, Tier II Equipment, and the vertical slice's three Equipment Slots; the intended expansion to six slots remains a later effort.
