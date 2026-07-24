import type { StageDef } from "../core/types";

/** Unwound Belfry Stages 7–10 (issue #593). */
export const unwoundBelfryStages: StageDef[] = [
  {
    id: 7,
    name: "Stopped-Clock Court",
    waves: [
      {
        opponents: ["tollbat-s7-44a", "tollbat-s7-44b", "tickmoth-s7-36a", "tickmoth-s7-36b"],
      },
      {
        opponents: [
          "tickmoth-s7-40",
          "tickmoth-s7-40",
          "tickmoth-s7-40",
          "tickmoth-s7-40",
        ],
      },
    ],
    boss: { opponents: ["the-vigil"] },
    rarityOdds: [6, 28, 40, 26],
    backdropKey: "stopped-clock-court",
  },
  {
    id: 8,
    name: "Carillon Hall",
    waves: [
      {
        opponents: [
          "astrolabe-spider-s8-48a",
          "astrolabe-spider-s8-48b",
          "tollbat-s8-47a",
          "tollbat-s8-47b",
        ],
      },
      {
        opponents: [
          "tickmoth-s8-38",
          "tickmoth-s8-38",
          "tickmoth-s8-38",
          "tickmoth-s8-38",
          "tickmoth-s8-38",
        ],
      },
    ],
    boss: { opponents: ["the-tocsin"] },
    rarityOdds: [4, 24, 42, 30],
    backdropKey: "carillon-hall",
  },
  {
    id: 9,
    name: "The Mainspring",
    waves: [
      {
        opponents: [
          "astrolabe-spider-s9-70a",
          "astrolabe-spider-s9-70b",
          "tollbat-s9-60",
          "tickmoth-s9-60",
        ],
      },
      {
        opponents: [
          "tickmoth-s9-52",
          "tickmoth-s9-52",
          "tickmoth-s9-52",
          "tickmoth-s9-52",
          "tickmoth-s9-52",
        ],
      },
    ],
    boss: { opponents: ["the-unwound"] },
    rarityOdds: [3, 20, 42, 35],
    backdropKey: "the-mainspring",
  },
  {
    id: 10,
    name: "The Oculus",
    waves: [],
    boss: { opponents: ["aphelion"] },
    rarityOdds: [2, 16, 42, 40],
    backdropKey: "the-oculus",
  },
];
