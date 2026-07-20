# Acceptance evidence seams

> **Historical.** Point-in-time record from 2026-07-19. Superseded by
> [`docs/agents/acceptance-evidence.md`](../agents/acceptance-evidence.md) and
> Nightglass [`.agents/issue-implementer.md`](../../.agents/issue-implementer.md)
> step 5. Findings here may describe a state that no longer exists; do not action
> them without re-verifying against the current tree.

Researched on 2026-07-19 against `main` at `3528abf` (`Audit rendered
application acceptance evidence (#93)`), for Wayfinder ticket
[#90](https://github.com/jsbellamy/nightglass/issues/90) on map
[Wayfind vertical-slice validation and rendered-output testing](https://github.com/jsbellamy/nightglass/issues/86).

This document answers: **what can Nightglass's existing seams actually prove,
and where are the blind spots** when measured against the criterion-by-criterion
publication gate in SideScape `.agents/issue-implementer.md` step 5. It proposes
a low-level evidence map. It deliberately does **not** choose the final rendered
scenarios or edit `.agents/issue-implementer.md` — those belong to later
tickets.

## The standard being measured against

SideScape's step 5 requires, for every live checkbox: a `met` verdict plus
**specific evidence at the seam the criterion names** — a test name, code
location, command result, or manual native observation. Two clauses do the real
work:

- *"Never infer a visual/integration criterion from a merely related test."*
- *"Require a manual `npm run tauri dev` observation only after a change to
  the `app.windows` block, Rust window/plugin code, or macOS-specific
  visuals."*

The second clause is only affordable because SideScape carries an explicit **UI
evidence map** (`AGENTS.md` §"UI evidence map") that routes each named check to
an automated seam: port-injected `manual-check:` describes in
`window-geometry.test.ts` / `window-chrome.test.ts` for geometry, a Playwright
`browser-degraded.spec.ts` smoke for browser behaviour, and committed
`e2e-screenshots/*.png` for visual layout. Manual native observation is the
narrow **residual**, not the default.

Nightglass has adopted the first clause (via `AGENTS.md` §"Git workflow") but
has **no equivalent evidence map and no browser or native seam at all**. That
asymmetry is the root of every blind spot below.

## Seam inventory on current `main`

`npm test` — 27 Vitest files, 199 tests, 1.0s. `npm run typecheck`, `npm run
build`, `npm run assets:verify`, and `cargo check` all pass.

| # | Seam | How it is reached | What it genuinely proves | Hard limit |
| --- | --- | --- | --- | --- |
| S1 | **Engine** | `createEngine(content, saved?, lootSeed?)` → commands → `advanceBy` → `snapshot()`, fixture Content from [`src/core/testing/fixture-content.ts`](../../src/core/testing/fixture-content.ts) | Deterministic combat numbers, event order/timestamps, chunk neutrality, command rejection | Nothing about presentation; by design it cannot name an asset |
| S2 | **Pure functions** | Direct unit tests ([`dock-geometry.test.ts`](../../src/ui/dock-geometry.test.ts), `xp`, `combat`, `equipment`, `presentation` math) | Worked-example math independent of the implementation | Proves the *number*, never that anything applied it on screen |
| S3 | **Content validator** | [`src/core/validate-content.test.ts`](../../src/core/validate-content.test.ts) over the whole assembled `Content` | Aggregate id resolution, registry completeness, encounter budgets | Content shape only |
| S4 | **DOM integration** | Vitest + happy-dom via `// @vitest-environment happy-dom` (12 of 27 files) | Element structure, classes, `data-` attributes, text, event wiring, keyboard traversal, fake-timer pump/render gating | **No layout engine**, and `styles.css` is a `<link href>` no test loads, so the project's actual cascade is absent: `getBoundingClientRect()` is zeroed and only inline/authored values are visible. Overlap, fit, contrast, and readability are all unreachable |
| S5 | **In-process bus** | [`src/ui/bus.test.ts`](../../src/ui/bus.test.ts) + [`src/main.test.ts`](../../src/main.test.ts) over a happy-dom `BroadcastChannel` | Message vocabulary, handler dispatch, the `dock-opened` → fresh-Snapshot handshake | One process, one channel implementation. Says nothing about delivery between two real webviews |
| S6 | **Dock window port** | [`src/ui/dock-window.ts`](../../src/ui/dock-window.ts) `DockWindowPort` with injected `deps` (mock `createDockWindow`, `getTileOuterPosition`, `getMonitorForTile`, `onTileMoved`) | Call sequencing, open/close/toggle state, reposition math wiring, tile-move subscription/cleanup | The port is *the* mock boundary — nothing beyond it is exercised. This is Nightglass's closest analogue to SideScape's port-injected `manual-check:` scenarios, but it is not named or routed as acceptance evidence |
| S7 | **Asset pipeline** | `npm run assets:verify` → `pipeline/test_contract.py` + [`pipeline/effects/verify.py`](../../pipeline/effects/verify.py); wired in CI | Acquisition contract, byte-level determinism (94 files), effect/body separation (78/78 frames) | The **body-free gate is vacuous**: it computes `canon = digest_dir(SPRITES)` *after* the rebuild and compares it to a second post-rebuild digest, so a mutation performed by the rebuild is present in both operands. Carried forward from the #43 audit row |
| S8 | **Rust / native** | `cargo check` in CI; [`src-tauri/capabilities/default.json`](../../src-tauri/capabilities/default.json) reviewed by hand | Compilation, capability scope | No native run, no window observation, no cross-webview traffic. `npm run tauri dev` is unrouted and unrecorded |
| S9 | **Release** | Static inspection of [`.github/workflows/release.yml`](../../.github/workflows/release.yml) + `scripts/set-version.mjs` | Workflow shape, stamping | Dispatch-only, so no green run is ever produced by CI |

Two structural facts shape everything: `vite.config.ts` sets
`test.environment: "node"`, so DOM is opt-in per file; and
[`index.html`](../../index.html) hosts **both** `#tile` and `#dock` in one
document, selected by the `?window=dock` query — meaning a browser seam could
mount either surface, and could mount *both* on a shared `BroadcastChannel`.

## Blind spots

**B1 — No rendered seam of any kind (severity: high).** There is no Playwright,
no headless browser, no screenshot, no committed visual review. Nightglass
cannot currently produce SideScape's "visual layout evidence" row for any
criterion. Every physical claim — the five-opponent 480×112 fit at 1× without
overlap (#44), the non-colour Knockout read (#45), AA contrast (#46) — is
unprovable today, which is exactly why the audit returned seven *insufficient
evidence* rows rather than failures.

**B2 — `docs/agents/code-style.md` cites a suite that does not exist (severity:
high, cheap to fix).** Line 44 states "The Playwright e2e suite owns the
accessibility floor (keyboard, contrast, reduced-motion); ordinary UI slices do
not duplicate it." No Playwright dependency, config, spec, or script exists
anywhere in the repo. The standing seam agreement therefore **routes the
accessibility floor to a void**: slices are told not to duplicate a suite that
never runs. This is a documentation defect, not a code one, and it plausibly
explains the #46 contrast row.

**B3 — Sprite scaling is unasserted at any seam, and the prior audit row is
wrong (severity: high).** The #44 integer-scale row is checked only by reading
the inline `imageRendering` value in
[`battle-tile.test.ts`](../../src/ui/battle-tile.test.ts). No test relates
`styles.css` to sprite dimensions, and `styles.css` is a `<link href>` that no
test loads, so happy-dom never cascades it — a mismatch *cannot* fail.

**Correction to a recorded decision.** The application audit
([#88](https://github.com/jsbellamy/nightglass/issues/88),
[`vertical-slice-application-audit.md`](./vertical-slice-application-audit.md))
marked this row **Regressed / current failure**, citing Pipcap as 29×40 and Boss
1 as 32×41 against a 32×48 CSS box. On `3528abf` that is not so:
[`src/ui/sprites.ts`](../../src/ui/sprites.ts) declares all four sprites 32×48,
and the PNG IHDR headers of `knight`, `wizard`, `pipcap`, and `boss-1` are each
32×48. Declared, intrinsic, and CSS dimensions agree; the render is 1×. The
sprite file has not changed since #78, so this was an audit error, not a later
fix. The row should be **Insufficient evidence** (nothing proves it), not a
failure. This does not change the audit's headline seven-blind-spot conclusion,
but it does move one row out of the "two failures" bucket — the remaining
failure is the #44 three-layer row.

The seam lesson survives the correction, and is the reason to keep this item:
integer-scale is provable **without** a browser, by a pure test comparing
`SPRITE_SOURCES` dimensions against the `.combatant-sprite` rule parsed from
`styles.css`. Not every visual criterion needs pixels — some need only the right
seam. That such a test does not exist is why an audit could get the row wrong in
either direction.

**B4 — No cross-webview seam (severity: high).** S5 and S6 meet at a mock. The
bus test runs one process; the window test stops at `DockWindowPort`. Nothing
proves a command published in the Dock webview arrives in the tile webview, or
that the `dock-opened` handshake survives a real second window. Four of the six
#46 rows sit in this gap.

**B5 — No named-scenario vocabulary (severity: medium).** SideScape's
`manual-check:` describe names are what let a criterion row cite an automated
scenario instead of demanding a manual run. Nightglass has no such convention,
so there is no way for an issue row to point at S6 as its proof — the port-injected
capability exists but is unaddressable.

**B6 — Native observation is unbounded (severity: medium).** Because no residual
scope is defined, any native-sounding criterion falls to "run Tauri manually",
which nobody records. SideScape bounds this to three concrete triggers
(`app.windows` block, `src-tauri/src/`, macOS visuals) — Nightglass's equivalent
triggers exist (`src-tauri/src/lib.rs`, `main.rs`, `capabilities/default.json`)
but are unwritten.

**B7 — The body-free gate is structurally inert (severity: medium).** See S7. It
reports PASS and always will.

**B8 — Issue checkboxes are never checked (severity: low).** All 50 rows across
#43–#52 remain textually unchecked regardless of state, so the tracker carries
no per-criterion record. The acceptance matrix lives only in PR bodies, which is
why the audit had to reconstruct it.

## Proposed evidence map (draft)

A first cut at routing each named check to the narrowest seam that can prove it.
**Proposal only** — the concrete scenario list is a later ticket.

| Named check | Proposed seam | New? |
| --- | --- | --- |
| Native-1× sprite scaling | Pure test: every `SPRITE_SOURCES` entry (and its PNG IHDR) vs. the `.combatant-sprite` rule parsed from `styles.css` | new, no browser (B3) |
| Five-opponent fit / no overlap at 480×112 | Browser: real layout, measured `getBoundingClientRect()` on all five slots + status line | new, browser |
| Knockout readable without colour | Browser screenshot at 1×, committed, plus the existing grayscale-forced DOM assertions | new, browser |
| AA contrast | Browser: computed-style contrast calculation over the token set | new, browser (closes B2) |
| Keyboard floor (open → cycle → close) | Browser, spanning tile → Dock, not the current mount-first component tests | new, browser |
| Dock second-window lifecycle, positioning, pump continuity | Named `manual-check:` describes over `DockWindowPort` (S6), promoted to citable evidence | rename/route existing |
| Real cross-webview command + Snapshot delivery | Browser: two pages on one origin sharing `BroadcastChannel`, tile at `/`, dock at `/?window=dock` | new, browser |
| Native window chrome, focus, drag; macOS visuals | Residual manual `npm run tauri dev`, triggered only by `src-tauri/**` or `app.windows` changes, recorded in the acceptance row | new convention (B6) |
| Engine / content / math criteria | S1–S3 unchanged — already sufficient | none |
| Body-free asset gate | Capture the sprite digest **before** authoring/derivation | fix (B7) |

The browser rows all collapse onto one dependency: a headless-Chromium harness
over `vite preview`. Nightglass's single-`index.html`, query-selected two-window
design makes the cross-webview row unusually cheap — both surfaces are reachable
as two pages of the same origin. Whether that is Playwright (SideScape's choice,
a new dependency and a `npx playwright install` step) or something lighter is a
decision for a later ticket, not this one.

## Open questions handed forward

- Which specific rendered scenes and Dock states the harness must capture, and
  which are committed as review assets versus asserted numerically.
- Whether committed screenshots are review evidence only or gain a diff gate —
  the map already rules a broad pixel-diff system out of scope.
- Whether `.agents/issue-implementer.md` grows a Nightglass evidence-map
  reference, and where that map physically lives (`AGENTS.md` like SideScape,
  or `docs/agents/code-style.md` where the seam agreement already sits).
- Whether B2 and B3 are fixed as part of the gate work or filed as their own
  remediation slices.
- Whether the B3 correction is applied to
  `vertical-slice-application-audit.md` in place, or recorded only here — the
  audit is a closed decision on the map, so amending it is a scoping call.

## Verification record

```text
git rev-parse --short HEAD          # 3528abf
npm test                            # 27 files, 199 tests passed
grep -rl "happy-dom" src            # 12 files
grep -rn "playwright" package.json docs AGENTS.md CLAUDE.md
                                    # only docs/agents/code-style.md:44
```

No tracker or source state was changed while collecting this research beyond the
Wayfinder claim on #90.
