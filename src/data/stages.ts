import type { Content, StageDef } from "../core/types";
import { fowlHarvestStages } from "./fowl-harvest-stages";
import { opponents } from "./opponents";
import { unwoundBelfryStages } from "./unwound-belfry-stages";

/** Stage rosters and rarity odds from issue #40 / issue #5. */
export const stages: StageDef[] = [
  {
    id: 1,
    name: "Orchard Understory",
    waves: [
      { opponents: ["pipcap-1-7a", "brambling-1-7", "lanternmoth-1-6"] },
      { opponents: ["pipcap-1-5", "pipcap-1-5", "huskbeetle-1-5", "dewsnail-1-5"] },
    ],
    boss: { opponents: ["boss-1"] },
    rarityOdds: [55, 35, 9, 1],
    backdropKey: "backdrop-1",
  },
  {
    id: 2,
    name: "Moonlit Bramble",
    waves: [
      {
        opponents: ["pipcap-2-8a", "pipcap-2-8b", "brambling-2-7", "lanternmoth-2-7"],
      },
      {
        opponents: ["pipcap-2-6", "pipcap-2-6", "huskbeetle-2-6", "dewsnail-2-6", "brambling-2-6"],
      },
    ],
    boss: { opponents: ["boss-2"] },
    rarityOdds: [40, 40, 17, 3],
    backdropKey: "backdrop-2",
  },
  {
    id: 3,
    name: "Nightbloom Terrace",
    waves: [
      {
        opponents: ["pipcap-3-8", "pipcap-3-8", "brambling-3-8", "lanternmoth-3-8", "huskbeetle-3-8"],
      },
      {
        opponents: ["dewsnail-3-8", "dewsnail-3-8", "brambling-3-8", "lanternmoth-3-8", "pipcap-3-8"],
      },
    ],
    boss: { opponents: ["boss-3"] },
    rarityOdds: [25, 45, 24, 6],
    backdropKey: "backdrop-3",
  },
  ...fowlHarvestStages,
  ...unwoundBelfryStages,
];

export function buildStageSlice(): {
  opponents: Content["opponents"];
  stages: Content["stages"];
} {
  return {
    opponents,
    stages,
  };
}
