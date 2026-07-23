import type { ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, Content } from "../core/types";
import type { TileCommand } from "./bus";
import { bindPressable } from "./keyboard";
import {
  CLASS_LABELS,
  effectiveFormation,
  effectiveParty,
  levelFor,
  rosterClassIds,
} from "./snapshot-view";
import { bindScrollOverflowAffordance, el, pendingMarker } from "./surface-shell";

const POSITION_LABELS = ["Front", "Middle", "Back"] as const;
const POSITION_KEYS = ["front", "middle", "back"] as const;
const FORMATION_SLOTS = ["Front", "Middle", "Back"] as const;

export interface CharacterPicker {
  render(snapshot: ReadonlySnapshot | null, selected: ClassId): void;
  destroy(): void;
}

export interface CharacterPickerOptions {
  content: Content;
  onSelect(classId: ClassId): void;
  onCommand?: (command: TileCommand) => void;
}

function swapFormationOrder(
  order: [ClassId, ClassId, ClassId],
  slotIndex: number,
  direction: "up" | "down",
): [ClassId, ClassId, ClassId] {
  const next = [...order] as [ClassId, ClassId, ClassId];
  const target = direction === "up" ? slotIndex - 1 : slotIndex + 1;
  if (target < 0 || target >= next.length) {
    return order;
  }
  const current = next[slotIndex]!;
  next[slotIndex] = next[target]!;
  next[target] = current;
  return next;
}

function partySwapButtons(
  snapshot: ReadonlySnapshot,
  selected: ClassId,
  options: CharacterPickerOptions,
  getSnapshot: () => ReadonlySnapshot | null,
): HTMLElement[] {
  const { members, reserve } = effectiveParty(snapshot);
  const selectedPartyIndex = members.indexOf(selected);
  const selectedIsReserve = selected === reserve;
  const buttons: HTMLElement[] = [];

  if (selectedIsReserve) {
    for (let slotIndex = 0; slotIndex < members.length; slotIndex += 1) {
      const swapButton = el("button", {
        class: "party-swap focus-ring",
        data: { partySwapSlot: String(slotIndex) },
        props: { type: "button" },
        text: `→ ${FORMATION_SLOTS[slotIndex]}`,
      });
      bindPressable(swapButton, () => {
        const live = getSnapshot();
        if (!live) {
          return;
        }
        const current = effectiveParty(live);
        const nextMembers = [...current.members] as [ClassId, ClassId, ClassId];
        nextMembers[slotIndex] = selected;
        options.onCommand?.({
          cmd: "setParty",
          args: [nextMembers, current.members[slotIndex]!],
        });
      });
      buttons.push(swapButton);
    }
  } else if (selectedPartyIndex !== -1) {
    const swapButton = el("button", {
      class: "party-swap focus-ring",
      data: { partySwap: selected },
      props: { type: "button" },
      text: "Swap with Reserve",
    });
    bindPressable(swapButton, () => {
      const live = getSnapshot();
      if (!live) {
        return;
      }
      const current = effectiveParty(live);
      const index = current.members.indexOf(selected);
      if (index === -1) {
        return;
      }
      const nextMembers = [...current.members] as [ClassId, ClassId, ClassId];
      nextMembers[index] = current.reserve;
      options.onCommand?.({
        cmd: "setParty",
        args: [nextMembers, selected],
      });
    });
    buttons.push(swapButton);
  }

  return buttons;
}

export function mountCharacterPicker(
  root: HTMLElement,
  options: CharacterPickerOptions,
): CharacterPicker {
  const picker = el("div", {
    class: "character-picker",
    aria: { label: "Character picker" },
  });
  const pendingHost = el("div", { class: "character-picker-pending" });
  const tablist = el("div", {
    class: "character-picker-tabs",
    props: { role: "tablist" },
  });
  picker.append(pendingHost, tablist);
  root.append(picker);
  const unbindOverflow = bindScrollOverflowAffordance(picker);

  let chipOrder: ClassId[] = [];
  let lastSnapshot: ReadonlySnapshot | null = null;

  function selectAt(index: number): void {
    const classId = chipOrder[index];
    if (!classId) {
      return;
    }
    options.onSelect(classId);
  }

  function onChipKeydown(event: KeyboardEvent, classId: ClassId): void {
    const index = chipOrder.indexOf(classId);
    if (index < 0 || chipOrder.length === 0) {
      return;
    }
    const last = chipOrder.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      selectAt((index + 1) % chipOrder.length);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      selectAt((index - 1 + chipOrder.length) % chipOrder.length);
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

  function renderPending(snapshot: ReadonlySnapshot): void {
    const children: HTMLElement[] = [];
    if (snapshot.pendingEdits.some((edit) => edit.kind === "formation")) {
      const marker = pendingMarker();
      marker.dataset["pendingKind"] = "formation";
      children.push(marker);
    }
    if (snapshot.progression.pendingParty !== null) {
      children.push(
        el("p", {
          class: "pending-marker pending-attempt",
          data: { pendingKind: "party" },
          text: "Applies next Attempt",
        }),
      );
    }
    pendingHost.replaceChildren(...children);
  }

  /**
   * Folds everything that determines a row's DOM into one string. Rows whose
   * key is unchanged are reused in place across a render so the browser keeps
   * their native `:hover` state — detaching them (as `replaceChildren` did)
   * drops `:hover` until the next mousemove, which read as a flash on every
   * management-relevant pump.
   */
  function rowStateKey(
    snapshot: ReadonlySnapshot,
    selected: ClassId,
    classId: ClassId,
    index: number,
  ): string {
    const isSelected = classId === selected;
    const showFormationControls = snapshot.progression.pendingParty === null;
    let swapKey = "";
    if (isSelected) {
      const { members, reserve } = effectiveParty(snapshot);
      swapKey = `${members.join(",")}~${reserve}`;
    }
    return [
      classId,
      index,
      isSelected ? "sel" : "",
      levelFor(snapshot, options.content, classId),
      showFormationControls ? "fc" : "",
      swapKey,
    ].join("|");
  }

  function buildRow(
    snapshot: ReadonlySnapshot,
    selected: ClassId,
    classId: ClassId,
    index: number,
  ): HTMLElement {
    const isSelected = classId === selected;
    const positionKey = index < 3 ? POSITION_KEYS[index]! : "reserve";
    const positionLabel = index < 3 ? POSITION_LABELS[index]! : "Reserve";
    const isPartySlot = index < 3;
    const formation = effectiveFormation(snapshot);
    const showFormationControls = snapshot.progression.pendingParty === null;

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
          text: `Level ${levelFor(snapshot, options.content, classId)}`,
        }),
        el("span", {
          class: "character-chip-position",
          data: { pickerPosition: positionKey },
          text: positionLabel,
        }),
      ],
    );
    chip.setAttribute("aria-selected", isSelected ? "true" : "false");
    bindPressable(chip, () => options.onSelect(classId));
    chip.addEventListener("keydown", (event) => onChipKeydown(event, classId));

    const rowChildren: HTMLElement[] = [chip];
    if (isPartySlot && showFormationControls) {
      const moveUp = el("button", {
        class: "formation-action focus-ring",
        data: { formationAction: "move-up", slot: String(index) },
        props: { type: "button", disabled: index === 0 },
        aria: { label: "Move up" },
        text: "↑",
      });
      bindPressable(moveUp, () => {
        const live = lastSnapshot;
        if (!live) {
          return;
        }
        options.onCommand?.({
          cmd: "setFormation",
          args: [swapFormationOrder(effectiveFormation(live), index, "up")],
        });
      });

      const moveDown = el("button", {
        class: "formation-action focus-ring",
        data: { formationAction: "move-down", slot: String(index) },
        props: { type: "button", disabled: index === formation.length - 1 },
        aria: { label: "Move down" },
        text: "↓",
      });
      bindPressable(moveDown, () => {
        const live = lastSnapshot;
        if (!live) {
          return;
        }
        options.onCommand?.({
          cmd: "setFormation",
          args: [swapFormationOrder(effectiveFormation(live), index, "down")],
        });
      });

      rowChildren.push(
        el("div", { class: "character-picker-formation-controls" }, [moveUp, moveDown]),
      );
    }

    if (isSelected) {
      const swaps = partySwapButtons(snapshot, selected, options, () => lastSnapshot);
      if (swaps.length > 0) {
        rowChildren.push(el("div", { class: "character-picker-row-swaps" }, swaps));
      }
    }

    // Keyed by Roster slot index (unique) rather than Class — a Class can appear
    // in both a Party slot and Reserve, so Class alone would collide.
    const row = el("div", {
      class: "character-picker-row",
      data: {
        characterRow: String(index),
        rowStateKey: rowStateKey(snapshot, selected, classId, index),
      },
    }, rowChildren);
    return row;
  }

  function renderChips(snapshot: ReadonlySnapshot, selected: ClassId): void {
    lastSnapshot = snapshot;
    const restoreFocus = picker.contains(document.activeElement);
    const active = document.activeElement;
    const restoreSelector =
      active instanceof HTMLElement
        ? active.getAttribute("data-formation-action")
          ? `[data-formation-action="${active.getAttribute("data-formation-action")}"][data-slot="${active.getAttribute("data-slot")}"]`
          : active.getAttribute("data-party-swap")
            ? `[data-party-swap="${active.getAttribute("data-party-swap")}"]`
            : active.getAttribute("data-party-swap-slot")
              ? `[data-party-swap-slot="${active.getAttribute("data-party-swap-slot")}"]`
              : `[data-character-chip="${selected}"]`
        : `[data-character-chip="${selected}"]`;

    chipOrder = rosterClassIds(snapshot);

    const existing = new Map<string, HTMLElement>();
    for (const child of [...tablist.children]) {
      const key = (child as HTMLElement).dataset["characterRow"];
      if (key !== undefined) {
        existing.set(key, child as HTMLElement);
      }
    }

    const desired: HTMLElement[] = chipOrder.map((classId, index) => {
      const prev = existing.get(String(index));
      if (prev && prev.dataset["rowStateKey"] === rowStateKey(snapshot, selected, classId, index)) {
        return prev;
      }
      return buildRow(snapshot, selected, classId, index);
    });

    const keep = new Set<Node>(desired);
    for (const child of [...tablist.childNodes]) {
      if (!keep.has(child)) {
        tablist.removeChild(child);
      }
    }
    let cursor = tablist.firstChild;
    for (const node of desired) {
      if (node === cursor) {
        cursor = cursor.nextSibling;
        continue;
      }
      tablist.insertBefore(node, cursor);
    }

    renderPending(snapshot);

    if (restoreFocus) {
      picker.querySelector<HTMLElement>(restoreSelector)?.focus();
    }
  }

  return {
    render(snapshot, selected) {
      if (!snapshot) {
        chipOrder = [];
        lastSnapshot = null;
        pendingHost.replaceChildren();
        tablist.replaceChildren();
        return;
      }
      renderChips(snapshot, selected);
    },
    destroy() {
      unbindOverflow();
      chipOrder = [];
      picker.remove();
    },
  };
}
