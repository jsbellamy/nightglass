# Terminal scene review (nightglass#103)

Independent revalidation of the `wave:evidence-gate` tickets (#98–#102). This
pass was run by a session that did **not** author those PRs. It is a scene
review, not a re-derivation of the 99-row audit.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-07-19 |
| Base | `main` @ `3c30cf6` (includes #102 observation) |
| Browser suite | `npm run test:evidence` — **3 passed in 55.7s** |
| Platform | macOS arm64 (review machine); scenes from Chromium via Playwright |

## Baseline (confirmed green)

| Check | Result |
| --- | --- |
| `npm run test:evidence` | 3 passed (~56s) |
| `npm test` | 29 files / 197 tests passed |
| `npm run typecheck` (`tsc --noEmit`) | pass |
| `npm run build` | pass |
| `npm run assets:verify` | pass (contract + body-free gate) |
| `cargo check` (in `src-tauri`) | pass |

## Scenes reviewed

Harness output (`e2e-screenshots/`, gitignored) was inspected after the fresh
run. Representative frames are committed here so the judgement stays citable:

| Scene | Path |
| --- | --- |
| Tile initial | [`01-tile-initial.png`](./01-tile-initial.png) |
| Tile combat / knockout | [`02-tile-combat.png`](./02-tile-combat.png) |
| Five-opponent stress | [`05-tile-five-opponents.png`](./05-tile-five-opponents.png) |
| Dock Party | [`03-dock-initial.png`](./03-dock-initial.png) |
| Dock Loadout | [`04-dock-2-loadout.png`](./04-dock-2-loadout.png) |
| Dock Stage | [`04-dock-5-stage.png`](./04-dock-5-stage.png) |
| Knockout judgement artifact | [`../knockout-readability/tile-combat.png`](../knockout-readability/tile-combat.png) |
| Native Dock (prior #102) | [`../102-native-dock-lifecycle/`](../102-native-dock-lifecycle/) |

Also inspected (not re-copied; same run): `04-dock-1-party.png`,
`04-dock-3-talents.png`, `04-dock-4-armory.png`.

### Artifact correction

On `main` before this pass, `docs/research/evidence/knockout-readability/tile-combat.png`
was **byte-identical** to `01-tile-initial.png` (SHA
`0623f4b19834829769d6d4cc82a219fe577064a9`) — the pre-knockout frame, not the
combat frame the harness is written to emit. Re-running `npm run test:evidence`
rewrote the artifact so it matches `02-tile-combat.png` (SHA
`9a574d60fc66d0a4e8b7b6e73b38fdb148414ce0`). The knockout judgement below is
against the corrected combat frame.

## Knockout-readability judgement (`evidence: knockout-readability`)

**Verdict: readable — row discharged.**

Against
[`../knockout-readability/tile-combat.png`](../knockout-readability/tile-combat.png)
(same pixels as [`02-tile-combat.png`](./02-tile-combat.png)):

- A knocked-out opponent sits in the left opponent slot.
- Non-colour signals are visible without relying on HP-bar hue alone:
  full grayscale + darkened sprite (`knockout-desaturate`), slight
  bottom-anchored collapse (`knockout-collapse`), and no live green health fill
  under that combatant.
- Living opponents beside it remain saturated pink pipcaps with green fills, so
  the KO state reads in the crowded 3+3 tile.

This discharges the human judgement #98 explicitly deferred.

## Visual findings assertions did not constrain

These are scene observations. Rect / CSS assertions can stay green while they
remain wrong.

1. **Drop toast occlusion (known, #104)** — Not visible in *this* five-opponent
   capture (timing landed on a centred **"Wave 2"** banner instead). The defect
   remains filed and is still visible in the prototype frame
   [`../91-prototype/05-tile-five-opponents.png`](../91-prototype/05-tile-five-opponents.png)
   (`Drop • Uncommon` over the opponent row). Unfixed; out of wave scope.

2. **Wave banner over the battlefield** — In
   [`05-tile-five-opponents.png`](./05-tile-five-opponents.png) a semi-opaque
   "Wave 2" label sits in the centre of the tile and covers battlefield space.
   Combatant rects still pass because the banner is not a `.combatant`.

3. **"PRIEST" callout under a knight sprite** — Tile scenes show a yellow
   `PRIEST` label under the leftmost party combatant, whose body art reads as
   the knight. Looks like a misplaced class/ability callout; not measured by
   geometry rows.

4. **Native Dock geometry still wrong (#102)** — Browser dock shots at
   `/?window=dock` look fine; the *native* Dock still opens pinned
   bottom-right rather than `dockRect` above/below the tile. See
   [`../102-native-dock-lifecycle/02-dock-open-misplaced.png`](../102-native-dock-lifecycle/02-dock-open-misplaced.png).

5. **Native effect glyphs broken (#102 incidental)** — Blue `?` placeholders
   for effect/`img` loads under Tauri; browser scenes do not show this.

Dock browser surfaces themselves look coherent: five tabs in one row, Party
scrolls rather than clipping (BACK row partially visible), Loadout / Talents /
Armory / Stage each populated.

## Row-by-row across the wave

### #98 — Browser acceptance scenarios

| Row | Disposition |
| --- | --- |
| Tile geometry (five-opponent stress, 480×112, status 24px, 8 combatants, no overlap/OOB) | **Proven** — `evidence: tile-geometry`; scene [`05-tile-five-opponents.png`](./05-tile-five-opponents.png) matches the claim for combatants (toast/#104 separate) |
| Cross-webview delivery | **Proven** — `evidence: cross-webview-delivery` green; dock scenes populated from tile bus |
| AA contrast ≥ 4.5:1 floor | **Proven** — `evidence: aa-contrast` green (computed-style seam) |
| Five Dock surfaces at 480×336 | **Proven** — `evidence: dock-surfaces`; scenes show five tabs + populated surfaces |
| Knockout artifact emitted/committed | **Proven** (after correction in this pass) |
| Knockout readability judgement | **Proven here** — see above |

### #99 — Static / pipeline guards

Not a rendered seam. Confirmed via baseline: `assets:verify` body-free gate
PASS; `npm test` includes `evidence: native-1x-scaling`; least-privilege /
stale-prototype work landed in #108. **Proven** at deterministic seams.

### #100 — Ability number contract fixture

Not a rendered seam. Mechanical comparison is in the green unit suite.
Transcription diligence remains a human read of
`src/data/fixtures/class-kit-number-contract.ts` vs issue #7 (as #109 stated) —
this pass does not re-litigate that read. **Proven** as the wave ticket's
mechanical gate; transcription correctness stays a one-time human act already
called out on #109.

### #101 — Editorial retirements / discharge pointers / audit correction

Docs + GitHub comments (#110). **Proven** as editorial work; nothing to see in
a scene.

### #102 — Native Dock lifecycle

| Row | Disposition |
| --- | --- |
| Ran `npm run tauri dev` vs #96 checklist | **Proven** — note committed |
| Native lifecycle at **true geometry** | **Not proven** — window + handshake yes; geometry **fail** (bottom-right) |
| Close semantics (tile pump undisturbed) | **Adapted proven** — in-UI close only; OS chrome N/A (`decorations: false`) |
| Committed note + screenshots + platform/Tauri versions | **Proven** |

## Wave close posture

Browser / static / editorial rows the wave promised are proven. The deferred
knockout-readability judgement is discharged **readable**. Native Dock
**true geometry** remains an open product defect recorded by #102 — this
terminal pass does not pretend the scene review repaired it.

Open follow-ups already filed or recorded outside the wave: #104 (toast
occlusion), native Dock positioning, native effect-image loads.
