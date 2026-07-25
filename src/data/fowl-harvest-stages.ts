import type { StageDef } from "../core/types";

/** Fowl Harvest Stages 4–6 (issue #416). */
export const fowlHarvestStages: StageDef[] = [
  {
    id: 4,
    name: "Last Stop Diner",
    waves: [
      {
        opponents: ["burger-drake-s4-27a", "milkshake-mallard-s4-27", "balewaddle-s4-26"],
      },
      {
        opponents: [
          "burger-drake-s4-20",
          "burger-drake-s4-20",
          "pie-widgeon-s4-20",
          "milkshake-mallard-s4-20",
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
        opponents: ["cornquacker-s5-34", "balewaddle-s5-33", "pie-widgeon-s5-33"],
      },
      {
        opponents: [
          "cornquacker-s5-20",
          "cornquacker-s5-20",
          "milkshake-mallard-s5-20",
          "balewaddle-s5-20",
          "pie-widgeon-s5-20",
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
          "cornquacker-s6-33",
          "milkshake-mallard-s6-32",
          "balewaddle-s6-32",
        ],
      },
      {
        opponents: [
          "pie-widgeon-s6-26",
          "pie-widgeon-s6-26",
          "cornquacker-s6-26",
          "burger-drake-s6-26",
          "balewaddle-s6-26",
        ],
      },
    ],
    boss: { opponents: ["the-combine"] },
    rarityOdds: [8, 32, 38, 22],
    backdropKey: "harvest-yard",
  },
];
