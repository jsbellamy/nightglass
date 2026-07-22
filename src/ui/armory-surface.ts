import { snapshotEquipmentLoadouts } from "../core/equipment";
import type { DropInstance, ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, Content, EquipmentSlotId } from "../core/types";
import type { TileCommand } from "./bus";
import {
  type ArmoryFilters,
  type ArmorySortId,
  compareAbilityRawChanges,
  compareEquipmentStatDeltas,
  discardableDrop,
  equipmentBaseForDrop,
  filterArmoryDrops,
  formatAffix,
  formatAssignment,
  formatGuaranteedStat,
  formatRarityLabel,
  isCompatibleWithSlot,
  rareOrEpicDropNames,
  SLOT_LABELS,
  sortArmoryDrops,
  statModifiersForSlotSwap,
  statsForEquipmentLoadout,
} from "./equipment-format";
import { bindPressable } from "./keyboard";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";
import { createEquipmentIconElement } from "./icons";
import {
  CLASS_LABELS,
  classKitFor,
  effectiveLoadout,
  effectiveTalentState,
  levelFor,
  rosterClassIds,
} from "./snapshot-view";
import { el, bindScrollOverflowAffordance, mountSurfaceShell } from "./surface-shell";

export interface ArmorySurface {
  render(
    snapshot: ReadonlySnapshot | null,
    legality: EngineLegalityView,
  ): void;
  destroy(): void;
}

export interface ArmorySurfaceOptions {
  content: Content;
  onCommand?: (command: TileCommand) => void;
  /** The Character the Dock picker has selected. Read at render time. */
  getSelectedClassId(): ClassId | null;
  /** Updates session-local Character selection owned by the Management Dock shell. */
  selectClassId(classId: ClassId): void;
}

type BrowseCompatibility = { classId: ClassId; slot: EquipmentSlotId };

type StateFilterId = "all" | "unseen" | "locked";

function equippedDropId(
  armory: DropInstance[],
  classId: ClassId,
  slot: EquipmentSlotId,
): number | null {
  const equipped = armory.find(
    (drop) => drop.assignedTo?.classId === classId && drop.assignedTo.slot === slot,
  );
  return equipped?.dropId ?? null;
}

function dropById(armory: DropInstance[], dropId: number): DropInstance | undefined {
  return armory.find((entry) => entry.dropId === dropId);
}

function stateFilterId(filters: ArmoryFilters): StateFilterId {
  if (filters.unseen === true) {
    return "unseen";
  }
  if (filters.locked === true) {
    return "locked";
  }
  return "all";
}

function applyStateFilter(id: StateFilterId, filters: ArmoryFilters): ArmoryFilters {
  const next: ArmoryFilters = { ...filters };
  delete next.unseen;
  delete next.assigned;
  delete next.locked;
  switch (id) {
    case "unseen":
      next.unseen = true;
      break;
    case "locked":
      next.locked = true;
      break;
    case "all":
      break;
  }
  return next;
}

export function mountArmorySurface(
  root: HTMLElement,
  options: ArmorySurfaceOptions,
): ArmorySurface {
  const { content } = options;
  let filters: ArmoryFilters = {};
  let sort: ArmorySortId = "default";
  let selectedDropId: number | null = null;
  let browseCompatibility: BrowseCompatibility | null = null;
  let selectedDiscard = new Set<number>();
  let discardConfirmOpen = false;
  let crossEquipConfirm: {
    dropId: number;
    fromClassId: ClassId;
    fromSlot: EquipmentSlotId;
  } | null = null;
  let lastSnapshot: ReadonlySnapshot | null = null;
  let optimisticallySeenDropIds = new Set<number>();
  let currentLegality: EngineLegalityView = EMPTY_ENGINE_LEGALITY;
  let unbindGridOverflow: (() => void) | null = null;
  let unbindDetailOverflow: (() => void) | null = null;
  let comparePopoverHost: HTMLElement | null = null;
  let comparePopoverAnchor: HTMLElement | null = null;
  let comparePopoverDropId: number | null = null;

  const comparePopover = el("div", {
    class: "armory-compare-popover",
    data: { armoryComparePopover: "true" },
    props: { hidden: true },
  });
  comparePopover.style.pointerEvents = "none";

  function publish(command: TileCommand): void {
    options.onCommand?.(command);
  }

  function isDropSeen(drop: DropInstance): boolean {
    return drop.seen || optimisticallySeenDropIds.has(drop.dropId);
  }

  function syncOptimisticSeen(armory: readonly DropInstance[]): void {
    for (const drop of armory) {
      if (drop.seen) {
        optimisticallySeenDropIds.delete(drop.dropId);
      }
    }
  }

  function markDropSeen(dropId: number): void {
    const drop = lastSnapshot ? dropById(lastSnapshot.progression.armory, dropId) : undefined;
    if (!drop || isDropSeen(drop)) {
      return;
    }
    optimisticallySeenDropIds.add(dropId);
    publish({ cmd: "markSeen", args: [[dropId]] });
  }

  function hideComparePopover(): void {
    comparePopover.hidden = true;
    comparePopover.replaceChildren();
    comparePopoverAnchor = null;
    comparePopoverDropId = null;
    comparePopoverHost = null;
  }

  function positionComparePopover(anchor: HTMLElement, host: HTMLElement): void {
    comparePopover.hidden = false;
    comparePopover.style.visibility = "hidden";
    const margin = 6;
    const hostRect = host.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const popW = comparePopover.offsetWidth;
    const popH = comparePopover.offsetHeight;
    let top = anchorRect.bottom + margin;
    if (top + popH > hostRect.bottom && anchorRect.top - margin - popH >= hostRect.top) {
      top = anchorRect.top - margin - popH;
    }
    top = Math.min(Math.max(top, hostRect.top + margin), hostRect.bottom - popH - margin);
    let left = anchorRect.left + anchorRect.width / 2 - popW / 2;
    left = Math.min(Math.max(left, hostRect.left + margin), hostRect.right - popW - margin);
    comparePopover.style.position = "fixed";
    comparePopover.style.left = `${left}px`;
    comparePopover.style.top = `${top}px`;
    comparePopover.style.visibility = "";
  }

  function fillComparePopover(
    snapshot: ReadonlySnapshot,
    drop: DropInstance,
    classId: ClassId,
  ): string {
    const base = equipmentBaseForDrop(drop, content);
    const slot = base.slot;
    const descId = `armory-compare-desc-${drop.dropId}`;
    comparePopover.replaceChildren();
    comparePopover.id = descId;

    const meta = el("div", { class: "armory-compare-meta" }, [
      el("p", { class: "armory-compare-name", text: base.name }),
      el("p", {
        class: "armory-compare-meta-line",
        text: `${formatRarityLabel(drop.rarity)} · Tier ${base.tier} · Item Level ${drop.itemLevel}${drop.locked ? " · Locked" : ""}`,
      }),
    ]);
    comparePopover.append(meta);

    const roster = [...snapshot.progression.party, snapshot.progression.reserve];
    const { current: currentMods, candidate: candidateMods } = statModifiersForSlotSwap(
      snapshot.progression.armory,
      roster,
      classId,
      slot,
      drop,
      content,
    );
    const statDeltas = compareEquipmentStatDeltas(currentMods, candidateMods);

    const classKit = classKitFor(content, classId);
    const talentState = effectiveTalentState(snapshot, classId);
    const loadout = effectiveLoadout(snapshot, classId);
    const abilitiesById = new Map(content.abilities.map((ability) => [ability.id, ability]));
    const basicAbility = abilitiesById.get(classKit.basicAbilityId);
    if (!basicAbility) {
      throw new Error(`Missing basic Ability for ${classId}`);
    }
    const loadouts = snapshotEquipmentLoadouts(snapshot.progression.armory, roster);
    const currentLoadout = { ...loadouts[classId] };
    const candidateLoadout = { ...currentLoadout, [slot]: drop.dropId };
    const currentStats = statsForEquipmentLoadout(
      classKit,
      talentState,
      currentLoadout,
      snapshot.progression.armory,
      content,
    );
    const candidateStats = statsForEquipmentLoadout(
      classKit,
      talentState,
      candidateLoadout,
      snapshot.progression.armory,
      content,
    );
    const abilityChanges = compareAbilityRawChanges(
      loadout,
      basicAbility,
      currentStats,
      candidateStats,
      abilitiesById,
    );

    if (statDeltas.length > 0) {
      const table = el("table", {
        class: "armory-compare-stat-table",
        data: { statDeltas: "true" },
      });
      const head = el("thead");
      head.append(
        el("tr", {}, [
          el("th", { text: "Stat" }),
          el("th", { text: "Equipped" }),
          el("th", { text: "Hovered" }),
          el("th", { text: "Δ" }),
        ]),
      );
      table.append(head);
      const body = el("tbody");
      for (const line of statDeltas) {
        body.append(
          el("tr", {}, [
            el("td", { text: line.label }),
            el("td", { text: line.before }),
            el("td", { text: line.after }),
            el("td", { text: line.delta }),
          ]),
        );
      }
      table.append(body);
      comparePopover.append(table);
    }

    if (abilityChanges.length > 0) {
      const abilityList = el("ul", {
        class: "armory-compare-ability-list",
        data: { abilityDeltas: "true" },
      });
      for (const change of abilityChanges) {
        abilityList.append(
          el("li", {
            text: `${change.abilityName}: ${change.before ?? "—"} → ${change.after ?? "—"}`,
          }),
        );
      }
      comparePopover.append(abilityList);
    }

    if (statDeltas.length === 0 && abilityChanges.length === 0) {
      comparePopover.append(
        el("p", {
          class: "armory-compare-empty",
          data: { compareEmpty: "true" },
          text: "No stat or Ability changes",
        }),
      );
    }

    return descId;
  }

  function showComparePopover(
    snapshot: ReadonlySnapshot,
    drop: DropInstance,
    anchor: HTMLElement,
    host: HTMLElement,
  ): void {
    const classId = options.getSelectedClassId();
    if (!classId) {
      hideComparePopover();
      return;
    }
    markDropSeen(drop.dropId);
    comparePopoverHost = host;
    comparePopoverAnchor = anchor;
    comparePopoverDropId = drop.dropId;
    const descId = fillComparePopover(snapshot, drop, classId);
    anchor.setAttribute("aria-describedby", descId);
    positionComparePopover(anchor, host);
  }

  function bindComparePopover(
    snapshot: ReadonlySnapshot,
    drop: DropInstance,
    tile: HTMLElement,
    host: HTMLElement,
  ): void {
    const open = () => {
      showComparePopover(snapshot, drop, tile, host);
    };
    const maybeClose = () => {
      if (tile.matches(":hover") || tile.contains(document.activeElement)) {
        return;
      }
      if (comparePopoverAnchor === tile) {
        tile.removeAttribute("aria-describedby");
        hideComparePopover();
      }
    };
    tile.addEventListener("mouseenter", open);
    tile.addEventListener("mouseleave", maybeClose);
    tile.addEventListener("focusin", open);
    tile.addEventListener("focusout", maybeClose);
  }

  function appendContentTierIcon(container: HTMLElement, iconKey: string, name: string): void {
    const wrap = el("span", {
      class: "equipment-icon-content",
      aria: { label: `${name} icon` },
    });
    wrap.append(createEquipmentIconElement(iconKey, "content"));
    container.append(wrap);
  }

  function applyBrowseSlot(classId: ClassId, slot: EquipmentSlotId, armory: DropInstance[]): void {
    const next: ArmoryFilters = { ...filters, slot };
    if (slot === "weapon") {
      next.weaponClass = classId;
    } else {
      delete next.weaponClass;
    }
    filters = next;
    browseCompatibility = { classId, slot };
    selectedDropId = equippedDropId(armory, classId, slot);
    crossEquipConfirm = null;
  }

  function renderArmoryCharacterSelector(
    snapshot: ReadonlySnapshot,
    container: HTMLElement,
  ): void {
    const roster = rosterClassIds(snapshot);
    const selected = options.getSelectedClassId();
    const selector = el("div", {
      class: "armory-character-selector",
      data: { armoryCharacterSelector: "true" },
      props: { role: "tablist" },
      aria: { label: "Characters" },
    });

    function selectAt(index: number): void {
      const classId = roster[index];
      if (!classId) {
        return;
      }
      options.selectClassId(classId);
    }

    function onChipKeydown(event: KeyboardEvent, classId: ClassId): void {
      const index = roster.indexOf(classId);
      if (index < 0 || roster.length === 0) {
        return;
      }
      const last = roster.length - 1;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        selectAt((index + 1) % roster.length);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectAt((index - 1 + roster.length) % roster.length);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        selectAt(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        selectAt(last);
      }
    }

    for (const classId of roster) {
      const isSelected = classId === selected;
      const chip = el(
        "button",
        {
          class: "character-picker-chip focus-ring",
          data: { characterChip: classId },
          props: {
            type: "button",
            role: "tab",
            tabIndex: isSelected ? 0 : -1,
          },
        },
        [
          el("span", { class: "character-chip-name", text: CLASS_LABELS[classId] }),
          el("span", {
            class: "character-chip-level",
            text: `Level ${levelFor(snapshot, content, classId)}`,
          }),
        ],
      );
      chip.setAttribute("aria-selected", isSelected ? "true" : "false");
      bindPressable(chip, () => options.selectClassId(classId));
      chip.addEventListener("keydown", (event) => onChipKeydown(event, classId));
      selector.append(chip);
    }

    container.append(selector);
  }

  function renderWornStrip(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    const classId = options.getSelectedClassId();
    const strip = el("div", {
      class: "armory-worn-strip",
      data: { armoryWornStrip: "true" },
      props: { role: "group" },
      aria: {
        label: classId
          ? `Worn loadout · ${CLASS_LABELS[classId]}`
          : "Worn loadout",
      },
    });

    const slots: EquipmentSlotId[] = ["weapon", "armor", "charm"];
    for (const slot of slots) {
      const equippedId =
        classId === null
          ? null
          : equippedDropId(snapshot.progression.armory, classId, slot);
      const drop = equippedId === null ? undefined : dropById(snapshot.progression.armory, equippedId);
      const filled = drop !== undefined;
      const base = drop ? equipmentBaseForDrop(drop, content) : null;
      const label = filled && base
        ? `${SLOT_LABELS[slot]} · ${base.name}`
        : `${SLOT_LABELS[slot]} · Empty`;
      const button = el("button", {
        class: filled
          ? `armory-worn-slot focus-ring rarity-${drop.rarity}`
          : "armory-worn-slot focus-ring armory-worn-slot--empty",
        data: {
          wornSlot: slot,
          slotFilled: filled ? "true" : "false",
        },
        props: { type: "button", disabled: classId === null },
        aria: { label },
      });
      button.title = label;
      button.append(
        el("span", { class: "armory-worn-slot-label", text: SLOT_LABELS[slot] }),
      );
      if (drop && base) {
        appendContentTierIcon(button, base.iconKey, base.name);
      } else {
        button.append(el("span", { class: "armory-worn-slot-empty", text: "Empty" }));
      }
      bindPressable(button, () => {
        if (classId === null) {
          return;
        }
        applyBrowseSlot(classId, slot, snapshot.progression.armory);
        render(snapshot);
      });
      strip.append(button);
    }

    container.append(strip);
  }

  function renderTileFace(card: HTMLElement, drop: DropInstance): void {
    const base = equipmentBaseForDrop(drop, content);
    card.classList.add(`rarity-${drop.rarity}`);
    card.title = base.name;

    const header = el("div", { class: "equipment-card-header" });
    appendContentTierIcon(header, base.iconKey, base.name);
    card.append(header);

    if (!isDropSeen(drop)) {
      card.append(
        el("span", {
          class: "equipment-badge unseen-badge",
          data: { unseenMarker: "true" },
          aria: { label: "Unseen" },
        }),
      );
    }
    if (drop.locked) {
      card.append(
        el("span", {
          class: "equipment-badge locked-marker",
          aria: { label: "Locked" },
        }),
      );
    }
  }

  function renderDropSummary(card: HTMLElement, drop: DropInstance): void {
    const base = equipmentBaseForDrop(drop, content);
    const titleWrap = el("div", { class: "equipment-card-titles" }, [
      el("p", { class: "equipment-name", text: base.name }),
      el("p", {
        class: "equipment-meta",
        text: `Tier ${base.tier} · Item Level ${drop.itemLevel}`,
      }),
    ]);

    const header = el("div", { class: "equipment-card-header" });
    appendContentTierIcon(header, base.iconKey, base.name);
    header.append(titleWrap);
    card.classList.add(`rarity-${drop.rarity}`);
    card.append(header);

    card.append(
      el("p", { class: "equipment-guaranteed", text: formatGuaranteedStat(base) }),
    );

    if (drop.affixes.length > 0) {
      const affixList = el("ul", { class: "equipment-affix-list" });
      for (const affix of drop.affixes) {
        affixList.append(el("li", { text: formatAffix(affix) }));
      }
      card.append(affixList);
    }

    const markerChildren: HTMLElement[] = [];
    if (!isDropSeen(drop)) {
      markerChildren.push(
        el("span", {
          class: "equipment-marker unseen-marker",
          data: { unseenMarker: "true" },
          text: "Unseen",
        }),
      );
    }
    if (drop.locked) {
      markerChildren.push(
        el("span", { class: "equipment-marker locked-marker", text: "Locked" }),
      );
    }
    const assignment = formatAssignment(drop.assignedTo);
    if (assignment) {
      markerChildren.push(
        el("span", { class: "equipment-marker assigned-marker", text: assignment }),
      );
    }
    if (markerChildren.length > 0) {
      card.append(el("div", { class: "equipment-markers" }, markerChildren));
    }
  }

  function filteredDrops(snapshot: ReadonlySnapshot): DropInstance[] {
    const unequipped = snapshot.progression.armory.filter((drop) => !drop.assignedTo);
    let drops = filterArmoryDrops(unequipped, filters, content);
    if (browseCompatibility) {
      const { classId, slot } = browseCompatibility;
      drops = drops.filter((drop) =>
        isCompatibleWithSlot(drop, classId, slot, currentLegality.canEquip),
      );
    }
    return sortArmoryDrops(drops, sort, content);
  }

  function renderToolbar(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    const toolbar = el("div", { class: "armory-toolbar" });

    const slotControl = el("div", {
      class: "armory-slot-segments",
      props: { role: "group" },
      aria: { label: "Equipment Slot filter" },
    });
    const slotOptions: { id: "all" | EquipmentSlotId; label: string }[] = [
      { id: "all", label: "All" },
      { id: "weapon", label: "Weapon" },
      { id: "armor", label: "Armor" },
      { id: "charm", label: "Charm" },
    ];
    for (const option of slotOptions) {
      const active =
        option.id === "all" ? filters.slot === undefined : filters.slot === option.id;
      const button = el("button", {
        class: "armory-slot-segment focus-ring",
        data: { slotFilter: option.id },
        props: { type: "button" },
        aria: { pressed: active ? "true" : "false" },
        text: option.label,
      });
      bindPressable(button, () => {
        browseCompatibility = null;
        if (option.id === "all") {
          const next = { ...filters };
          delete next.slot;
          delete next.weaponClass;
          filters = next;
        } else {
          filters = { ...filters, slot: option.id };
        }
        render(snapshot);
      });
      slotControl.append(button);
    }
    toolbar.append(slotControl);

    const stateSelect = el("select", {
      class: "armory-state-select focus-ring",
      data: { armoryState: "true" },
      aria: { label: "Armory state filter" },
    });
    const stateOptions: { id: StateFilterId; label: string }[] = [
      { id: "all", label: "All" },
      { id: "unseen", label: "Unseen" },
      { id: "locked", label: "Locked" },
    ];
    const currentState = stateFilterId(filters);
    for (const option of stateOptions) {
      stateSelect.append(
        el("option", {
          props: { value: option.id, selected: currentState === option.id },
          text: option.label,
        }),
      );
    }
    stateSelect.addEventListener("change", () => {
      browseCompatibility = null;
      filters = applyStateFilter(stateSelect.value as StateFilterId, filters);
      render(snapshot);
    });
    toolbar.append(
      el("label", { class: "armory-state-label", text: "State" }, [stateSelect]),
    );

    const sortSelect = el("select", {
      class: "armory-sort-select focus-ring",
      data: { armorySort: "true" },
      aria: { label: "Armory sort" },
    });
    const sorts: { id: ArmorySortId; label: string }[] = [
      { id: "default", label: "Unseen first, then newest" },
      { id: "newest", label: "Newest" },
      { id: "rarity", label: "Rarity" },
      { id: "tier", label: "Tier" },
      { id: "name", label: "Name" },
    ];
    for (const entry of sorts) {
      sortSelect.append(
        el("option", {
          props: { value: entry.id, selected: sort === entry.id },
          text: entry.label,
        }),
      );
    }
    sortSelect.addEventListener("change", () => {
      sort = sortSelect.value as ArmorySortId;
      render(snapshot);
    });
    toolbar.append(
      el("label", { class: "armory-sort-label", text: "Sort" }, [sortSelect]),
    );

    if (selectedDiscard.size > 0) {
      const discardButton = el("button", {
        class: "armory-discard-button focus-ring",
        data: { bulkDiscard: "true" },
        props: { type: "button" },
        text: `Discard selected (${selectedDiscard.size})`,
      });
      bindPressable(discardButton, () => {
        discardConfirmOpen = true;
        render(snapshot);
      });
      toolbar.append(
        el("div", { class: "armory-bulk-actions", data: { bulkDiscardStrip: "true" } }, [
          discardButton,
        ]),
      );
    }

    if (discardConfirmOpen && selectedDiscard.size > 0) {
      const selectedDrops = [...selectedDiscard]
        .map((dropId) => dropById(snapshot.progression.armory, dropId))
        .filter((entry): entry is DropInstance => entry !== undefined);
      const rareEpic = rareOrEpicDropNames(selectedDrops, content);
      const yes = el("button", {
        class: "armory-confirm-yes focus-ring",
        props: { type: "button" },
        text: "Discard",
      });
      bindPressable(yes, () => {
        publish({ cmd: "discard", args: [[...selectedDiscard]] });
        selectedDiscard = new Set();
        discardConfirmOpen = false;
      });
      const no = el("button", {
        class: "armory-confirm-no focus-ring",
        props: { type: "button" },
        text: "Cancel",
      });
      bindPressable(no, () => {
        discardConfirmOpen = false;
        render(snapshot);
      });
      toolbar.append(
        el("div", { class: "armory-confirm", data: { discardConfirm: "true" } }, [
          el("p", {
            class: "armory-confirm-copy",
            text:
              rareEpic.length > 0
                ? `Discard ${selectedDiscard.size} piece(s)? Rare/Epic: ${rareEpic.join(", ")}`
                : `Discard ${selectedDiscard.size} piece(s)?`,
          }),
          el("div", { class: "armory-confirm-actions" }, [yes, no]),
        ]),
      );
    }

    container.append(toolbar);
  }

  function renderGrid(snapshot: ReadonlySnapshot, container: HTMLElement, host: HTMLElement): void {
    const grid = el("div", {
      class: "armory-grid",
      data: { armoryCollection: "true" },
      props: { role: "listbox" },
      aria: { label: "Armory collection" },
    });

    const drops = filteredDrops(snapshot);
    for (const drop of drops) {
      const selected = selectedDropId === drop.dropId;
      const tile = el("article", {
        class: selected
          ? `equipment-card focus-ring selected${drop.locked ? " locked-tile" : ""}`
          : `equipment-card focus-ring${drop.locked ? " locked-tile" : ""}`,
        data: {
          dropId: String(drop.dropId),
          compareCandidate: String(drop.dropId),
        },
        props: { tabIndex: 0, role: "option" },
        aria: {
          selected: selected ? "true" : "false",
          label: equipmentBaseForDrop(drop, content).name,
        },
      });
      renderTileFace(tile, drop);

      if (discardableDrop(drop)) {
        const checkbox = el("input", {
          class: "armory-discard-checkbox focus-ring",
          data: { discardSelect: String(drop.dropId) },
          props: {
            type: "checkbox",
            checked: selectedDiscard.has(drop.dropId),
          },
          aria: {
            label: `Select ${equipmentBaseForDrop(drop, content).name} for discard`,
          },
        });
        checkbox.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedDiscard.add(drop.dropId);
          } else {
            selectedDiscard.delete(drop.dropId);
          }
          render(snapshot);
        });
        tile.append(checkbox);
      }

      const lockButton = el("button", {
        class: "armory-tile-lock focus-ring",
        data: { tileLock: String(drop.dropId) },
        props: { type: "button" },
        aria: {
          label: drop.locked
            ? `Unlock ${equipmentBaseForDrop(drop, content).name}`
            : `Lock ${equipmentBaseForDrop(drop, content).name}`,
        },
        text: drop.locked ? "Unlock" : "Lock",
      });
      lockButton.addEventListener("click", (event) => {
        event.stopPropagation();
        publish({ cmd: "setLocked", args: [drop.dropId, !drop.locked] });
      });
      bindPressable(lockButton, () => {
        publish({ cmd: "setLocked", args: [drop.dropId, !drop.locked] });
      });
      tile.append(lockButton);

      bindComparePopover(snapshot, drop, tile, host);

      bindPressable(tile, () => {
        selectedDropId = drop.dropId;
        markDropSeen(drop.dropId);
        crossEquipConfirm = null;
        render(snapshot);
      });
      grid.append(tile);
    }

    if (drops.length === 0) {
      grid.append(
        el("p", {
          class: "surface-empty",
          text: "No equipment matches the current filters.",
        }),
      );
    }

    container.append(grid);
    unbindGridOverflow?.();
    unbindGridOverflow = bindScrollOverflowAffordance(grid);
  }

  function renderComparePanel(
    snapshot: ReadonlySnapshot,
    panel: HTMLElement,
    selectedDrop: DropInstance,
    classId: ClassId,
    slot: EquipmentSlotId,
  ): void {
    const classKit = classKitFor(content, classId);
    const talentState = effectiveTalentState(snapshot, classId);
    const loadout = effectiveLoadout(snapshot, classId);
    const abilitiesById = new Map(content.abilities.map((ability) => [ability.id, ability]));
    const basicAbility = abilitiesById.get(classKit.basicAbilityId);
    if (!basicAbility) {
      throw new Error(`Missing basic Ability for ${classId}`);
    }

    const equippedId = equippedDropId(snapshot.progression.armory, classId, slot);
    const equipped = equippedId
      ? dropById(snapshot.progression.armory, equippedId)
      : undefined;

    const currentColumn = el("section", { class: "armory-compare-column" }, [
      el("h4", { text: "Equipped" }),
    ]);
    if (equipped) {
      renderDropSummary(currentColumn, equipped);
    } else {
      currentColumn.append(el("p", { class: "surface-empty", text: "Empty slot" }));
    }

    const candidateColumn = el("section", { class: "armory-compare-column" }, [
      el("h4", { text: "Selected" }),
    ]);
    renderDropSummary(candidateColumn, selectedDrop);

    panel.append(
      el("div", { class: "armory-compare-columns" }, [currentColumn, candidateColumn]),
    );

    const roster = [...snapshot.progression.party, snapshot.progression.reserve];
    const { current: currentMods, candidate: candidateMods } = statModifiersForSlotSwap(
      snapshot.progression.armory,
      roster,
      classId,
      slot,
      selectedDrop,
      content,
    );
    const statDeltas = compareEquipmentStatDeltas(currentMods, candidateMods);
    if (statDeltas.length > 0) {
      const deltaList = el("ul", {
        class: "armory-stat-deltas",
        data: { statDeltas: "true" },
      });
      for (const line of statDeltas) {
        deltaList.append(
          el("li", {
            text: `${line.label}: ${line.before} → ${line.after} (${line.delta})`,
          }),
        );
      }
      panel.append(deltaList);
    }

    const loadouts = snapshotEquipmentLoadouts(snapshot.progression.armory, roster);
    const currentLoadout = { ...loadouts[classId] };
    const candidateLoadout = { ...currentLoadout, [slot]: selectedDrop.dropId };
    const currentStats = statsForEquipmentLoadout(
      classKit,
      talentState,
      currentLoadout,
      snapshot.progression.armory,
      content,
    );
    const candidateStats = statsForEquipmentLoadout(
      classKit,
      talentState,
      candidateLoadout,
      snapshot.progression.armory,
      content,
    );
    const abilityChanges = compareAbilityRawChanges(
      loadout,
      basicAbility,
      currentStats,
      candidateStats,
      abilitiesById,
    );
    if (abilityChanges.length > 0) {
      const abilityList = el("ul");
      for (const change of abilityChanges) {
        abilityList.append(
          el("li", {
            text: `${change.abilityName}: ${change.before ?? "—"} → ${change.after ?? "—"}`,
          }),
        );
      }
      panel.append(
        el(
          "div",
          {
            class: "armory-ability-deltas",
            data: { abilityDeltas: "true" },
          },
          [el("h4", { text: "Ability changes" }), abilityList],
        ),
      );
    } else {
      panel.append(
        el("p", {
          class: "armory-no-ability-change",
          data: { abilityDeltas: "true" },
          text: "No Ability raw value changes.",
        }),
      );
    }

    const canEquipSelected = isCompatibleWithSlot(
      selectedDrop,
      classId,
      slot,
      currentLegality.canEquip,
    );
    if (canEquipSelected) {
      const equipButton = el("button", {
        class: "armory-equip-button focus-ring",
        data: { equipButton: "true" },
        props: { type: "button" },
        text: "Equip selected",
      });
      bindPressable(equipButton, () => {
        const assigned = selectedDrop.assignedTo;
        if (assigned && (assigned.classId !== classId || assigned.slot !== slot)) {
          crossEquipConfirm = {
            dropId: selectedDrop.dropId,
            fromClassId: assigned.classId,
            fromSlot: assigned.slot,
          };
          render(snapshot);
          return;
        }
        publish({ cmd: "equip", args: [selectedDrop.dropId, classId, slot] });
      });
      panel.append(el("div", { class: "armory-equip-row" }, [equipButton]));
    }

    if (crossEquipConfirm && crossEquipConfirm.dropId === selectedDrop.dropId) {
      const yes = el("button", {
        class: "armory-confirm-yes focus-ring",
        props: { type: "button" },
        text: "Confirm equip",
      });
      bindPressable(yes, () => {
        publish({ cmd: "equip", args: [selectedDrop.dropId, classId, slot] });
        crossEquipConfirm = null;
      });
      const no = el("button", {
        class: "armory-confirm-no focus-ring",
        props: { type: "button" },
        text: "Cancel",
      });
      bindPressable(no, () => {
        crossEquipConfirm = null;
        render(snapshot);
      });
      panel.append(
        el("div", { class: "armory-confirm", data: { crossEquipConfirm: "true" } }, [
          el("p", {
            class: "armory-confirm-copy",
            text: `Move from ${CLASS_LABELS[crossEquipConfirm.fromClassId]} ${SLOT_LABELS[crossEquipConfirm.fromSlot]}? That slot will be empty.`,
          }),
          el("div", { class: "armory-confirm-actions" }, [yes, no]),
        ]),
      );
    }
  }

  function renderDetail(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    const detail = el("aside", {
      class: "armory-detail",
      data: { armoryDetail: "true" },
      aria: { label: "Equipment detail" },
    });

    detail.append(
      el("p", {
        class: "armory-attempt-note",
        data: { nextAttemptNote: "true" },
        text: "Equipment changes apply from the next Stage Attempt.",
      }),
    );

    if (selectedDropId === null) {
      detail.append(
        el("p", {
          class: "surface-empty",
          text: "Select a Drop to inspect it.",
        }),
      );
      container.append(detail);
      unbindDetailOverflow?.();
      unbindDetailOverflow = bindScrollOverflowAffordance(detail);
      return;
    }

    const selectedDrop = dropById(snapshot.progression.armory, selectedDropId);
    if (!selectedDrop) {
      selectedDropId = null;
      detail.append(
        el("p", {
          class: "surface-empty",
          text: "Select a Drop to inspect it.",
        }),
      );
      container.append(detail);
      unbindDetailOverflow?.();
      unbindDetailOverflow = bindScrollOverflowAffordance(detail);
      return;
    }

    const summary = el("article", {
      class: "equipment-card equipment-detail",
    });
    renderDropSummary(summary, selectedDrop);
    detail.append(summary);

    const actions = el("div", { class: "armory-detail-actions" });
    const lockButton = el("button", {
      class: "equipment-lock-toggle focus-ring",
      data: { lockToggle: String(selectedDrop.dropId) },
      props: { type: "button" },
      text: selectedDrop.locked ? "Unlock" : "Lock",
    });
    bindPressable(lockButton, () => {
      publish({ cmd: "setLocked", args: [selectedDrop.dropId, !selectedDrop.locked] });
    });
    actions.append(lockButton);

    const classId = options.getSelectedClassId();
    const assigned = selectedDrop.assignedTo;
    if (classId && assigned?.classId === classId) {
      const unequip = el("button", {
        class: "equipment-slot-unequip focus-ring",
        data: { unequipSlot: assigned.slot },
        props: { type: "button" },
        text: "Unequip",
      });
      bindPressable(unequip, () => {
        publish({ cmd: "unequip", args: [classId, assigned.slot] });
      });
      actions.append(unequip);
    }
    detail.append(actions);

    if (classId) {
      const slot = equipmentBaseForDrop(selectedDrop, content).slot;
      renderComparePanel(snapshot, detail, selectedDrop, classId, slot);
    }

    container.append(detail);
    unbindDetailOverflow?.();
    unbindDetailOverflow = bindScrollOverflowAffordance(detail);
  }

  const shell = mountSurfaceShell(root, "armory-surface", {
    title: "Armory",
    showTitle: false,
    body(snapshot) {
      const body = el("div", { class: "armory-body armory-body--compare-host" });
      renderToolbar(snapshot, body);
      renderArmoryCharacterSelector(snapshot, body);
      renderWornStrip(snapshot, body);
      const panes = el("div", { class: "armory-panes" });
      renderGrid(snapshot, panes, body);
      renderDetail(snapshot, panes);
      body.append(panes);
      body.append(comparePopover);
      return [body];
    },
  });

  function render(
    snapshot: ReadonlySnapshot | null,
    legality: EngineLegalityView = currentLegality,
  ): void {
    currentLegality = legality;
    if (snapshot) {
      syncOptimisticSeen(snapshot.progression.armory);
    }
    lastSnapshot = snapshot;
    shell.render(snapshot);
    comparePopoverHost = root.querySelector<HTMLElement>(".armory-body--compare-host");
    if (comparePopoverDropId !== null && comparePopoverHost && snapshot) {
      const drop = dropById(snapshot.progression.armory, comparePopoverDropId);
      const classId = options.getSelectedClassId();
      const anchor = root.querySelector<HTMLElement>(
        `.armory-grid .equipment-card[data-drop-id="${comparePopoverDropId}"]`,
      );
      if (drop && classId && anchor) {
        comparePopoverAnchor = anchor;
        const descId = fillComparePopover(snapshot, drop, classId);
        anchor.setAttribute("aria-describedby", descId);
        positionComparePopover(anchor, comparePopoverHost);
      } else if (!anchor) {
        hideComparePopover();
      }
    }
  }

  return {
    render,
    destroy() {
      unbindGridOverflow?.();
      unbindDetailOverflow?.();
      hideComparePopover();
      shell.destroy();
    },
  };
}
