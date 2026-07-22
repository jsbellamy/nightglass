import type { StageDef } from "../core/types";

/** Inactive Fowl Harvest Stages 4–6 (issue #416). Not wired into shipped Content yet. */
export const fowlHarvestStages: StageDef[] = [
  {
    id: 4,
    name: "Last Stop Diner",
    waves: [
      {
        opponents: ["burger-drake-s4-27a", "burger-drake-s4-27b", "burger-drake-s4-26"],
      },
      {
        opponents: [
          "burger-drake-s4-20",
          "burger-drake-s4-20",
          "burger-drake-s4-20",
          "burger-drake-s4-20",
        ],
      },
    ],
    boss: { opponents: ["the-fryer"] },
    rarityOdds: [18, 42, 30, 10],
    backdropKey: "last-stop-diner",
  },
  {
    id: 5,
    name: "Crooked Cornfield",
    waves: [
      {
        opponents: ["cornquacker-s5-34", "cornquacker-s5-33a", "cornquacker-s5-33b"],
      },
      {
        opponents: [
          "cornquacker-s5-20",
          "cornquacker-s5-20",
          "cornquacker-s5-20",
          "cornquacker-s5-20",
          "cornquacker-s5-20",
        ],
      },
    ],
    boss: { opponents: ["scarequack"] },
    rarityOdds: [12, 38, 34, 16],
    backdropKey: "crooked-cornfield",
  },
  {
    id: 6,
    name: "Harvest Yard",
    waves: [
      {
        opponents: [
          "burger-drake-s6-33",
          "burger-drake-s6-32",
          "cornquacker-s6-33",
          "cornquacker-s6-32",
        ],
      },
      {
        opponents: [
          "burger-drake-s6-26",
          "burger-drake-s6-26",
          "cornquacker-s6-26",
          "cornquacker-s6-26",
          "cornquacker-s6-26",
        ],
      },
    ],
    boss: { opponents: ["the-combine"] },
    rarityOdds: [8, 32, 38, 22],
    backdropKey: "harvest-yard",
  },
];
