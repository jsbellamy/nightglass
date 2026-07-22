import type { ReadonlySnapshot } from "../core/snapshot";
import type { EngineLegalityView } from "./engine-legality";
import type { DockSurfaceMountOptions } from "./dock";
import { bindPressable } from "./keyboard";
import { el } from "./surface-shell";
import { mountLoadoutSurface } from "./loadout-surface";
import { mountTalentsSurface } from "./talents-surface";

export type CharacterTabId = "loadout" | "talents";

const CHARACTER_TABS: { id: CharacterTabId; label: string }[] = [
  { id: "loadout", label: "Loadout" },
  { id: "talents", label: "Talents" },
];

function cycleCharacterTab(current: CharacterTabId, delta: number): CharacterTabId {
  const index = CHARACTER_TABS.findIndex((entry) => entry.id === current);
  const next = (index + delta + CHARACTER_TABS.length) % CHARACTER_TABS.length;
  return CHARACTER_TABS[next]!.id;
}

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

  const tabList = el("div", {
    class: "character-subtabs",
    props: { role: "tablist" },
    aria: { label: "Character workspace" },
  });

  const tabButtons = new Map<CharacterTabId, HTMLButtonElement>();
  const sections = new Map<CharacterTabId, HTMLElement>();

  for (const { id, label } of CHARACTER_TABS) {
    const tabButton = el("button", {
      class: "character-subtab focus-ring",
      data: { characterSubTab: id },
      props: { type: "button", role: "tab" },
      text: label,
    });
    tabButton.id = `character-subtab-${id}`;
    tabButtons.set(id, tabButton);
    tabList.append(tabButton);

    const section = document.createElement("section");
    section.className = "character-section";
    section.dataset["characterSection"] = id;
    section.id = `character-panel-${id}`;
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", tabButton.id);
    sections.set(id, section);
  }

  root.append(tabList, ...sections.values());

  const loadout = mountLoadoutSurface(sections.get("loadout")!, options);
  const talents = mountTalentsSurface(sections.get("talents")!, options);

  function syncTabs(): void {
    for (const { id } of CHARACTER_TABS) {
      const selected = id === activeTab;
      const button = tabButtons.get(id);
      const section = sections.get(id);
      if (button) {
        button.classList.toggle("active", selected);
        button.setAttribute("aria-selected", selected ? "true" : "false");
        button.tabIndex = selected ? 0 : -1;
      }
      if (section) {
        section.hidden = !selected;
      }
    }
  }

  function setActiveTab(next: CharacterTabId): void {
    activeTab = next;
    syncTabs();
  }

  function onTabKeydown(event: KeyboardEvent, tab: CharacterTabId): void {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = cycleCharacterTab(tab, 1);
      setActiveTab(next);
      tabButtons.get(next)?.focus();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = cycleCharacterTab(tab, -1);
      setActiveTab(next);
      tabButtons.get(next)?.focus();
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveTab(CHARACTER_TABS[0]!.id);
      tabButtons.get(CHARACTER_TABS[0]!.id)?.focus();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      const last = CHARACTER_TABS[CHARACTER_TABS.length - 1]!.id;
      setActiveTab(last);
      tabButtons.get(last)?.focus();
    }
  }

  for (const { id } of CHARACTER_TABS) {
    const button = tabButtons.get(id);
    if (!button) {
      continue;
    }
    bindPressable(button, () => setActiveTab(id));
    button.addEventListener("keydown", (event) => onTabKeydown(event, id));
  }

  syncTabs();

  return {
    render(snapshot, legality) {
      loadout.render(snapshot, legality);
      talents.render(snapshot, legality);
    },
    destroy() {
      loadout.destroy();
      talents.destroy();
      root.replaceChildren();
      root.classList.remove("character-surface");
    },
  };
}
