# Fowl Harvest Management Dock UI contract

Approved interaction contract for expanding the Management Dock to **six Stages**
and **two Talent Tiers** per Character without restyling unrelated surfaces.
Frozen by [#383](https://github.com/jsbellamy/nightglass/issues/383). Downstream
content, Engine, and asset slices may land before UI work; until a UI slice
explicitly cites this document, the shipped single-Tier Talent renderer and
three-Stage list remain **interim** behavior.

| Field | Value |
| --- | --- |
| Workspace | 800×480 logical pixels (`docs/adr/0005-dock-workspace-geometry.md`) |
| Surfaces in scope | Character → Talents, Stage tab, Armory tab |
| Vocabulary | `CONTEXT.md` — Stage, Talent Tier, Talent Tree, Visual Theme, Pending Edit, Management Dock |
| Out of scope for this contract | Battle Tile combat layout, Character Formation/Loadout chrome beyond Pending Edit rules shared with Talents |

## Approved rules versus illustration

Sections labeled **Interaction rules** are normative: a future UI slice must
implement them or file a successor contract issue. Sections labeled **Text
wireframe (illustrative)** show one acceptable layout; spacing, typography, and
chrome may change if the rules and evidence hooks are preserved.

Do **not** introduce domain synonyms such as Campaign, World, or Biome.
**Moonberry** and **Fowl Harvest** in this document name **Visual Theme**
families used only as **editorial group labels** in the Stage list. They do not
define progression, unlock logic, or playable scope. **Visual Theme remains
independent of Stage progression** (`CONTEXT.md`).

---

## Talent Tree (Character → Talents)

### Interaction rules

1. **One tree, two Tiers.** The Talents sub-surface renders every authored
   **Talent Tier** for the picker-selected Character in a **single vertically
   scrollable** column (`talent-tree-scroll`). Tier 1 appears above Tier 2 in
   content order. The existing **sticky detail** panel (`aside.talent-detail`,
   `[data-talent-detail="true"]`) stays beside or adjacent to the tree; selecting
   any Talent cell updates that panel without losing scroll position (surface
   shell scroll/focus retention in `src/ui/surface-shell.ts`).

2. **Tier gate (Tier 1 → Tier 2).** Tier 2 is **locked** until Tier 1 has **all
   six** Talent Points allocated (five Stat Row points plus one Ability Row
   point). While locked:
   - Tier 2 cells are not allocatable (`disabled` / `aria-disabled="true"`).
   - A visible **gate connection** links Tier 1’s Ability Row to Tier 2’s Stat
     Row (connector line, bracket, or equivalent non-text-only cue).
   - Copy explains the lock, e.g. “Allocate all six Talent Tier 1 points to
     unlock Talent Tier 2.”

3. **Within-tier gates** (unchanged). Each Tier’s Ability Row stays locked until
   five Stat Row points are spent in that Tier. Existing gate copy semantics in
   `src/ui/talents-surface.ts` apply per Tier.

4. **Selection and detail.** Talent cells remain pressable buttons
   (`.talent-cell`, `[data-talent-id]`). **Selected** cells use `.selected` (and
   visible `.focus-ring` when focused). **Chosen** Ability Talents keep
   `.talent-cell--chosen` / check mark behavior. Stat and Ability detail actions
   (`[data-talent-action="allocate"|"deallocate"]`) stay in the detail panel.

5. **Cascade-safe respec feedback.** Engine rules (#401): Tier 1 cannot be
   reduced while Tier 2 holds any point; a Tier Stat Row cannot drop below five
   while that Tier’s Ability point remains. When the player selects **Remove
   point** on Tier 1 but Tier 2 is non-empty, the detail panel shows explicit
   feedback (same severity as the loadout warning), e.g. “Clear all Talent Tier 2
   points before reducing Talent Tier 1.” Disabled buttons alone are not
   sufficient. Use `[data-talent-cascade-blocked="true"]` on the message element
   for tests.

6. **Pending Edit versus combat.** The tree reflects **effective** Talent state
   (pending edits applied in the Snapshot view). When a pending Talent edit
   exists for the Character, show `pendingMarker()` with
   `[data-pending-kind="talent"]` and class `pending-marker pending-wave` (“Applies
   at next Wave”). Combat on the Battle Tile continues using **committed** state
   until the Wave or Boss boundary; the marker must remain visually distinct from
   applied combat (cool blue wave border per `src/styles.css`), not conflated with
   **Current** Stage labels or combat health.

7. **Points header.** Keep level and available Talent Point count
   (`[data-talent-points="true"]`) above the tree.

### Text wireframe (illustrative)

```text
┌─ Character › Talents ────────────────────────────────────────────────┐
│ Knight · Level 12          2 Talent Points available                 │
│ ┌ Applies at next Wave ──────────────────────────────────────────┐ │  ← pending only
│ └────────────────────────────────────────────────────────────────┘ │
│ ┌─ talent-tree-scroll ────────────────┐ ┌─ talent-detail (sticky) ─┐ │
│ │ TALENT TIER 1                        │ │ Thornmail                │ │
│ │ Stat Row                             │ │ +Armor per rank          │ │
│ │  [5/5][3/5]  (two stat cells)        │ │ [Add point] [Remove]     │ │
│ │ Ability Row — unlocked               │ └──────────────────────────┘ │
│ │  [✓ pick A] [  pick B ]              │                              │
│ │           ║  gate connector          │                              │
│ │ TALENT TIER 2 — LOCKED               │                              │
│ │ Allocate all six Tier 1 points…      │                              │
│ │  [░][░] stat   [░][░] ability        │                              │
│ └──────────────────────────────────────┘                              │
└──────────────────────────────────────────────────────────────────────┘
```

### Keyboard and focus (Talent Tree)

Order within the Talents section after the Character picker and sub-tab strip
(`e2e/keyboard.spec.ts` pattern):

1. Talent cells in **document order** inside `talent-tree-scroll`: Tier 1 Stat Row
   left-to-right, Tier 1 Ability Row left-to-right, then Tier 2 rows when
   unlocked (locked Tier 2 cells are skipped by Tab).
2. Detail panel for the selected cell: primary action (Add point / Choose), then
   secondary (Remove).
3. **Enter** / **Space** on a cell selects it (updates detail) consistent with
   today’s `bindPressable` + focus handler behavior in `src/ui/talents-surface.ts`.
4. Every focused control shows a visible **focus ring** (`.focus-ring`); keyboard
   acceptance extends `e2e/keyboard.spec.ts` or adds a named slug below.

---

## Stage surface (Stage tab)

### Interaction rules

1. **One list, six Stages.** Render every `StageDef` from Content in a single
   **scrollable** list (`stage-list-scroll` wrapping `.stage-list`). Do not split
   Stages across tabs or filters.

2. **Editorial grouping.** Insert non-interactive group headings:
   - **Moonberry** — Stages **1–3** (existing night-garden Visual Theme).
   - **Fowl Harvest** — Stages **4–6** (toxic rural dusk Visual Theme; see
     `docs/fowl-harvest-theme.md`).  
   Headings are labels only; unlock still follows `progression.unlockedStage` and
   authored `StageDef.id`.

3. **Row content.** Each row remains a button (`.stage-row`, `[data-stage-id]`):
   Stage **name** from Content, **lock glyph** when `id > unlockedStage`, **Current**
   label when matching the active Attempt’s Stage. Locked rows are `disabled`.

4. **Select and confirm (unchanged).** Activating an unlocked row does **not**
   change Stage immediately. It opens the confirm region (`.stage-confirm`,
   `[data-surface-retain="true"]`, `[data-pending-stage]`) with **Confirm** /
   **Cancel** (`[data-stage-confirm="yes"|"no"]`). Copy and `selectStage` command
   semantics stay as in `src/ui/stage-surface.ts`. Confirm receives deferred
   focus on **Confirm** for keyboard safety.

5. **Attempt context.** Keep `attempt-position` and **Failure Policy** below the
   list; policy copy still reflects defeat-hold vs normal Attempt.

6. **Pending Edit.** Stage selection is not a Pending Edit; changing Stage
   abandons the Attempt per confirm copy. Do not show wave/attempt pending
   markers on Stage rows.

### Text wireframe (illustrative)

```text
┌─ Stage tab ──────────────────────────────────────────────────────────┐
│ Current Attempt: Stage 2, Wave 1, combat                             │
│ ┌─ stage-list-scroll ─────────────────────────────────────────────┐ │
│ │ MOONBERRY                                                         │ │
│ │  ( ) Stage 1 · Orchard Understory                                 │ │
│ │  (•) Stage 2 · Moonlit Bramble              Current               │ │
│ │  ( ) Stage 3 · Nightbloom Terrace                                 │ │
│ │ FOWL HARVEST                                                      │ │
│ │  (🔒) Stage 4 · Last Stop Diner                                   │ │
│ │  (🔒) Stage 5 · Crooked Cornfield                                 │ │
│ │  (🔒) Stage 6 · Harvest Yard                                      │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│ Failure Policy — Retry / Retreat copy…                               │
│ ┌ Confirm Stage selection (overlay, retained on rebuild) ─────────┐ │
│ │ Abandons the current Attempt…  [Confirm]  [Cancel]                │ │
│ └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

Approved Stage 4–6 **names** (from inactive content #416): Last Stop Diner,
Crooked Cornfield, Harvest Yard.

### Keyboard and focus (Stage)

1. Tab order: unlocked `.stage-row` elements in list order (1→6), skipping
   disabled rows.
2. **Enter** on a row opens confirm; focus moves to **Confirm** (microtask defer
   per current implementation).
3. **Tab** cycles Confirm → Cancel; **Enter** on Confirm commits; Cancel dismisses
   without command.
4. Extend `e2e/keyboard.spec.ts` (Stage segment) for six-row lists and Fowl
   Harvest rows when Content ships six Stages.

---

## Armory surface

### Interaction rules

1. **No Equipment Tier filter.** Do **not** add a toolbar control that filters the
   collection by **Equipment Tier** (I–IV). Sorting by Tier remains allowed (see
   below). Slot filter, state filter, and compatibility browse are unchanged.

2. **Preserved controls** (match `src/ui/armory-surface.ts`):
   - **Icon tiles** — `.equipment-card` with content-tier icons, rarity class,
     unseen/locked badges.
   - **Labels** — comparison popover and metadata lines continue to show
     **Equipment Tier** and **Item Level** (e.g. `Tier 2 · Item Level 3`).
   - **Sorting** — including `tier` in the sort `<select>` (`[data-armory-sort]`).
   - **Transient comparison** — hover/focus popover (`[data-armory-compare-popover]`),
     not a persistent detail column.
   - **Drag-only equip** — `application/x-nightglass-armory-drag`; no equip buttons
     (`[data-equip-button]` must stay absent). Worn strip + collection grid drops
     only.

3. **Character scope.** Character picker chips, worn strip, slot filter, and
   browse-from-worn behavior stay Character-scoped.

4. **Pending Edit.** Equipment changes during an Attempt follow Engine pending
   rules. When the UI surfaces pending Equipment edits, use the same
   `pending-marker pending-wave` convention and `[data-pending-kind="equipment"]`
   (implementation slice); Armory must not imply immediate combat application.

### Text wireframe (illustrative)

```text
┌─ Armory ─────────────────────────────────────────────────────────────┐
│ [All|Weapon|Armor|Charm]  State [All▾]  Sort [Unseen first…▾]        │  ← no Tier filter
│ Character chips · Worn strip (Weapon / Armor / Charm)                  │
│ ┌ armory-grid (scroll) ────────────────────────────────────────────┐ │
│ │  [icon] Tier II · IL 3 on compare · drag to worn slot            │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Keyboard and focus (Armory)

Preserve the Armory segment of `e2e/keyboard.spec.ts`: character chip → worn
slots → slot segments → discard checkbox → collection tile → per-tile lock;
comparison opens on focus; no equip button focus target.

---

## Locked, selected, and pending summary

| State | Talent Tree | Stage list | Armory |
| --- | --- | --- | --- |
| **Locked** | Tier 2 until 6× Tier 1 points; per-tier Ability Row until 5 stat points | `stageId > unlockedStage` | Locked drop badge; lock toggle on tile |
| **Selected** | `.talent-cell.selected` + detail panel | N/A (rows activate confirm, not persistent selection) | Worn slot browse / filter segment `aria-pressed` |
| **Pending edit** | `pending-wave` + `[data-pending-kind="talent"]` | — (Attempt abandon via confirm) | `[data-pending-kind="equipment"]` when surfaced |

---

## Acceptance evidence for downstream implementation

Future UI issues cite **registered slugs** per `docs/agents/acceptance-evidence.md`.
This contract does not add harness tests; it routes them.

| Criterion area | Seam | Notes |
| --- | --- | --- |
| Two-Tier tree scroll inside 800×480 | `evidence: character-talents-tree-scroll` | New Playwright scenario in `e2e/rendered-evidence.spec.ts`; supersedes single-tier `evidence: character-talents-no-scroll` for two-Tier Content |
| Tier 2 gate + connector + lock copy | `src/ui/talents-surface.test.ts` + `evidence: character-talents-tree-scroll` | Happy-dom for DOM hooks; rendered scene for connector visibility |
| Cascade respec message | `src/ui/talents-surface.test.ts` | Assert `[data-talent-cascade-blocked="true"]` when deallocate blocked |
| Sticky detail + selection | `src/ui/talents-surface.test.ts` | Existing selection/detail patterns extend to Tier 2 ids |
| Talent icons (both Tiers) | `evidence: talent-icon-content-tier` | `src/ui/talents-surface.test.ts` + review artifact path in acceptance doc |
| Six-Stage list + group headings | `evidence: stage-list-six` | New rendered-evidence scenario; group labels non-interactive |
| Stage confirm preserved | `e2e/keyboard.spec.ts` (Stage flow) + `src/ui/stage-surface.test.ts` | Retain `[data-surface-retain]` confirm behavior |
| Keyboard focus (Talents + Stage) | `e2e/keyboard.spec.ts` | Extend “accessibility keyboard floor” or add `evidence: dock-keyboard-talents-stage` slug tied to test title |
| Pending vs combat (Talents) | `src/ui/talents-surface.test.ts` + `e2e/keyboard.spec.ts` | Marker text and effective rank display |
| Armory: no Tier filter | `src/ui/armory-surface.test.ts` | Assert absence of `[data-tier-filter]` / tier segment control |
| Armory: preserved drag/compare/sort | `evidence: armory-drag-equip-unequip`, `evidence: armory-comparison-popover`, `evidence: equipment-icon-content-tier` | Existing slugs; re-run when Armory layout changes |
| Dock population / three tabs | `evidence: dock-surfaces` | `e2e/rendered-evidence.spec.ts` |
| Cross-window Snapshot | `evidence: cross-webview-delivery` | Unchanged bus contract |
| Native window geometry | `manual-check: dock-*` + `docs/agents/native-observation.md` | Only if dock window attachment or size tokens change |

**Interim:** Until a UI slice lands, #411 and related content slices may ship
two-Tier data while the Dock still renders one Tier; evidence rows for the full
tree are **needs manual** / blocked on the UI slice, not falsified.

---

## Related issues

| Issue | Relationship |
| --- | --- |
| #381, #400, #416, #417 | Stage count and Content |
| #401, #406–#409, #411 | Talent Tier 2 data and activation |
| #414 | `StageId` typing at Stage surface seams |
| UI implementation wave (follows this contract) | Implements rules above; must not merge without evidence rows in this table |
