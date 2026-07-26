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
      { opponents: ["pipcap-1-4", "brambling-1-3", "lanternmoth-1-3"] },
      { opponents: ["pipcap-1-2", "pipcap-1-2", "huskbeetle-1-3", "dewsnail-1-3"] },
      {
        opponents: [
          "brambling-1-2",
          "lanternmoth-1-2",
          "huskbeetle-1-2",
          "dewsnail-1-2",
          "pipcap-1-2",
        ],
      },
      { opponents: ["pipcap-1-5", "brambling-1-3", "lanternmoth-1-2"] },
    ],
    boss: { opponents: ["boss-1"] },
    rarityOdds: [55, 35, 9, 1],
    backdropKey: "backdrop-1",
  },
  {
    id: 2,
    name: "Moonlit Bramble",
    waves: [
      { opponents: ["pipcap-2-5", "brambling-2-5", "lanternmoth-2-5"] },
      {
        opponents: [
          "pipcap-2-3",
          "pipcap-2-3",
          "brambling-2-3",
          "huskbeetle-2-3",
          "dewsnail-2-3",
        ],
      },
      { opponents: ["pipcap-2-4", "brambling-2-4", "lanternmoth-2-4", "dewsnail-2-3"] },
      { opponents: ["pipcap-2-6", "brambling-2-3", "lanternmoth-2-3", "dewsnail-2-3"] },
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
        opponents: [
          "pipcap-3-4",
          "brambling-3-4",
          "lanternmoth-3-4",
          "huskbeetle-3-4",
          "dewsnail-3-4",
        ],
      },
      { opponents: ["pipcap-3-5", "brambling-3-5", "lanternmoth-3-5", "huskbeetle-3-5"] },
      { opponents: ["pipcap-3-8", "brambling-3-6", "lanternmoth-3-3", "dewsnail-3-3"] },
      {
        opponents: [
          "pipcap-3-8",
          "pipcap-3-4",
          "brambling-3-4",
          "lanternmoth-3-2",
          "dewsnail-3-2",
        ],
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
