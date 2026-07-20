import type { ReadonlySnapshot } from "../core/snapshot";
import type { Content } from "../core/types";
import { mountArmorySurface } from "./armory-surface";
import { mountLoadoutSurface } from "./loadout-surface";
import { mountPartySurface } from "./party-surface";
import { mountStageSurface } from "./stage-surface";
import { mountTalentsSurface } from "./talents-surface";
import type { TileCommand } from "./bus";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";
import type { MountedSurface } from "./surface-shell";

export type DockTabId = "party" | "loadout" | "talents" | "armory" | "stage";

export interface DockSurfaceMountOptions {
  content: Content;
  onCommand(command: TileCommand): void;
  /** Armory only — the Unseen Equipment badge; other surfaces ignore this. */
  onBadgeChange?(visible: boolean): void;
}

export interface DockSurfaceEntry {
  id: DockTabId;
  label: string;
  mount(root: HTMLElement, options: DockSurfaceMountOptions): MountedSurface;
}

export const DOCK_SURFACES: DockSurfaceEntry[] = [
  { id: "party", label: "Party", mount: mountPartySurface },
  { id: "loadout", label: "Loadout", mount: mountLoadoutSurface },
  { id: "talents", label: "Talents", mount: mountTalentsSurface as DockSurfaceEntry["mount"] },
  { id: "armory", label: "Armory", mount: mountArmorySurface as DockSurfaceEntry["mount"] },
  { id: "stage", label: "Stage", mount: mountStageSurface },
];

export const DOCK_TABS = DOCK_SURFACES.map(({ id, label }) => ({ id, label }));

export interface ManagementDock {
  render(snapshot: ReadonlySnapshot | null, legality?: EngineLegalityView): void;
  setArmoryBadge(visible: boolean): void;
  setOpen(open: boolean): void;
  destroy(): void;
}

export interface ManagementDockOptions {
  content?: Content;
  initialTab?: DockTabId;
  onClose?: () => void;
  onCommand?: (command: TileCommand) => void;
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
  let activeTab: DockTabId = options.initialTab ?? "party";
  let armoryBadge = false;

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

  const surface = document.createElement("section");
  surface.className = "dock-surface";
  surface.setAttribute("role", "tabpanel");

  const panels = new Map<DockTabId, HTMLElement>();
  const tabButtons = new Map<DockTabId, HTMLButtonElement>();
  const mountedSurfaces = new Map<DockTabId, MountedSurface>();

  if (!options.content) {
    throw new Error("Management Dock requires content for Loadout and Talents surfaces");
  }

  function syncArmoryTabBadge(): void {
    const badge = tabButtons.get("armory")?.querySelector<HTMLElement>(".dock-tab-badge");
    if (badge) {
      badge.hidden = !armoryBadge;
    }
  }

  const mountOptions: DockSurfaceMountOptions = {
    content: options.content,
    onCommand: (command) => options.onCommand?.(command),
    onBadgeChange: (visible) => {
      armoryBadge = visible;
      syncArmoryTabBadge();
    },
  };

  for (const entry of DOCK_SURFACES) {
    const tabButton = document.createElement("button");
    tabButton.type = "button";
    tabButton.className = "dock-tab focus-ring";
    tabButton.dataset["dockTab"] = entry.id;
    tabButton.setAttribute("role", "tab");
    tabButton.setAttribute("aria-controls", `dock-panel-${entry.id}`);
    tabButton.id = `dock-tab-${entry.id}`;
    tabButton.textContent = entry.label;

    const badge = document.createElement("span");
    badge.className = "dock-tab-badge";
    badge.hidden = true;
    badge.setAttribute("aria-label", "New equipment");
    tabButton.append(badge);

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
  }

  root.append(header, surface);

  function setActiveTab(next: DockTabId): void {
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
      const stageLabel = snapshot?.attempt
        ? `Stage ${snapshot.attempt.stage} · ${
            snapshot.attempt.encounter === 3 ? "Boss" : `Wave ${snapshot.attempt.encounter}`
          }`
        : "No Attempt";
      root.dataset["stageLabel"] = stageLabel;
      for (const { id } of DOCK_SURFACES) {
        const mounted = mountedSurfaces.get(id)!;
        if (id === "talents" || id === "armory") {
          (mounted as { render(s: typeof snapshot, l: typeof legality): void }).render(
            snapshot,
            legality,
          );
        } else {
          mounted.render(snapshot);
        }
      }
    },
    setArmoryBadge(visible) {
      armoryBadge = visible;
      syncArmoryTabBadge();
    },
    setOpen(open) {
      root.hidden = !open;
      root.setAttribute("aria-hidden", open ? "false" : "true");
    },
    destroy() {
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
