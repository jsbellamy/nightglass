import type { StageDef } from "../core/types";

/** Fowl Harvest Stages 4–6 (issue #416). */
export const fowlHarvestStages: StageDef[] = [
  {
    id: 4,
    name: "Last Stop Diner",
    waves: [
      {
        opponents: ["burger-drake-s4-14", "milkshake-mallard-s4-13", "balewaddle-s4-13"],
      },
      {
        opponents: ["burger-drake-s4-20", "pie-widgeon-s4-10", "milkshake-mallard-s4-10"],
      },
      {
        opponents: ["burger-drake-s4-13a", "milkshake-mallard-s4-13", "balewaddle-s4-14"],
      },
      {
        opponents: [
          "burger-drake-s4-10",
          "milkshake-mallard-s4-10",
          "balewaddle-s4-10",
          "pie-widgeon-s4-10",
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
        opponents: ["cornquacker-s5-17", "balewaddle-s5-17", "pie-widgeon-s5-16"],
      },
      {
        opponents: [
          "cornquacker-s5-13",
          "milkshake-mallard-s5-13",
          "balewaddle-s5-13",
          "pie-widgeon-s5-11",
        ],
      },
      {
        opponents: [
          "cornquacker-s5-14a",
          "cornquacker-s5-14b",
          "balewaddle-s5-11",
          "milkshake-mallard-s5-11",
        ],
      },
      {
        opponents: [
          "cornquacker-s5-10",
          "milkshake-mallard-s5-10",
          "balewaddle-s5-10",
          "pie-widgeon-s5-10a",
          "pie-widgeon-s5-10b",
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
        opponents: ["burger-drake-s6-22", "cornquacker-s6-22", "milkshake-mallard-s6-21"],
      },
      {
        opponents: ["balewaddle-s6-22", "pie-widgeon-s6-22", "cornquacker-s6-21"],
      },
      {
        opponents: [
          "burger-drake-s6-13",
          "cornquacker-s6-13",
          "milkshake-mallard-s6-13",
          "balewaddle-s6-13",
          "pie-widgeon-s6-13",
        ],
      },
      {
        opponents: ["burger-drake-s6-26", "pie-widgeon-s6-26", "balewaddle-s6-13"],
      },
    ],
    boss: { opponents: ["the-combine"] },
    rarityOdds: [8, 32, 38, 22],
    backdropKey: "harvest-yard",
  },
];
