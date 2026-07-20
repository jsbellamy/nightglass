import { dropStatModifiers, snapshotEquipmentLoadouts } from "../core/equipment";
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
  isCompatibleWithSlot,
  rareOrEpicDropNames,
  SLOT_LABELS,
  sortArmoryDrops,
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
  rosterClassIds,
} from "./snapshot-view";
import { el, mountSurfaceShell } from "./surface-shell";

const SLOTS: EquipmentSlotId[] = ["weapon", "armor", "charm"];

export interface ArmorySurface {
  render(snapshot: ReadonlySnapshot | null, legality: EngineLegalityView): void;
  destroy(): void;
}

export interface ArmorySurfaceOptions {
  content: Content;
  onCommand?: (command: TileCommand) => void;
  onBadgeChange?: (visible: boolean) => void;
}

type ArmoryView = "collection" | "detail" | "compare";

interface CompareContext {
  classId: ClassId;
  slot: EquipmentSlotId;
  selectedDropId: number | null;
}

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

export function mountArmorySurface(
  root: HTMLElement,
  options: ArmorySurfaceOptions,
): ArmorySurface {
  const { content } = options;
  let filters: ArmoryFilters = {};
  let sort: ArmorySortId = "default";
  let view: ArmoryView = "collection";
  let detailDropId: number | null = null;
  let compareContext: CompareContext | null = null;
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

  function hasUnseenDrops(armory: readonly DropInstance[]): boolean {
    return armory.some((drop) => !isDropSeen(drop));
  }

  function markDropSeen(dropId: number): void {
    const drop = lastSnapshot ? dropById(lastSnapshot.progression.armory, dropId) : undefined;
    if (!drop || isDropSeen(drop)) {
      return;
    }
    optimisticallySeenDropIds.add(dropId);
    publish({ cmd: "markSeen", args: [[dropId]] });
  }

  function appendContentTierIcon(container: HTMLElement, iconKey: string, name: string): void {
    const wrap = el("span", {
      class: "equipment-icon-content",
      aria: { label: `${name} icon` },
    });
    wrap.append(createEquipmentIconElement(iconKey, "content"));
    container.append(wrap);
  }

  function appendChromeTierIcon(container: HTMLElement, iconKey: string, name: string): void {
    const wrap = el("span", {
      class: "equipment-icon-chrome",
      aria: { label: `${name} icon` },
    });
    wrap.append(createEquipmentIconElement(iconKey, "chrome"));
    container.append(wrap);
  }

  function renderDropIconChip(container: HTMLElement, drop: DropInstance): void {
    const base = equipmentBaseForDrop(drop, content);
    appendContentTierIcon(container, base.iconKey, base.name);
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
    renderDropIconChip(header, drop);
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

  function renderFilterBar(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    const bar = el("div", {
      class: "armory-filters",
      props: { role: "group" },
      aria: { label: "Armory filters" },
    });

    const addToggle = (
      label: string,
      key: keyof ArmoryFilters,
      value: ArmoryFilters[keyof ArmoryFilters],
      active: boolean,
    ) => {
      const button = el("button", {
        class: "armory-filter focus-ring",
        data: {
          filterKey: String(key),
          filterValue: String(value),
        },
        props: { type: "button" },
        aria: { pressed: active ? "true" : "false" },
        text: active ? `${label} ✓` : label,
      });
      bindPressable(button, () => {
        if (active) {
          const next = { ...filters };
          delete next[key];
          filters = next;
        } else {
          filters = { ...filters, [key]: value };
        }
        render(snapshot);
      });
      bar.append(button);
    };

    addToggle("Weapon", "slot", "weapon", filters.slot === "weapon");
    addToggle("Armor", "slot", "armor", filters.slot === "armor");
    addToggle("Charm", "slot", "charm", filters.slot === "charm");
    addToggle("Knight", "weaponClass", "knight", filters.weaponClass === "knight");
    addToggle("Tier I", "tier", 1, filters.tier === 1);
    addToggle("Tier II", "tier", 2, filters.tier === 2);
    addToggle("Rare", "rarity", "rare", filters.rarity === "rare");
    addToggle("Assigned", "assigned", "assigned", filters.assigned === "assigned");
    addToggle("Available", "assigned", "available", filters.assigned === "available");
    addToggle("Locked", "locked", true, filters.locked === true);
    addToggle("Unseen", "unseen", true, filters.unseen === true);

    const clear = el("button", {
      class: "armory-filter-clear focus-ring",
      props: { type: "button" },
      text: "Clear filters",
    });
    bindPressable(clear, () => {
      filters = {};
      render(snapshot);
    });
    bar.append(clear);

    container.append(bar);
  }

  function renderSortBar(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    const select = el("select", {
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
      select.append(
        el("option", {
          props: { value: entry.id, selected: sort === entry.id },
          text: entry.label,
        }),
      );
    }
    select.addEventListener("change", () => {
      sort = select.value as ArmorySortId;
      render(snapshot);
    });
    const bar = el("div", { class: "armory-sort" }, [
      el("label", { class: "armory-sort-label", text: "Sort" }, [select]),
    ]);
    container.append(bar);
  }

  function renderSlotStrip(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    const strip = el("div", {
      class: "armory-slot-strip",
      props: { role: "group" },
      aria: { label: "Character equipment slots" },
    });

    for (const classId of rosterClassIds(snapshot)) {
      const slotButtons: HTMLElement[] = [];

      for (const slot of SLOTS) {
        const dropId = equippedDropId(snapshot.progression.armory, classId, slot);
        const equipped = dropId ? dropById(snapshot.progression.armory, dropId) : undefined;
        const button = el("button", {
          class: "armory-slot-button focus-ring",
          data: {
            compareSlot: slot,
            classId,
          },
          props: { type: "button" },
          aria: { label: `Compare ${CLASS_LABELS[classId]} ${SLOT_LABELS[slot]}` },
        });
        button.append(el("span", { class: "armory-slot-label", text: SLOT_LABELS[slot] }));
        if (equipped) {
          const base = equipmentBaseForDrop(equipped, content);
          appendChromeTierIcon(button, base.iconKey, base.name);
        } else {
          button.append(el("span", { class: "armory-slot-empty", text: "Empty" }));
        }
        bindPressable(button, () => {
          view = "compare";
          compareContext = { classId, slot, selectedDropId: null };
          detailDropId = null;
          render(snapshot);
        });
        slotButtons.push(button);
      }

      strip.append(
        el("section", { class: "armory-character-slots", data: { classId } }, [
          el("h3", { class: "surface-section-title", text: CLASS_LABELS[classId] }),
          el("div", { class: "armory-slot-row" }, slotButtons),
        ]),
      );
    }

    container.append(strip);
  }

  function renderCollection(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    const toolbar = el("div", { class: "armory-toolbar" });
    renderFilterBar(snapshot, toolbar);
    renderSortBar(snapshot, toolbar);
    container.append(toolbar);

    const drops = sortArmoryDrops(
      filterArmoryDrops(snapshot.progression.armory, filters, content),
      sort,
      content,
    );

    const discardButton = el("button", {
      class: "armory-discard-button focus-ring",
      data: { bulkDiscard: "true" },
      props: { type: "button", disabled: selectedDiscard.size === 0 },
      text: `Discard selected (${selectedDiscard.size})`,
    });
    bindPressable(discardButton, () => {
      discardConfirmOpen = true;
      render(snapshot);
    });
    container.append(el("div", { class: "armory-bulk-actions" }, [discardButton]));

    if (discardConfirmOpen) {
      const selectedDrops = [...selectedDiscard]
        .map((dropId) => dropById(snapshot.progression.armory, dropId))
        .filter((drop): drop is DropInstance => drop !== undefined);
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
      container.append(
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

    const list = el("div", { class: "armory-collection", data: { armoryCollection: "true" } });

    for (const drop of drops) {
      const row = el("article", {
        class: "equipment-card",
        data: { dropId: String(drop.dropId) },
      });
      renderDropSummary(row, drop);

      const actionChildren: HTMLElement[] = [];

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
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedDiscard.add(drop.dropId);
          } else {
            selectedDiscard.delete(drop.dropId);
          }
          render(snapshot);
        });
        actionChildren.push(checkbox);
      }

      const lockButton = el("button", {
        class: "equipment-lock-toggle focus-ring",
        data: { lockToggle: String(drop.dropId) },
        props: { type: "button" },
        text: drop.locked ? "Unlock" : "Lock",
      });
      bindPressable(lockButton, () => {
        publish({ cmd: "setLocked", args: [drop.dropId, !drop.locked] });
      });
      actionChildren.push(lockButton);

      const detailButton = el("button", {
        class: "equipment-detail-button focus-ring",
        data: { openDetail: String(drop.dropId) },
        props: { type: "button" },
        text: "Details",
      });
      bindPressable(detailButton, () => {
        view = "detail";
        detailDropId = drop.dropId;
        markDropSeen(drop.dropId);
        render(snapshot);
      });
      actionChildren.push(detailButton);

      row.append(el("div", { class: "equipment-card-actions" }, actionChildren));
      list.append(row);
    }

    if (drops.length === 0) {
      list.append(
        el("p", {
          class: "surface-empty",
          text: "No equipment matches the current filters.",
        }),
      );
    }

    container.append(list);
  }

  function renderCompare(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    if (!compareContext) {
      return;
    }
    const { classId, slot, selectedDropId } = compareContext;
    const classKit = classKitFor(content, classId);
    const talentState = effectiveTalentState(snapshot, classId);
    const loadout = effectiveLoadout(snapshot, classId);
    const abilitiesById = new Map(content.abilities.map((ability) => [ability.id, ability]));
    const basicAbility = abilitiesById.get(classKit.basicAbilityId);
    if (!basicAbility) {
      throw new Error(`Missing basic Ability for ${classId}`);
    }

    const back = el("button", {
      class: "armory-back focus-ring",
      data: { armoryBack: "true" },
      props: { type: "button" },
      text: "Back to collection",
    });
    bindPressable(back, () => {
      view = "collection";
      compareContext = null;
      crossEquipConfirm = null;
      render(snapshot);
    });
    container.append(back);

    container.append(
      el("h3", {
        class: "surface-section-title",
        text: `Compare · ${CLASS_LABELS[classId]} ${SLOT_LABELS[slot]}`,
      }),
    );

    container.append(
      el("p", {
        class: "armory-attempt-note",
        data: { nextAttemptNote: "true" },
        text: "Equipment changes apply from the next Stage Attempt.",
      }),
    );

    const candidates = snapshot.progression.armory.filter((drop) =>
      isCompatibleWithSlot(drop, classId, slot, currentLegality.canEquip),
    );

    const candidateList = el("div", {
      class: "armory-compare-candidates",
      props: { role: "listbox" },
      aria: { label: "Compatible equipment" },
    });

    for (const candidate of candidates) {
      const selected = selectedDropId === candidate.dropId;
      const button = el("button", {
        class: selected
          ? "armory-compare-candidate focus-ring selected"
          : "armory-compare-candidate focus-ring",
        data: { compareCandidate: String(candidate.dropId) },
        props: { type: "button", role: "option" },
        aria: { selected: selected ? "true" : "false" },
      });
      renderDropSummary(button, candidate);
      bindPressable(button, () => {
        compareContext = { classId, slot, selectedDropId: candidate.dropId };
        markDropSeen(candidate.dropId);
        crossEquipConfirm = null;
        render(snapshot);
      });
      candidateList.append(button);
    }
    container.append(candidateList);

    if (selectedDropId === null) {
      return;
    }

    const selectedDrop = dropById(snapshot.progression.armory, selectedDropId);
    if (!selectedDrop) {
      return;
    }

    const equippedId = equippedDropId(snapshot.progression.armory, classId, slot);
    const equipped = equippedId
      ? dropById(snapshot.progression.armory, equippedId)
      : undefined;

    const comparePanel = el("div", {
      class: "armory-compare-panel",
      data: { comparePanel: "true" },
    });

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

    comparePanel.append(
      el("div", { class: "armory-compare-columns" }, [currentColumn, candidateColumn]),
    );

    const currentMods = equipped ? dropStatModifiers(equipped, content) : [];
    const candidateMods = dropStatModifiers(selectedDrop, content);
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
      comparePanel.append(deltaList);
    }

    const roster = [...snapshot.progression.party, snapshot.progression.reserve];
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
      comparePanel.append(
        el("div", {
          class: "armory-ability-deltas",
          data: { abilityDeltas: "true" },
        }, [
          el("h4", { text: "Ability changes" }),
          abilityList,
        ]),
      );
    } else {
      comparePanel.append(
        el("p", {
          class: "armory-no-ability-change",
          data: { abilityDeltas: "true" },
          text: "No Ability raw value changes.",
        }),
      );
    }

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
    comparePanel.append(el("div", { class: "armory-equip-row" }, [equipButton]));

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
      comparePanel.append(
        el("div", { class: "armory-confirm", data: { crossEquipConfirm: "true" } }, [
          el("p", {
            class: "armory-confirm-copy",
            text: `Move from ${CLASS_LABELS[crossEquipConfirm.fromClassId]} ${SLOT_LABELS[crossEquipConfirm.fromSlot]}? That slot will be empty.`,
          }),
          el("div", { class: "armory-confirm-actions" }, [yes, no]),
        ]),
      );
    }

    container.append(comparePanel);
  }

  function renderDetail(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    if (detailDropId === null) {
      return;
    }
    const drop = dropById(snapshot.progression.armory, detailDropId);
    if (!drop) {
      view = "collection";
      detailDropId = null;
      render(snapshot);
      return;
    }

    const back = el("button", {
      class: "armory-back focus-ring",
      props: { type: "button" },
      text: "Back to collection",
    });
    bindPressable(back, () => {
      view = "collection";
      detailDropId = null;
      render(snapshot);
    });
    container.append(back);

    const card = el("article", {
      class: "equipment-card equipment-detail",
      data: { dropDetail: String(drop.dropId) },
    });
    renderDropSummary(card, drop);
    container.append(card);
  }

  function renderArmoryBody(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    if (view === "compare") {
      renderCompare(snapshot, container);
    } else if (view === "detail") {
      renderDetail(snapshot, container);
    } else {
      renderCollection(snapshot, container);
    }
  }

  const shell = mountSurfaceShell(root, "armory-surface", {
    title: "Armory",
    body(snapshot) {
      const slotStripHost = el("div");
      renderSlotStrip(snapshot, slotStripHost);
      const body = el("div", { class: "armory-body" });
      renderArmoryBody(snapshot, body);
      return [...slotStripHost.children, body];
    },
  });

  function render(snapshot: ReadonlySnapshot | null, legality: EngineLegalityView = currentLegality): void {
    currentLegality = legality;
    if (snapshot) {
      syncOptimisticSeen(snapshot.progression.armory);
      if (!hasUnseenDrops(snapshot.progression.armory)) {
        options.onBadgeChange?.(false);
      }
    }
    lastSnapshot = snapshot;
    shell.render(snapshot);
  }

  return {
    render,
    destroy: () => shell.destroy(),
  };
}
