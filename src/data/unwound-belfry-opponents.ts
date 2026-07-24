import type { AbilityDef, BaseStats, OpponentDef } from "../core/types";

/** Unwound Belfry opponents and kits (issue #592). */

const TICKMOTH_S7_STATS: BaseStats = {
  maxHealth: 340,
  physical: 30,
  elemental: 34,
  armor: 20,
  elementalResistance: 26,
};

const TICKMOTH_S8_STATS: BaseStats = {
  maxHealth: 400,
  physical: 34,
  elemental: 40,
  armor: 24,
  elementalResistance: 30,
};

const TICKMOTH_S9_STATS: BaseStats = {
  maxHealth: 560,
  physical: 44,
  elemental: 52,
  armor: 30,
  elementalResistance: 38,
};

const TOLLBAT_S7_STATS: BaseStats = {
  maxHealth: 430,
  physical: 42,
  elemental: 16,
  armor: 30,
  elementalResistance: 22,
};

const TOLLBAT_S8_STATS: BaseStats = {
  maxHealth: 500,
  physical: 48,
  elemental: 18,
  armor: 34,
  elementalResistance: 26,
};

const TOLLBAT_S9_STATS: BaseStats = {
  maxHealth: 680,
  physical: 60,
  elemental: 24,
  armor: 42,
  elementalResistance: 34,
};

const SPIDER_S8_STATS: BaseStats = {
  maxHealth: 520,
  physical: 36,
  elemental: 30,
  armor: 36,
  elementalResistance: 32,
};

const SPIDER_S9_STATS: BaseStats = {
  maxHealth: 720,
  physical: 46,
  elemental: 40,
  armor: 46,
  elementalResistance: 42,
};

const VIGIL_STATS: BaseStats = {
  maxHealth: 3600,
  physical: 46,
  elemental: 40,
  armor: 34,
  elementalResistance: 34,
};

const TOCSIN_STATS: BaseStats = {
  maxHealth: 4400,
  physical: 54,
  elemental: 34,
  armor: 40,
  elementalResistance: 38,
};

const UNWOUND_STATS: BaseStats = {
  maxHealth: 6500,
  physical: 66,
  elemental: 44,
  armor: 50,
  elementalResistance: 46,
};

const APHELION_STATS: BaseStats = {
  maxHealth: 9000,
  physical: 78,
  elemental: 70,
  armor: 58,
  elementalResistance: 58,
};

const TICKMOTH_ABILITY_IDS = ["tickmoth-frostwing-flutter", "tickmoth-tick-peck"] as const;
const TOLLBAT_ABILITY_IDS = ["tollbat-toll", "tollbat-wing-buffet"] as const;
const ASTROLABE_SPIDER_ABILITY_IDS = [
  "astrolabe-spider-verdigris-web",
  "astrolabe-spider-caliper-bite",
] as const;
const THE_VIGIL_ABILITY_IDS = [
  "the-vigil-stopped-hour",
  "the-vigil-hollow-gaze",
  "the-vigil-talon-rake",
] as const;
const THE_TOCSIN_ABILITY_IDS = [
  "the-tocsin-tocsin-toll",
  "the-tocsin-death-knell",
  "the-tocsin-iron-peck",
] as const;
const THE_UNWOUND_ABILITY_IDS = [
  "the-unwound-mainspring-release",
  "the-unwound-escapement-sweep",
  "the-unwound-grinding-halt",
  "the-unwound-gear-grind",
] as const;
const APHELION_ABILITY_IDS = [
  "aphelion-precession",
  "aphelion-eclipse-toll",
  "aphelion-aphelions-reach",
  "aphelion-cold-zenith",
  "aphelion-orrery-strike",
] as const;

export const unwoundBelfryOpponentAbilities: AbilityDef[] = [
  {
    id: "tickmoth-frostwing-flutter",
    name: "Frostwing Flutter",
    classId: "knight",
    slot: "core",
    targeting: { kind: "closest-opponent" },
    effects: [
      { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.9 },
      { kind: "apply-status", statusId: "timeslip" },
    ],
    windUpMs: 450,
    recoveryMs: 650,
    cooldownMs: 8_000,
  },
  {
    id: "tickmoth-tick-peck",
    name: "Tick Peck",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 380,
    recoveryMs: 620,
    cooldownMs: 0,
  },
  {
    id: "tollbat-toll",
    name: "Toll",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 0.6 },
      { kind: "apply-status", statusId: "tolling" },
    ],
    windUpMs: 600,
    recoveryMs: 750,
    cooldownMs: 9_000,
  },
  {
    id: "tollbat-wing-buffet",
    name: "Wing Buffet",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 400,
    recoveryMs: 700,
    cooldownMs: 0,
  },
  {
    id: "astrolabe-spider-verdigris-web",
    name: "Verdigris Web",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.5 },
      { kind: "apply-status", statusId: "corroded" },
    ],
    windUpMs: 550,
    recoveryMs: 700,
    cooldownMs: 9_000,
  },
  {
    id: "astrolabe-spider-caliper-bite",
    name: "Caliper Bite",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 420,
    recoveryMs: 680,
    cooldownMs: 0,
  },
  {
    id: "the-vigil-stopped-hour",
    name: "Stopped Hour",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.6 },
      { kind: "apply-status", statusId: "stun", stunMs: 1_000 },
    ],
    windUpMs: 700,
    recoveryMs: 800,
    cooldownMs: 13_000,
  },
  {
    id: "the-vigil-hollow-gaze",
    name: "Hollow Gaze",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [{ kind: "apply-status", statusId: "timeslip" }],
    windUpMs: 500,
    recoveryMs: 700,
    cooldownMs: 12_000,
  },
  {
    id: "the-vigil-talon-rake",
    name: "Talon Rake",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 450,
    recoveryMs: 650,
    cooldownMs: 0,
  },
  {
    id: "the-tocsin-tocsin-toll",
    name: "Tocsin Toll",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 0.8 },
      { kind: "apply-status", statusId: "tolling" },
    ],
    windUpMs: 800,
    recoveryMs: 800,
    cooldownMs: 12_000,
  },
  {
    id: "the-tocsin-death-knell",
    name: "Death Knell",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 0.7 },
      { kind: "apply-status", statusId: "stun", stunMs: 1_000 },
    ],
    windUpMs: 700,
    recoveryMs: 800,
    cooldownMs: 15_000,
  },
  {
    id: "the-tocsin-iron-peck",
    name: "Iron Peck",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 450,
    recoveryMs: 650,
    cooldownMs: 0,
  },
  {
    id: "the-unwound-mainspring-release",
    name: "Mainspring Release",
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
    id: "the-unwound-escapement-sweep",
    name: "Escapement Sweep",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 1 },
      { kind: "apply-status", statusId: "corroded" },
    ],
    windUpMs: 900,
    recoveryMs: 800,
    cooldownMs: 12_000,
  },
  {
    id: "the-unwound-grinding-halt",
    name: "Grinding Halt",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 0.7 },
      { kind: "apply-status", statusId: "stun", stunMs: 1_200 },
    ],
    windUpMs: 800,
    recoveryMs: 850,
    cooldownMs: 16_000,
  },
  {
    id: "the-unwound-gear-grind",
    name: "Gear Grind",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 500,
    recoveryMs: 650,
    cooldownMs: 0,
  },
  {
    id: "aphelion-precession",
    name: "Precession",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.9 },
      { kind: "apply-status", statusId: "timeslip" },
    ],
    windUpMs: 700,
    recoveryMs: 800,
    cooldownMs: 12_000,
  },
  {
    id: "aphelion-eclipse-toll",
    name: "Eclipse Toll",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 0.9 },
      { kind: "apply-status", statusId: "tolling" },
    ],
    windUpMs: 800,
    recoveryMs: 800,
    cooldownMs: 13_000,
  },
  {
    id: "aphelion-aphelions-reach",
    name: "Aphelion's Reach",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "frost", coefficient: 1.1 },
      { kind: "apply-status", statusId: "stun", stunMs: 1_200 },
    ],
    windUpMs: 900,
    recoveryMs: 900,
    cooldownMs: 16_000,
  },
  {
    id: "aphelion-cold-zenith",
    name: "Cold Zenith",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.7 },
      { kind: "apply-status", statusId: "corroded" },
    ],
    windUpMs: 650,
    recoveryMs: 800,
    cooldownMs: 14_000,
  },
  {
    id: "aphelion-orrery-strike",
    name: "Orrery Strike",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 500,
    recoveryMs: 650,
    cooldownMs: 0,
  },
];

function tickmoth(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Tickmoth",
    family: "tickmoth",
    boss: false,
    base: stats,
    abilityIds: [...TICKMOTH_ABILITY_IDS],
    xpAward,
    spriteKey: "tickmoth",
  };
}

function tollbat(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Tollbat",
    family: "tollbat",
    boss: false,
    base: stats,
    abilityIds: [...TOLLBAT_ABILITY_IDS],
    xpAward,
    spriteKey: "tollbat",
  };
}

function astrolabeSpider(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Astrolabe-Spider",
    family: "astrolabe-spider",
    boss: false,
    base: stats,
    abilityIds: [...ASTROLABE_SPIDER_ABILITY_IDS],
    xpAward,
    spriteKey: "astrolabe-spider",
  };
}

function belfryBoss(
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

export const unwoundBelfryOpponents: OpponentDef[] = [
  tickmoth("tickmoth-s7-36a", TICKMOTH_S7_STATS, 36),
  tickmoth("tickmoth-s7-36b", TICKMOTH_S7_STATS, 36),
  tickmoth("tickmoth-s7-40", TICKMOTH_S7_STATS, 40),
  tickmoth("tickmoth-s8-38", TICKMOTH_S8_STATS, 38),
  tickmoth("tickmoth-s9-60", TICKMOTH_S9_STATS, 60),
  tickmoth("tickmoth-s9-52", TICKMOTH_S9_STATS, 52),

  tollbat("tollbat-s7-44a", TOLLBAT_S7_STATS, 44),
  tollbat("tollbat-s7-44b", TOLLBAT_S7_STATS, 44),
  tollbat("tollbat-s8-47a", TOLLBAT_S8_STATS, 47),
  tollbat("tollbat-s8-47b", TOLLBAT_S8_STATS, 47),
  tollbat("tollbat-s9-60", TOLLBAT_S9_STATS, 60),

  astrolabeSpider("astrolabe-spider-s8-48a", SPIDER_S8_STATS, 48),
  astrolabeSpider("astrolabe-spider-s8-48b", SPIDER_S8_STATS, 48),
  astrolabeSpider("astrolabe-spider-s9-70a", SPIDER_S9_STATS, 70),
  astrolabeSpider("astrolabe-spider-s9-70b", SPIDER_S9_STATS, 70),

  belfryBoss("the-vigil", "The Vigil", VIGIL_STATS, THE_VIGIL_ABILITY_IDS, 480),
  belfryBoss("the-tocsin", "The Tocsin", TOCSIN_STATS, THE_TOCSIN_ABILITY_IDS, 570),
  belfryBoss("the-unwound", "The Unwound", UNWOUND_STATS, THE_UNWOUND_ABILITY_IDS, 900),
  belfryBoss("aphelion", "Aphelion", APHELION_STATS, APHELION_ABILITY_IDS, 1500),
];
