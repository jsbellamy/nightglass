import type { ReadonlySnapshot } from "../core/snapshot";
import type { AbilityDef, BaseStats, ClassId, Content, StatusEffectDef } from "../core/types";
import {
  formatAbilityDescription,
  formatAbilityTimings,
} from "./ability-format";
import type { TileCommand } from "./bus";
import type { EngineLegalityView } from "./engine-legality";
import { bindPressable } from "./keyboard";
import { createEquipmentIconElement } from "./icons";
import {
  appliedLoadout,
  CLASS_LABELS,
  characterStatsFor,
  classKitFor,
  effectiveLoadout,
  effectiveTalentState,
  unlockableAbilityIds,
} from "./snapshot-view";
import { el, mountSurfaceShell, pendingMarker } from "./surface-shell";

export type LoadoutSlotIndex = 0 | 1 | 2;

export type AbilityDragSource =
  | { kind: "pool"; abilityId: string }
  | { kind: "slot"; abilityId: string; slotIndex: LoadoutSlotIndex };

export const ABILITY_DRAG_MIME = "application/x-nightglass-ability-drag";

export function computeLoadoutAssignment(
  loadout: readonly [string, string, string],
  abilityId: string,
  targetSlot: LoadoutSlotIndex,
): [string, string, string] | null {
  const sourceSlot = loadout.indexOf(abilityId);
  if (sourceSlot === -1) {
    const next: [string, string, string] = [...loadout] as [string, string, string];
    next[targetSlot] = abilityId;
    if (new Set(next).size !== 3) {
      return null;
    }
    return next;
  }
  if (sourceSlot === targetSlot) {
    return null;
  }
  const next: [string, string, string] = [...loadout] as [string, string, string];
  const displaced = next[targetSlot];
  next[targetSlot] = next[sourceSlot]!;
  next[sourceSlot] = displaced;
  if (new Set(next).size !== 3) {
    return null;
  }
  return next;
}

export interface LoadoutSurface {
  render(snapshot: ReadonlySnapshot | null, legality?: EngineLegalityView): void;
  destroy(): void;
}

export interface LoadoutSurfaceOptions {
  content: Content;
  onCommand?: (command: TileCommand) => void;
  /** The Character the picker has selected. Read at render time, not mount time. */
  getSelectedClassId(): ClassId | null;
}

function abilityById(content: Content, abilityId: string): AbilityDef | undefined {
  return content.abilities.find((ability) => ability.id === abilityId);
}

function newlyInsertedAbilities(
  applied: [string, string, string],
  pending: [string, string, string],
): Set<string> {
  const previous = new Set(applied);
  return new Set(pending.filter((abilityId) => !previous.has(abilityId)));
}

function loadoutTuplesEqual(
  a: readonly [string, string, string],
  b: readonly [string, string, string],
): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function appendAbilityIcon(container: HTMLElement, ability: AbilityDef): void {
  if (!ability.iconKey) {
    return;
  }
  const wrap = el("span", {
    class: "equipment-icon-content loadout-ability-icon",
    aria: { hidden: "true" },
  });
  wrap.append(
    createEquipmentIconElement(ability.iconKey, "content", {
      ariaLabel: `${ability.name} icon`,
    }),
  );
  container.prepend(wrap);
}

export function mountLoadoutSurface(
  root: HTMLElement,
  options: LoadoutSurfaceOptions,
): LoadoutSurface {
  const { content } = options;
  let activeDrag: AbilityDragSource | null = null;
  let selectedAbilityId: string | null = null;
  let openPopoverAbilityId: string | null = null;
  let lastSnapshot: ReadonlySnapshot | null = null;

  const detailPopover = el("div", {
    class: "loadout-ability-popover",
    data: { loadoutAbilityPopover: "true", surfaceRetain: "true" },
    props: { hidden: true },
  });
  detailPopover.style.pointerEvents = "none";

  const orderNote = el("p", {
    class: "loadout-order-note",
    text: "Slot 1 is checked first for the first valid Ability.",
  });

  const loadoutHost = el("div", {
    class: "loadout-body loadout-body--detail-host",
    data: { surfaceRetain: "true" },
  });
  loadoutHost.append(detailPopover);

  function loadoutDragHost(): HTMLElement | null {
    return root.querySelector<HTMLElement>(".loadout-body--detail-host");
  }

  function hideDetailPopover(): void {
    detailPopover.hidden = true;
    detailPopover.replaceChildren();
    delete detailPopover.dataset["abilityId"];
    openPopoverAbilityId = null;
    for (const node of root.querySelectorAll<HTMLElement>("[aria-describedby^='loadout-ability-desc-']")) {
      node.removeAttribute("aria-describedby");
    }
  }

  function clearDragHighlights(host: HTMLElement): void {
    host.classList.remove("loadout-body--dragging");
    for (const node of host.querySelectorAll<HTMLElement>(".loadout-drag-source")) {
      node.classList.remove("loadout-drag-source");
    }
    for (const node of host.querySelectorAll<HTMLElement>(".loadout-drop-target--valid")) {
      node.classList.remove("loadout-drop-target--valid");
    }
    for (const node of host.querySelectorAll<HTMLElement>("[data-surface-preserve-live]")) {
      if (!node.draggable) {
        delete node.dataset["surfacePreserveLive"];
      }
    }
  }

  function endLoadoutDrag(host: HTMLElement): void {
    activeDrag = null;
    clearDragHighlights(host);
  }

  function highlightDropTargets(host: HTMLElement): void {
    for (const slot of host.querySelectorAll<HTMLElement>("[data-loadout-slot-drop]")) {
      slot.classList.add("loadout-drop-target--valid");
    }
  }

  function parseDragPayload(event: DragEvent): AbilityDragSource | null {
    const raw = event.dataTransfer?.getData(ABILITY_DRAG_MIME);
    if (!raw) {
      return activeDrag;
    }
    try {
      return JSON.parse(raw) as AbilityDragSource;
    } catch {
      return activeDrag;
    }
  }

  function clearAssignmentSelection(host: HTMLElement): void {
    selectedAbilityId = null;
    for (const node of host.querySelectorAll<HTMLElement>(".loadout-tile--selected-source")) {
      node.classList.remove("loadout-tile--selected-source");
      node.removeAttribute("aria-pressed");
    }
    for (const node of host.querySelectorAll<HTMLElement>(".loadout-slot--valid-target")) {
      node.classList.remove("loadout-slot--valid-target");
    }
  }

  function syncAssignmentSelection(host: HTMLElement): void {
    for (const node of host.querySelectorAll<HTMLElement>(".loadout-assign-tile")) {
      const abilityId = node.dataset["abilityId"];
      const selected = abilityId !== undefined && abilityId === selectedAbilityId;
      node.classList.toggle("loadout-tile--selected-source", selected);
      if (node instanceof HTMLButtonElement) {
        node.setAttribute("aria-pressed", selected ? "true" : "false");
      }
    }
    for (const node of host.querySelectorAll<HTMLElement>("[data-loadout-slot-drop]")) {
      node.classList.toggle("loadout-slot--valid-target", selectedAbilityId !== null);
    }
  }

  function publishLoadout(classId: ClassId, loadout: [string, string, string], next: [string, string, string]): void {
    if (loadoutTuplesEqual(loadout, next)) {
      return;
    }
    clearAssignmentSelection(loadoutHost);
    const host = loadoutDragHost();
    if (host) {
      endLoadoutDrag(host);
    } else {
      activeDrag = null;
    }
    options.onCommand?.({ cmd: "setLoadout", args: [classId, next] });
  }

  function tryAssign(
    classId: ClassId,
    loadout: [string, string, string],
    abilityId: string,
    targetSlot: LoadoutSlotIndex,
  ): void {
    const next = computeLoadoutAssignment(loadout, abilityId, targetSlot);
    if (!next) {
      return;
    }
    publishLoadout(classId, loadout, next);
  }

  function positionDetailPopover(anchor: HTMLElement, host: HTMLElement): void {
    detailPopover.hidden = false;
    detailPopover.style.visibility = "hidden";
    const margin = 6;
    const hostRect = host.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const popW = detailPopover.offsetWidth;
    const popH = detailPopover.offsetHeight;
    let top = anchorRect.bottom + margin;
    if (top + popH > hostRect.bottom && anchorRect.top - margin - popH >= hostRect.top) {
      top = anchorRect.top - margin - popH;
    }
    top = Math.min(Math.max(top, hostRect.top + margin), hostRect.bottom - popH - margin);
    let left = anchorRect.right + margin;
    if (left + popW > hostRect.right) {
      left = anchorRect.left - margin - popW;
    }
    left = Math.min(Math.max(left, hostRect.left + margin), hostRect.right - popW - margin);
    detailPopover.style.position = "fixed";
    detailPopover.style.left = `${left}px`;
    detailPopover.style.top = `${top}px`;
    detailPopover.style.visibility = "";
  }

  function fillDetailPopover(
    ability: AbilityDef,
    stats: BaseStats,
    statuses: readonly StatusEffectDef[],
    activationDelayPending: boolean,
  ): string {
    const descId = `loadout-ability-desc-${ability.id}`;
    detailPopover.replaceChildren();
    detailPopover.id = descId;
    detailPopover.append(
      el("p", {
        class: "loadout-popover-description",
        data: { abilityDescription: "true" },
        text: formatAbilityDescription(ability, stats, statuses),
      }),
      el("p", {
        class: "loadout-popover-timings ability-timings",
        text: formatAbilityTimings(ability),
      }),
    );
    if (activationDelayPending && ability.cooldownMs > 0) {
      detailPopover.append(
        el("p", {
          class: "activation-delay loadout-popover-delay",
          data: { activationDelay: "true" },
          text: "Activation Delay: starts on full cooldown",
        }),
      );
    }
    return descId;
  }

  function showDetailPopover(
    ability: AbilityDef,
    stats: BaseStats,
    statuses: readonly StatusEffectDef[],
    anchor: HTMLElement,
    host: HTMLElement,
    activationDelayPending: boolean,
  ): void {
    detailPopover.dataset["abilityId"] = ability.id;
    openPopoverAbilityId = ability.id;
    const descId = fillDetailPopover(ability, stats, statuses, activationDelayPending);
    anchor.setAttribute("aria-describedby", descId);
    positionDetailPopover(anchor, host);
  }

  function bindDetailPopover(
    ability: AbilityDef,
    statuses: readonly StatusEffectDef[],
    tile: HTMLElement,
    host: HTMLElement,
  ): void {
    const open = () => {
      const snapshot = lastSnapshot;
      const classId = options.getSelectedClassId();
      if (!snapshot || !classId) {
        return;
      }
      const freshStats = characterStatsFor(snapshot, content, classId);
      const loadout = effectiveLoadout(snapshot, classId);
      const applied = appliedLoadout(snapshot, classId);
      const hasPending = snapshot.pendingEdits.some(
        (edit) => edit.kind === "loadout" && edit.classId === classId,
      );
      const inserted = hasPending ? newlyInsertedAbilities(applied, loadout) : new Set<string>();
      const delay = loadout.includes(ability.id) ? inserted.has(ability.id) : false;
      showDetailPopover(ability, freshStats, statuses, tile, host, delay);
    };
    const maybeClose = () => {
      if (tile.matches(":hover") || tile.contains(document.activeElement)) {
        return;
      }
      if (detailPopover.dataset["abilityId"] === ability.id) {
        tile.removeAttribute("aria-describedby");
        hideDetailPopover();
      }
    };
    tile.addEventListener("mouseenter", open);
    tile.addEventListener("mouseleave", maybeClose);
    tile.addEventListener("focusin", open);
    tile.addEventListener("focusout", maybeClose);
  }

  function bindAbilityDrag(
    source: AbilityDragSource,
    tile: HTMLElement,
  ): void {
    tile.draggable = true;
    tile.addEventListener("dragstart", (event) => {
      hideDetailPopover();
      const host = loadoutDragHost();
      if (!host) {
        return;
      }
      activeDrag = source;
      host.classList.add("loadout-body--dragging");
      tile.classList.add("loadout-drag-source");
      tile.dataset["surfacePreserveLive"] = "true";
      highlightDropTargets(host);
      event.dataTransfer?.setData(ABILITY_DRAG_MIME, JSON.stringify(source));
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
      event.stopPropagation();
    });
    tile.addEventListener("dragend", () => {
      const host = loadoutDragHost();
      if (host) {
        endLoadoutDrag(host);
      } else {
        activeDrag = null;
      }
    });
  }

  function bindSlotDrop(
    classId: ClassId,
    loadout: [string, string, string],
    slotIndex: LoadoutSlotIndex,
    slotEl: HTMLElement,
  ): void {
    slotEl.addEventListener("dragover", (event) => {
      if (!activeDrag) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });

    slotEl.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const payload = parseDragPayload(event);
      const host = loadoutDragHost() ?? root;
      if (!payload) {
        endLoadoutDrag(host);
        return;
      }
      tryAssign(classId, loadout, payload.abilityId, slotIndex);
      endLoadoutDrag(host);
    });
  }

  function renderAssignTile(
    ability: AbilityDef,
    classId: ClassId,
    loadout: [string, string, string],
    context: { kind: "pool" } | { kind: "slot"; slotIndex: LoadoutSlotIndex },
    host: HTMLElement,
  ): HTMLElement {
    const tile = el("button", {
      class: "loadout-assign-tile ability-card focus-ring",
      data: {
        abilityId: ability.id,
        loadoutAssignTile: "true",
        ...(context.kind === "slot" ? { loadoutSlot: String(context.slotIndex) } : { loadoutPool: "true" }),
      },
      props: { type: "button" },
      aria: { label: ability.name, pressed: "false" },
    }, [el("span", { class: "ability-name", text: ability.name })]);
    appendAbilityIcon(tile, ability);

    bindPressable(tile, () => {
      if (selectedAbilityId !== null) {
        if (context.kind === "slot") {
          tryAssign(classId, loadout, selectedAbilityId, context.slotIndex);
          return;
        }
        selectedAbilityId = ability.id;
        syncAssignmentSelection(host);
        return;
      }
      selectedAbilityId = ability.id;
      syncAssignmentSelection(host);
    });

    tile.addEventListener("focus", () => {
      tile.dataset["surfacePreserveLive"] = "true";
    });
    tile.addEventListener("blur", () => {
      if (!tile.classList.contains("loadout-drag-source")) {
        delete tile.dataset["surfacePreserveLive"];
      }
    });

    const dragSource: AbilityDragSource =
      context.kind === "pool"
        ? { kind: "pool", abilityId: ability.id }
        : { kind: "slot", abilityId: ability.id, slotIndex: context.slotIndex };
    bindAbilityDrag(dragSource, tile);
    bindDetailPopover(ability, content.statuses, tile, host);
    return tile;
  }

  function renderBasicAttackTile(
    ability: AbilityDef,
    host: HTMLElement,
  ): HTMLElement {
    const tile = el("div", {
      class: "loadout-basic-tile ability-card focus-ring",
      data: { abilityId: ability.id, loadoutBasic: "true" },
      props: { tabIndex: 0 },
      aria: { label: `${ability.name} (basic attack fallback)` },
    }, [el("span", { class: "ability-name", text: ability.name })]);
    appendAbilityIcon(tile, ability);
    bindDetailPopover(ability, content.statuses, tile, host);
    return tile;
  }

  function rebuildLoadoutBody(snapshot: ReadonlySnapshot): void {
    if (activeDrag) {
      return;
    }
    const classId = options.getSelectedClassId()!;
    const host = loadoutHost;
    const popover = detailPopover;
    host.replaceChildren();
    host.append(popover);

    const classKit = classKitFor(content, classId);
    const talentState = effectiveTalentState(snapshot, classId);
    const loadout = effectiveLoadout(snapshot, classId);
    const hasPending = snapshot.pendingEdits.some(
      (edit) => edit.kind === "loadout" && edit.classId === classId,
    );

    const unlocked = unlockableAbilityIds(classKit, talentState);

    const sectionChildren: (HTMLElement | false)[] = [
      el("h3", { class: "surface-section-title", text: CLASS_LABELS[classId] }),
    ];

    if (hasPending) {
      const marker = pendingMarker();
      marker.dataset["pendingKind"] = "loadout";
      sectionChildren.push(marker);
    }

    const basicAbility = abilityById(content, classKit.basicAbilityId);
    if (basicAbility) {
      sectionChildren.push(
        el("div", { class: "basic-attack", aria: { label: "Basic attack fallback" } }, [
          el("p", { class: "slot-label", text: "Basic attack (fallback)" }),
          renderBasicAttackTile(basicAbility, host),
        ]),
      );
    }

    const poolTiles: HTMLElement[] = [];
    for (const abilityId of unlocked) {
      if (abilityId === classKit.basicAbilityId) {
        continue;
      }
      const ability = abilityById(content, abilityId);
      if (!ability) {
        continue;
      }
      poolTiles.push(
        renderAssignTile(
          ability,
          classId,
          loadout,
          { kind: "pool" },
          host,
        ),
      );
    }

    sectionChildren.push(
      el("div", { class: "loadout-pool" }, [
        el("p", { class: "slot-label", text: "Unlocked Abilities" }),
        el("div", { class: "loadout-pool-tiles", data: { loadoutPool: "true" } }, poolTiles),
      ]),
    );

    const slotElements: HTMLElement[] = [];
    loadout.forEach((abilityId, slotIndex) => {
      const ability = abilityById(content, abilityId);
      if (!ability) {
        return;
      }
      const slotDrop = el("div", {
        class: "loadout-slot",
        data: {
          slot: String(slotIndex),
          loadoutSlotDrop: "true",
        },
      }, [
        el("p", { class: "slot-label", text: `Slot ${slotIndex + 1}` }),
        renderAssignTile(
          ability,
          classId,
          loadout,
          { kind: "slot", slotIndex: slotIndex as LoadoutSlotIndex },
          host,
        ),
      ]);
      bindSlotDrop(classId, loadout, slotIndex as LoadoutSlotIndex, slotDrop);
      slotElements.push(slotDrop);
    });

    sectionChildren.push(el("div", { class: "loadout-slots" }, slotElements));

    host.append(
      el("section", { class: "loadout-character", data: { classId } }, sectionChildren),
    );
    syncAssignmentSelection(host);
  }

  const shell = mountSurfaceShell(root, "loadout-surface", {
    reconcile: true,
    title: "Loadout",
    body(snapshot) {
      rebuildLoadoutBody(snapshot);
      return [orderNote, loadoutHost];
    },
  });

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || selectedAbilityId === null) {
      return;
    }
    if (!root.contains(event.target as Node)) {
      return;
    }
    clearAssignmentSelection(loadoutHost);
  };
  root.addEventListener("keydown", onKeydown);

  function hasPausedInteraction(): boolean {
    if (root.querySelector("[data-surface-preserve-live]")) {
      return true;
    }
    const active = document.activeElement;
    return active instanceof HTMLSelectElement && root.contains(active);
  }

  function render(snapshot: ReadonlySnapshot | null, legality?: EngineLegalityView): void {
    lastSnapshot = snapshot;
    shell.render(snapshot, legality);
    if (hasPausedInteraction()) {
      syncAssignmentSelection(loadoutHost);
      return;
    }
    const host = loadoutDragHost();
    if (openPopoverAbilityId && host && snapshot) {
      const classId = options.getSelectedClassId();
      if (!classId) {
        hideDetailPopover();
        return;
      }
      const anchor = root.querySelector<HTMLElement>(
        `[data-ability-id="${openPopoverAbilityId}"]`,
      );
      const ability = abilityById(content, openPopoverAbilityId);
      if (!anchor || !ability) {
        hideDetailPopover();
        return;
      }
      const applied = appliedLoadout(snapshot, classId);
      const loadout = effectiveLoadout(snapshot, classId);
      const hasPending = snapshot.pendingEdits.some(
        (edit) => edit.kind === "loadout" && edit.classId === classId,
      );
      const inserted = hasPending ? newlyInsertedAbilities(applied, loadout) : new Set<string>();
      const stats = characterStatsFor(snapshot, content, classId);
      const delay = loadout.includes(openPopoverAbilityId)
        ? inserted.has(openPopoverAbilityId)
        : false;
      const descId = fillDetailPopover(ability, stats, content.statuses, delay);
      anchor.setAttribute("aria-describedby", descId);
      positionDetailPopover(anchor, host);
    }
    syncAssignmentSelection(loadoutHost);
  }

  return {
    render,
    destroy: () => {
      root.removeEventListener("keydown", onKeydown);
      const host = loadoutDragHost();
      if (host) {
        endLoadoutDrag(host);
      } else {
        activeDrag = null;
      }
      hideDetailPopover();
      shell.destroy();
    },
  };
}
