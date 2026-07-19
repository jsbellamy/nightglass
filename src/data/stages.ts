import type { Content, StageDef } from "../core/types";
import { opponents } from "./opponents";

/** Stage rosters and rarity odds from issue #40 / issue #5. */
export const stages: StageDef[] = [
  {
    id: 1,
    name: "Orchard Understory",
    waves: [
      { opponents: ["pipcap-1-7a", "pipcap-1-7b", "pipcap-1-6"] },
      { opponents: ["pipcap-1-5", "pipcap-1-5", "pipcap-1-5", "pipcap-1-5"] },
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
        opponents: ["pipcap-2-8a", "pipcap-2-8b", "pipcap-2-7a", "pipcap-2-7b"],
      },
      {
        opponents: ["pipcap-2-6", "pipcap-2-6", "pipcap-2-6", "pipcap-2-6", "pipcap-2-6"],
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
        opponents: ["pipcap-3-8", "pipcap-3-8", "pipcap-3-8", "pipcap-3-8", "pipcap-3-8"],
      },
      {
        opponents: ["pipcap-3-8", "pipcap-3-8", "pipcap-3-8", "pipcap-3-8", "pipcap-3-8"],
      },
    ],
    boss: { opponents: ["boss-3"] },
    rarityOdds: [25, 45, 24, 6],
    backdropKey: "backdrop-3",
  },
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
