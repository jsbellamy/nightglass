# Fowl Harvest Management Dock UI contract

Approved interaction contract for the Management Dock workspace: **Armory**, **Character**
(Loadout, Talents, Stats), and **Stage** surfaces at 800×480, including six Stages and
two Talent Tiers per Character. Frozen by [#383](https://github.com/jsbellamy/nightglass/issues/383);
revised for the settled Character workspace by
[#478](https://github.com/jsbellamy/nightglass/issues/478). Downstream content, Engine,
and asset slices may land before UI work; until a UI slice explicitly cites this document,
shipped tab order, rail visibility, inline Ability copy, sticky Talent detail, and Armory
duplicate Character selector remain **interim** behavior.

| Field | Value |
| --- | --- |
| Workspace | 800×480 logical pixels (`docs/adr/0005-dock-workspace-geometry.md`) |
| Surfaces in scope | **Armory** → **Character** (Loadout → Talents → Stats) → **Stage** |
| Vocabulary | `CONTEXT.md` — Ability, Ability Loadout, Stage, Talent, Equipment, Pending Edit, Management Dock |
| Out of scope for this contract | Battle Tile combat layout beyond shared Pending Edit semantics |

## Approved rules versus illustration

Sections labeled **Interaction rules** are normative: a future UI slice must
implement them or file a successor contract issue. Sections labeled **Text
wireframe (illustrative)** show one acceptable layout; spacing, typography, and
chrome may change if the rules and evidence hooks are preserved.

Do **not** introduce domain synonyms such as Campaign, **World**, or Biome, or use
**Skill** for **Ability**. **Moonberry** and **Fowl Harvest** in this document name
**Visual Theme** families used only as **editorial group labels** in the Stage list.
**Visual Theme remains independent of Stage progression** (`CONTEXT.md`).

---

## Superseded rules (still-live semantics)

The following placement or visibility rules are **replaced** by this contract. Their
underlying formulas, generated mechanical text (`src/ui/ability-format.ts` and
equivalent Talent copy), accessibility gates, Engine legality, and **Pending Edit**
behavior remain authoritative unless a later issue changes them.

| Prior rule | Superseded by | Still live |
| --- | --- | --- |
| [#468](https://github.com/jsbellamy/nightglass/issues/468): full Ability mechanical descriptions **inline** on Loadout tiles; **no** hover/focus inspector | **Mechanical detail popover** (below) — same generated text, bounded placement | Text generation, timing lines, Activation Delay copy, keyboard focus on tiles |
| Talent **sticky detail** panel (`aside.talent-detail`) owning description and allocate/deallocate actions | **Talent tile** `+` / `−` actions plus popover for mechanical text | Tier gates, cascade respec Engine rules (#401), Pending Edit markers |
| Armory **compact horizontal Character selector** (`armory-character-selector` chips) | **Left Character rail** on Armory (shared with Character tab) | Equipment drag/drop, comparison popover, worn strip, Pending Edit for Equipment |
| `CONTEXT.md` claim that consolidated **Physical Power** and **Elemental Power** stay hidden | **Character → Stats** exposes totals with Base / Equipment / Talent breakdown | Canonical formulas and terminology in `CONTEXT.md` |

---

## Management Dock shell

### Interaction rules

1. **Top-level tab order.** The Management Dock tab strip lists surfaces left-to-right:
   **Armory → Character → Stage** (`DOCK_TABS` order in a future `src/ui/dock.ts` slice).

2. **Default surface.** A newly mounted or opened Dock activates **Armory** first (not Character).

3. **Left Character rail.** The full vertical Character picker rail (Roster portraits,
   Formation controls, and Party / Reserve assignment) is **visible** on **Armory** and
   **Character**. It is **absent** on **Stage** (hidden and inert, matching today’s
   `syncCharacterRailVisibility` intent extended to Armory).

4. **Rail selection scope.** The rail-selected Character is the scope for:
   - **Armory** — worn **Equipment** strip, compatibility filtering, comparison values,
     and collection browse.
   - **Character** — Loadout, Talents, and Stats for that Character.

5. **No duplicate Armory selector.** Armory must **not** render a second compact
   horizontal Character chip row; rail selection is the sole Character scope control on
   Armory.

### Text wireframe (illustrative)

```text
┌─ Management Dock ──────────────────────────────────────────────────────┐
│ [ Armory | Character | Stage ]                                    [✕] │
├──────────┬───────────────────────────────────────────────────────────┤
│ Character│  (active surface: Armory grid, Character sub-tab, or     │
│ rail +   │   Stage list)                                             │
│ Formation│                                                           │
│ (hidden  │                                                           │
│ on Stage)│                                                           │
└──────────┴───────────────────────────────────────────────────────────┘
```

---

## Mechanical detail popover (Ability and Talent)

### Interaction rules

1. **Placement.** Generated mechanical information for **Ability** tiles (Loadout pool
   and slots, Basic Attack row) and **Talent** tiles moves out of persistent inline or
   sticky panels into a **bounded, non-interactive popover** anchored to the hovered or
   keyboard-focused tile. The popover must stay clipped within the Management Dock
   workspace (800×480), not the OS window or Battle Tile.

2. **Parity.** **Hover** and **keyboard focus** on the same tile reveal the **same**
   generated text (Ability: `formatAbilityInlineMechanics` / timings; Talent: equivalent
   authored or generated detail). Moving pointer or focus away **clears** the popover.

3. **No actions in popover.** Equip, allocate, slot, Formation, and Stage confirm controls
   never appear inside the popover; they remain on tiles, slots, or dedicated controls.

4. **Keyboard access.** The popover must **not** be the sole keyboard path to mechanical
   information: focusing a tile both shows the popover **and** keeps the tile in tab order
   with a visible focus ring. Implementations may register a dedicated `evidence:` slug
   for popover + focus parity.

5. **Armory Equipment comparison** keeps its existing transient compare popover
   (`[data-armory-compare-popover]`); this section governs **Ability** and **Talent**
   mechanical copy only.

### Text wireframe (illustrative)

```text
┌─ Character › Loadout ─────────────────────────────────────────────────┐
│  [Basic Attack tile]     ┌─ popover (non-interactive) ─────────────┐ │
│  [Pool ability]  [Slot1] │  Frost Lance — raw damage, coefficients…   │ │
│         ▲ anchor         └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Character workspace

### Interaction rules

1. **Sub-tab order.** Inside **Character**, sub-tabs are **Loadout → Talents → Stats**
   (left-to-right).

2. **Default sub-tab.** A newly mounted Character surface opens on **Loadout**.

3. **Picker scope.** Sub-tabs always reflect the Character selected on the left rail.

### Text wireframe (illustrative)

```text
┌─ Character ────────────────────────────────────────────────────────────┐
│ [ Loadout | Talents | Stats ]                                        │
│  (one sub-surface visible)                                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Ability Loadout (Character → Loadout)

### Interaction rules

1. **Basic Attack.** Show the Class Kit **Basic Attack** as its own row or tile. It is
   **not** one of the three **Ability Loadout** slots, **not** draggable, and **not**
   slottable from the pool.

2. **Pool and slots.** Below Basic Attack, show a **pool** of currently **unlocked**
   Abilities (Core Abilities plus Ability Talents) and **three ordered Ability Loadout
   slots**.

3. **Pool → slot.** Assigning a pool Ability to a slot **replaces** whatever Ability
   occupied that slot (if any). Empty slot + assignment fills the slot.

4. **Slot ↔ slot.** Dragging or otherwise moving an Ability from one slot to another
   **swaps** positions when both slots hold Abilities; reassignment of an already slotted
   Ability follows the same swap semantics.

5. **Input parity.** **Drag-and-drop** is supplemented by **select-then-slot** activation
   so mouse, touch, and keyboard can perform the same replacements and swaps: select a
   pool or slotted Ability, then activate a target slot (or equivalent command) to apply
   the same rules as drag.

6. **Pending Edit.** Ability Loadout edits during a Stage Attempt follow Engine **Pending
   Edit** rules. When pending, show `pendingMarker()` with `[data-pending-kind="loadout"]`
   and class `pending-marker pending-wave` (“Applies at next Wave”). Surface **effective**
   Loadout in the UI; combat uses committed state until the Wave or Boss boundary.

7. **Mechanical copy.** Ability tiles show name and icon in the layout; full mechanical
   text appears only in the **Mechanical detail popover** (not inline sticky paragraphs).

### Text wireframe (illustrative)

```text
┌─ Character › Loadout ─────────────────────────────────────────────────┐
│ Basic Attack   [════ always available ════]                           │
│ Unlocked pool  [A] [B] [C] [D] …                                      │
│ Slots          [ 1 ] [ 2 ] [ 3 ]   ← ordered Ability Loadout          │
│ ┌ Applies at next Wave ──────────────────────────────────────────┐   │  ← pending only
└──────────────────────────────────────────────────────────────────────┘
```

### Keyboard and focus (Loadout)

1. Tab order: Basic Attack tile (informational focus) → pool Abilities left-to-right →
   slots 1→3 → any warning or pending marker region.
2. **Select-then-slot:** **Enter** / **Space** on a focused pool or slotted Ability
   selects it; a second activation on a slot applies pool→slot or swap per rules above.
3. Extend `e2e/keyboard.spec.ts` or a registered `evidence:` slug for select-then-slot parity.

---

## Talent Tree (Character → Talents)

### Interaction rules

1. **One tree, two Tiers.** The Talents sub-surface renders every authored **Talent Tier**
   for the rail-selected Character in a **single vertically scrollable** column
   (`talent-tree-scroll`). Tier 1 appears above Tier 2 in content order. There is **no**
   sticky detail column; mechanical text uses the **Mechanical detail popover**.

2. **Tier gate (Tier 1 → Tier 2).** Tier 2 is **locked** until Tier 1 has **all six**
   Talent Points allocated (five Stat Row points plus one Ability Row point). While locked:
   - Tier 2 cells are not allocatable (`disabled` / `aria-disabled="true"`).
   - A visible **gate connection** links Tier 1’s Ability Row to Tier 2’s Stat Row.
   - Copy explains the lock, e.g. “Allocate all six Talent Tier 1 points to unlock Talent Tier 2.”

3. **Within-tier gates** (unchanged). Each Tier’s Ability Row stays locked until five Stat
   Row points are spent in that Tier.

4. **Talent tiles.** Cells remain pressable (`.talent-cell`, `[data-talent-id]`).
   **Chosen** Ability Talents keep `.talent-cell--chosen` / check mark behavior.

5. **Direct rank actions on tiles.**
   - **Stat Talents:** each tile exposes **`+`** and **`−`** controls that change **one
     rank** per activation (subject to Engine legality and available Talent Points).
   - **Ability Talents:** choosing the **other** mutually exclusive Ability in the same
     Ability Row **atomically replaces** the current choice. If the replaced Ability was
     slotted in the **Ability Loadout**, the newly chosen Ability **keeps the same slot
     index** (slot contents update without reordering other slots).

6. **Cascade-safe respec feedback.** Engine rules (#401): Tier 1 cannot be reduced while
   Tier 2 holds any point; a Tier Stat Row cannot drop below five while that Tier’s Ability
   point remains. When **−** is blocked, show explicit feedback (same severity as Loadout
   warnings), e.g. “Clear all Talent Tier 2 points before reducing Talent Tier 1.” Disabled
   buttons alone are not sufficient. Use `[data-talent-cascade-blocked="true"]` on the
   message element for tests.

7. **Pending Edit versus combat.** The tree reflects **effective** Talent state (pending
   edits applied in the Snapshot view). When a pending Talent edit exists, show
   `pendingMarker()` with `[data-pending-kind="talent"]` and class
   `pending-marker pending-wave` (“Applies at next Wave”).

8. **Points header.** Keep level and available Talent Point count
   (`[data-talent-points="true"]`) above the tree.

### Text wireframe (illustrative)

```text
┌─ Character › Talents ──────────────────────────────────────────────────┐
│ Knight · Level 12          2 Talent Points available                 │
│ ┌ Applies at next Wave ──────────────────────────────────────────┐ │
│ ┌─ talent-tree-scroll ───────────────────────────────────────────┐ │
│ │ TALENT TIER 1                                                  │ │
│ │ Stat Row    [3/5  − +] [2/5  − +]                              │ │
│ │ Ability Row [✓ pick A] [  pick B ]                              │ │
│ │           ║  gate connector                                    │ │
│ │ TALENT TIER 2 — LOCKED …                                       │ │
│ └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Keyboard and focus (Talent Tree)

1. Talent cells in **document order** inside `talent-tree-scroll`; locked Tier 2 cells
   skipped by Tab.
2. Within a focused cell, tab to **`−`** then **`+`** (or consistent primary/secondary order).
3. **Enter** / **Space** on **`+`** / **`−`** applies one-rank change when legal.
4. Popover follows **Mechanical detail popover** rules on cell focus/hover.

---

## Stats (Character → Stats)

### Interaction rules

1. **Header progression.** Show **Level**, **Character XP** progress toward the next Level,
   and available **Talent Points** when relevant to the Stats view.

2. **Combat statistics.** For the rail-selected Character, show totals for:
   - **Max Health**
   - **Physical Power** (formula per `CONTEXT.md`)
   - **Elemental Power** (formula per `CONTEXT.md`)
   - **Armor**
   - **Elemental Resistance**

3. **Source breakdown.** Each total breaks out contributions from **Base**, **Equipment**, and
   **Talent**, distinguishing **flat** modifiers from **percentage** modifiers (labels or
   grouping must make the distinction unambiguous).

4. **Effective pending configuration.** Values reflect the **effective** Equipment and Talent
   configuration (pending edits applied in the Snapshot view used by other Character surfaces).

5. **Wave marker.** When effective Equipment or Talent Pending Edits change combat stats but
   combat still uses committed state, show the existing **“Applies at next Wave”** marker
   (`pending-marker pending-wave` with appropriate `[data-pending-kind]`).

### Text wireframe (illustrative)

```text
┌─ Character › Stats ────────────────────────────────────────────────────┐
│ Level 12 · XP ████████░░ → 13                                        │
│ Physical Power  142   Base 40 · Equip +22 flat · Talent +10%         │
│ Max Health      980   Base … · Equip … · Talent …                    │
│ ┌ Applies at next Wave ──────────────────────────────────────────┐   │
└──────────────────────────────────────────────────────────────────────┘
```

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

7. **No Character rail.** Stage does not show the left Character rail (Dock shell rule).

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
5. Every focused control shows a visible **focus ring** (`.focus-ring`) on
   `.stage-row`, `.stage-confirm-yes`, and `.stage-confirm-no`, matching the
   harness `assertFocusRingVisible` checks.

---

## Armory surface

### Interaction rules

1. **No Equipment Tier filter.** Do **not** add a toolbar control that filters the
   collection by **Equipment Tier** (I–IV). Sorting by Tier remains allowed (see
   below). Slot filter, state filter, and compatibility browse are unchanged.

2. **Preserved controls** (match `src/ui/armory-surface.ts` except Character selector):
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

3. **Character scope via rail.** Worn strip, slot filter, and browse-from-worn behavior
   follow the **left Character rail** selection. Remove the duplicate compact horizontal
   Character selector from Armory.

4. **Pending Edit.** Equipment changes during an Attempt follow Engine pending
   rules. When the UI surfaces pending Equipment edits, use the same
   `pending-marker pending-wave` convention and `[data-pending-kind="equipment"]`
   (implementation slice); Armory must not imply immediate combat application.

### Text wireframe (illustrative)

```text
┌─ Armory ─────────────────────────────────────────────────────────────┐
│ [All|Weapon|Armor|Charm]  State [All▾]  Sort [Unseen first…▾]        │
│ Worn strip (Weapon / Armor / Charm) for rail-selected Character      │
│ ┌ armory-grid (scroll) ────────────────────────────────────────────┐ │
│ │  [icon] Tier II · IL 3 on compare · drag to worn slot            │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Keyboard and focus (Armory)

Preserve the Armory segment of `e2e/keyboard.spec.ts` adjusted for **rail-first**
Character focus: left rail Character → worn slots → slot segments → discard checkbox →
collection tile → per-tile lock; comparison opens on focus; no equip button focus target;
no compact Armory-only Character chip row.

---

## Locked, selected, and pending summary

| State | Loadout | Talent Tree | Stats | Stage list | Armory |
| --- | --- | --- | --- | --- | --- |
| **Locked** | — | Tier 2 until 6× Tier 1 points; per-tier Ability Row until 5 stat points | — | `stageId > unlockedStage` | Locked drop badge; lock toggle on tile |
| **Selected** | Pool/slot selection for select-then-slot | `.talent-cell--chosen` on Ability Talents | — | N/A (rows activate confirm) | Worn slot browse / filter segment `aria-pressed` |
| **Pending edit** | `pending-wave` + `[data-pending-kind="loadout"]` | `pending-wave` + `[data-pending-kind="talent"]` | Wave marker when stats differ from combat | — (Attempt abandon via confirm) | `[data-pending-kind="equipment"]` when surfaced |

---

## Acceptance evidence for downstream implementation

Future UI issues cite **registered slugs** per `docs/agents/acceptance-evidence.md`.
This contract does not add harness tests; it routes them.

| Criterion area | Seam | Notes |
| --- | --- | --- |
| Dock tab order Armory → Character → Stage; default Armory | `src/ui/dock.test.ts` + `evidence: dock-surfaces` | Tab labels and `initialTab` / first-open surface |
| Character rail on Armory + Character; hidden on Stage | `src/ui/dock.test.ts` + `evidence: dock-surfaces` | `[data-dock-nav]` / picker `hidden` + `inert` |
| No Armory compact Character selector | `src/ui/armory-surface.test.ts` | Absence of `armory-character-selector` chips |
| Character sub-tabs Loadout → Talents → Stats; default Loadout | `src/ui/character-surface.test.ts` | Sub-tab order and initial panel |
| Ability/Talent mechanical popover hover ≡ focus | New `evidence:` slug or `e2e/keyboard.spec.ts` | Bounded non-interactive popover; not sole keyboard path |
| Loadout pool/slot replace, swap, Basic Attack excluded | `src/ui/loadout-surface.test.ts` + drag/select evidence | Select-then-slot parity slug when registered |
| Talent tile +/−; Ability Talent same-slot preservation | `src/ui/talents-surface.test.ts` | Cascade message `[data-talent-cascade-blocked="true"]` |
| Stats totals + Base/Equip/Talent flat vs % | `src/ui/` Stats surface tests + rendered evidence | Pending wave marker when effective ≠ combat |
| Two-Tier tree scroll inside 800×480 | `evidence: character-talents-tree-scroll` | Supersedes single-tier `evidence: character-talents-no-scroll` for two-Tier Content |
| Tier 2 gate + connector + lock copy | `src/ui/talents-surface.test.ts` + `evidence: character-talents-tree-scroll` | Happy-dom for DOM hooks; rendered scene for connector visibility |
| Talent icons (both Tiers) | `evidence: talent-icon-content-tier` | `src/ui/talents-surface.test.ts` + review artifact path in acceptance doc |
| Six-Stage list + group headings | `evidence: stage-list-six` | New rendered-evidence scenario; group labels non-interactive |
| Stage confirm preserved | `e2e/keyboard.spec.ts` (Stage flow) + `src/ui/stage-surface.test.ts` | Retain `[data-surface-retain]` confirm behavior |
| Keyboard focus (Loadout + Talents + Stage) | `e2e/keyboard.spec.ts` | Extend accessibility keyboard floor test |
| Pending vs combat (Loadout, Talents, Stats) | Surface unit tests + `e2e/keyboard.spec.ts` | Marker text and effective display |
| Armory: no Tier filter | `src/ui/armory-surface.test.ts` | Toolbar keeps only slot, state, and sort |
| Armory: preserved drag/compare/sort | `evidence: armory-drag-equip-unequip`, `evidence: armory-comparison-popover`, `evidence: equipment-icon-content-tier` | Existing slugs |
| Cross-window Snapshot | `evidence: cross-webview-delivery` | Unchanged bus contract |
| Dock port sequencing / clamp geometry | `manual-check: dock-position-only`, etc. | When `src/ui/dock-window.ts` or geometry tokens change |
| Native dock lifecycle / OS chrome | `docs/agents/native-observation.md` | Manual `npm run tauri dev` when native shell changes |

**Interim:** Until a UI slice lands, shipped Dock order, default tab, rail visibility,
inline Loadout copy, sticky Talent detail, Armory duplicate selector, and hidden Power
totals may persist. Evidence rows follow disposition **2** in
`docs/agents/acceptance-evidence.md` (open the UI PR, block merge until harness rows exist).

---

## Related issues

| Issue | Relationship |
| --- | --- |
| #478 | This contract revision (Character workspace interaction) |
| #468 | Superseded Ability inline-description placement (text generation retained) |
| #381, #400, #416, #417 | Stage count and Content |
| #401, #406–#409, #411 | Talent Tier 2 data and activation |
| #414 | `StageId` typing at Stage surface seams |
| UI implementation wave (follows this contract) | Implements rules above; must not merge without evidence rows in this table |
