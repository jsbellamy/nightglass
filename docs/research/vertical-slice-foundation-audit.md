# Vertical-slice foundation acceptance audit

> **Historical.** Point-in-time record from 2026-07-19. Superseded by
> [`docs/vertical-slice-spec.md`](../vertical-slice-spec.md) §§12–13 and
> [`docs/agents/acceptance-evidence.md`](../agents/acceptance-evidence.md).
> Findings here may describe a state that no longer exists; do not action them
> without re-verifying against the current tree. Resolved since this audit:
> `prototype/comfyui-fit/canonical/` was deleted; all four Character references
> and three Boss stills ship at 32×48.

Audited on 2026-07-19 against `main` at `3528abf` (`Audit rendered application
acceptance evidence (#93)`) and the live GitHub issue bodies for
[#33](https://github.com/jsbellamy/nightglass/issues/33) through
[#42](https://github.com/jsbellamy/nightglass/issues/42). All issue checkboxes
are still textually unchecked, so issue state is not treated as criterion
evidence. Merged pull-request bodies were used only as leads; every verdict
below rests on a command rerun or a file read on current `main`.

This is the engine-foundation companion to
[`vertical-slice-application-audit.md`](./vertical-slice-application-audit.md),
which covers #43–#52, and it reuses that document's verdict vocabulary.

## Verdict vocabulary

- **Proven on current main** — evidence exists at the seam named by the row.
- **Regressed / current failure** — the literal closed-issue row is false on
  current `main`, whether through a later intentional successor or a defect.
- **Insufficient evidence** — related code or tests exist, but the named seam
  has not proved the whole claim.
- **Correctly incomplete** — the issue remains open and its implementation is
  absent, so the row is not expected to pass yet. (No rows in #33–#42 fall
  here; all ten issues are closed.)

## Executive result

| Verdict | Rows |
| --- | ---: |
| Proven on current main | 44 |
| Regressed / current failure | 3 |
| Insufficient evidence | 2 |
| **Total** | **49** |

The foundation is markedly healthier than the application layer. Unlike #43–#52,
these rows name seams that automated evidence can actually reach — pure Engine
determinism, content validation, and a byte-comparable asset pipeline — so
almost all of them are genuinely provable and genuinely proved.

Baseline on current `main`: 27 Vitest files / 199 tests pass, `npm run
typecheck` passes, the production Vite build passes, `cargo check` in
`src-tauri` passes, and `npm run assets:verify` reports all three gates green.

The exceptions are:

1. **One real, uncorrected failure.** #42 required deleting the stale
   `prototype/comfyui-fit/canonical/*.png` pair. Both files are still present.
2. **Two rows falsified by intentional successors.** #33's five-permission
   capability list is now twelve (the Management Dock window from #46), and
   #35's basic-attack interim label was removed when #36 landed the real combat
   rules. Both are correct as engineering; both leave the literal closed row
   false.
3. **Two rows whose evidence is narrower than the claim.** #39 claims every
   number from issue #7 appears verbatim, but only five Abilities of 28 are
   pinned field-by-field. #40 claims all tuning numbers are comment-marked as
   tuning; the marking is inconsistent across the data files.

The important structural finding: the same body-free verifier weakness recorded
against #43 in the application audit also underwrites #42's determinism claim.
See the note under #42 below.

**Companion-audit correction ([#90](https://github.com/jsbellamy/nightglass/issues/90)):**
the application audit's #44 integer-scale row is **Insufficient evidence**, not
a regression. Declared, intrinsic, and CSS dimensions agree at 32×48;
[`src/ui/sprites.ts`](../../src/ui/sprites.ts) is unchanged since #78. The
original “Pipcap 29×40 / Boss 1 32×41” failure reading was an audit error.
Recorded here so a reader of either audit sees the same correction; the
foundation table itself is unchanged.

## #33 — Scaffold the Tauri/TypeScript app shell

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/33).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| `npm run typecheck`, `npm test`, and `cargo check` in `src-tauri` all pass. | **Proven on current main** | All three rerun on current `main`: `tsc --noEmit` clean, 27 files / 199 tests pass, `cargo check` finishes the dev profile with no diagnostics. |
| `tauri.conf.json` window is exactly 480×112, non-resizable, undecorated, always-on-top, transparent. | **Proven on current main** | The single `tile` window in [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json) pins `width`/`height`/`min*`/`max*` at 480×112 with `resizable: false`, `decorations: false`, `alwaysOnTop: true`, `transparent: true`, `shadow: false` — matching the pinned block verbatim. |
| CSP is the pinned strict string — grep confirms no `"csp": null`. | **Proven on current main** | `app.security.csp` is exactly `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`. A recursive grep for `"csp": null` across `src-tauri/` returns nothing. |
| No `macOSPrivateApi`, no `withGlobalTauri`, no objc2/opener dependencies anywhere in `src-tauri/`. | **Proven on current main** | `macOSPrivateApi` is absent from the `app` object and `withGlobalTauri` is unset. A grep of [`src-tauri/Cargo.toml`](../../src-tauri/Cargo.toml) for `objc2`, `opener`, and `macos-private-api` returns no matches. |
| `capabilities/default.json` contains exactly the five pinned permissions. | **Regressed / current failure** | [`src-tauri/capabilities/default.json`](../../src-tauri/capabilities/default.json) now lists **twelve** permissions across **two** windows (`tile`, `dock`). The seven additions — `core:event:default`, `core:webview:allow-create-webview-window`, `allow-show`, `allow-hide`, `allow-outer-position`, `allow-outer-size`, `allow-current-monitor` — are all required by the second-window and cross-window bus work in #46. This is an expected successor change, but the literal live row no longer describes current `main`. The issue's own "add capabilities later only on demonstrated need" clause is satisfied in spirit. |
| CI workflow runs check + rust-check on PR. | **Proven on current main** | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) triggers on `pull_request` and defines a `check` job (`npm ci`, `npm run typecheck`, `npm test`) and a `rust-check` job ending in `cargo check`, plus an `assets` job running `npm run assets:verify`. |

## #34 — Domain content types, validator, and fixture Content

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/34).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Types compile under the scaffold's strict tsconfig; no `any`. | **Proven on current main** | [`tsconfig.json`](../../tsconfig.json) sets `"strict": true`, and `tsc --noEmit` passes. A grep for `: any`, `as any`, and `<any>` across non-test `src/` returns **zero** matches. |
| `validateContent` returns an aggregated list; test proves multiple simultaneous violations all appear. | **Proven on current main** | `it("collects every violation instead of stopping at the first")` in [`src/core/validate-content.test.ts`](../../src/core/validate-content.test.ts) exercises exactly this. |
| Fixture content passes validation (with cardinality relaxation) and is imported by at least one test. | **Proven on current main** | `it("returns [] for fixture Content with cardinality relaxation")` proves the pass; [`src/core/types.test.ts`](../../src/core/types.test.ts) has a dedicated row asserting a validating test imports the fixture, and [`src/core/testing/fixture-content.ts`](../../src/core/testing/fixture-content.ts) is imported across the Engine suites. |
| XP-budget validation rejects a stage whose opponent `xpAward` sum ≠ its authored budget. | **Proven on current main** | `it("rejects a Stage whose opponent xpAward sum does not match its authored budget")` in the validator suite. |
| Field names match this spec (they are load-bearing for every later slice). | **Proven on current main** | `it("carries load-bearing field names from the content contract")` in `types.test.ts` pins the names, and the compile-time row asserts fixture Content satisfies the `Content` interface. Every later slice's data files typecheck against those same types. |

## #35 — Engine core: caller-pumped advancement, Snapshot, events, Stage Attempt lifecycle

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/35).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Chunk-equivalence test passes: 1ms vs 7ms vs single-call advancement → identical events, byte-equal Snapshots. | **Proven on current main** | `it("produces identical events and byte-equal Snapshots for 1ms, 7ms, and single-call chunking")` in [`src/core/engine.test.ts`](../../src/core/engine.test.ts) tests all three chunkings against each other. Passes. |
| Save/reload equivalence test passes mid-Attempt. | **Proven on current main** | `it("continues with identical events after restoring a mid-Attempt Snapshot")`. |
| Wave transition is exactly 2000ms with no new Action Cycles inside it; Knockouts persist across Waves. | **Proven on current main** | `it("holds exactly 2000ms with no new Action Cycles and preserves Knockouts across Waves")` covers both halves of the row. |
| Party Defeat → 2000ms hold → automatic Retry with full restore; `selectStage` abandons without XP rollback. | **Proven on current main** | Two rows: `it("waits 2000ms after Party Defeat then automatically Retries with full restore")` and `it("abandons the current Attempt without rolling back earned Character XP")`. |
| Stage 3 clear auto-begins another Stage 3 Attempt. | **Proven on current main** | `it("begins another Stage 3 Attempt after clearing Stage 3")`. |
| Events carry only entity ids/timestamps/domain facts — grep proves no sprite/audio/DOM references in `src/core`. | **Proven on current main** | [`src/core/events.ts`](../../src/core/events.ts) (41 lines) contains zero case-insensitive matches for `sprite`, `audio`, `document`, `css`, or `dom`, and `it("defines events with only domain facts (no sprite, audio, or DOM fields)")` enforces it. The one `spriteKey` in [`src/core/types.ts`](../../src/core/types.ts) is a field on the **content** contract (`OpponentDef`), not on an event — the fixture opponents carry it too. The row names events, so this does not falsify it, but the literal whole-directory grep the row describes is not what the test performs. |
| Invalid commands throw (e.g. `selectStage` on a locked stage). | **Proven on current main** | `it("throws when selecting a locked Stage")`, plus `it("throws when setLoadout receives duplicate Ability ids")` from the #36 work. |
| `lootRngState` survives snapshot round-trip unchanged. | **Proven on current main** | `it("keeps lootRngState unchanged during combat and across snapshot round-trip before Drops")`, reinforced by `it("does not touch lootRngState during combat resolution")`. |
| The basic-attack interim is labeled in code as replaced by #36. | **Regressed / current failure** | A grep for `#36` across `src/` returns **no matches**. The label is gone because #36 landed the full combat rules and the interim basic-attack placeholder it annotated no longer exists — the successor made the marker obsolete rather than leaving it stale. Correct as engineering; the literal live row is false on current `main`. |

## #36 — Combat rules: Ability Loadouts, targeting, Status Effects, Knockout and revival

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/36).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Every bullet above has at least one test; the listed test cases all exist and pass. | **Proven on current main** | [`src/core/combat.test.ts`](../../src/core/combat.test.ts) (238 lines) covers mitigation, Power math, first-valid slot priority, `validWhile` gates, heal targeting, revival targeting, retarget-once, overheal, and Boss Stun immunity. The `describe("full combat rules")` block in `engine.test.ts` adds 18 lifecycle-level rows (cooldown-at-Impact, Wind-up cancellation on Stun and on Knockout, Status refresh-not-stack, simultaneous lethal Impacts, Formation-order revival with 1000ms Recovery, `status-expired`, and more). All pass. |
| Mitigation formula exact: `max(1, floor(raw × 100 / (100 + mitigation)))`, clamp-≥0 before it. | **Proven on current main** | `it("uses max(1, floor(raw × 100 / (100 + mitigation))) with mitigation clamped ≥ 0")` names the clamp explicitly. |
| Power math exact: `floor((base + flat) × (1 + summed%))`, `floor(Power × coefficient)`. | **Proven on current main** | `it("applies floor((base + flat) × (1 + summed%)) before floor(Power × coefficient)")` plus `it("combines flat modifiers before summed percentage modifiers")` pin the ordering, not just the result. |
| Stun is the only control effect; Bosses ignore it; a stunned Character's Recovery/cooldowns still elapse. | **Proven on current main** | Three rows: `it("ignores Stun on Boss opponents")`, `it("prevents Stun on Boss opponents")` at the pure-combat seam, and `it("completes Recovery and advances cooldowns while a Character remains stunned")`. `it("cancels Wind-up on Stun without starting cooldown and keeps cooldowns elapsing while stunned")` covers the interaction. |
| Activation Delay = full cooldown on newly inserted Ability, applied at the boundary. | **Proven on current main** | `it("applies queued loadout edits at the Wave boundary with Activation Delay")`, with the Talent-side counterpart in the progression block. |
| Chunk-equivalence and save/reload equivalence still pass with the full rules. | **Proven on current main** | Both equivalence tests live in the same suite as the full combat rules and pass on current `main`; they are not fixture-isolated from #36's behavior. |
| No RNG anywhere in combat resolution (grep: `lootRngState` untouched by `combat.ts`). | **Proven on current main** | A grep of [`src/core/combat.ts`](../../src/core/combat.ts) for `lootRng`, `rng`, and `random` returns **zero** matches, and `it("does not touch lootRngState during combat resolution")` enforces it at the Engine seam. This is the exact grep the row names. |

## #37 — Progression: Character XP, Levels, Talents, Stage flow

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/37).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Reserve gets `floor(award / 2)`; Party full; per-defeat timing (an abandoned wave keeps partial XP). | **Proven on current main** | `it("awards full Character XP to Party Members and floor(50%) to the Reserve on opponent defeat")` and `it("keeps partial Character XP when abandoning a Wave mid-Attempt")` in `engine.test.ts`, with the unit-level `it("awards floor(50%) of the opponent xpAward to the Reserve")` in [`src/core/xp.test.ts`](../../src/core/xp.test.ts). |
| Talent Point budget equals Level; all Stat/Ability Row rules above enforced with tests. | **Proven on current main** | [`src/core/talents.test.ts`](../../src/core/talents.test.ts) pins the budget at Level (including Level 1), the five-point Stat Row split, the per-Talent five-rank cap, sixth-point Ability Row unlock with mutual exclusivity, the five-Stat-point prerequisite, deallocation ordering, and per-rank modifiers feeding Power/Max Health. |
| Talent and party edits apply only at their boundaries; Activation Delay applies to newly slotted talent Abilities. | **Proven on current main** | `it("queues Talent edits until the Wave boundary and applies Activation Delay to newly slotted Abilities")` and `it("applies setParty at the next fresh Attempt")` — note the two edit kinds have *different* boundaries and each is tested at its own. `it("strips a removed Ability Talent from loadout slots")` covers the removal path. |
| `level-up`/`xp-awarded` events carry classId + totals; chunk-equivalence still passes. | **Proven on current main** | `events.ts` declares `xp-awarded` with `classId`, `amount`, and `totalXp`, and `level-up` with `classId` and `level`; `engine.test.ts` filters on both types and asserts `classId === "knight"`. Note the "total" on `level-up` is the new `level` itself, not a cumulative XP figure — reasonable, but narrower than "totals" reads. Chunk-equivalence passes. |
| No progression field is ever rolled back on defeat/abandon (test proves it). | **Proven on current main** | The abandon row above, the Party Defeat full-restore row, and `it("crosses level-up at exact thresholds without rolling back earned XP")` in `xp.test.ts` together cover defeat and abandonment. |

## #38 — Equipment, Drops, the loot RNG stream, and the Armory model

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/38).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Roll order exactly as numbered above; a recorded-seed test locks the sequence (any reorder breaks it). | **Proven on current main** | `it("locks the full roll order for a recorded seed")` in [`src/core/equipment.test.ts`](../../src/core/equipment.test.ts) is the recorded-seed lock the row asks for. `it("steps rarity odds via crafted stream positions instead of statistics")` and `it("rolls Affix types without replacement from the eligible slot pool")` pin the individual steps deterministically rather than statistically. |
| Loot stream is the only RNG; combat files never advance it; Offline/live share it (equivalence test). | **Proven on current main** | The `combat.ts` RNG grep is empty (see #36), `it("does not touch lootRngState during combat resolution")` enforces the Engine side, and `it("shares the loot stream between chunked advancement and reload")` is the equivalence test named. |
| Second boss drop floor: Common→Uncommon with other rolls untouched. | **Proven on current main** | `it("applies the Boss second-Drop Uncommon floor without rerolling slot, Base, or Item Level")` asserts both the floor *and* the untouched-rolls clause. |
| Drops committed at encounter completion survive Party Defeat and abandonment. | **Proven on current main** | Two separate rows: `it("keeps committed Drops through Party Defeat")` and `it("keeps committed Drops through Stage abandonment via selectStage")`. |
| Equipped/Locked discard guard; exclusive assignment empties the other slot. | **Proven on current main** | `it("rejects discard for equipped or Locked pieces")` and `it("empties the other slot when a piece is assigned exclusively elsewhere")`. |
| Equipment stats apply only from the next Stage Attempt. | **Proven on current main** | `it("applies Equipment stats only from the next Stage Attempt")`. |
| Chunk-equivalence and save/reload equivalence still pass. | **Proven on current main** | Both pass on current `main`, plus the loot-specific `it("produces the same next Drop after a loot-stream snapshot round-trip")`. |

## #39 — Class Kit content data: Knight, Wizard, Priest, Hunter

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/39).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| Every number in #7's Answer appears verbatim (bases, coefficients, timings, cooldowns, durations, talent values). | **Insufficient evidence** | [`src/data/classes.test.ts`](../../src/data/classes.test.ts) pins Level 1 bases for all four Classes, `xpThresholds`, default loadouts, and a blanket "every non-basic Ability cooldown above zero" — but the field-by-field transcription check covers only **five** Abilities (Heartseeker, Steel Cut, Frost Lance, Dawn Recall, Hold the Line) of the 28. Coefficients, Wind-up/Recovery timings, Status durations, and talent values for the other 23 are not pinned against issue #7 by any test. A transcription error in an unpinned Ability would pass the whole suite. The row claims *every* number; the evidence covers a labeled sample. |
| All 28 abilities present: 4 basics, 16 Core, 8 Ability Talents; 5 buff statuses + 2 debuffs + stun handling. | **Proven on current main** | `it("ships 28 Class Abilities: 4 basics, 16 Core, 8 Ability Talents")` checks the counts and the split; `it("defines five buff statuses, two debuffs, and stun handling")` covers the status side. |
| `validateContent` passes over the assembled data. | **Proven on current main** | `it("passes validateContent with fixture stubs for sibling slices")`, and the full assembled Content also validates through the sibling data suites. |
| Spot-check tests pin at least one full AbilityDef per class field-by-field. | **Proven on current main** | This row asks only for one per class, and the four spot-checks map one-to-one onto Hunter, Knight, Wizard, and Priest — Heartseeker, Steel Cut, Frost Lance, Dawn Recall. Fully satisfied. (The gap above is in the *stronger* first row, not this one.) |

## #40 — Stage and opponent content data

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/40).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| XP allocations sum exactly to #5's budgets per encounter (validator-enforced, test-proven). | **Proven on current main** | `it("passes validateContent with exact encounter XP budgets")` in [`src/data/stages.test.ts`](../../src/data/stages.test.ts) runs the real assembled Stage data through the validator whose XP-budget rule is independently tested in #34. Both halves of "validator-enforced, test-proven" are present. |
| One ordinary family (Pipcap) reused across all Waves; three distinct Bosses; spriteKeys as pinned. | **Proven on current main** | `it("reuses one Pipcap family for ordinary Waves and three distinct Bosses")` and `it("defines three Moonberry Stages with pinned backdrop keys and rarity odds")`. |
| Every Boss telegraphed exception has Wind-up ≥ 1200ms; bosses `boss: true`. | **Proven on current main** | `it("gives every Boss a telegraphed sweep with Wind-up at least 1200ms")` iterates all three Bosses rather than sampling one. |
| Stage-clear smoke sim: default party clears Stage 1 and hits Level 2. | **Proven on current main** | `it("clears Stage 1 and reaches Level 2 within ten simulated minutes")` is a real simulated run through the Engine, and `it("allows Party Defeat at Stage 3 with the default untalented Party")` guards the other end of the difficulty curve. |
| All numbers live in the data files marked as tuning (comment), not scattered. | **Insufficient evidence** | The centralization half holds: the numbers live in [`src/data/stages.ts`](../../src/data/stages.ts) and [`src/data/opponents.ts`](../../src/data/opponents.ts), not scattered through the Engine. The *marking* half is inconsistent — `opponents.ts` carries one header comment reading "Initial combat tuning for vertical-slice opponents (issue #40)", while `stages.ts` has no occurrence of "tuning" at all (its header instead cites "issue #40 / issue #5"). No test enforces the convention, so nothing prevents further drift. This is a documentation-convention gap, not a behavioral defect. |

## #41 — Equipment content data: 12 Bases, Affix bands

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/41).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| All 12 bases exactly as tabled (ids, names, tiers, slots, classes, guaranteed stats). | **Proven on current main** | [`src/data/equipment.test.ts`](../../src/data/equipment.test.ts) has `it("ships all 12 bases exactly as tabled")` plus `it("defines 12 Equipment Bases: 6 per tier, one per slot/class combination")` for the structural invariant, and separate `it("pins Tier I guaranteed statistics")` / `it("pins Tier II guaranteed statistics")` rows for the stat half. Unlike #39, this transcription check covers the complete set, not a sample. |
| Affix bands exactly as #8's Answer; test pins every row. | **Proven on current main** | `it("pins every Affix band row")` — the test name matches the criterion's "every row" scope, and the assertions enumerate the bands rather than spot-checking. |
| `validateContent` cardinality checks pass over the assembled data. | **Proven on current main** | `it("passes equipment cardinality through validateContent")`, with the negative case covered by #34's `it("requires twelve Equipment Bases outside fixture mode")` — so the cardinality gate is proven to both accept the real data and reject a short list. |

## #42 — Asset pipeline and Archived Raw Bundle in production

Issue state: **closed**. Source: [live issue](https://github.com/jsbellamy/nightglass/issues/42).

| Live criterion | Verdict | Current-main evidence |
| --- | --- | --- |
| `npm run assets:build` rebuilds all four runtime sprites byte-identically (SHA-256 match against committed files) with no network. | **Proven on current main** | SHA-256 of all four PNGs in [`src/assets/sprites/`](../../src/assets/sprites/) was recorded, `npm run assets:build` (`python3 pipeline/acquire.py`) was rerun, and all four digests are unchanged — `knight` `6ae9b30b…`, `wizard` `a8646b19…`, `pipcap` `01322791…`, `boss-1` `58832d9a…`. `git status --porcelain` is empty after the rebuild, so nothing else moved either. The no-network clause is separately gated by the verifier's `[PASS] acquire.py opens no socket`. |
| `npm run assets:verify` green locally and in CI; CI job has no provider/network access. | **Proven on current main** | Rerun locally: all contract tests pass, then determinism `PASS` (94 files rebuilt byte-identically), separation `PASS` (78/78 effect frames caught), body-free `PASS`. CI wires it as the `assets` job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), whose only install step is `pip install pillow`; the verifier's own `[PASS] no provider/model modules imported` and socket check enforce the neutrality clause in-band. |
| Raw bytes unchanged: each sidecar's `raw_sha256` matches its moved raw. | **Proven on current main** | Recomputed SHA-256 for each raw under `assets-raw/grid_raw/` against the `raw_sha256` recorded in its `.source.json` sidecar: `boss` `ae87deb3…`, `knight` `9dfcdd69…`, `pipcap` `61521e22…`, `wizard` `cf390b25…` — four matches, zero mismatches. |
| Runtime outputs named `knight.png`, `wizard.png`, `pipcap.png`, `boss-1.png`; manifest records `"palette": "moonberry-16"`. | **Proven on current main** | Exactly those four filenames plus `manifest.json` are present. The verifier's dedicated gate reports `[PASS] manifest records moonberry-16 palette for every sprite -- {'knight': …, 'wizard': …, 'pipcap': …, 'boss-1': …}`, and the literal string appears on three manifest entries plus the fourth. |
| Stale `prototype/comfyui-fit/canonical/*.png` pair deleted. | **Regressed / current failure** | **The deletion never happened.** `prototype/comfyui-fit/canonical/` still contains `knight-canonical.png`, `wizard-canonical.png`, and `MANIFEST.md` on current `main`. This is the only row in #33–#42 that is false for reasons unrelated to a later intentional successor — it is simply outstanding cleanup from #42 itself. Low severity (the directory is prototype-only and not imported by the runtime), but the row as written is untrue. |
| Validator still rejects an off-palette frame (test_contract's gates all pass in the new location). | **Proven on current main** | [`pipeline/test_contract.py`](../../pipeline/test_contract.py) fires every rejection rule as a positive assertion in the production location: non-magenta background, wrong dimensions, non-RGBA, unapproved alpha, embedded off-palette effects, empty frame, and generator-clipped raw. All pass. This is a genuine rejection-fires check, not a "clean input passes" check. |

### Carried-over structural weakness

The determinism gate above is strong — it is a true before/after digest
comparison across a rebuild I triggered. The **body-free** gate reported
alongside it is not, and the reason is the one already recorded against #43 in
the application audit: [`pipeline/effects/verify.py`](../../pipeline/effects/verify.py)
computes its canonical digest only *after* the rebuild it is meant to guard,
then compares that value with a second digest taken moments later. Both
readings sit downstream of any mutation, so the gate cannot fail.

This matters here because #42's second row treats `assets:verify` being green
as evidence for the whole pipeline, and one of the three gates inside that green
result is vacuous. The row is still **Proven** as written — it asks for the
command to be green locally and in CI, and it is — but the confidence a reader
should draw from that green is lower than three passing gates suggests.
Remediation belongs to the #43 finding, not to a reopening of #42.

## Remediation candidates

Ordered by severity, for the Wayfinder tickets that follow. None are fixed by
this audit, which is research-only.

1. **Delete `prototype/comfyui-fit/canonical/{knight,wizard}-canonical.png`**
   (and decide whether `MANIFEST.md` goes with them) to close #42's outstanding
   row. Trivial, uncontested, no design question.
2. **Extend #39's transcription pinning from 5 Abilities to all 28**, or amend
   the criterion to match the sample the project actually intends to maintain.
   This is the largest correctness exposure in the foundation: 23 Abilities'
   coefficients, timings, and durations are currently unguarded against
   transcription drift.
3. **Reconcile the two successor-falsified rows** (#33's capability list, #35's
   interim label). Neither is a defect. The decision to make is editorial — how
   this project records a closed criterion that a later slice legitimately
   superseded — and it applies to the #44/#45 successor rows in the application
   audit too, so it wants one answer, not four.
4. **Settle the tuning-comment convention** for #40 and enforce it, or drop the
   clause. Lowest severity; documentation-only.
5. **Fix the body-free verifier ordering** — already owned by the #43 finding,
   recorded here only because #42 leans on the same green.

## Method notes

- Every command in this document was rerun on current `main` at `3528abf`;
  none of the results are quoted from a pull-request body or a prior audit.
- Test-name citations are load-bearing: where a row is marked proven by a test,
  the test's name asserts the same scope the row claims. Where the test's scope
  is narrower than the row (#39's transcription, #40's comment marking), the
  verdict is **Insufficient evidence** even though the suite is green.
- The working tree was left clean; the asset rebuild is byte-identical and
  produced no diff to revert.
