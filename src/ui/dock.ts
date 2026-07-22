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
import { mountTabStrip } from "./tab-strip";

export type DockTabId = "character" | "armory" | "stage";

export interface DockSurfaceMountOptions {
  content: Content;
  onCommand(command: TileCommand): void;
  /** The Character the picker has selected. Read at render time, not mount time. */
  getSelectedClassId(): ClassId | null;
  /** Session-local Character selection owned by the Management Dock shell. */
  selectClassId(classId: ClassId): void;
}

export interface DockSurfaceEntry {
  id: DockTabId;
  label: string;
  mount(root: HTMLElement, options: DockSurfaceMountOptions): MountedSurface;
}

export const DOCK_SURFACES: DockSurfaceEntry[] = [
  {
    id: "character",
    label: "Character",
    mount: mountCharacterSurface,
  },
  {
    id: "armory",
    label: "Armory",
    mount: mountArmorySurface,
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

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "dock-close focus-ring";
  closeButton.setAttribute("aria-label", "Close Management Dock");
  closeButton.textContent = "✕";

  const body = document.createElement("div");
  body.className = "dock-body";

  const surface = document.createElement("section");
  surface.className = "dock-surface";
  surface.setAttribute("role", "tabpanel");
  const overflowUnbinds: Array<() => void> = [
    bindScrollOverflowAffordance(surface),
  ];

  const panels = new Map<DockTabId, HTMLElement>();
  const mountedSurfaces = new Map<DockTabId, MountedSurface>();

  if (!options.content) {
    throw new Error("Management Dock requires content for Loadout and Talents surfaces");
  }

  const mountOptions: DockSurfaceMountOptions = {
    content: options.content,
    onCommand: (command) => options.onCommand?.(command),
    getSelectedClassId: () => selectedClassId ?? null,
    selectClassId(classId) {
      if (selectedClassId === classId) {
        return;
      }
      selectedClassId = classId;
      remountPickerAndSurface();
    },
  };

  const characterPicker = mountCharacterPicker(body, {
    content: options.content,
    onSelect(classId) {
      mountOptions.selectClassId(classId);
    },
    onCommand: (command) => options.onCommand?.(command),
  });
  const characterPickerEl = body.querySelector<HTMLElement>(".character-picker")!;
  body.append(surface);

  for (const entry of DOCK_SURFACES) {
    const panel = document.createElement("div");
    panel.className = "dock-panel";
    panel.dataset["dockPanel"] = entry.id;
    panel.id = `dock-panel-${entry.id}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `dock-tab-${entry.id}`);

    const surfaceRoot = document.createElement("div");
    surfaceRoot.className = "dock-surface-root";
    panel.append(surfaceRoot);
    mountedSurfaces.set(entry.id, entry.mount(surfaceRoot, mountOptions));

    panels.set(entry.id, panel);
    surface.append(panel);
    overflowUnbinds.push(bindScrollOverflowAffordance(panel));
  }

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
    mountedSurfaces.get(id)!.render(heldSnapshot, heldLegality);
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

  function syncCharacterRailVisibility(): void {
    const showRail = activeTab === "character";
    characterPickerEl.hidden = !showRail;
    characterPickerEl.setAttribute("aria-hidden", showRail ? "false" : "true");
    characterPickerEl.inert = !showRail;
    body.dataset["dockNav"] = activeTab;
  }

  function setActiveTab(next: DockTabId): void {
    const tabChanged = next !== activeTab;
    activeTab = next;
    syncCharacterRailVisibility();
    tabStrip.setActive(next);
    for (const { id } of DOCK_SURFACES) {
      const selected = id === activeTab;
      const panel = panels.get(id);
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

  const tabStrip = mountTabStrip<DockTabId>({
    tabs: DOCK_TABS,
    initial: activeTab,
    className: "dock-tab",
    ariaLabel: "Management surfaces",
    panelId: (id) => `dock-panel-${id}`,
    onActivate(id) {
      setActiveTab(id);
    },
    onReactivate() {
      requestClose();
    },
  });
  for (const { id } of DOCK_SURFACES) {
    const button = tabStrip.element.querySelector<HTMLButtonElement>(`#dock-tab-${id}`);
    if (button) {
      button.dataset["dockTab"] = id;
    }
  }

  header.append(tabStrip.element, closeButton);
  root.append(header, body);

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
      tabStrip.destroy();
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
