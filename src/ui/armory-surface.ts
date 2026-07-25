import type { DropInstance, ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, Content, EquipmentSlotId, ItemLevel, Rarity } from "../core/types";
import type { TileCommand } from "./bus";
import {
  type ArmoryFilters,
  type ArmorySortId,
  discardableDrop,
  equipmentBaseForDrop,
  filterArmoryDrops,
  formatRarityLabel,
  isCompatibleWithSlot,
  nextRarity,
  RARITY_LABELS,
  salvageEligibleAtRarity,
  selectSalvageBatchForRarity,
  SLOT_LABELS,
  sortArmoryDrops,
  discardTierDropsAtItemLevel,
  discardTierItemLevels,
} from "./equipment-format";
import { bindPressable } from "./keyboard";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";
import { createEquipmentIconElement } from "./icons";
import {
  CLASS_LABELS,
  previewEquip,
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

type SalvagePendingResult = {
  beforeIds: Set<number>;
  consumedDropIds: number[];
  expectedRarity: Rarity;
  expectedItemLevel: ItemLevel;
};

type SalvageStageMeta = {
  rarity: Rarity;
};

const SALVAGE_INPUT_RARITIES = ["common", "uncommon", "rare"] as const satisfies readonly Rarity[];

type StateFilterId = "all" | "unseen" | "locked";

type ArmoryActionMode = "salvage" | "discard-tier";


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

function dropById(armory: readonly DropInstance[], dropId: number): DropInstance | undefined {
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
  let actionMode: ArmoryActionMode | null = null;
  let salvagePickRarity: Rarity | null = null;
  let salvageFilled = false;
  let stagedSalvageIds = new Set<number>();
  let stagedSalvageMeta: SalvageStageMeta | null = null;
  let discardPickItemLevel: ItemLevel | null = null;
  let discardTierFilled = false;
  let stagedDiscardTierIds = new Set<number>();
  let pendingSalvageResult: SalvagePendingResult | null = null;
  let salvageResultDropId: number | null = null;
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
  // — the toolbar, salvage tray, worn strip, and the keyed grid tiles — update.
  const gridEl = el("div", {
    class: "armory-grid",
    data: { armoryCollection: "true" },
    props: { role: "list" },
    aria: { label: "Armory collection" },
  });
  const detailEl = el("div", {
    class: "armory-detail",
    data: { armoryDetail: "true", surfaceRetain: "true" },
    props: { hidden: true },
  });
  const armoryPanes = el("div", { class: "armory-panes armory-panes--full" }, [gridEl, detailEl]);
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

  function clearSalvageResult(): void {
    salvageResultDropId = null;
  }

  function clearSalvageStaging(): void {
    stagedSalvageIds = new Set();
    stagedSalvageMeta = null;
    salvageFilled = false;
  }

  function clearSalvageFill(): void {
    clearSalvageStaging();
  }

  function resetSalvagePaneState(): void {
    salvagePickRarity = null;
    clearSalvageFill();
  }

  function defaultDiscardPickItemLevel(armory: readonly DropInstance[]): ItemLevel | null {
    const levels = discardTierItemLevels([...armory]);
    return levels[0]?.itemLevel ?? null;
  }

  function clearDiscardTierStaging(): void {
    stagedDiscardTierIds = new Set();
    discardTierFilled = false;
  }

  function resetDiscardTierPaneState(): void {
    discardPickItemLevel = null;
    clearDiscardTierStaging();
  }

  function defaultSalvagePickRarity(armory: readonly DropInstance[]): Rarity {
    for (const rarity of SALVAGE_INPUT_RARITIES) {
      if (salvageEligibleAtRarity(armory, rarity).length >= 10) {
        return rarity;
      }
    }
    for (const rarity of SALVAGE_INPUT_RARITIES) {
      if (salvageEligibleAtRarity(armory, rarity).length > 0) {
        return rarity;
      }
    }
    return "common";
  }

  function setPaneLayout(layout: "full" | "compact"): void {
    if (layout === "full") {
      armoryPanes.classList.add("armory-panes--full");
      armoryPanes.classList.remove("armory-panes--compact");
      detailEl.hidden = true;
      detailEl.setAttribute("aria-hidden", "true");
      return;
    }

    armoryPanes.classList.remove("armory-panes--full");
    armoryPanes.classList.add("armory-panes--compact");
    detailEl.hidden = false;
    detailEl.removeAttribute("aria-hidden");
  }

  function closeActionPane(): void {
    actionMode = null;
    resetSalvagePaneState();
    resetDiscardTierPaneState();
    clearSalvageResult();
    setPaneLayout("full");
    delete detailEl.dataset["armoryActionMode"];
    detailEl.replaceChildren();
  }

  function openActionPane(mode: ArmoryActionMode): void {
    if (actionMode === mode) {
      closeActionPane();
      return;
    }
    actionMode = mode;
    resetSalvagePaneState();
    resetDiscardTierPaneState();
    clearSalvageResult();
    if (lastSnapshot) {
      if (mode === "salvage") {
        salvagePickRarity = defaultSalvagePickRarity(lastSnapshot.progression.armory);
      } else {
        discardPickItemLevel = defaultDiscardPickItemLevel(lastSnapshot.progression.armory);
      }
    }
    setPaneLayout("compact");
    detailEl.dataset["armoryActionMode"] = mode;
  }

  function syncActionPane(snapshot: ReadonlySnapshot): void {
    if (actionMode === null) {
      setPaneLayout("full");
      detailEl.replaceChildren();
      delete detailEl.dataset["armoryActionMode"];
      return;
    }

    setPaneLayout("compact");
    detailEl.dataset["armoryActionMode"] = actionMode;
    detailEl.replaceChildren(renderActionPaneBody(snapshot, actionMode));
  }

  function renderActionPaneBody(
    snapshot: ReadonlySnapshot,
    mode: ArmoryActionMode,
  ): HTMLElement {
    if (mode === "salvage") {
      return renderSalvagePane(snapshot);
    }
    return renderDiscardTierPane(snapshot);
  }

  function renderDiscardTierPane(snapshot: ReadonlySnapshot): HTMLElement {
    const armory = snapshot.progression.armory;
    const levels = discardTierItemLevels([...armory]);
    const pickItemLevel =
      discardPickItemLevel ?? (levels[0]?.itemLevel ?? null);
    discardPickItemLevel = pickItemLevel;

    const pane = el("div", {
      class: "armory-action-pane armory-discard-tier-pane",
      data: { discardTierPane: "true" },
    });
    pane.append(el("h3", { class: "armory-action-pane-title", text: "Discard" }));

    if (levels.length > 0) {
      const picker = el("div", {
        class: "armory-discard-tier-picker",
        props: { role: "group" },
        aria: { label: "Discard Item Level" },
      });
      for (const entry of levels) {
        const chip = el("button", {
          class: "armory-discard-tier-chip focus-ring",
          data: { discardTierPick: String(entry.itemLevel) },
          props: { type: "button" },
          aria: {
            pressed: pickItemLevel === entry.itemLevel ? "true" : "false",
          },
          text: `IL ${entry.itemLevel} (${entry.count})`,
        });
        bindPressable(chip, () => {
          discardPickItemLevel = entry.itemLevel;
          clearDiscardTierStaging();
          if (lastSnapshot) {
            render(lastSnapshot);
          }
        });
        picker.append(chip);
      }
      pane.append(picker);
    }

    const tierDrops =
      pickItemLevel === null ? [] : discardTierDropsAtItemLevel([...armory], pickItemLevel);
    const fill = el("button", {
      class: "armory-discard-tier-fill focus-ring",
      data: { discardTierFill: "true" },
      props: { type: "button", disabled: tierDrops.length === 0 },
      text: "Fill from tier",
    });
    bindPressable(fill, () => {
      if (pickItemLevel === null) {
        return;
      }
      const drops = discardTierDropsAtItemLevel([...armory], pickItemLevel);
      if (drops.length === 0) {
        clearDiscardTierStaging();
      } else {
        stagedDiscardTierIds = new Set(drops.map((entry) => entry.dropId));
        discardTierFilled = true;
      }
      if (lastSnapshot) {
        render(lastSnapshot);
      }
    });

    const fillRowChildren: HTMLElement[] = [fill];
    if (stagedDiscardTierIds.size > 0) {
      const clearFill = el("button", {
        class: "armory-discard-tier-clear-fill focus-ring",
        data: { discardTierClearFill: "true" },
        props: { type: "button" },
        text: "Clear",
      });
      bindPressable(clearFill, () => {
        clearDiscardTierStaging();
        if (lastSnapshot) {
          render(lastSnapshot);
        }
      });
      fillRowChildren.push(clearFill);
    }
    pane.append(el("div", { class: "armory-discard-tier-fill-row" }, fillRowChildren));

    const stagedDrops = [...stagedDiscardTierIds]
      .map((dropId) => dropById(armory, dropId))
      .filter((entry): entry is DropInstance => entry !== undefined);

    if (stagedDrops.length > 0) {
      const precious = stagedDrops.filter(
        (entry) => entry.rarity === "rare" || entry.rarity === "epic",
      );
      const preciousSuffix =
        precious.length > 0 ? ` · ${precious.length} Rare/Epic` : "";
      const tierBatch =
        discardTierFilled &&
        pickItemLevel !== null &&
        stagedDrops.every((entry) => entry.itemLevel === pickItemLevel);
      const summary = tierBatch
        ? `Discard ${stagedDrops.length} at Item Level ${pickItemLevel}${preciousSuffix}`
        : `Discard ${stagedDrops.length} piece(s)${preciousSuffix}`;
      pane.append(
        el("p", {
          class: "armory-discard-tier-summary",
          data: { discardTierSummary: "true" },
          text: summary,
        }),
      );

      const preciousSet = new Set(precious.map((entry) => entry.dropId));
      const ordered = [
        ...stagedDrops.filter((entry) => preciousSet.has(entry.dropId)),
        ...stagedDrops.filter((entry) => !preciousSet.has(entry.dropId)),
      ];
      const list = el("div", { class: "armory-discard-tier-list" });
      for (const entry of ordered) {
        const base = equipmentBaseForDrop(entry, content);
        const preciousRow = entry.rarity === "rare" || entry.rarity === "epic";
        const row = el("div", {
          class: `armory-discard-tier-row${preciousRow ? ` priority rarity-${entry.rarity}` : ""}`,
          data: { discardTierRow: "true" },
        });
        row.append(
          createEquipmentIconElement(base.iconKey, "content", { ariaLabel: base.name }),
        );
        const copy = el("div", { class: "armory-discard-tier-row-copy" });
        copy.append(el("span", { class: "armory-discard-tier-row-name", text: base.name }));
        copy.append(
          el("span", {
            class: "armory-discard-tier-row-meta",
            text: `${SLOT_LABELS[base.slot]} · IL ${entry.itemLevel}`,
          }),
        );
        row.append(copy);
        row.append(
          el("span", {
            class: "armory-discard-tier-row-rarity",
            text: RARITY_LABELS[entry.rarity],
          }),
        );
        list.append(row);
      }
      pane.append(list);
    } else if (levels.length === 0) {
      pane.append(
        el("p", {
          class: "armory-discard-tier-empty",
          text: "No unequipped, unlocked pieces to discard.",
        }),
      );
    } else {
      pane.append(
        el("p", {
          class: "armory-action-pane-hint",
          text: "Fill from tier, or click pieces in the collection to stage them.",
        }),
      );
    }

    if (stagedDrops.length > 0) {
      const confirm = el("button", {
        class: "armory-discard-tier-confirm focus-ring",
        data: { discardTierConfirm: "true" },
        props: { type: "button" },
        text: "Discard",
      });
      bindPressable(confirm, () => {
        const dropIds = [...stagedDiscardTierIds];
        publish({ cmd: "discard", args: [dropIds] });
        clearDiscardTierStaging();
        if (lastSnapshot) {
          render(lastSnapshot);
        }
      });

      const cancel = el("button", {
        class: "armory-discard-tier-cancel focus-ring",
        data: { discardTierCancel: "true" },
        props: { type: "button" },
        text: "Cancel",
      });
      bindPressable(cancel, () => {
        clearDiscardTierStaging();
        if (lastSnapshot) {
          render(lastSnapshot);
        }
      });

      pane.append(el("div", { class: "armory-discard-tier-actions" }, [confirm, cancel]));
    } else {
      pane.append(renderActionPaneClose());
    }

    return pane;
  }

  function renderActionPaneClose(): HTMLElement {
    const close = el("button", {
      class: "armory-action-close focus-ring",
      data: { armoryActionClose: "true" },
      props: { type: "button" },
      text: "Close",
    });
    bindPressable(close, () => {
      closeActionPane();
      if (lastSnapshot) {
        render(lastSnapshot);
      }
    });
    return el("div", { class: "armory-detail-actions" }, [close]);
  }

  function renderSalvagePane(snapshot: ReadonlySnapshot): HTMLElement {
    const armory = snapshot.progression.armory;
    const pickRarity = salvagePickRarity ?? defaultSalvagePickRarity(armory);
    salvagePickRarity = pickRarity;

    const pane = el("div", {
      class: "armory-action-pane armory-salvage-pane",
      data: { salvagePane: "true" },
    });
    pane.append(el("h3", { class: "armory-action-pane-title", text: "Salvage" }));

    const picker = el("div", {
      class: "armory-salvage-picker",
      props: { role: "group" },
      aria: { label: "Salvage rarity" },
    });
    for (const rarity of SALVAGE_INPUT_RARITIES) {
      const count = salvageEligibleAtRarity(armory, rarity).length;
      const chip = el("button", {
        class: `armory-salvage-rarity-chip rarity-${rarity} focus-ring`,
        data: { salvageRarityPick: rarity },
        props: { type: "button", disabled: count === 0 },
        aria: { pressed: pickRarity === rarity ? "true" : "false" },
        text: `${RARITY_LABELS[rarity]} ${count}/10`,
      });
      bindPressable(chip, () => {
        salvagePickRarity = rarity;
        clearSalvageFill();
        if (lastSnapshot) {
          render(lastSnapshot);
        }
      });
      picker.append(chip);
    }
    pane.append(picker);

    const eligibleCount = salvageEligibleAtRarity(armory, pickRarity).length;
    const fill = el("button", {
      class: "armory-salvage-fill focus-ring",
      data: { salvageFill: "true" },
      props: { type: "button", disabled: eligibleCount < 10 },
      text: "Fill 10 slots",
    });
    bindPressable(fill, () => {
      if (!salvagePickRarity) {
        return;
      }
      clearSalvageResult();
      const batch = selectSalvageBatchForRarity([...armory], salvagePickRarity);
      if (batch) {
        stagedSalvageIds = new Set(batch.dropIds);
        stagedSalvageMeta = { rarity: batch.rarity };
        salvageFilled = true;
      } else {
        clearSalvageFill();
      }
      if (lastSnapshot) {
        render(lastSnapshot);
      }
    });

    const fillRowChildren: HTMLElement[] = [fill];
    if (salvageFilled) {
      const clearFill = el("button", {
        class: "armory-salvage-clear-fill focus-ring",
        data: { salvageClearFill: "true" },
        props: { type: "button" },
        text: "Clear",
      });
      bindPressable(clearFill, () => {
        clearSalvageFill();
        if (lastSnapshot) {
          render(lastSnapshot);
        }
      });
      fillRowChildren.push(clearFill);
    }
    pane.append(el("div", { class: "armory-salvage-fill-row" }, fillRowChildren));

    const stagedDrops = salvageFilled
      ? [...stagedSalvageIds]
          .map((dropId) => dropById(armory, dropId))
          .filter((entry): entry is DropInstance => entry !== undefined)
      : [];

    if (salvageFilled && stagedSalvageMeta && stagedDrops.length === 10) {
      const fromRarity = stagedSalvageMeta.rarity;
      const toRarity = nextRarity(fromRarity);
      const minItemLevel = Math.min(...stagedDrops.map((entry) => entry.itemLevel)) as ItemLevel;
      if (toRarity) {
        pane.append(
          el("p", {
            class: "armory-salvage-summary",
            data: { salvageSummary: "true" },
            text: `10 ${RARITY_LABELS[fromRarity]} → 1 ${RARITY_LABELS[toRarity]} · Item Level ${minItemLevel}`,
          }),
        );
      }
    }

    const slotGrid = el("div", {
      class: "armory-salvage-slot-grid",
      aria: { label: "Salvage slots" },
    });
    for (let index = 0; index < 10; index += 1) {
      const stagedDrop = stagedDrops[index];
      if (stagedDrop) {
        const base = equipmentBaseForDrop(stagedDrop, content);
        const slot = el("div", {
          class: `armory-salvage-slot filled rarity-${stagedDrop.rarity}`,
          data: { salvageSlot: "true", dropId: String(stagedDrop.dropId) },
          aria: { label: base.name },
        });
        slot.append(
          createEquipmentIconElement(base.iconKey, "content", { ariaLabel: base.name }),
        );
        slot.append(
          el("span", { class: "armory-salvage-slot-il", text: `IL ${stagedDrop.itemLevel}` }),
        );
        slotGrid.append(slot);
      } else {
        slotGrid.append(
          el("div", {
            class: "armory-salvage-slot empty",
            data: { salvageSlot: "true" },
            text: String(index + 1),
          }),
        );
      }
    }
    if (salvageFilled && stagedSalvageMeta) {
      const outcomeRarity = nextRarity(stagedSalvageMeta.rarity);
      if (outcomeRarity) {
        slotGrid.append(
          el("div", {
            class: `armory-salvage-slot outcome rarity-${outcomeRarity}`,
            data: { salvageOutcomeSlot: "true" },
            aria: { label: `Outcome ${RARITY_LABELS[outcomeRarity]}` },
          }, [
            el("span", { class: "armory-salvage-slot-q", text: "?" }),
            el("span", {
              class: "armory-salvage-slot-il",
              text: RARITY_LABELS[outcomeRarity],
            }),
          ]),
        );
      }
    }
    pane.append(slotGrid);

    if (salvageResultDropId !== null) {
      const resultDrop = dropById(armory, salvageResultDropId);
      if (resultDrop) {
        const base = equipmentBaseForDrop(resultDrop, content);
        const card = el("div", {
          class: `armory-salvage-result rarity-${resultDrop.rarity}`,
          data: { salvageResult: String(resultDrop.dropId) },
        });
        card.append(
          createEquipmentIconElement(base.iconKey, "content", { ariaLabel: base.name }),
        );
        card.append(el("span", { class: "armory-salvage-result-name", text: base.name }));
        pane.append(card);
      }
    }

    if (salvageFilled && stagedSalvageMeta && stagedDrops.length === 10) {
      const confirm = el("button", {
        class: "armory-salvage-confirm focus-ring",
        data: { salvageConfirm: "true" },
        props: { type: "button" },
        text: "Salvage",
      });
      bindPressable(confirm, () => {
        const dropIds = [...stagedSalvageIds];
        const consumed = dropIds
          .map((dropId) => dropById(snapshot.progression.armory, dropId))
          .filter((entry): entry is DropInstance => entry !== undefined);
        const upgradedRarity = nextRarity(stagedSalvageMeta!.rarity);
        if (!upgradedRarity || consumed.length !== 10) {
          return;
        }
        pendingSalvageResult = {
          beforeIds: new Set(snapshot.progression.armory.map((entry) => entry.dropId)),
          consumedDropIds: dropIds,
          expectedRarity: upgradedRarity,
          expectedItemLevel: Math.min(...consumed.map((entry) => entry.itemLevel)) as ItemLevel,
        };
        publish({ cmd: "salvage", args: [dropIds] });
        clearSalvageFill();
        if (lastSnapshot) {
          render(lastSnapshot);
        }
      });

      const cancel = el("button", {
        class: "armory-salvage-cancel focus-ring",
        data: { salvageCancel: "true" },
        props: { type: "button" },
        text: "Cancel",
      });
      bindPressable(cancel, () => {
        clearSalvageFill();
        clearSalvageResult();
        if (lastSnapshot) {
          render(lastSnapshot);
        }
      });

      pane.append(el("div", { class: "armory-salvage-actions" }, [confirm, cancel]));
    } else {
      pane.append(renderActionPaneClose());
    }

    return pane;
  }

  function syncStagedSalvage(armory: readonly DropInstance[]): void {
    if (stagedSalvageIds.size === 0) {
      return;
    }
    for (const dropId of [...stagedSalvageIds]) {
      const entry = dropById(armory, dropId);
      if (!entry || entry.assignedTo !== null || entry.locked) {
        stagedSalvageIds.delete(dropId);
      }
    }
    if (stagedSalvageIds.size < 10) {
      clearSalvageStaging();
    }
  }

  function syncStagedDiscardTier(armory: readonly DropInstance[]): void {
    if (stagedDiscardTierIds.size === 0) {
      return;
    }
    for (const dropId of [...stagedDiscardTierIds]) {
      const entry = dropById(armory, dropId);
      if (!entry || entry.assignedTo !== null || entry.locked) {
        stagedDiscardTierIds.delete(dropId);
      }
    }
    if (stagedDiscardTierIds.size === 0) {
      clearDiscardTierStaging();
    }
  }

  function resolvePendingSalvageResult(snapshot: ReadonlySnapshot): void {
    if (!pendingSalvageResult) {
      return;
    }
    const { beforeIds, consumedDropIds, expectedRarity, expectedItemLevel } =
      pendingSalvageResult;
    const armory = snapshot.progression.armory;
    const consumedGone = consumedDropIds.every(
      (dropId) => dropById(armory, dropId) === undefined,
    );
    if (!consumedGone) {
      return;
    }

    const candidates = armory.filter((drop) => !beforeIds.has(drop.dropId));
    const match = candidates
      .filter(
        (drop) => drop.rarity === expectedRarity && drop.itemLevel === expectedItemLevel,
      )
      .sort((left, right) => left.dropId - right.dropId)[0];
    if (match) {
      salvageResultDropId = match.dropId;
    }
    pendingSalvageResult = null;
  }

  function salvageStagedDrop(drop: DropInstance): boolean {
    return stagedSalvageIds.has(drop.dropId);
  }

  function discardTierStagedDrop(drop: DropInstance): boolean {
    return stagedDiscardTierIds.has(drop.dropId);
  }

  function toggleDiscardTierSelection(dropId: number): void {
    if (stagedDiscardTierIds.has(dropId)) {
      stagedDiscardTierIds.delete(dropId);
    } else {
      stagedDiscardTierIds.add(dropId);
    }
    discardTierFilled = false;
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

    const salvageOpen = el("button", {
      class: "armory-salvage-open focus-ring",
      data: { armorySalvageOpen: "true" },
      props: { type: "button" },
      aria: { pressed: actionMode === "salvage" ? "true" : "false" },
      text: "Salvage",
    });
    bindPressable(salvageOpen, () => {
      openActionPane("salvage");
      if (lastSnapshot) {
        render(lastSnapshot);
      }
    });

    const discardTierOpen = el("button", {
      class: "armory-discard-tier-open focus-ring",
      data: { armoryDiscardTierOpen: "true" },
      props: { type: "button" },
      aria: { pressed: actionMode === "discard-tier" ? "true" : "false" },
      text: "Discard",
    });
    bindPressable(discardTierOpen, () => {
      openActionPane("discard-tier");
      if (lastSnapshot) {
        render(lastSnapshot);
      }
    });

    toolbar.append(
      el("div", { class: "armory-bulk-actions", data: { armoryBulkOpen: "true" } }, [
        salvageOpen,
        discardTierOpen,
      ]),
    );

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
      salvageStagedDrop(drop) ? "V" : "",
      discardTierStagedDrop(drop) ? "T" : "",
    ].join("|");
  }

  function buildTile(drop: DropInstance, host: HTMLElement): HTMLElement {
    const salvageStaged = salvageStagedDrop(drop);
    const discardTierStaged = discardTierStagedDrop(drop);
    const staged = salvageStaged || discardTierStaged;
    const tile = el("article", {
      class: `equipment-card focus-ring${drop.locked ? " locked-tile" : ""}${staged ? " armory-card--staged" : ""}`,
      data: {
        dropId: String(drop.dropId),
        tileStateKey: tileStateKey(drop),
        ...(salvageStaged ? { salvageStaged: "true" } : {}),
        ...(discardTierStaged ? { discardTierStaged: "true" } : {}),
      },
      props: { tabIndex: 0, role: "listitem" },
      aria: {
        label: equipmentBaseForDrop(drop, content).name,
      },
    });
    renderTileFace(tile, drop);

    tile.addEventListener("click", (event) => {
      if (actionMode !== "discard-tier") {
        return;
      }
      if ((event.target as HTMLElement).closest("[data-tile-lock]")) {
        return;
      }
      if (!discardableDrop(drop)) {
        return;
      }
      toggleDiscardTierSelection(drop.dropId);
      if (lastSnapshot) {
        render(lastSnapshot);
      }
    });

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
      if (snapshot) {
        syncStagedSalvage(snapshot.progression.armory);
        syncStagedDiscardTier(snapshot.progression.armory);
        resolvePendingSalvageResult(snapshot);
      }
      currentToolbar = swapBodySection(currentToolbar, renderToolbar(snapshot));
      currentWornStrip = swapBodySection(currentWornStrip, renderWornStrip(snapshot));
      syncActionPane(snapshot);
      reconcileGrid(snapshot, bodyEl);
      return [bodyEl];
    },
  });

  // The grid node persists, so its drop-target and overflow affordance bind exactly once
  // rather than on every render.
  bindCollectionDropTarget(gridEl);
  unbindGridOverflow = bindScrollOverflowAffordance(gridEl);

  const salvageVisibilityObserver =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              clearSalvageResult();
            }
          }
        })
      : null;
  salvageVisibilityObserver?.observe(root);

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
      salvageVisibilityObserver?.disconnect();
      closeActionPane();
      pendingSalvageResult = null;
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
