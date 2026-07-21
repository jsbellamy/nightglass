import type { ReadonlySnapshot } from "../core/snapshot";
import type { ClassId, Content } from "../core/types";
import { mountArmorySurface } from "./armory-surface";
import { mountCharacterPicker } from "./character-picker";
import { mountCharacterSurface } from "./character-surface";
import { mountStageSurface } from "./stage-surface";
import type { TileCommand } from "./bus";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";
import { rosterClassIds } from "./snapshot-view";
import {
  bindScrollOverflowAffordance,
  captureScrollPositions,
  restoreScrollPositions,
  type MountedSurface,
} from "./surface-shell";

export type DockTabId = "character" | "armory" | "stage";

export interface DockSurfaceMountOptions {
  content: Content;
  onCommand(command: TileCommand): void;
  /** The Character the picker has selected. Read at render time, not mount time. */
  getSelectedClassId(): ClassId | null;
}

export interface DockSurfaceEntry {
  id: DockTabId;
  label: string;
  /** True when this surface's render takes the legality view as a second argument. */
  needsLegality?: boolean;
  mount(root: HTMLElement, options: DockSurfaceMountOptions): MountedSurface;
}

export const DOCK_SURFACES: DockSurfaceEntry[] = [
  {
    id: "character",
    label: "Character",
    needsLegality: true,
    mount: mountCharacterSurface as DockSurfaceEntry["mount"],
  },
  {
    id: "armory",
    label: "Armory",
    needsLegality: true,
    mount: mountArmorySurface as DockSurfaceEntry["mount"],
  },
  { id: "stage", label: "Stage", mount: mountStageSurface },
];

export const DOCK_TABS = DOCK_SURFACES.map(({ id, label }) => ({ id, label }));

export interface ManagementDock {
  render(snapshot: ReadonlySnapshot | null, legality?: EngineLegalityView): void;
  setOpen(open: boolean): void;
  destroy(): void;
}

export interface ManagementDockOptions {
  content?: Content;
  initialTab?: DockTabId;
  onClose?: () => void;
  onCommand?: (command: TileCommand) => void;
}

/**
 * Stable key for Snapshot fields that affect Management Dock surfaces.
 * Combat HP / cooldown / sim clock churn is excluded so pumps do not remount.
 */
function managementRelevantKey(snapshot: ReadonlySnapshot | null): string {
  if (!snapshot) {
    return "null";
  }
  const { progression, pendingEdits, attempt } = snapshot;
  return JSON.stringify({
    unlockedStage: progression.unlockedStage,
    party: progression.party,
    reserve: progression.reserve,
    pendingParty: progression.pendingParty,
    armory: progression.armory,
    characterXp: progression.characterXp,
    talents: progression.talents,
    loadouts: progression.loadouts,
    pendingEdits,
    attempt: attempt
      ? {
          id: attempt.id,
          stage: attempt.stage,
          encounter: attempt.encounter,
          equipmentLoadouts: attempt.equipmentLoadouts,
        }
      : null,
  });
}

function cycleTab(current: DockTabId, delta: number): DockTabId {
  const index = DOCK_TABS.findIndex((entry) => entry.id === current);
  const next = (index + delta + DOCK_TABS.length) % DOCK_TABS.length;
  return DOCK_TABS[next]!.id;
}

export function mountManagementDock(
  root: HTMLElement,
  options: ManagementDockOptions = {},
): ManagementDock {
  let activeTab: DockTabId = options.initialTab ?? "character";
  let heldSnapshot: ReadonlySnapshot | null = null;
  let heldLegality: EngineLegalityView = EMPTY_ENGINE_LEGALITY;
  let hasHeldState = false;
  let selectedClassId: ClassId | undefined;
  let lastManagementKey: string | undefined;
  let lastRenderedLegality: EngineLegalityView | undefined;

  root.classList.add("dock-shell", "management-dock");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "Management Dock");

  const header = document.createElement("header");
  header.className = "dock-header";

  const tabList = document.createElement("div");
  tabList.className = "dock-tabs";
  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-label", "Management surfaces");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "dock-close focus-ring";
  closeButton.setAttribute("aria-label", "Close Management Dock");
  closeButton.textContent = "✕";

  header.append(tabList, closeButton);

  const body = document.createElement("div");
  body.className = "dock-body";

  const surface = document.createElement("section");
  surface.className = "dock-surface";
  surface.setAttribute("role", "tabpanel");
  const overflowUnbinds: Array<() => void> = [
    bindScrollOverflowAffordance(surface),
  ];

  const panels = new Map<DockTabId, HTMLElement>();
  const tabButtons = new Map<DockTabId, HTMLButtonElement>();
  const mountedSurfaces = new Map<DockTabId, MountedSurface>();

  if (!options.content) {
    throw new Error("Management Dock requires content for Loadout and Talents surfaces");
  }

  const mountOptions: DockSurfaceMountOptions = {
    content: options.content,
    onCommand: (command) => options.onCommand?.(command),
    getSelectedClassId: () => selectedClassId ?? null,
  };

  const characterPicker = mountCharacterPicker(body, {
    content: options.content,
    onSelect(classId) {
      selectedClassId = classId;
      remountPickerAndSurface();
    },
    onCommand: (command) => options.onCommand?.(command),
  });
  body.append(surface);

  for (const entry of DOCK_SURFACES) {
    const tabButton = document.createElement("button");
    tabButton.type = "button";
    tabButton.className = "dock-tab focus-ring";
    tabButton.dataset["dockTab"] = entry.id;
    tabButton.setAttribute("role", "tab");
    tabButton.setAttribute("aria-controls", `dock-panel-${entry.id}`);
    tabButton.id = `dock-tab-${entry.id}`;
    tabButton.textContent = entry.label;

    tabList.append(tabButton);
    tabButtons.set(entry.id, tabButton);

    const panel = document.createElement("div");
    panel.className = "dock-panel";
    panel.dataset["dockPanel"] = entry.id;
    panel.id = `dock-panel-${entry.id}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tabButton.id);

    const surfaceRoot = document.createElement("div");
    surfaceRoot.className = "dock-surface-root";
    panel.append(surfaceRoot);
    mountedSurfaces.set(entry.id, entry.mount(surfaceRoot, mountOptions));

    panels.set(entry.id, panel);
    surface.append(panel);
    overflowUnbinds.push(bindScrollOverflowAffordance(panel));
  }

  root.append(header, body);

  function syncStageLabel(): void {
    const stageLabel = heldSnapshot?.attempt
      ? `Stage ${heldSnapshot.attempt.stage} · ${
          heldSnapshot.attempt.encounter === 3 ? "Boss" : `Wave ${heldSnapshot.attempt.encounter}`
        }`
      : "No Attempt";
    root.dataset["stageLabel"] = stageLabel;
  }

  function syncSelectedClassId(snapshot: ReadonlySnapshot | null): ClassId | undefined {
    if (!snapshot) {
      return selectedClassId;
    }
    const roster = rosterClassIds(snapshot);
    if (selectedClassId === undefined || !roster.includes(selectedClassId)) {
      selectedClassId = snapshot.progression.party[0];
    }
    return selectedClassId;
  }

  function renderSurface(id: DockTabId): void {
    const mounted = mountedSurfaces.get(id)!;
    const entry = DOCK_SURFACES.find((surfaceEntry) => surfaceEntry.id === id);
    if (entry?.needsLegality) {
      (
        mounted as {
          render(s: typeof heldSnapshot, l: typeof heldLegality): void;
        }
      ).render(heldSnapshot, heldLegality);
    } else {
      mounted.render(heldSnapshot);
    }
  }

  function remountPickerAndSurface(): void {
    const scrolls = captureScrollPositions(root);
    const selected = selectedClassId;
    if (!heldSnapshot || selected === undefined) {
      characterPicker.render(null, selected ?? "knight");
    } else {
      characterPicker.render(heldSnapshot, selected);
    }
    if (hasHeldState) {
      renderSurface(activeTab);
    }
    restoreScrollPositions(root, scrolls);
    lastManagementKey = managementRelevantKey(heldSnapshot);
    lastRenderedLegality = heldLegality;
  }

  function setActiveTab(next: DockTabId): void {
    const tabChanged = next !== activeTab;
    activeTab = next;
    for (const { id } of DOCK_SURFACES) {
      const selected = id === activeTab;
      const button = tabButtons.get(id);
      const panel = panels.get(id);
      if (button) {
        button.classList.toggle("active", selected);
        button.setAttribute("aria-selected", selected ? "true" : "false");
        button.tabIndex = selected ? 0 : -1;
      }
      if (panel) {
        panel.hidden = !selected;
      }
    }
    surface.setAttribute("aria-labelledby", `dock-tab-${activeTab}`);
    if (tabChanged && hasHeldState) {
      remountPickerAndSurface();
    }
  }

  function requestClose(): void {
    options.onClose?.();
  }

  function onTabActivate(tab: DockTabId): void {
    if (tab === activeTab) {
      requestClose();
      return;
    }
    setActiveTab(tab);
  }

  function onTabKeydown(event: KeyboardEvent, tab: DockTabId): void {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = cycleTab(tab, 1);
      setActiveTab(next);
      tabButtons.get(next)?.focus();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = cycleTab(tab, -1);
      setActiveTab(next);
      tabButtons.get(next)?.focus();
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveTab(DOCK_TABS[0]!.id);
      tabButtons.get(DOCK_TABS[0]!.id)?.focus();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      const last = DOCK_TABS[DOCK_TABS.length - 1]!.id;
      setActiveTab(last);
      tabButtons.get(last)?.focus();
    }
  }

  for (const { id } of DOCK_SURFACES) {
    const button = tabButtons.get(id);
    if (!button) {
      continue;
    }
    button.addEventListener("click", () => onTabActivate(id));
    button.addEventListener("keydown", (event) => onTabKeydown(event, id));
  }

  closeButton.addEventListener("click", () => requestClose());

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
    }
  });

  setActiveTab(activeTab);

  return {
    render(snapshot, legality = EMPTY_ENGINE_LEGALITY) {
      heldSnapshot = snapshot;
      heldLegality = legality;
      hasHeldState = true;
      syncStageLabel();
      syncSelectedClassId(snapshot);

      const nextKey = managementRelevantKey(snapshot);
      const managementUnchanged =
        lastManagementKey !== undefined &&
        nextKey === lastManagementKey &&
        lastRenderedLegality === legality;
      if (managementUnchanged) {
        return;
      }

      remountPickerAndSurface();
    },
    setOpen(open) {
      root.hidden = !open;
      root.setAttribute("aria-hidden", open ? "false" : "true");
    },
    destroy() {
      for (const unbind of overflowUnbinds) {
        unbind();
      }
      characterPicker.destroy();
      for (const mounted of mountedSurfaces.values()) {
        mounted.destroy();
      }
      root.replaceChildren();
      root.classList.remove("dock-shell", "management-dock");
      root.removeAttribute("role");
      root.removeAttribute("aria-label");
    },
  };
}
