import type { ReadonlySnapshot } from "../core/snapshot";
import type { ClassId } from "../core/types";
import type { EngineLegalityView } from "./engine-legality";
import type { DockSurfaceMountOptions } from "./dock";
import { mountLoadoutSurface } from "./loadout-surface";
import { mountStatsSurface } from "./stats-surface";
import { availableTalentPoints, mountTalentsSurface } from "./talents-surface";
import { mountTabStrip } from "./tab-strip";
import { CLASS_LABELS, levelFor, rosterClassIds } from "./snapshot-view";
import { el } from "./surface-shell";

export type CharacterViewId = "build" | "stats";

export const CHARACTER_VIEWS = [
  { id: "build", label: "Build" },
  { id: "stats", label: "Stats" },
] as const;

const FORMATION_POSITION_LABELS = ["Front", "Middle", "Back", "Reserve"] as const;

type CharacterSectionId = "loadout" | "talents" | "stats";

export interface CharacterSurface {
  render(snapshot: ReadonlySnapshot | null, legality?: EngineLegalityView): void;
  destroy(): void;
}

function formationPositionLabel(snapshot: ReadonlySnapshot, classId: ClassId): string {
  const rosterIndex = rosterClassIds(snapshot).indexOf(classId);
  if (rosterIndex < 0) {
    return "Reserve";
  }
  return FORMATION_POSITION_LABELS[rosterIndex] ?? "Reserve";
}

function talentPointsLabel(snapshot: ReadonlySnapshot, classId: ClassId, content: DockSurfaceMountOptions["content"]): string {
  const points = availableTalentPoints(snapshot, classId, content);
  const noun = points === 1 ? "Talent Point" : "Talent Points";
  return `${points} ${noun} available`;
}

export function mountCharacterSurface(
  root: HTMLElement,
  options: DockSurfaceMountOptions,
): CharacterSurface {
  root.classList.add("character-surface");

  const { content } = options;
  let activeView: CharacterViewId = "build";

  const header = el("header", { class: "character-workspace-header" });
  const headerMeta = el("div", { class: "character-workspace-meta" });
  const headerName = el("span", {
    class: "character-workspace-name",
    data: { characterHeaderName: "true" },
  });
  const headerLevel = el("span", {
    class: "character-workspace-level",
    data: { characterHeaderLevel: "true" },
  });
  const headerPosition = el("span", {
    class: "character-workspace-position",
    data: { characterHeaderPosition: "true" },
  });
  const headerTalentPoints = el("span", {
    class: "character-workspace-talent-points",
    data: { characterHeaderTalentPoints: "true" },
  });
  headerMeta.append(headerName, headerLevel, headerPosition, headerTalentPoints);

  const sections = new Map<CharacterSectionId, HTMLElement>();

  for (const id of ["loadout", "talents", "stats"] as const) {
    const section = document.createElement("section");
    section.className = "character-section";
    section.dataset["characterSection"] = id;
    section.id = `character-section-${id}`;
    sections.set(id, section);
  }

  const buildBoard = el("div", { class: "character-build-board" }, [
    sections.get("loadout")!,
    sections.get("talents")!,
  ]);

  const buildPanel = el("section", {
    class: "character-view-panel",
    data: { characterView: "build" },
    props: { id: "character-panel-build" },
    aria: { labelledby: "character-subtab-build" },
  }, [buildBoard]);
  buildPanel.setAttribute("role", "tabpanel");

  const statsPanel = el("section", {
    class: "character-view-panel",
    data: { characterView: "stats" },
    props: { id: "character-panel-stats" },
    aria: { labelledby: "character-subtab-stats" },
  }, [sections.get("stats")!]);
  statsPanel.setAttribute("role", "tabpanel");

  const tabStrip = mountTabStrip<CharacterViewId>({
    tabs: CHARACTER_VIEWS,
    initial: activeView,
    className: "character-subtab",
    ariaLabel: "Character workspace",
    panelId: (id) => `character-panel-${id}`,
    onActivate(id) {
      setActiveView(id);
    },
  });
  for (const { id } of CHARACTER_VIEWS) {
    const button = tabStrip.element.querySelector<HTMLButtonElement>(`#character-subtab-${id}`);
    if (button) {
      button.dataset["characterSubTab"] = id;
    }
  }

  const headerChrome = el("div", { class: "character-workspace-header-chrome" }, [tabStrip.element]);
  header.append(headerMeta, headerChrome);
  root.append(header, buildPanel, statsPanel);

  const loadout = mountLoadoutSurface(sections.get("loadout")!, options);
  const talents = mountTalentsSurface(sections.get("talents")!, options);
  const stats = mountStatsSurface(sections.get("stats")!, options);

  function syncViewPanels(): void {
    const onBuild = activeView === "build";
    buildPanel.hidden = !onBuild;
    statsPanel.hidden = onBuild;
    sections.get("loadout")!.hidden = !onBuild;
    sections.get("talents")!.hidden = !onBuild;
    sections.get("stats")!.hidden = onBuild;
  }

  function setActiveView(next: CharacterViewId): void {
    activeView = next;
    tabStrip.setActive(next);
    syncViewPanels();
  }

  function updateHeader(snapshot: ReadonlySnapshot | null): void {
    if (!snapshot) {
      headerName.textContent = "";
      headerLevel.textContent = "";
      headerPosition.textContent = "";
      headerTalentPoints.textContent = "";
      return;
    }
    const classId = options.getSelectedClassId();
    if (!classId) {
      headerName.textContent = "";
      headerLevel.textContent = "";
      headerPosition.textContent = "";
      headerTalentPoints.textContent = "";
      return;
    }
    headerName.textContent = CLASS_LABELS[classId];
    headerLevel.textContent = `Level ${levelFor(snapshot, content, classId)}`;
    headerPosition.textContent = formationPositionLabel(snapshot, classId);
    headerTalentPoints.textContent = talentPointsLabel(snapshot, classId, content);
  }

  syncViewPanels();

  return {
    render(snapshot, legality) {
      updateHeader(snapshot);
      loadout.render(snapshot, legality);
      talents.render(snapshot, legality);
      stats.render(snapshot, legality);
    },
    destroy() {
      loadout.destroy();
      talents.destroy();
      stats.destroy();
      tabStrip.destroy();
      root.replaceChildren();
      root.classList.remove("character-surface");
    },
  };
}
