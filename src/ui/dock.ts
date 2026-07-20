import type { ReadonlySnapshot } from "../core/snapshot";
import type { Content } from "../core/types";
import type { TileCommand } from "./bus";
import { mountArmorySurface } from "./armory-surface";
import { mountLoadoutSurface } from "./loadout-surface";
import { mountPartySurface } from "./party-surface";
import { mountStageSurface } from "./stage-surface";
import { mountTalentsSurface } from "./talents-surface";

export type DockTabId = "party" | "loadout" | "talents" | "armory" | "stage";

export const DOCK_TABS: { id: DockTabId; label: string }[] = [
  { id: "party", label: "Party" },
  { id: "loadout", label: "Loadout" },
  { id: "talents", label: "Talents" },
  { id: "armory", label: "Armory" },
  { id: "stage", label: "Stage" },
];

export interface ManagementDock {
  render(snapshot: ReadonlySnapshot | null): void;
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

function tabIndex(tab: DockTabId): number {
  return DOCK_TABS.findIndex((entry) => entry.id === tab);
}

function cycleTab(current: DockTabId, delta: number): DockTabId {
  const index = tabIndex(current);
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
  let partyRoot: HTMLElement | null = null;
  let loadoutRoot: HTMLElement | null = null;
  let talentsRoot: HTMLElement | null = null;
  let armoryRoot: HTMLElement | null = null;
  let stageRoot: HTMLElement | null = null;

  for (const tab of DOCK_TABS) {
    const tabButton = document.createElement("button");
    tabButton.type = "button";
    tabButton.className = "dock-tab focus-ring";
    tabButton.dataset["dockTab"] = tab.id;
    tabButton.setAttribute("role", "tab");
    tabButton.setAttribute("aria-controls", `dock-panel-${tab.id}`);
    tabButton.id = `dock-tab-${tab.id}`;
    tabButton.textContent = tab.label;

    const badge = document.createElement("span");
    badge.className = "dock-tab-badge";
    badge.hidden = true;
    badge.setAttribute("aria-label", "New equipment");
    tabButton.append(badge);

    tabList.append(tabButton);
    tabButtons.set(tab.id, tabButton);

    const panel = document.createElement("div");
    panel.className = "dock-panel";
    panel.dataset["dockPanel"] = tab.id;
    panel.id = `dock-panel-${tab.id}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tabButton.id);

    if (tab.id === "party") {
      partyRoot = document.createElement("div");
      partyRoot.className = "dock-surface-root";
      panel.append(partyRoot);
    } else if (tab.id === "loadout") {
      loadoutRoot = document.createElement("div");
      loadoutRoot.className = "dock-surface-root";
      panel.append(loadoutRoot);
    } else if (tab.id === "talents") {
      talentsRoot = document.createElement("div");
      talentsRoot.className = "dock-surface-root";
      panel.append(talentsRoot);
    } else if (tab.id === "armory") {
      armoryRoot = document.createElement("div");
      armoryRoot.className = "dock-surface-root";
      panel.append(armoryRoot);
    } else if (tab.id === "stage") {
      stageRoot = document.createElement("div");
      stageRoot.className = "dock-surface-root";
      panel.append(stageRoot);
    }

    panels.set(tab.id, panel);
    surface.append(panel);
  }

  if (!partyRoot || !loadoutRoot || !talentsRoot || !armoryRoot || !stageRoot) {
    throw new Error("Party, Loadout, Talents, Armory, and Stage dock panels are required");
  }

  if (!options.content) {
    throw new Error("Management Dock requires content for Loadout and Talents surfaces");
  }

  const partySurface = mountPartySurface(partyRoot, {
    content: options.content,
    onCommand: (command) => {
      options.onCommand?.(command);
    },
  });
  const loadoutSurface = mountLoadoutSurface(loadoutRoot, {
    content: options.content,
    onCommand: (command) => {
      options.onCommand?.(command);
    },
  });
  const talentsSurface = mountTalentsSurface(talentsRoot, {
    content: options.content,
    onCommand: (command) => {
      options.onCommand?.(command);
    },
  });
  const armorySurface = mountArmorySurface(armoryRoot, {
    content: options.content,
    onCommand: (command) => {
      options.onCommand?.(command);
    },
    onBadgeChange: (visible) => {
      armoryBadge = visible;
      const badge = tabButtons.get("armory")?.querySelector<HTMLElement>(".dock-tab-badge");
      if (badge) {
        badge.hidden = !armoryBadge;
      }
    },
  });
  const stageSurface = mountStageSurface(stageRoot, {
    content: options.content,
    onCommand: (command) => {
      options.onCommand?.(command);
    },
  });

  root.append(header, surface);

  function setActiveTab(next: DockTabId): void {
    activeTab = next;
    for (const tab of DOCK_TABS) {
      const selected = tab.id === activeTab;
      const button = tabButtons.get(tab.id);
      const panel = panels.get(tab.id);
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

  for (const tab of DOCK_TABS) {
    const button = tabButtons.get(tab.id);
    if (!button) {
      continue;
    }
    button.addEventListener("click", () => {
      onTabActivate(tab.id);
    });
    button.addEventListener("keydown", (event) => {
      onTabKeydown(event, tab.id);
    });
  }

  closeButton.addEventListener("click", () => {
    requestClose();
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
    }
  });

  setActiveTab(activeTab);

  return {
    render(snapshot) {
      const stageLabel = snapshot?.attempt
        ? `Stage ${snapshot.attempt.stage} · ${
            snapshot.attempt.encounter === 3 ? "Boss" : `Wave ${snapshot.attempt.encounter}`
          }`
        : "No Attempt";
      root.dataset["stageLabel"] = stageLabel;
      partySurface.render(snapshot);
      loadoutSurface.render(snapshot);
      talentsSurface.render(snapshot);
      armorySurface.render(snapshot);
      stageSurface.render(snapshot);
    },
    setArmoryBadge(visible) {
      armoryBadge = visible;
      const badge = tabButtons.get("armory")?.querySelector<HTMLElement>(".dock-tab-badge");
      if (badge) {
        badge.hidden = !armoryBadge;
      }
    },
    setOpen(open) {
      root.hidden = !open;
      root.setAttribute("aria-hidden", open ? "false" : "true");
    },
    destroy() {
      partySurface.destroy();
      loadoutSurface.destroy();
      talentsSurface.destroy();
      armorySurface.destroy();
      stageSurface.destroy();
      root.replaceChildren();
      root.classList.remove("dock-shell", "management-dock");
      root.removeAttribute("role");
      root.removeAttribute("aria-label");
    },
  };
}
