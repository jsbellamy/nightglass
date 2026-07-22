import type { AbilityDef, BaseStats, OpponentDef } from "../core/types";

/** Inactive Fowl Harvest opponents and kits (issue #415). Not wired into shipped Content yet. */

const BURGER_S4_STATS: BaseStats = {
  maxHealth: 190,
  physical: 22,
  elemental: 20,
  armor: 12,
  elementalResistance: 14,
};

const CORN_S5_STATS: BaseStats = {
  maxHealth: 240,
  physical: 28,
  elemental: 8,
  armor: 17,
  elementalResistance: 16,
};

const BURGER_S6_STATS: BaseStats = {
  maxHealth: 300,
  physical: 26,
  elemental: 30,
  armor: 22,
  elementalResistance: 22,
};

const CORN_S6_STATS: BaseStats = {
  maxHealth: 320,
  physical: 34,
  elemental: 10,
  armor: 24,
  elementalResistance: 20,
};

const THE_FRYER_STATS: BaseStats = {
  maxHealth: 1500,
  physical: 34,
  elemental: 32,
  armor: 25,
  elementalResistance: 28,
};

const SCAREQUACK_STATS: BaseStats = {
  maxHealth: 2100,
  physical: 42,
  elemental: 18,
  armor: 32,
  elementalResistance: 30,
};

const THE_COMBINE_STATS: BaseStats = {
  maxHealth: 3000,
  physical: 52,
  elemental: 24,
  armor: 38,
  elementalResistance: 36,
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
    cooldownMs: 8_000,
  },
  {
    id: "burger-drake-bun-bash",
    name: "Bun Bash",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 400,
    recoveryMs: 700,
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
    cooldownMs: 9_000,
  },
  {
    id: "cornquacker-cob-peck",
    name: "Cob Peck",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 450,
    recoveryMs: 650,
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
    cooldownMs: 11_000,
  },
  {
    id: "the-fryer-pressure-burst",
    name: "Pressure Burst",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "fire", coefficient: 0.65 },
      { kind: "apply-status", statusId: "stun", stunMs: 1_000 },
    ],
    windUpMs: 650,
    recoveryMs: 800,
    cooldownMs: 14_000,
  },
  {
    id: "the-fryer-grease-peck",
    name: "Grease Peck",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 450,
    recoveryMs: 650,
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
    cooldownMs: 12_000,
  },
  {
    id: "scarequack-stakefall",
    name: "Stakefall",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 0.85 },
      { kind: "apply-status", statusId: "stun", stunMs: 1_000 },
    ],
    windUpMs: 800,
    recoveryMs: 800,
    cooldownMs: 14_000,
  },
  {
    id: "scarequack-crooked-peck",
    name: "Crooked Peck",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 450,
    recoveryMs: 650,
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
    cooldownMs: 14_000,
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
    cooldownMs: 12_000,
  },
  {
    id: "the-combine-thresher-bite",
    name: "Thresher Bite",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 500,
    recoveryMs: 650,
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

  cornquacker("cornquacker-s5-34", CORN_S5_STATS, 34),
  cornquacker("cornquacker-s5-33a", CORN_S5_STATS, 33),
  cornquacker("cornquacker-s5-33b", CORN_S5_STATS, 33),
  cornquacker("cornquacker-s5-20", CORN_S5_STATS, 20),

  burgerDrake("burger-drake-s6-33", BURGER_S6_STATS, 33),
  burgerDrake("burger-drake-s6-32", BURGER_S6_STATS, 32),
  burgerDrake("burger-drake-s6-26", BURGER_S6_STATS, 26),

  cornquacker("cornquacker-s6-33", CORN_S6_STATS, 33),
  cornquacker("cornquacker-s6-32", CORN_S6_STATS, 32),
  cornquacker("cornquacker-s6-26", CORN_S6_STATS, 26),

  fowlBoss("the-fryer", "The Fryer", THE_FRYER_STATS, THE_FRYER_ABILITY_IDS, 240),
  fowlBoss("scarequack", "Scarequack", SCAREQUACK_STATS, SCAREQUACK_ABILITY_IDS, 300),
  fowlBoss("the-combine", "The Combine", THE_COMBINE_STATS, THE_COMBINE_ABILITY_IDS, 390),
];
