# Vertical-slice application acceptance audit

Audited on 2026-07-19 against `main` at `75344b0` (`update ui (#85)`) and the
live GitHub issue bodies for [#43](https://github.com/jsbellamy/nightglass/issues/43)
through [#52](https://github.com/jsbellamy/nightglass/issues/52). All issue
checkboxes are still textually unchecked, so issue state is not treated as
criterion evidence.

## Verdict vocabulary

- **Proven on current main** — evidence exists at the seam named by the row.
- **Regressed / current failure** — the literal closed-issue row is false on
  current `main`, whether through a later intentional successor or a defect.
- **Insufficient evidence** — related code or tests exist, but the named visual,
  native-window, or verification seam has not proved the whole claim.
- **Correctly incomplete** — the issue remains open and its implementation is
  absent, so the row is not expected to pass yet.

Rendered readability, physical overlap, native window behavior, and actual
cross-webview delivery are not inferred from happy-dom classes. This audit
judges the evidence already available for publication; it does not create the
rendered-output prototype assigned to a later Wayfinder ticket. No committed
screenshot, Playwright result, or native Tauri observation covers those claims.

## Executive result

| Verdict | Rows |
| --- | ---: |
| Proven on current main | 30 |
| Regressed / current failure | 1 |
| Insufficient evidence | 8 |
| Correctly incomplete | 11 |
| **Total** | **50** |

**Audit correction ([#90](https://github.com/jsbellamy/nightglass/issues/90)):**
#44's integer-scale row was originally marked **Regressed / current failure**
here, citing Pipcap as 29×40 and Boss 1 as 32×41 against a 32×48 CSS box. That
was wrong. Declared, intrinsic, and CSS dimensions agree at 32×48;
[`src/ui/sprites.ts`](../../src/ui/sprites.ts) is unchanged since #78. The row
is **Insufficient evidence** (nothing at a seam proved integer-scale), not a
regression. This does not change the seven-blind-spot headline in spirit — it
moves one row out of the failure bucket; the remaining regression is #44's
three-layer “only body populated” row.

The broad automated baseline is healthy: 27 Vitest files / 199 tests pass,
TypeScript passes, the production Vite build passes, and the acquisition plus
effects validators report green. The important exceptions are:

1. The effect verifier's body-free check is vacuous: it captures the sprite
   digest only after authoring/derivation and immediately compares it with a
   second digest. A pipeline mutation would already be part of both values.
2. No automated seam relates `SPRITE_SOURCES` / PNG IHDR dimensions to the
   `.combatant-sprite` CSS rule, so #44's integer-scale claim is unproved
   (corrected from “regressed” — see the note above).
3. No rendered seam proves the five-opponent layout/readability or the
   non-colour Knockout read.
4. No native Tauri seam proves the second-window lifecycle, positioning,
   focus/drag behavior, or real cross-webview bus. The latest dock-opened
   Snapshot handshake is present and unit-tested, but only at the in-process
   protocol seam.

## #43 — Effect stills, derivation recipes, and status glyphs for all 28 Abilities

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/43).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Every one of the 28 Ability ids has a recipe; test enforces the complete set against assembled Content. | **Proven on current main** | [`src/data/effects.test.ts`](../../src/data/effects.test.ts) compares all assembled Class Kit Ability ids with 28 recipes in [`src/data/effects.ts`](../../src/data/effects.ts). The full suite passes. |
| All three verify gates green (determinism, separation including recolours, body-free) offline in CI. | **Insufficient evidence** | `npm run assets:verify` reports determinism `PASS` for 94 files, separation `PASS` for 78/78 frames, and body-free `PASS`. CI wires that command in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). However, [`pipeline/effects/verify.py`](../../pipeline/effects/verify.py) computes `canon = digest_dir(SPRITES)` only after the rebuild, then immediately compares it with another digest. The named body-free gate therefore cannot detect a sprite mutation performed by the rebuild it is meant to guard. |
| Anchors restricted to `strike_target` / `lane_travel` / band; no `strike_self`. | **Proven on current main** | The legal-anchor test scans every recipe and rejects `strike_self`; full suite passes. |
| Eight status glyphs, shape-distinct at 1×. | **Proven on current main** | Eight 7×7 PNGs exist under [`src/assets/effects/status/`](../../src/assets/effects/status/). A direct alpha-mask audit found eight unique shapes (opaque counts: 13, 10, 12, 12, 8, 13, 12, 13), and the assets were inspected at original 7×7 size. This is stronger than the existing PNG-byte-uniqueness test. |
| `moonberry-glow` unchanged except documented additive extensions; disjointness passes. | **Proven on current main** | `cmp` and SHA-256 show [`pipeline/effects/palette_glow.json`](../../pipeline/effects/palette_glow.json) is byte-identical to the prototype palette (`1ce3ac7b…ac34738cb1`). The separation validator rejects all 78 baked effect frames. |

## #44 — Battle Tile renderer: battlefield, bodies, health bars, status line, pump loop

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/44).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| 480×112, 24px status line, specified thirds/facings, five opponents fit at 1× without overlap. | **Insufficient evidence** | Constants, classes, facings, and five slot names are tested in [`src/ui/battle-tile.test.ts`](../../src/ui/battle-tile.test.ts), while positions live in [`src/styles.css`](../../src/styles.css). The test never performs layout or measures rectangles; happy-dom cannot prove physical non-overlap, native 1× fit, or readability. No browser/native render evidence was available. |
| Integer-scale rendering only; pixelated; no runtime downscale path. | **Insufficient evidence** | Pixelation is set. Declared, intrinsic, and CSS dimensions agree at 32×48 for the four Character stills ([`src/ui/sprites.ts`](../../src/ui/sprites.ts) and PNG IHDR; unchanged since #78). The existing test checks only the inline `imageRendering` value and never relates `SPRITE_SOURCES` to the `.combatant-sprite` rule in [`src/styles.css`](../../src/styles.css), so nothing proves integer-scale. **Correction ([#90](https://github.com/jsbellamy/nightglass/issues/90)):** an earlier pass of this audit marked the row **Regressed** on wrong declared sizes (29×40 / 32×41); that was an audit error, not a later fix. |
| Three-layer per-combatant structure present, only body populated. | **Regressed / current failure** | The three layers remain. “Only body populated” is now false during actions because #45 intentionally inserts actor pools and effect frames into mark/effect layers via [`src/ui/presentation.ts`](../../src/ui/presentation.ts). The old test passes only on an idle initial Snapshot. This is an expected successor change, but the literal live row no longer describes current `main`. |
| Pump at 250ms, render at no more than 30fps, hidden means no rendering plus heartbeat pumping. | **Proven on current main** | [`src/ui/pump.test.ts`](../../src/ui/pump.test.ts) uses fake timers to prove the 250ms pump, 33ms render gate, hidden render stop, and 5s heartbeat. Full suite passes. |
| Health bars update from events; Boss gets the wide top-edge bar. | **Proven on current main** | UI integration tests apply an Impact result and assert the new health percentage; a Boss Snapshot gets the wide bar and no per-combatant bar. |
| Sprite/backdrop/fresh-boot interims are labeled. | **Proven on current main** | Priest/Hunter and Boss 2/3 fallbacks carry #55/#56/#57 metadata in `sprites.ts`; gradient backdrops cite #59 in [`src/ui/battle-tile.ts`](../../src/ui/battle-tile.ts); [`src/main.ts`](../../src/main.ts) labels fresh Engine boot as interim #50. |

## #45 — Presentation mapping: Engine events to animation, feedback, and reduced motion

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/45).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Exact lunge, hurt, downed, and actor-pool constants. | **Proven on current main** | Presentation math tests pin all values, including the complete 66ms lunge hold and 0.6/60ms flash. |
| Actor pool present in both motion arms. | **Proven on current main** | `describe.each([false, true])` mounts the UI and finds the actor pool throughout an Action Cycle in both arms. |
| No sprite/effect/audio name in `src/core`; Ability-id → recipe mapping lives in presentation/data. | **Proven on current main** | Current source scan finds no asset path or presentation asset name in `src/core`; [`src/ui/presentation.ts`](../../src/ui/presentation.ts) owns manifest/status loading and consumes recipes from data. The boundary test also passes. `spriteKey` in shared content types is a domain content key, not a concrete asset filename. |
| Damage merging, status cap/chip, banners, and drop toast tested. | **Proven on current main** | [`src/ui/damage-numbers.test.ts`](../../src/ui/damage-numbers.test.ts) and [`src/ui/presentation.test.ts`](../../src/ui/presentation.test.ts) cover the 250ms merge, two-glyph cap plus `+n`, banner lifetime, toast, and Armory badge hook. |
| Knockout readable without colour via collapse, desaturation, and position. | **Insufficient evidence** | The DOM test proves `knockout-collapse`, `knockout-desaturate`, and a 3px downed offset persist across a Wave transition. That establishes non-colour signals, but not that the 32×48 rendered state is actually readable in the crowded Battle Tile. No rendered review exists at that seam. |

## #46 — Management Dock shell: second window, tabs, cross-window bus, keyboard

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/46).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Dock is a second window; no calls resize/move/pause the tile. | **Insufficient evidence** | [`src/ui/dock-window.ts`](../../src/ui/dock-window.ts) creates label `dock` as a second `WebviewWindow` and the source contains no tile resize/set-position/focus call. Unit tests use a mock port and show the pump continues. No native Tauri test or observation proves the real second-window lifecycle or pump continuity while it is shown, hidden, moved, and focused. |
| `dockRect` above/below placement, 8px gap, tile width. | **Proven on current main** | Pure geometry tests cover bottom-parked/above, top-parked/below, 8px, and width 480 in [`src/ui/dock-geometry.test.ts`](../../src/ui/dock-geometry.test.ts). |
| One surface at a time; active-tab toggle and close button close the Dock. | **Insufficient evidence** | [`src/ui/dock.test.ts`](../../src/ui/dock.test.ts) proves one panel and `onClose` callback semantics. Actual hide/show completion crosses the BroadcastChannel and Tauri window port and has not been observed at that integration seam. |
| Keyboard path open → cycle tabs → close; AA contrast tokens. | **Insufficient evidence** | Component tests prove arrow cycling and Escape close after mount, but do not exercise keyboard opening from the tile through the second window. CSS contains focus/text tokens, but no contrast calculation or rendered focus review proves AA. |
| Dock never imports Engine; commands and Snapshots cross only through `bus.ts`. | **Insufficient evidence** | Source boundaries are clean, and BroadcastChannel unit tests prove same-process command/Snapshot delivery. The newest handshake in [`src/main.ts`](../../src/main.ts) has the Dock publish `dock-opened`; the tile handles it by publishing a fresh Snapshot, and [`src/main.test.ts`](../../src/main.test.ts) proves that response. What remains unproved is delivery across two real Tauri webviews; the test invokes the tile handler directly and does not mount both windows on the channel. |
| New capabilities limited to Dock needs and justified in PR. | **Proven on current main** | Current capability additions match creation, show/hide, position, tile rect/monitor reads, and move-event listening in [`src-tauri/capabilities/default.json`](../../src-tauri/capabilities/default.json). The merged [PR #81](https://github.com/jsbellamy/nightglass/pull/81) gives a permission-by-permission justification. |

## #47 — Dock surfaces: Party and Stage

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/47).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Formation and party edits use distinct Wave/Boss and next-Attempt pending states. | **Proven on current main** | [`src/ui/party-surface.test.ts`](../../src/ui/party-surface.test.ts) drives the real Engine/bus-facing surface, asserts distinct marker text/data, and observes application at the two boundaries. |
| Stage select confirms and preserves earned XP/Drops; Stage 1 floor via unlock state. | **Proven on current main** | [`src/ui/stage-surface.test.ts`](../../src/ui/stage-surface.test.ts) rejects locked activation, confirms unlocked selection, and compares Snapshots to retain XP/Drops. Stage 1 remains available. |
| Keyboard-only completion; no colour-only state. | **Proven on current main** | Keyboard tests complete Formation reorder, party swap, and Stage selection. Pending states use distinct text, and Stage lock/current state uses labels and a lock glyph in addition to styling. |
| Surfaces communicate only through bus; no Engine import. | **Proven on current main** | Both source-boundary tests pass; the renderers accept command callbacks and [`src/ui/dock.ts`](../../src/ui/dock.ts) routes them to the bus owner. |

## #48 — Dock surfaces: Loadout and Talents

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/48).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Exact per-Ability raw results; no consolidated Power totals. | **Proven on current main** | [`src/ui/loadout-surface.test.ts`](../../src/ui/loadout-surface.test.ts) asserts an exact talent-driven raw-number change and DOM-greps against “Power”. Shared math is in [`src/ui/ability-format.ts`](../../src/ui/ability-format.ts). |
| Cooldown/Action-Cycle telemetry here and absent from tile. | **Proven on current main** | Cross-component DOM test finds both telemetry blocks in Loadout and neither in the Battle Tile. |
| Talent cap, gate, and cascade enforced and tested. | **Proven on current main** | [`src/ui/talents-surface.test.ts`](../../src/ui/talents-surface.test.ts) covers the five-point cap, Ability Row gate, and remove-Ability-before-dropping-below-five rule. |
| Activation Delay visible while queued and live after boundary. | **Proven on current main** | The test observes the queued marker, advances to `config-applied`, then asserts positive live cooldown telemetry. |
| Keyboard-only slotting and respec. | **Proven on current main** | Loadout slotting and Talent allocate/deallocate keyboard walkthroughs pass. |

## #49 — Dock surface: Armory

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/49).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Seven filters, four sorts, and pinned default work and are tested. | **Proven on current main** | Pure-helper and surface tests cover every filter/sort, combinations, and Unseen-first/newest default. |
| Compare deltas/raw Ability changes; no score/Power totals; next-Attempt note. | **Proven on current main** | [`src/ui/armory-surface.test.ts`](../../src/ui/armory-surface.test.ts) asserts all named DOM outputs and absences. |
| Bulk discard names Rare/Epic; equipped/Locked undiscardable. | **Proven on current main** | Surface test asserts explicit Rare/Epic names and excludes equipped/Locked checkboxes; Engine remains the backstop. |
| Unseen ordering and badge lifecycle. | **Proven on current main** | Tests cover default ordering, `markSeen`, and badge removal when no Unseen Equipment remains. The dock-opened fresh-Snapshot handshake prevents a newly mounted Dock from waiting for a later pump event before evaluating this state. |
| #58 icon interim labeled; Rarity readable without colour. | **Proven on current main** | [`src/ui/armory-surface.ts`](../../src/ui/armory-surface.ts) carries `data-interim-icon="issue-58"` and explanatory copy; every Rarity has visible text in addition to a class/colour. |

## #50 — Save, boot, tolerant recovery, and Offline Progress

Issue state: **open**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/50).

All six rows are **correctly incomplete**:

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Exact restore, durable-only mismatch recovery, corrupt-save fallback. | **Correctly incomplete** | No `src/core/load-state.ts` or boot recovery implementation exists. |
| One accelerated offline `advanceBy`, committed deltas, fresh visible Attempt. | **Correctly incomplete** | No offline boot path exists; `main.ts` still creates a fresh Engine directly. |
| Offline Drops consume persisted loot stream. | **Correctly incomplete** | No offline-progress integration exists. |
| Eight-hour advancement under 2s in unskipped CI test. | **Correctly incomplete** | No such timing test exists. |
| Preferences excluded; save contains only Snapshot. | **Correctly incomplete** | No `nightglass-save-v1` persistence layer exists. |
| Pre-mount ordering proven by spy. | **Correctly incomplete** | No `src/ui/boot.test.ts` or equivalent test exists. |

## #51 — Audio proof: event-driven cues, default muted

Issue state: **open**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/51).

All five rows are **correctly incomplete**:

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Default muted; no sound before explicit unmute. | **Correctly incomplete** | No `src/ui/sfx.ts` or audio runtime exists. |
| Seven exact event cues, channel selection, batch de-dup. | **Correctly incomplete** | No cue mapping exists. |
| CC0-compatible provenance and matching hashes. | **Correctly incomplete** | No `src/assets/audio/` or `assets-raw/audio-provenance.json` exists. |
| Preferences in `nightglass-audio-v1`, absent from Snapshot/save. | **Correctly incomplete** | No audio preferences implementation exists. |
| No network fetch at build/runtime. | **Correctly incomplete** | No bundled audio implementation exists yet, so the intended constraint has not been exercised. |

## #52 — Release workflow: dual-platform draft builds

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/52).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Dispatch-only, tag-derived semver, fail on existing tag, draft release, Windows NSIS, stamp without commit. | **Proven on current main** | [`.github/workflows/release.yml`](../../.github/workflows/release.yml) has only `workflow_dispatch`, computes from `app-v*`, checks an existing ref, tags/pushes, uses macOS and Windows matrix entries, passes `--bundles nsis` on Windows, stamps after tag checkout, and sets `releaseDraft: true`. |
| `set-version.mjs` stamps all three named files; demonstrated; tree clean. | **Proven on current main** | [`scripts/set-version.mjs`](../../scripts/set-version.mjs) stamps `package.json`, `tauri.conf.json`, and `Cargo.toml` (plus lockfiles). Merged [PR #70](https://github.com/jsbellamy/nightglass/pull/70) records a `0.0.1` demonstration for all three and a clean-tree revert. Current audit tree was clean before the report. |
| No signing secrets; explicitly unsigned personal distribution. | **Proven on current main** | Workflow references only `GITHUB_TOKEN` for release upload and sets the release body to “Unsigned personal-distribution builds for macOS and Windows.” No platform signing variables or secrets appear. |

Static workflow inspection does not prove that a real dual-platform draft run
has succeeded. That is a publication/sign-off observation, but it is not stated
as one of #52's three live checkbox criteria.

## Verification record

Commands executed from the repository root:

```text
git status --short --branch
# ## main...origin/main

npm test
# Test Files 27 passed (27)
# Tests      199 passed (199)

npm run typecheck
# exit 0

npm run build
# 60 modules transformed; build completed in 253ms; exit 0

npm run assets:verify
# acquisition contract: all tests passed
# determinism: PASS (94 files rebuilt byte-identically)
# separation: PASS (78/78 effect frames caught)
# body-free: PASS as reported, but structurally inadequate as explained above

npm run assets:effects
# exit 0; independent SHA-256 capture before/after showed all four canonical
# Character sprite files unchanged

(cd src-tauri && cargo check)
# exit 0

cmp -s pipeline/effects/palette_glow.json \
  prototype/comfyui-fit/effects/palette_glow.json
# exit 0

shasum -a 256 pipeline/effects/palette_glow.json \
  prototype/comfyui-fit/effects/palette_glow.json
# both: 1ce3ac7bb6b136cea5f05d38a2c3be3e157ef217a0629fe63fca99ac34738cb1

node /private/tmp/nightglass-release-audit.*/scripts/set-version.mjs 0.0.1
# isolated copy: package.json, src-tauri/tauri.conf.json, and
# src-tauri/Cargo.toml all changed to 0.0.1; repository worktree stayed clean
```

Live issue bodies and merged PR acceptance matrices were read with `gh issue
view` / `gh pr view`. The audit ticket was assigned as the Wayfinder claim;
no other tracker state was changed while collecting evidence.
