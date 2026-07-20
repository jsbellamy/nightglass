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

  root.classList.add("armory-surface");

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
    const wrap = document.createElement("span");
    wrap.className = "equipment-icon-content";
    wrap.setAttribute("aria-label", `${name} icon`);
    wrap.append(createEquipmentIconElement(iconKey, "content"));
    container.append(wrap);
  }

  function appendChromeTierIcon(container: HTMLElement, iconKey: string, name: string): void {
    const wrap = document.createElement("span");
    wrap.className = "equipment-icon-chrome";
    wrap.setAttribute("aria-label", `${name} icon`);
    wrap.append(createEquipmentIconElement(iconKey, "chrome"));
    container.append(wrap);
  }

  function renderDropIconChip(container: HTMLElement, drop: DropInstance): void {
    const base = equipmentBaseForDrop(drop, content);
    appendContentTierIcon(container, base.iconKey, base.name);
  }

  function renderDropSummary(card: HTMLElement, drop: DropInstance): void {
    const base = equipmentBaseForDrop(drop, content);
    const header = document.createElement("div");
    header.className = "equipment-card-header";

    renderDropIconChip(header, drop);

    const titleWrap = document.createElement("div");
    titleWrap.className = "equipment-card-titles";

    const name = document.createElement("p");
    name.className = "equipment-name";
    name.textContent = base.name;
    titleWrap.append(name);

    const meta = document.createElement("p");
    meta.className = "equipment-meta";
    meta.textContent = `Tier ${base.tier} · Item Level ${drop.itemLevel}`;
    titleWrap.append(meta);

    header.append(titleWrap);
    card.classList.add(`rarity-${drop.rarity}`);
    card.append(header);

    const guaranteed = document.createElement("p");
    guaranteed.className = "equipment-guaranteed";
    guaranteed.textContent = formatGuaranteedStat(base);
    card.append(guaranteed);

    if (drop.affixes.length > 0) {
      const affixList = document.createElement("ul");
      affixList.className = "equipment-affix-list";
      for (const affix of drop.affixes) {
        const item = document.createElement("li");
        item.textContent = formatAffix(affix);
        affixList.append(item);
      }
      card.append(affixList);
    }

    const markers = document.createElement("div");
    markers.className = "equipment-markers";
    if (!isDropSeen(drop)) {
      const unseen = document.createElement("span");
      unseen.className = "equipment-marker unseen-marker";
      unseen.dataset["unseenMarker"] = "true";
      unseen.textContent = "Unseen";
      markers.append(unseen);
    }
    if (drop.locked) {
      const locked = document.createElement("span");
      locked.className = "equipment-marker locked-marker";
      locked.textContent = "Locked";
      markers.append(locked);
    }
    const assignment = formatAssignment(drop.assignedTo);
    if (assignment) {
      const assigned = document.createElement("span");
      assigned.className = "equipment-marker assigned-marker";
      assigned.textContent = assignment;
      markers.append(assigned);
    }
    if (markers.childElementCount > 0) {
      card.append(markers);
    }
  }

  function renderFilterBar(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    const bar = document.createElement("div");
    bar.className = "armory-filters";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Armory filters");

    const addToggle = (
      label: string,
      key: keyof ArmoryFilters,
      value: ArmoryFilters[keyof ArmoryFilters],
      active: boolean,
    ) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "armory-filter focus-ring";
      button.dataset["filterKey"] = String(key);
      button.dataset["filterValue"] = String(value);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.textContent = active ? `${label} ✓` : label;
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

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "armory-filter-clear focus-ring";
    clear.textContent = "Clear filters";
    bindPressable(clear, () => {
      filters = {};
      render(snapshot);
    });
    bar.append(clear);

    container.append(bar);
  }

  function renderSortBar(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    const bar = document.createElement("div");
    bar.className = "armory-sort";
    const label = document.createElement("label");
    label.className = "armory-sort-label";
    label.textContent = "Sort";
    const select = document.createElement("select");
    select.className = "armory-sort-select focus-ring";
    select.dataset["armorySort"] = "true";
    select.setAttribute("aria-label", "Armory sort");
    const sorts: { id: ArmorySortId; label: string }[] = [
      { id: "default", label: "Unseen first, then newest" },
      { id: "newest", label: "Newest" },
      { id: "rarity", label: "Rarity" },
      { id: "tier", label: "Tier" },
      { id: "name", label: "Name" },
    ];
    for (const entry of sorts) {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.label;
      option.selected = sort === entry.id;
      select.append(option);
    }
    select.addEventListener("change", () => {
      sort = select.value as ArmorySortId;
      render(snapshot);
    });
    label.append(select);
    bar.append(label);
    container.append(bar);
  }

  function renderSlotStrip(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    const strip = document.createElement("div");
    strip.className = "armory-slot-strip";
    strip.setAttribute("role", "group");
    strip.setAttribute("aria-label", "Character equipment slots");

    for (const classId of rosterClassIds(snapshot)) {
      const character = document.createElement("section");
      character.className = "armory-character-slots";
      character.dataset["classId"] = classId;

      const heading = document.createElement("h3");
      heading.className = "surface-section-title";
      heading.textContent = CLASS_LABELS[classId];
      character.append(heading);

      const slots = document.createElement("div");
      slots.className = "armory-slot-row";

      for (const slot of SLOTS) {
        const dropId = equippedDropId(snapshot.progression.armory, classId, slot);
        const equipped = dropId ? dropById(snapshot.progression.armory, dropId) : undefined;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "armory-slot-button focus-ring";
        button.dataset["compareSlot"] = slot;
        button.dataset["classId"] = classId;
        button.setAttribute(
          "aria-label",
          `Compare ${CLASS_LABELS[classId]} ${SLOT_LABELS[slot]}`,
        );
        const label = document.createElement("span");
        label.className = "armory-slot-label";
        label.textContent = SLOT_LABELS[slot];
        button.append(label);
        if (equipped) {
          const base = equipmentBaseForDrop(equipped, content);
          appendChromeTierIcon(button, base.iconKey, base.name);
        } else {
          const empty = document.createElement("span");
          empty.className = "armory-slot-empty";
          empty.textContent = "Empty";
          button.append(empty);
        }
        bindPressable(button, () => {
          view = "compare";
          compareContext = { classId, slot, selectedDropId: null };
          detailDropId = null;
          render(snapshot);
        });
        slots.append(button);
      }

      character.append(slots);
      strip.append(character);
    }

    container.append(strip);
  }

  function renderCollection(snapshot: ReadonlySnapshot, container: HTMLElement): void {
    const toolbar = document.createElement("div");
    toolbar.className = "armory-toolbar";
    renderFilterBar(snapshot, toolbar);
    renderSortBar(snapshot, toolbar);
    container.append(toolbar);

    const drops = sortArmoryDrops(
      filterArmoryDrops(snapshot.progression.armory, filters, content),
      sort,
      content,
    );

    const bulk = document.createElement("div");
    bulk.className = "armory-bulk-actions";
    const discardButton = document.createElement("button");
    discardButton.type = "button";
    discardButton.className = "armory-discard-button focus-ring";
    discardButton.dataset["bulkDiscard"] = "true";
    discardButton.disabled = selectedDiscard.size === 0;
    discardButton.textContent = `Discard selected (${selectedDiscard.size})`;
    bindPressable(discardButton, () => {
      discardConfirmOpen = true;
      render(snapshot);
    });
    bulk.append(discardButton);
    container.append(bulk);

    if (discardConfirmOpen) {
      const confirm = document.createElement("div");
      confirm.className = "armory-confirm";
      confirm.dataset["discardConfirm"] = "true";
      const selectedDrops = [...selectedDiscard]
        .map((dropId) => dropById(snapshot.progression.armory, dropId))
        .filter((drop): drop is DropInstance => drop !== undefined);
      const rareEpic = rareOrEpicDropNames(selectedDrops, content);
      const copy = document.createElement("p");
      copy.className = "armory-confirm-copy";
      copy.textContent =
        rareEpic.length > 0
          ? `Discard ${selectedDiscard.size} piece(s)? Rare/Epic: ${rareEpic.join(", ")}`
          : `Discard ${selectedDiscard.size} piece(s)?`;
      confirm.append(copy);
      const actions = document.createElement("div");
      actions.className = "armory-confirm-actions";
      const yes = document.createElement("button");
      yes.type = "button";
      yes.className = "armory-confirm-yes focus-ring";
      yes.textContent = "Discard";
      bindPressable(yes, () => {
        publish({ cmd: "discard", args: [[...selectedDiscard]] });
        selectedDiscard = new Set();
        discardConfirmOpen = false;
      });
      const no = document.createElement("button");
      no.type = "button";
      no.className = "armory-confirm-no focus-ring";
      no.textContent = "Cancel";
      bindPressable(no, () => {
        discardConfirmOpen = false;
        render(snapshot);
      });
      actions.append(yes, no);
      confirm.append(actions);
      container.append(confirm);
    }

    const list = document.createElement("div");
    list.className = "armory-collection";
    list.dataset["armoryCollection"] = "true";

    for (const drop of drops) {
      const row = document.createElement("article");
      row.className = "equipment-card";
      row.dataset["dropId"] = String(drop.dropId);
      renderDropSummary(row, drop);

      const actions = document.createElement("div");
      actions.className = "equipment-card-actions";

      if (discardableDrop(drop)) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "armory-discard-checkbox focus-ring";
        checkbox.dataset["discardSelect"] = String(drop.dropId);
        checkbox.checked = selectedDiscard.has(drop.dropId);
        checkbox.setAttribute("aria-label", `Select ${equipmentBaseForDrop(drop, content).name} for discard`);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedDiscard.add(drop.dropId);
          } else {
            selectedDiscard.delete(drop.dropId);
          }
          render(snapshot);
        });
        actions.append(checkbox);
      }

      const lockButton = document.createElement("button");
      lockButton.type = "button";
      lockButton.className = "equipment-lock-toggle focus-ring";
      lockButton.dataset["lockToggle"] = String(drop.dropId);
      lockButton.textContent = drop.locked ? "Unlock" : "Lock";
      bindPressable(lockButton, () => {
        publish({ cmd: "setLocked", args: [drop.dropId, !drop.locked] });
      });
      actions.append(lockButton);

      const detailButton = document.createElement("button");
      detailButton.type = "button";
      detailButton.className = "equipment-detail-button focus-ring";
      detailButton.dataset["openDetail"] = String(drop.dropId);
      detailButton.textContent = "Details";
      bindPressable(detailButton, () => {
        view = "detail";
        detailDropId = drop.dropId;
        markDropSeen(drop.dropId);
        render(snapshot);
      });
      actions.append(detailButton);

      row.append(actions);
      list.append(row);
    }

    if (drops.length === 0) {
      const empty = document.createElement("p");
      empty.className = "surface-empty";
      empty.textContent = "No equipment matches the current filters.";
      list.append(empty);
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

    const back = document.createElement("button");
    back.type = "button";
    back.className = "armory-back focus-ring";
    back.dataset["armoryBack"] = "true";
    back.textContent = "Back to collection";
    bindPressable(back, () => {
      view = "collection";
      compareContext = null;
      crossEquipConfirm = null;
      render(snapshot);
    });
    container.append(back);

    const heading = document.createElement("h3");
    heading.className = "surface-section-title";
    heading.textContent = `Compare · ${CLASS_LABELS[classId]} ${SLOT_LABELS[slot]}`;
    container.append(heading);

    const note = document.createElement("p");
    note.className = "armory-attempt-note";
    note.dataset["nextAttemptNote"] = "true";
    note.textContent = "Equipment changes apply from the next Stage Attempt.";
    container.append(note);

    const candidates = snapshot.progression.armory.filter((drop) =>
      isCompatibleWithSlot(drop, classId, slot, currentLegality.canEquip),
    );

    const candidateList = document.createElement("div");
    candidateList.className = "armory-compare-candidates";
    candidateList.setAttribute("role", "listbox");
    candidateList.setAttribute("aria-label", "Compatible equipment");

    for (const candidate of candidates) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "armory-compare-candidate focus-ring";
      button.dataset["compareCandidate"] = String(candidate.dropId);
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", selectedDropId === candidate.dropId ? "true" : "false");
      if (selectedDropId === candidate.dropId) {
        button.classList.add("selected");
      }
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

    const selected = dropById(snapshot.progression.armory, selectedDropId);
    if (!selected) {
      return;
    }

    const equippedId = equippedDropId(snapshot.progression.armory, classId, slot);
    const equipped = equippedId
      ? dropById(snapshot.progression.armory, equippedId)
      : undefined;

    const comparePanel = document.createElement("div");
    comparePanel.className = "armory-compare-panel";
    comparePanel.dataset["comparePanel"] = "true";

    const columns = document.createElement("div");
    columns.className = "armory-compare-columns";

    const currentColumn = document.createElement("section");
    currentColumn.className = "armory-compare-column";
    const currentTitle = document.createElement("h4");
    currentTitle.textContent = "Equipped";
    currentColumn.append(currentTitle);
    if (equipped) {
      renderDropSummary(currentColumn, equipped);
    } else {
      const empty = document.createElement("p");
      empty.className = "surface-empty";
      empty.textContent = "Empty slot";
      currentColumn.append(empty);
    }

    const candidateColumn = document.createElement("section");
    candidateColumn.className = "armory-compare-column";
    const candidateTitle = document.createElement("h4");
    candidateTitle.textContent = "Selected";
    candidateColumn.append(candidateTitle);
    renderDropSummary(candidateColumn, selected);

    columns.append(currentColumn, candidateColumn);
    comparePanel.append(columns);

    const currentMods = equipped ? dropStatModifiers(equipped, content) : [];
    const candidateMods = dropStatModifiers(selected, content);
    const statDeltas = compareEquipmentStatDeltas(currentMods, candidateMods);
    if (statDeltas.length > 0) {
      const deltaList = document.createElement("ul");
      deltaList.className = "armory-stat-deltas";
      deltaList.dataset["statDeltas"] = "true";
      for (const line of statDeltas) {
        const item = document.createElement("li");
        item.textContent = `${line.label}: ${line.before} → ${line.after} (${line.delta})`;
        deltaList.append(item);
      }
      comparePanel.append(deltaList);
    }

    const roster = [...snapshot.progression.party, snapshot.progression.reserve];
    const loadouts = snapshotEquipmentLoadouts(snapshot.progression.armory, roster);
    const currentLoadout = { ...loadouts[classId] };
    const candidateLoadout = { ...currentLoadout, [slot]: selected.dropId };
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
      const abilitySection = document.createElement("div");
      abilitySection.className = "armory-ability-deltas";
      abilitySection.dataset["abilityDeltas"] = "true";
      const abilityHeading = document.createElement("h4");
      abilityHeading.textContent = "Ability changes";
      abilitySection.append(abilityHeading);
      const abilityList = document.createElement("ul");
      for (const change of abilityChanges) {
        const item = document.createElement("li");
        item.textContent = `${change.abilityName}: ${change.before ?? "—"} → ${change.after ?? "—"}`;
        abilityList.append(item);
      }
      abilitySection.append(abilityList);
      comparePanel.append(abilitySection);
    } else {
      const noAbilityChange = document.createElement("p");
      noAbilityChange.className = "armory-no-ability-change";
      noAbilityChange.dataset["abilityDeltas"] = "true";
      noAbilityChange.textContent = "No Ability raw value changes.";
      comparePanel.append(noAbilityChange);
    }

    const equipRow = document.createElement("div");
    equipRow.className = "armory-equip-row";
    const equipButton = document.createElement("button");
    equipButton.type = "button";
    equipButton.className = "armory-equip-button focus-ring";
    equipButton.dataset["equipButton"] = "true";
    equipButton.textContent = "Equip selected";
    bindPressable(equipButton, () => {
      const assigned = selected.assignedTo;
      if (assigned && (assigned.classId !== classId || assigned.slot !== slot)) {
        crossEquipConfirm = {
          dropId: selected.dropId,
          fromClassId: assigned.classId,
          fromSlot: assigned.slot,
        };
        render(snapshot);
        return;
      }
      publish({ cmd: "equip", args: [selected.dropId, classId, slot] });
    });
    equipRow.append(equipButton);
    comparePanel.append(equipRow);

    if (crossEquipConfirm && crossEquipConfirm.dropId === selected.dropId) {
      const confirm = document.createElement("div");
      confirm.className = "armory-confirm";
      confirm.dataset["crossEquipConfirm"] = "true";
      const copy = document.createElement("p");
      copy.className = "armory-confirm-copy";
      copy.textContent = `Move from ${CLASS_LABELS[crossEquipConfirm.fromClassId]} ${SLOT_LABELS[crossEquipConfirm.fromSlot]}? That slot will be empty.`;
      confirm.append(copy);
      const actions = document.createElement("div");
      actions.className = "armory-confirm-actions";
      const yes = document.createElement("button");
      yes.type = "button";
      yes.className = "armory-confirm-yes focus-ring";
      yes.textContent = "Confirm equip";
      bindPressable(yes, () => {
        publish({ cmd: "equip", args: [selected.dropId, classId, slot] });
        crossEquipConfirm = null;
      });
      const no = document.createElement("button");
      no.type = "button";
      no.className = "armory-confirm-no focus-ring";
      no.textContent = "Cancel";
      bindPressable(no, () => {
        crossEquipConfirm = null;
        render(snapshot);
      });
      actions.append(yes, no);
      confirm.append(actions);
      comparePanel.append(confirm);
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

    const back = document.createElement("button");
    back.type = "button";
    back.className = "armory-back focus-ring";
    back.textContent = "Back to collection";
    bindPressable(back, () => {
      view = "collection";
      detailDropId = null;
      render(snapshot);
    });
    container.append(back);

    const card = document.createElement("article");
    card.className = "equipment-card equipment-detail";
    card.dataset["dropDetail"] = String(drop.dropId);
    renderDropSummary(card, drop);
    container.append(card);
  }

  function render(snapshot: ReadonlySnapshot | null, legality: EngineLegalityView = currentLegality): void {
    currentLegality = legality;
    if (snapshot) {
      syncOptimisticSeen(snapshot.progression.armory);
    }
    lastSnapshot = snapshot;
    root.replaceChildren();

    if (!snapshot) {
      const empty = document.createElement("p");
      empty.className = "surface-empty";
      empty.textContent = "No Snapshot yet.";
      root.append(empty);
      return;
    }

    if (!hasUnseenDrops(snapshot.progression.armory)) {
      options.onBadgeChange?.(false);
    }

    const title = document.createElement("h2");
    title.className = "dock-surface-title";
    title.textContent = "Armory";
    root.append(title);

    renderSlotStrip(snapshot, root);

    const body = document.createElement("div");
    body.className = "armory-body";
    if (view === "compare") {
      renderCompare(snapshot, body);
    } else if (view === "detail") {
      renderDetail(snapshot, body);
    } else {
      renderCollection(snapshot, body);
    }
    root.append(body);
  }

  return {
    render,
    destroy() {
      root.replaceChildren();
      root.classList.remove("armory-surface");
    },
  };
}
