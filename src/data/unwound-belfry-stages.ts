import type { StageDef } from "../core/types";

/** Unwound Belfry Stages 7–10 (issue #593). */
export const unwoundBelfryStages: StageDef[] = [
  {
    id: 7,
    name: "Stopped-Clock Court",
    waves: [
      {
        opponents: [
          "tollbat-s7-44a",
          "tickmoth-s7-36a",
          "pendulum-rat-s7-44",
          "sundial-gargoyle-s7-36",
        ],
      },
      {
        opponents: [
          "tickmoth-s7-40",
          "tickmoth-s7-40",
          "pendulum-rat-s7-40",
          "sundial-gargoyle-s7-40",
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
          "tollbat-s8-47a",
          "pendulum-rat-s8-48",
          "sundial-gargoyle-s8-47",
        ],
      },
      {
        opponents: [
          "tickmoth-s8-38",
          "tickmoth-s8-38",
          "astrolabe-spider-s8-38",
          "pendulum-rat-s8-38",
          "sundial-gargoyle-s8-38",
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
          "tollbat-s9-60",
          "pendulum-rat-s9-70",
          "sundial-gargoyle-s9-60",
        ],
      },
      {
        opponents: [
          "tickmoth-s9-52",
          "tickmoth-s9-52",
          "sundial-gargoyle-s9-52",
          "pendulum-rat-s9-52",
          "astrolabe-spider-s9-52",
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
