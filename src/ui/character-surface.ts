import type { ReadonlySnapshot } from "../core/snapshot";
import type { EngineLegalityView } from "./engine-legality";
import type { DockSurfaceMountOptions } from "./dock";
import { mountLoadoutSurface } from "./loadout-surface";
import { mountTalentsSurface } from "./talents-surface";
import { mountTabStrip } from "./tab-strip";

export type CharacterTabId = "loadout" | "talents";

const CHARACTER_TABS: { id: CharacterTabId; label: string }[] = [
  { id: "loadout", label: "Loadout" },
  { id: "talents", label: "Talents" },
];

export interface CharacterSurface {
  render(snapshot: ReadonlySnapshot | null, legality?: EngineLegalityView): void;
  destroy(): void;
}

export function mountCharacterSurface(
  root: HTMLElement,
  options: DockSurfaceMountOptions,
): CharacterSurface {
  root.classList.add("character-surface");

  let activeTab: CharacterTabId = "loadout";

  const sections = new Map<CharacterTabId, HTMLElement>();

  for (const { id } of CHARACTER_TABS) {
    const section = document.createElement("section");
    section.className = "character-section";
    section.dataset["characterSection"] = id;
    section.id = `character-panel-${id}`;
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", `character-subtab-${id}`);
    sections.set(id, section);
  }

  const tabStrip = mountTabStrip<CharacterTabId>({
    tabs: CHARACTER_TABS,
    initial: activeTab,
    className: "character-subtab",
    ariaLabel: "Character workspace",
    panelId: (id) => `character-panel-${id}`,
    onActivate(id) {
      setActiveTab(id);
    },
  });
  for (const { id } of CHARACTER_TABS) {
    const button = tabStrip.element.querySelector<HTMLButtonElement>(`#character-subtab-${id}`);
    if (button) {
      // Preserve the existing e2e / unit selector contract (hyphen before "tab").
      button.dataset["characterSubTab"] = id;
    }
  }

  root.append(tabStrip.element, ...sections.values());

  const loadout = mountLoadoutSurface(sections.get("loadout")!, options);
  const talents = mountTalentsSurface(sections.get("talents")!, options);

  function syncPanels(): void {
    for (const { id } of CHARACTER_TABS) {
      const section = sections.get(id);
      if (section) {
        section.hidden = id !== activeTab;
      }
    }
  }

  function setActiveTab(next: CharacterTabId): void {
    activeTab = next;
    tabStrip.setActive(next);
    syncPanels();
  }

  syncPanels();

  return {
    render(snapshot, legality) {
      loadout.render(snapshot, legality);
      talents.render(snapshot, legality);
    },
    destroy() {
      loadout.destroy();
      talents.destroy();
      tabStrip.destroy();
      root.replaceChildren();
      root.classList.remove("character-surface");
    },
  };
}
