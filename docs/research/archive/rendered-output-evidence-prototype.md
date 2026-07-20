# Rendered-output evidence: prototype findings

> **Historical.** Point-in-time record from 2026-07-19. Superseded by
> [`docs/agents/acceptance-evidence.md`](../../agents/acceptance-evidence.md) and the
> production harness at `e2e/` (`npm run test:evidence`). Findings here may describe
> a state that no longer exists; do not action them without re-verifying against the
> current tree.

Resolves Wayfinder ticket "Prototype rendered-output evidence for the Battle
Tile and Management Dock" (nightglass#91), on the map "Wayfind vertical-slice
validation and rendered-output testing" (nightglass#86).

Successor to [`acceptance-evidence-seams.md`](./acceptance-evidence-seams.md),
which proposed a draft evidence map and left the concrete rendered scenarios,
the harness choice, and the native residual to this ticket. This document
records what a working prototype demonstrated, not a proposal.

Prototype harness (throwaway; promoted by nightglass#96 to the runnable seam
at [`e2e/`](../../../e2e/) via `npm run test:evidence`):
formerly `prototype/rendered-evidence/`.
Screenshots from the prototype run: [`evidence/91-prototype/`](../evidence/91-prototype/).
Measured against `main` at `3528abf`.

## The evidence path

**Playwright over `vite preview`.** Two pages in one browser context, so one
origin and a genuinely shared `BroadcastChannel`:

- tile at `/`, sized to `TILE_WIDTH` × `TILE_HEIGHT`
- dock at `/?window=dock`, sized to `DOCK_WIDTH` × `DOCK_HEIGHT`
- `deviceScaleFactor: 1`, because native-1× is itself a criterion

Playwright was already present at 1.61.1 with Chromium cached, so the dependency
cost the research doc flagged as an open question is lower than assumed. The
whole run is ~23 checks in about six seconds.

This closes blind spot **B1** (no rendered seam of any kind) and **B2** (the
accessibility floor routed to a Playwright suite that did not exist).

## Decisions

### Scenarios are driven by bus injection

The harness posts commands onto the `BroadcastChannel` as a third peer, exactly
as the Dock does:

```js
new BroadcastChannel("nightglass").postMessage({
  type: "command",
  command: { cmd: "selectStage", args: ["stage-3"] },
});
```

This needs **no production change and no test-only hook**. It is Nightglass's
equivalent of SideScape's port-injected `manual-check:` scenarios, and it uses a
seam already exercised in production by the Dock.

It is what makes the five-opponent criterion reachable at all: five-opponent
waves exist only in stages 2 and 3, so a default run never encounters one. That
is why the criterion sat at *insufficient evidence* — the state was
unreachable, not the assertion unwritable.

Rejected: URL query params (adds test-only branching to production boot) and
driving `mountTileShell` options (needs a harness bundle rather than the real
built artifact).

### Screenshots are review-only committed assets

Committed as linked evidence for a human to read at the acceptance row, with no
diff gate. The map rules a broad pixel-diff visual-regression system out of
scope, and the prototype gave a positive reason to keep human review rather than
replace it with numbers — see the toast finding below.

### Native residual is a narrow trigger list

Chromium is not WKWebView, and Tauri APIs are absent under `vite preview`.
Manual `npm run tauri dev` observation is required **only** when `src-tauri/**`,
`app.windows`, or capabilities change; every other rendered criterion rides the
browser harness. This settles blind spot **B6**.

## What the prototype proved

Four of the seven *insufficient evidence* rows from the application audit are
now reachable:

| Row | Result |
| --- | --- |
| 480×112, 24px status line, five opponents fit at 1× without overlap | Exact 480×112, status line exactly 24px, 8 combatants with zero pairwise overlap and none out of bounds, in the forced five-opponent stress layout |
| Real cross-webview command + Snapshot delivery | `dock-opened` → tile snapshot → populated dock render, across two real pages; dock close crossed back with the tile pump undisturbed |
| AA contrast tokens | 13.0:1 to 18.6:1 across status, dock toggle, health and boss-health text — all clear of the 4.5:1 floor |
| One surface at a time; five Dock surfaces | All five render with content at the true dock geometry, one tab row, no clipping, surface scrolls rather than clips |

## Three findings that shape the gate

### 1. A naive native-1× assertion is wrong

`rendered == intrinsic` **fails** legitimately: `knockout-collapse` applies
`transform: scale(0.88, 0.92)` to `.combatant-stack`, so a knocked-out sprite
measures 28.16 × 44.16 from a 32 × 48 source. The assertion must exclude
deliberately transformed states.

This also confirms the correction #90 made to the audit: declared, intrinsic and
CSS dimensions do agree at 32 × 48, and the render is 1× for every combatant not
in a transformed state.

### 2. Assert on the node the CSS actually targets

A first version read knockout signals off `.combatant` and reported
`filter: none, transform: none` — the filter lives on `.combatant-sprite` and
the transform on `.combatant-stack`. It would have passed while proving nothing.
A green assertion on the wrong node is worse than no assertion, because it
retires the row.

### 3. Screenshots caught what measurement could not

In the five-opponent scene the "Drop · Uncommon" toast **occludes the rightmost
opponent**. The rect check passed cleanly because the toast is not a
`.combatant` and was never in the measured set.

This is the concrete argument for review-only screenshots alongside numeric
assertions: the numbers only constrain what you thought to measure. It is also a
candidate product defect, handed to the remediation ticket rather than fixed
here — the map puts fixes out of scope during Wayfinding.

### Harness hygiene

An initial 420 × 560 dock viewport produced a clipped "Stage" tab and dead space
that both vanished at the real 480 × 336. The harness must import
`DOCK_WIDTH`/`DOCK_HEIGHT` and `TILE_WIDTH`/`TILE_HEIGHT` from source rather
than hardcode geometry, or it will manufacture failures the app does not have.

## Still open

- Which rows become their own remediation slices, and the disposition of the
  toast-occlusion defect — nightglass#92.
- The gate and evidence-map wording, and where the map physically lives —
  nightglass#87.
- The knockout-readability row still wants a committed rendered review; the
  prototype shows the non-colour signals resolve in a real renderer, but
  "readable in the crowded tile" remains a human judgement on a screenshot.
