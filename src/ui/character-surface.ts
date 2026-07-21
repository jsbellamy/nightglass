import type { ReadonlySnapshot } from "../core/snapshot";
import type { EngineLegalityView } from "./engine-legality";
import type { DockSurfaceMountOptions } from "./dock";
import { mountLoadoutSurface } from "./loadout-surface";
import { mountPartySurface } from "./party-surface";
import { mountTalentsSurface } from "./talents-surface";

export interface CharacterSurface {
  render(snapshot: ReadonlySnapshot | null, legality: EngineLegalityView): void;
  destroy(): void;
}

export function mountCharacterSurface(
  root: HTMLElement,
  options: DockSurfaceMountOptions,
): CharacterSurface {
  root.classList.add("character-surface");

  const partySection = document.createElement("section");
  partySection.className = "character-section";
  partySection.dataset["characterSection"] = "party";

  const loadoutSection = document.createElement("section");
  loadoutSection.className = "character-section";
  loadoutSection.dataset["characterSection"] = "loadout";

  const talentsSection = document.createElement("section");
  talentsSection.className = "character-section";
  talentsSection.dataset["characterSection"] = "talents";

  root.append(partySection, loadoutSection, talentsSection);

  const party = mountPartySurface(partySection, options);
  const loadout = mountLoadoutSurface(loadoutSection, options);
  const talents = mountTalentsSurface(talentsSection, options);

  return {
    render(snapshot, legality) {
      party.render(snapshot);
      loadout.render(snapshot);
      talents.render(snapshot, legality);
    },
    destroy() {
      party.destroy();
      loadout.destroy();
      talents.destroy();
      root.replaceChildren();
      root.classList.remove("character-surface");
    },
  };
}
