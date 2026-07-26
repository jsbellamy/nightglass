import type { AbilityDef, BaseStats, OpponentDef } from "../core/types";

/** Fowl Harvest opponents and kits (issue #415). */

const BURGER_S4_STATS: BaseStats = {
  maxHealth: 247,
  physical: 22,
  spell: 20,
  armor: 12,
  elementalResistance: 14,
  firePower: 0,
  frostPower: 0,
  lightningPower: 0,
  lightPower: 0,
  critChance: 0.05,
  critDamage: 1.5,
};

const CORN_S5_STATS: BaseStats = {
  maxHealth: 312,
  physical: 28,
  spell: 8,
  armor: 17,
  elementalResistance: 16,
  firePower: 0,
  frostPower: 0,
  lightningPower: 0,
  lightPower: 0,
  critChance: 0.05,
  critDamage: 1.5,
};

const BURGER_S6_STATS: BaseStats = {
  maxHealth: 390,
  physical: 26,
  spell: 30,
  armor: 22,
  elementalResistance: 22,
  firePower: 0,
  frostPower: 0,
  lightningPower: 0,
  lightPower: 0,
  critChance: 0.05,
  critDamage: 1.5,
};

const CORN_S6_STATS: BaseStats = {
  maxHealth: 416,
  physical: 34,
  spell: 10,
  armor: 24,
  elementalResistance: 20,
  firePower: 0,
  frostPower: 0,
  lightningPower: 0,
  lightPower: 0,
  critChance: 0.05,
  critDamage: 1.5,
};

const THE_FRYER_STATS: BaseStats = {
  maxHealth: 1950,
  physical: 34,
  spell: 32,
  armor: 25,
  elementalResistance: 28,
  firePower: 0,
  frostPower: 0,
  lightningPower: 0,
  lightPower: 0,
  critChance: 0.05,
  critDamage: 1.5,
};

const SCAREQUACK_STATS: BaseStats = {
  maxHealth: 2730,
  physical: 42,
  spell: 18,
  armor: 32,
  elementalResistance: 30,
  firePower: 0,
  frostPower: 0,
  lightningPower: 0,
  lightPower: 0,
  critChance: 0.05,
  critDamage: 1.5,
};

const THE_COMBINE_STATS: BaseStats = {
  maxHealth: 3900,
  physical: 52,
  spell: 24,
  armor: 38,
  elementalResistance: 36,
  firePower: 0,
  frostPower: 0,
  lightningPower: 0,
  lightPower: 0,
  critChance: 0.05,
  critDamage: 1.5,
};

const BURGER_DRAKE_ABILITY_IDS = ["burger-drake-grease-spit", "burger-drake-bun-bash"] as const;
const CORNQUACKER_ABILITY_IDS = ["cornquacker-husk-lash", "cornquacker-cob-peck"] as const;
const THE_FRYER_ABILITY_IDS = [
  "the-fryer-flash-fry",
  "the-fryer-pressure-burst",
  "the-fryer-grease-peck",
] as const;
const SCAREQUACK_ABILITY_IDS = [
  "scarequack-harrowing-gaze",
  "scarequack-stakefall",
  "scarequack-crooked-peck",
] as const;
const THE_COMBINE_ABILITY_IDS = [
  "the-combine-redline-overdrive",
  "the-combine-reaping-pass",
  "the-combine-thresher-bite",
] as const;
const MILKSHAKE_MALLARD_ABILITY_IDS = [
  "milkshake-mallard-brainfreeze",
  "milkshake-mallard-straw-jab",
] as const;
const BALEWADDLE_ABILITY_IDS = ["balewaddle-chaff-burst", "balewaddle-bale-bump"] as const;
const PIE_WIDGEON_ABILITY_IDS = ["pie-widgeon-scalding-slice", "pie-widgeon-crust-peck"] as const;

export const fowlHarvestOpponentAbilities: AbilityDef[] = [
  {
    id: "burger-drake-grease-spit",
    name: "Grease Spit",
    classId: "knight",
    slot: "core",
    targeting: { kind: "closest-opponent" },
    effects: [
      { kind: "damage", channel: "elemental", element: "fire", coefficient: 0.9 },
      { kind: "apply-status", statusId: "scalded" },
    ],
    windUpMs: 450,
    recoveryMs: 700,
    cooldownMs: 10_400,
  },
  {
    id: "burger-drake-bun-bash",
    name: "Bun Bash",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 400,
    recoveryMs: 1800,
    cooldownMs: 0,
  },
  {
    id: "cornquacker-husk-lash",
    name: "Husk Lash",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 0.55 },
      { kind: "apply-status", statusId: "riven" },
    ],
    windUpMs: 600,
    recoveryMs: 700,
    cooldownMs: 11_700,
  },
  {
    id: "cornquacker-cob-peck",
    name: "Cob Peck",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 450,
    recoveryMs: 1750,
    cooldownMs: 0,
  },
  {
    id: "the-fryer-flash-fry",
    name: "Flash Fry",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "fire", coefficient: 1 },
      { kind: "apply-status", statusId: "scalded" },
    ],
    windUpMs: 800,
    recoveryMs: 800,
    cooldownMs: 14_300,
  },
  {
    id: "the-fryer-pressure-burst",
    name: "Pressure Burst",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "fire", coefficient: 0.65 },
      { kind: "apply-status", statusId: "stun", stunMs: 1_300 },
    ],
    windUpMs: 650,
    recoveryMs: 800,
    cooldownMs: 18_200,
  },
  {
    id: "the-fryer-grease-peck",
    name: "Grease Peck",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 450,
    recoveryMs: 1750,
    cooldownMs: 0,
  },
  {
    id: "scarequack-harrowing-gaze",
    name: "Harrowing Gaze",
    classId: "knight",
    slot: "core",
    targeting: { kind: "party" },
    effects: [{ kind: "apply-status", statusId: "shaken" }],
    windUpMs: 500,
    recoveryMs: 700,
    cooldownMs: 15_600,
  },
  {
    id: "scarequack-stakefall",
    name: "Stakefall",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 0.85 },
      { kind: "apply-status", statusId: "stun", stunMs: 1_300 },
    ],
    windUpMs: 800,
    recoveryMs: 800,
    cooldownMs: 18_200,
  },
  {
    id: "scarequack-crooked-peck",
    name: "Crooked Peck",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 450,
    recoveryMs: 1750,
    cooldownMs: 0,
  },
  {
    id: "the-combine-redline-overdrive",
    name: "Redline Overdrive",
    classId: "knight",
    slot: "core",
    targeting: { kind: "self" },
    effects: [{ kind: "apply-status", statusId: "overdrive" }],
    windUpMs: 400,
    recoveryMs: 600,
    cooldownMs: 18_200,
    validWhile: "status-absent",
  },
  {
    id: "the-combine-reaping-pass",
    name: "Reaping Pass",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 1 },
      { kind: "apply-status", statusId: "riven" },
    ],
    windUpMs: 900,
    recoveryMs: 800,
    cooldownMs: 15_600,
  },
  {
    id: "the-combine-thresher-bite",
    name: "Thresher Bite",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 500,
    recoveryMs: 1800,
    cooldownMs: 0,
  },
  {
    id: "milkshake-mallard-brainfreeze",
    name: "Brainfreeze",
    classId: "knight",
    slot: "core",
    targeting: { kind: "closest-opponent" },
    effects: [
      { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.9 },
      { kind: "apply-status", statusId: "timeslip" },
    ],
    windUpMs: 470,
    recoveryMs: 690,
    cooldownMs: 11_100,
  },
  {
    id: "milkshake-mallard-straw-jab",
    name: "Straw Jab",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 410,
    recoveryMs: 1750,
    cooldownMs: 0,
  },
  {
    id: "balewaddle-chaff-burst",
    name: "Chaff Burst",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 0.55 },
      { kind: "apply-status", statusId: "shaken" },
    ],
    windUpMs: 590,
    recoveryMs: 710,
    cooldownMs: 11_700,
  },
  {
    id: "balewaddle-bale-bump",
    name: "Bale Bump",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 440,
    recoveryMs: 1820,
    cooldownMs: 0,
  },
  {
    id: "pie-widgeon-scalding-slice",
    name: "Scalding Slice",
    classId: "knight",
    slot: "core",
    targeting: { kind: "closest-opponent" },
    effects: [
      { kind: "damage", channel: "elemental", element: "fire", coefficient: 0.85 },
      { kind: "apply-status", statusId: "scalded" },
    ],
    windUpMs: 460,
    recoveryMs: 680,
    cooldownMs: 10_400,
  },
  {
    id: "pie-widgeon-crust-peck",
    name: "Crust Peck",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 430,
    recoveryMs: 1750,
    cooldownMs: 0,
  },
];

function burgerDrake(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Burger Drake",
    family: "burger-drake",
    boss: false,
    base: stats,
    abilityIds: [...BURGER_DRAKE_ABILITY_IDS],
    xpAward,
    spriteKey: "burger-drake",
  };
}

function cornquacker(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Cornquacker",
    family: "cornquacker",
    boss: false,
    base: stats,
    abilityIds: [...CORNQUACKER_ABILITY_IDS],
    xpAward,
    spriteKey: "cornquacker",
  };
}

function milkshakeMallard(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Milkshake Mallard",
    family: "milkshake-mallard",
    boss: false,
    base: stats,
    abilityIds: [...MILKSHAKE_MALLARD_ABILITY_IDS],
    xpAward,
    spriteKey: "milkshake-mallard",
  };
}

function balewaddle(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Balewaddle",
    family: "balewaddle",
    boss: false,
    base: stats,
    abilityIds: [...BALEWADDLE_ABILITY_IDS],
    xpAward,
    spriteKey: "balewaddle",
  };
}

function pieWidgeon(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Pie Widgeon",
    family: "pie-widgeon",
    boss: false,
    base: stats,
    abilityIds: [...PIE_WIDGEON_ABILITY_IDS],
    xpAward,
    spriteKey: "pie-widgeon",
  };
}

function fowlBoss(
  id: string,
  name: string,
  stats: BaseStats,
  abilityIds: readonly string[],
  xpAward: number,
): OpponentDef {
  return {
    id,
    name,
    family: id,
    boss: true,
    base: stats,
    abilityIds: [...abilityIds],
    xpAward,
    spriteKey: id,
  };
}

export const fowlHarvestOpponents: OpponentDef[] = [
  burgerDrake("burger-drake-s4-27a", BURGER_S4_STATS, 27),
  burgerDrake("burger-drake-s4-27b", BURGER_S4_STATS, 27),
  burgerDrake("burger-drake-s4-26", BURGER_S4_STATS, 26),
  burgerDrake("burger-drake-s4-20", BURGER_S4_STATS, 20),
  burgerDrake("burger-drake-s4-14", BURGER_S4_STATS, 14),
  burgerDrake("burger-drake-s4-13a", BURGER_S4_STATS, 13),
  burgerDrake("burger-drake-s4-13b", BURGER_S4_STATS, 13),
  burgerDrake("burger-drake-s4-10", BURGER_S4_STATS, 10),

  cornquacker("cornquacker-s5-34", CORN_S5_STATS, 34),
  cornquacker("cornquacker-s5-33a", CORN_S5_STATS, 33),
  cornquacker("cornquacker-s5-33b", CORN_S5_STATS, 33),
  cornquacker("cornquacker-s5-20", CORN_S5_STATS, 20),
  cornquacker("cornquacker-s5-17", CORN_S5_STATS, 17),
  cornquacker("cornquacker-s5-16", CORN_S5_STATS, 16),
  cornquacker("cornquacker-s5-14a", CORN_S5_STATS, 14),
  cornquacker("cornquacker-s5-14b", CORN_S5_STATS, 14),
  cornquacker("cornquacker-s5-13", CORN_S5_STATS, 13),
  cornquacker("cornquacker-s5-11", CORN_S5_STATS, 11),
  cornquacker("cornquacker-s5-10", CORN_S5_STATS, 10),

  burgerDrake("burger-drake-s6-33", BURGER_S6_STATS, 33),
  burgerDrake("burger-drake-s6-32", BURGER_S6_STATS, 32),
  burgerDrake("burger-drake-s6-26", BURGER_S6_STATS, 26),
  burgerDrake("burger-drake-s6-22", BURGER_S6_STATS, 22),
  burgerDrake("burger-drake-s6-16", BURGER_S6_STATS, 16),
  burgerDrake("burger-drake-s6-13", BURGER_S6_STATS, 13),
  burgerDrake("burger-drake-s6-10", BURGER_S6_STATS, 10),

  cornquacker("cornquacker-s6-33", CORN_S6_STATS, 33),
  cornquacker("cornquacker-s6-32", CORN_S6_STATS, 32),
  cornquacker("cornquacker-s6-26", CORN_S6_STATS, 26),
  cornquacker("cornquacker-s6-22", CORN_S6_STATS, 22),
  cornquacker("cornquacker-s6-21", CORN_S6_STATS, 21),
  cornquacker("cornquacker-s6-16", CORN_S6_STATS, 16),
  cornquacker("cornquacker-s6-13", CORN_S6_STATS, 13),
  cornquacker("cornquacker-s6-10", CORN_S6_STATS, 10),

  milkshakeMallard("milkshake-mallard-s4-27", BURGER_S4_STATS, 27),
  milkshakeMallard("milkshake-mallard-s4-20", BURGER_S4_STATS, 20),
  milkshakeMallard("milkshake-mallard-s4-13", BURGER_S4_STATS, 13),
  milkshakeMallard("milkshake-mallard-s4-10", BURGER_S4_STATS, 10),
  balewaddle("balewaddle-s4-26", BURGER_S4_STATS, 26),
  balewaddle("balewaddle-s4-14", BURGER_S4_STATS, 14),
  balewaddle("balewaddle-s4-13", BURGER_S4_STATS, 13),
  balewaddle("balewaddle-s4-10", BURGER_S4_STATS, 10),
  pieWidgeon("pie-widgeon-s4-20", BURGER_S4_STATS, 20),
  pieWidgeon("pie-widgeon-s4-14", BURGER_S4_STATS, 14),
  pieWidgeon("pie-widgeon-s4-10", BURGER_S4_STATS, 10),
  milkshakeMallard("milkshake-mallard-s5-20", CORN_S5_STATS, 20),
  milkshakeMallard("milkshake-mallard-s5-13", CORN_S5_STATS, 13),
  milkshakeMallard("milkshake-mallard-s5-11", CORN_S5_STATS, 11),
  milkshakeMallard("milkshake-mallard-s5-10", CORN_S5_STATS, 10),
  balewaddle("balewaddle-s5-33", CORN_S5_STATS, 33),
  balewaddle("balewaddle-s5-20", CORN_S5_STATS, 20),
  balewaddle("balewaddle-s5-17", CORN_S5_STATS, 17),
  balewaddle("balewaddle-s5-13", CORN_S5_STATS, 13),
  balewaddle("balewaddle-s5-11", CORN_S5_STATS, 11),
  balewaddle("balewaddle-s5-10", CORN_S5_STATS, 10),
  pieWidgeon("pie-widgeon-s5-33", CORN_S5_STATS, 33),
  pieWidgeon("pie-widgeon-s5-20", CORN_S5_STATS, 20),
  pieWidgeon("pie-widgeon-s5-16", CORN_S5_STATS, 16),
  pieWidgeon("pie-widgeon-s5-13", CORN_S5_STATS, 13),
  pieWidgeon("pie-widgeon-s5-11", CORN_S5_STATS, 11),
  pieWidgeon("pie-widgeon-s5-10a", CORN_S5_STATS, 10),
  pieWidgeon("pie-widgeon-s5-10b", CORN_S5_STATS, 10),
  milkshakeMallard("milkshake-mallard-s6-32", BURGER_S6_STATS, 32),
  milkshakeMallard("milkshake-mallard-s6-22", BURGER_S6_STATS, 22),
  milkshakeMallard("milkshake-mallard-s6-21", BURGER_S6_STATS, 21),
  milkshakeMallard("milkshake-mallard-s6-16", BURGER_S6_STATS, 16),
  milkshakeMallard("milkshake-mallard-s6-13", BURGER_S6_STATS, 13),
  balewaddle("balewaddle-s6-32", CORN_S6_STATS, 32),
  balewaddle("balewaddle-s6-26", CORN_S6_STATS, 26),
  balewaddle("balewaddle-s6-22", CORN_S6_STATS, 22),
  balewaddle("balewaddle-s6-16", CORN_S6_STATS, 16),
  balewaddle("balewaddle-s6-13", CORN_S6_STATS, 13),
  pieWidgeon("pie-widgeon-s6-26", BURGER_S6_STATS, 26),
  pieWidgeon("pie-widgeon-s6-22", BURGER_S6_STATS, 22),
  pieWidgeon("pie-widgeon-s6-21", BURGER_S6_STATS, 21),
  pieWidgeon("pie-widgeon-s6-16", BURGER_S6_STATS, 16),
  pieWidgeon("pie-widgeon-s6-13", BURGER_S6_STATS, 13),

  fowlBoss("the-fryer", "The Fryer", THE_FRYER_STATS, THE_FRYER_ABILITY_IDS, 240),
  fowlBoss("scarequack", "Scarequack", SCAREQUACK_STATS, SCAREQUACK_ABILITY_IDS, 300),
  fowlBoss("the-combine", "The Combine", THE_COMBINE_STATS, THE_COMBINE_ABILITY_IDS, 390),
];
