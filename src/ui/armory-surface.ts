import type { DropInstance, ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, Content, EquipmentSlotId } from "../core/types";
import type { TileCommand } from "./bus";
import {
  type ArmoryFilters,
  type ArmorySortId,
  discardableDrop,
  equipmentBaseForDrop,
  filterArmoryDrops,
  formatRarityLabel,
  isCompatibleWithSlot,
  rareOrEpicDropNames,
  SLOT_LABELS,
  sortArmoryDrops,
} from "./equipment-format";
import { bindPressable } from "./keyboard";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";
import { createEquipmentIconElement } from "./icons";
import {
  CLASS_LABELS,
  levelFor,
  previewEquip,
  rosterClassIds,
} from "./snapshot-view";
import { el, bindScrollOverflowAffordance, mountSurfaceShell } from "./surface-shell";

export interface ArmorySurface {
  render(snapshot: ReadonlySnapshot | null, legality?: EngineLegalityView): void;
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

type ArmoryDragSource =
  | { kind: "collection"; dropId: number }
  | {
      kind: "worn";
      dropId: number;
      classId: ClassId;
      slot: EquipmentSlotId;
    };

const ARMORY_DRAG_MIME = "application/x-nightglass-armory-drag";

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
  let browseCompatibility: BrowseCompatibility | null = null;
  let selectedDiscard = new Set<number>();
  let discardConfirmOpen = false;
  let activeDrag: ArmoryDragSource | null = null;
  let lastSnapshot: ReadonlySnapshot | null = null;
  let optimisticallySeenDropIds = new Set<number>();
  let lastLegality: EngineLegalityView = EMPTY_ENGINE_LEGALITY;
  let unbindGridOverflow: (() => void) | null = null;

  const comparePopover = el("div", {
    class: "armory-compare-popover",
    data: { armoryComparePopover: "true", surfaceRetain: "true" },
    props: { hidden: true },
  });
  comparePopover.style.pointerEvents = "none";

  // The Armory body is a single persistent node the shell reconciles in place. Its
  // collection grid never leaves the DOM across a rebuild, so a hovered tile keeps its
  // native :hover (the lock button / discard checkbox stay put) and a tile grabbed for
  // drag is never torn out from under the pointer. Only the parts that actually change
  // — the toolbar, Character selector, worn strip, and the keyed grid tiles — update.
  const gridEl = el("div", {
    class: "armory-grid",
    data: { armoryCollection: "true" },
    props: { role: "list" },
    aria: { label: "Armory collection" },
  });
  const armoryPanes = el("div", { class: "armory-panes armory-panes--full" }, [gridEl]);
  // Persistent Character-selector tablist: its chips reconcile in place so a hovered tab
  // keeps its native :hover instead of flashing when a management pump rebuilds the body.
  const selectorEl = el("div", {
    class: "armory-character-selector",
    data: { armoryCharacterSelector: "true" },
    props: { role: "tablist" },
    aria: { label: "Characters" },
  });
  const bodyEl = el("div", {
    class: "armory-body armory-body--compare-host",
    data: { surfaceRetain: "true" },
  });
  bodyEl.append(armoryPanes, comparePopover);
  let currentToolbar: HTMLElement | null = null;
  let currentWornStrip: HTMLElement | null = null;

  /** Swap a persistent-body section in place, keeping the grid attached and unmoved. */
  function swapBodySection(current: HTMLElement | null, next: HTMLElement): HTMLElement {
    if (current && current.parentNode === bodyEl) {
      bodyEl.replaceChild(next, current);
    } else {
      bodyEl.insertBefore(next, armoryPanes);
    }
    return next;
  }

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
    delete comparePopover.dataset["compareDropId"];
  }

  function openCompareDropId(): number | null {
    const raw = comparePopover.dataset["compareDropId"];
    if (raw === undefined) {
      return null;
    }
    const dropId = Number(raw);
    return Number.isFinite(dropId) ? dropId : null;
  }

  function clearDragHighlights(host: HTMLElement): void {
    host.classList.remove("armory-body--collection-drag", "armory-body--worn-drag");
    for (const node of host.querySelectorAll<HTMLElement>(".armory-drop-target--valid")) {
      node.classList.remove("armory-drop-target--valid");
    }
    for (const node of host.querySelectorAll<HTMLElement>(".armory-drag-source")) {
      node.classList.remove("armory-drag-source");
    }
    for (const node of host.querySelectorAll<HTMLElement>(".armory-collection-drop-target--valid")) {
      node.classList.remove("armory-collection-drop-target--valid");
    }
    for (const node of host.querySelectorAll<HTMLElement>("[data-surface-preserve-live]")) {
      delete node.dataset["surfacePreserveLive"];
    }
  }

  function endArmoryDrag(host: HTMLElement): void {
    activeDrag = null;
    clearDragHighlights(host);
  }

  function armoryDragHost(): HTMLElement | null {
    return root.querySelector<HTMLElement>(".armory-body--compare-host");
  }

  function highlightCollectionDragTargets(snapshot: ReadonlySnapshot, dropId: number): void {
    const host = armoryDragHost();
    const classId = options.getSelectedClassId();
    if (!host || !classId) {
      return;
    }
    const drop = dropById(snapshot.progression.armory, dropId);
    if (!drop) {
      return;
    }
    const slot = equipmentBaseForDrop(drop, content).slot;
    if (!isCompatibleWithSlot(drop, classId, slot, lastLegality.canEquip)) {
      return;
    }
    host
      .querySelector<HTMLElement>(`[data-worn-slot="${slot}"]`)
      ?.classList.add("armory-drop-target--valid");
  }

  function highlightWornDragTargets(): void {
    const host = armoryDragHost();
    if (!host) {
      return;
    }
    host
      .querySelector<HTMLElement>('[data-armory-collection="true"]')
      ?.classList.add("armory-collection-drop-target--valid");
  }

  function parseDragPayload(event: DragEvent): ArmoryDragSource | null {
    const raw = event.dataTransfer?.getData(ARMORY_DRAG_MIME);
    if (!raw) {
      return activeDrag;
    }
    try {
      return JSON.parse(raw) as ArmoryDragSource;
    } catch {
      return activeDrag;
    }
  }

  function bindCollectionDrag(drop: DropInstance, tile: HTMLElement): void {
    tile.draggable = true;
    tile.addEventListener("dragstart", (event) => {
      hideComparePopover();
      const host = armoryDragHost();
      if (!host) {
        return;
      }
      const source: ArmoryDragSource = { kind: "collection", dropId: drop.dropId };
      activeDrag = source;
      host.classList.add("armory-body--collection-drag");
      tile.classList.add("armory-drag-source");
      tile.dataset["surfacePreserveLive"] = "true";
      if (lastSnapshot) {
        highlightCollectionDragTargets(lastSnapshot, drop.dropId);
      }
      event.dataTransfer?.setData(ARMORY_DRAG_MIME, JSON.stringify(source));
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    });
    tile.addEventListener("dragend", () => {
      const host = armoryDragHost();
      if (host) {
        endArmoryDrag(host);
      } else {
        activeDrag = null;
      }
    });
  }

  function bindWornSlotDrag(
    classId: ClassId,
    slot: EquipmentSlotId,
    drop: DropInstance,
    button: HTMLElement,
  ): void {
    button.draggable = true;
    button.addEventListener("dragstart", (event) => {
      hideComparePopover();
      const host = armoryDragHost();
      if (!host) {
        return;
      }
      const source: ArmoryDragSource = {
        kind: "worn",
        dropId: drop.dropId,
        classId,
        slot,
      };
      activeDrag = source;
      host.classList.add("armory-body--worn-drag");
      button.classList.add("armory-drag-source");
      button.dataset["surfacePreserveLive"] = "true";
      highlightWornDragTargets();
      event.dataTransfer?.setData(ARMORY_DRAG_MIME, JSON.stringify(source));
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
      event.stopPropagation();
    });
    button.addEventListener("dragend", () => {
      const host = armoryDragHost();
      if (host) {
        endArmoryDrag(host);
      } else {
        activeDrag = null;
      }
    });
  }

  function bindWornSlotDropTarget(
    snapshot: ReadonlySnapshot,
    classId: ClassId,
    slot: EquipmentSlotId,
    button: HTMLElement,
  ): void {
    button.addEventListener("dragover", (event) => {
      if (activeDrag?.kind !== "collection") {
        return;
      }
      const dragged = dropById(snapshot.progression.armory, activeDrag.dropId);
      if (!dragged || slot !== equipmentBaseForDrop(dragged, content).slot) {
        return;
      }
      const selected = options.getSelectedClassId();
      if (!selected || selected !== classId) {
        return;
      }
      if (!isCompatibleWithSlot(dragged, classId, slot, lastLegality.canEquip)) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });

    button.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const source = parseDragPayload(event);
      const selected = options.getSelectedClassId();
      if (!source || source.kind !== "collection" || !selected) {
        endArmoryDrag(armoryDragHost() ?? root);
        return;
      }
      const dragged = dropById(snapshot.progression.armory, source.dropId);
      if (!dragged) {
        endArmoryDrag(armoryDragHost() ?? root);
        return;
      }
      const targetSlot = equipmentBaseForDrop(dragged, content).slot;
      if (targetSlot !== slot || selected !== classId) {
        endArmoryDrag(armoryDragHost() ?? root);
        return;
      }
      if (!isCompatibleWithSlot(dragged, classId, slot, lastLegality.canEquip)) {
        endArmoryDrag(armoryDragHost() ?? root);
        return;
      }
      publish({ cmd: "equip", args: [source.dropId, classId, slot] });
      endArmoryDrag(armoryDragHost() ?? root);
    });
  }

  function bindCollectionDropTarget(grid: HTMLElement): void {
    grid.addEventListener("dragover", (event) => {
      if (activeDrag?.kind !== "worn") {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });

    grid.addEventListener("drop", (event) => {
      event.preventDefault();
      const source = parseDragPayload(event);
      if (!source || source.kind !== "worn") {
        endArmoryDrag(armoryDragHost() ?? root);
        return;
      }
      const worn = lastSnapshot
        ? dropById(lastSnapshot.progression.armory, source.dropId)
        : undefined;
      if (!worn?.assignedTo) {
        endArmoryDrag(armoryDragHost() ?? root);
        return;
      }
      publish({ cmd: "unequip", args: [source.classId, source.slot] });
      endArmoryDrag(armoryDragHost() ?? root);
    });
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

    const { statDeltas, abilityChanges } = previewEquip(
      snapshot,
      content,
      drop.dropId,
      classId,
      slot,
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
    comparePopover.dataset["compareDropId"] = String(drop.dropId);
    const descId = fillComparePopover(snapshot, drop, classId);
    anchor.setAttribute("aria-describedby", descId);
    positionComparePopover(anchor, host);
  }

  function bindComparePopover(
    drop: DropInstance,
    tile: HTMLElement,
    host: HTMLElement,
  ): void {
    const open = () => {
      // Re-read the drop from the current Snapshot: this tile node can be reused across
      // renders while the Character's stats (and so the preview deltas) have moved on.
      const snapshot = lastSnapshot;
      const current = snapshot
        ? dropById(snapshot.progression.armory, drop.dropId)
        : undefined;
      if (snapshot && current) {
        showComparePopover(snapshot, current, tile, host);
      }
    };
    const maybeClose = () => {
      if (tile.matches(":hover") || tile.contains(document.activeElement)) {
        return;
      }
      if (openCompareDropId() === drop.dropId) {
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

  function applyBrowseSlot(classId: ClassId, slot: EquipmentSlotId): void {
    const next: ArmoryFilters = { ...filters, slot };
    if (slot === "weapon") {
      next.weaponClass = classId;
    } else {
      delete next.weaponClass;
    }
    filters = next;
    browseCompatibility = { classId, slot };
  }

  function selectorSelectAt(index: number): void {
    const roster = lastSnapshot ? rosterClassIds(lastSnapshot) : [];
    const classId = roster[index];
    if (!classId) {
      return;
    }
    options.selectClassId(classId);
  }

  function onSelectorChipKeydown(event: KeyboardEvent, classId: ClassId): void {
    const roster = lastSnapshot ? rosterClassIds(lastSnapshot) : [];
    const index = roster.indexOf(classId);
    if (index < 0 || roster.length === 0) {
      return;
    }
    const last = roster.length - 1;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectorSelectAt((index + 1) % roster.length);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectorSelectAt((index - 1 + roster.length) % roster.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      selectorSelectAt(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      selectorSelectAt(last);
    }
  }

  function selectorChipStateKey(
    snapshot: ReadonlySnapshot,
    selected: ClassId | null,
    classId: ClassId,
  ): string {
    return [classId, classId === selected ? "sel" : "", levelFor(snapshot, content, classId)].join(
      "|",
    );
  }

  function buildSelectorChip(
    snapshot: ReadonlySnapshot,
    selected: ClassId | null,
    classId: ClassId,
  ): HTMLElement {
    const isSelected = classId === selected;
    const chip = el(
      "button",
      {
        class: "character-picker-chip focus-ring",
        data: {
          characterChip: classId,
          selectorChipKey: selectorChipStateKey(snapshot, selected, classId),
        },
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
    chip.addEventListener("keydown", (event) => onSelectorChipKeydown(event, classId));
    return chip;
  }

  function reconcileCharacterSelector(snapshot: ReadonlySnapshot): void {
    if (selectorEl.parentNode !== bodyEl) {
      // Insert once, after the toolbar and before the panes/worn strip.
      bodyEl.insertBefore(selectorEl, armoryPanes);
    }
    const roster = rosterClassIds(snapshot);
    const selected = options.getSelectedClassId();

    // Keyed by Roster slot index (unique) — a Class can occupy both a Party slot
    // and Reserve, so Class alone would collide.
    const existing = new Map<number, HTMLElement>();
    [...selectorEl.children].forEach((child, index) => {
      existing.set(index, child as HTMLElement);
    });

    const desired: HTMLElement[] = roster.map((classId, index) => {
      const prev = existing.get(index);
      if (
        prev &&
        prev.dataset["selectorChipKey"] === selectorChipStateKey(snapshot, selected, classId)
      ) {
        return prev;
      }
      return buildSelectorChip(snapshot, selected, classId);
    });

    const keep = new Set<Node>(desired);
    for (const child of [...selectorEl.childNodes]) {
      if (!keep.has(child)) {
        selectorEl.removeChild(child);
      }
    }
    let cursor = selectorEl.firstChild;
    for (const node of desired) {
      if (node === cursor) {
        cursor = cursor.nextSibling;
        continue;
      }
      selectorEl.insertBefore(node, cursor);
    }
  }

  function renderWornStrip(snapshot: ReadonlySnapshot): HTMLElement {
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
        applyBrowseSlot(classId, slot);
        render(snapshot);
      });
      if (classId) {
        bindWornSlotDropTarget(snapshot, classId, slot, button);
      }
      if (drop && classId) {
        bindWornSlotDrag(classId, slot, drop, button);
      }
      strip.append(button);
    }

    return strip;
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

  function filteredDrops(snapshot: ReadonlySnapshot): DropInstance[] {
    const unequipped = snapshot.progression.armory.filter((drop) => !drop.assignedTo);
    let drops = filterArmoryDrops(unequipped, filters, content);
    if (browseCompatibility) {
      const { classId, slot } = browseCompatibility;
      drops = drops.filter((drop) =>
        isCompatibleWithSlot(drop, classId, slot, lastLegality.canEquip),
      );
    }
    return sortArmoryDrops(drops, sort, content);
  }

  function renderToolbar(snapshot: ReadonlySnapshot): HTMLElement {
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

    return toolbar;
  }

  /**
   * Everything about a collection tile's rendered DOM, folded into one string. A tile is
   * reused across renders only when this key is unchanged, so combat churn (which never
   * touches these fields) reuses every tile — no teardown, no flash — while a genuine
   * change (lock, seen, discard selection) rebuilds just the one tile that changed.
   */
  function tileStateKey(drop: DropInstance): string {
    const base = equipmentBaseForDrop(drop, content);
    return [
      drop.dropId,
      drop.rarity,
      base.iconKey,
      base.name,
      drop.locked ? "L" : "",
      isDropSeen(drop) ? "S" : "",
      discardableDrop(drop) ? "d" : "",
      selectedDiscard.has(drop.dropId) ? "D" : "",
    ].join("|");
  }

  function buildTile(drop: DropInstance, host: HTMLElement): HTMLElement {
    const tile = el("article", {
      class: `equipment-card focus-ring${drop.locked ? " locked-tile" : ""}`,
      data: {
        dropId: String(drop.dropId),
        tileStateKey: tileStateKey(drop),
      },
      props: { tabIndex: 0, role: "listitem" },
      aria: {
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
        if (lastSnapshot) {
          render(lastSnapshot);
        }
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
    });
    bindPressable(lockButton, () => {
      const current = lastSnapshot
        ? dropById(lastSnapshot.progression.armory, drop.dropId)
        : undefined;
      publish({ cmd: "setLocked", args: [drop.dropId, !(current?.locked ?? drop.locked)] });
    });
    tile.append(lockButton);

    bindComparePopover(drop, tile, host);
    bindCollectionDrag(drop, tile);
    return tile;
  }

  /**
   * Reconcile the persistent grid's tiles in place, keyed by dropId. Unchanged tiles
   * keep their exact node (and their :hover, focus, and any active grab); changed tiles
   * are rebuilt one at a time; gone tiles are removed; new drops are inserted. A tile
   * already sitting in its target slot is never touched, so the common combat case —
   * identical tile set — mutates nothing.
   */
  function reconcileGrid(snapshot: ReadonlySnapshot, host: HTMLElement): void {
    const drops = filteredDrops(snapshot);

    const existing = new Map<number, HTMLElement>();
    for (const child of [...gridEl.children]) {
      const raw = (child as HTMLElement).dataset["dropId"];
      if (raw !== undefined) {
        existing.set(Number(raw), child as HTMLElement);
      }
    }

    const desired: HTMLElement[] = [];
    for (const drop of drops) {
      const prev = existing.get(drop.dropId);
      if (prev) {
        existing.delete(drop.dropId);
      }
      if (prev && prev.dataset["tileStateKey"] === tileStateKey(drop)) {
        desired.push(prev);
      } else {
        desired.push(buildTile(drop, host));
      }
    }

    const keep = new Set<Node>(desired);
    for (const child of [...gridEl.childNodes]) {
      if (!keep.has(child)) {
        gridEl.removeChild(child);
      }
    }
    let cursor = gridEl.firstChild;
    for (const node of desired) {
      if (node === cursor) {
        cursor = cursor.nextSibling;
        continue;
      }
      gridEl.insertBefore(node, cursor);
    }

    if (desired.length === 0) {
      gridEl.append(
        el("p", {
          class: "surface-empty",
          text: "No equipment matches the current filters.",
        }),
      );
    }
  }

  const shell = mountSurfaceShell(root, "armory-surface", {
    reconcile: true,
    title: "Armory",
    showTitle: false,
    body(snapshot) {
      currentToolbar = swapBodySection(currentToolbar, renderToolbar(snapshot));
      reconcileCharacterSelector(snapshot);
      currentWornStrip = swapBodySection(currentWornStrip, renderWornStrip(snapshot));
      reconcileGrid(snapshot, bodyEl);
      return [bodyEl];
    },
  });

  // The grid node persists, so its drop-target and overflow affordance bind exactly once
  // rather than on every render.
  bindCollectionDropTarget(gridEl);
  unbindGridOverflow = bindScrollOverflowAffordance(gridEl);

  function render(
    snapshot: ReadonlySnapshot | null,
    legality: EngineLegalityView = lastLegality,
  ): void {
    lastLegality = legality;
    if (snapshot) {
      syncOptimisticSeen(snapshot.progression.armory);
    }
    lastSnapshot = snapshot;
    shell.render(snapshot, legality);
    const compareDropId = openCompareDropId();
    const compareHost = root.querySelector<HTMLElement>(".armory-body--compare-host");
    if (compareDropId !== null && compareHost && snapshot) {
      const drop = dropById(snapshot.progression.armory, compareDropId);
      const classId = options.getSelectedClassId();
      const anchor = root.querySelector<HTMLElement>(
        `.armory-grid .equipment-card[data-drop-id="${compareDropId}"]`,
      );
      if (drop && classId && anchor) {
        const descId = fillComparePopover(snapshot, drop, classId);
        anchor.setAttribute("aria-describedby", descId);
        positionComparePopover(anchor, compareHost);
      } else if (!anchor) {
        hideComparePopover();
      }
    }
  }

  return {
    render,
    destroy() {
      unbindGridOverflow?.();
      const host = armoryDragHost();
      if (host) {
        endArmoryDrag(host);
      } else {
        activeDrag = null;
      }
      hideComparePopover();
      shell.destroy();
    },
  };
}
