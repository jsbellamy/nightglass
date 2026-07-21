import type { ReadonlySnapshot } from "../core/snapshot";
import type { EngineLegalityView } from "./engine-legality";
import type { DockSurfaceMountOptions } from "./dock";
import { mountLoadoutSurface } from "./loadout-surface";
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

  const loadoutSection = document.createElement("section");
  loadoutSection.className = "character-section";
  loadoutSection.dataset["characterSection"] = "loadout";

  const talentsSection = document.createElement("section");
  talentsSection.className = "character-section";
  talentsSection.dataset["characterSection"] = "talents";

  root.append(loadoutSection, talentsSection);

  const loadout = mountLoadoutSurface(loadoutSection, options);
  const talents = mountTalentsSurface(talentsSection, options);

  return {
    render(snapshot, legality) {
      loadout.render(snapshot);
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
