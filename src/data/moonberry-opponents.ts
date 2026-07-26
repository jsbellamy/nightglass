import type { AbilityDef, BaseStats, OpponentDef } from "../core/types";

/** Moonberry ordinary opponent families and kits (issue #684). */

const PIPCAP_1_STATS: BaseStats = {
  maxHealth: 72,
  physical: 9,
  spell: 0,
  armor: 4,
  elementalResistance: 4,
  firePower: 0,
  frostPower: 0,
  lightningPower: 0,
  lightPower: 0,
  critChance: 0.05,
  critDamage: 1.5,
};

const PIPCAP_2_STATS: BaseStats = {
  maxHealth: 124,
  physical: 13,
  spell: 0,
  armor: 7,
  elementalResistance: 7,
  firePower: 0,
  frostPower: 0,
  lightningPower: 0,
  lightPower: 0,
  critChance: 0.05,
  critDamage: 1.5,
};

const PIPCAP_3_STATS: BaseStats = {
  maxHealth: 182,
  physical: 18,
  spell: 0,
  armor: 10,
  elementalResistance: 10,
  firePower: 0,
  frostPower: 0,
  lightningPower: 0,
  lightPower: 0,
  critChance: 0.05,
  critDamage: 1.5,
};

const BRAMBLING_ABILITY_IDS = ["brambling-thorn-lash", "brambling-briar-jab"] as const;
const LANTERNMOTH_ABILITY_IDS = ["lanternmoth-dazzle", "lanternmoth-wing-cuff"] as const;
const HUSKBEETLE_ABILITY_IDS = ["huskbeetle-shell-slam", "huskbeetle-mandible-nip"] as const;
const DEWSNAIL_ABILITY_IDS = ["dewsnail-dew-spray", "dewsnail-rasp"] as const;

export const moonberryOpponentAbilities: AbilityDef[] = [
  {
    id: "brambling-thorn-lash",
    name: "Thorn Lash",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 0.6 },
      { kind: "apply-status", statusId: "riven" },
    ],
    windUpMs: 550,
    recoveryMs: 700,
    cooldownMs: 9_000,
  },
  {
    id: "brambling-briar-jab",
    name: "Briar Jab",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 420,
    recoveryMs: 650,
    cooldownMs: 0,
  },
  {
    id: "lanternmoth-dazzle",
    name: "Dazzle",
    classId: "knight",
    slot: "core",
    targeting: { kind: "closest-opponent" },
    effects: [
      { kind: "damage", channel: "elemental", element: "light", coefficient: 0.9 },
      { kind: "apply-status", statusId: "shaken" },
    ],
    windUpMs: 480,
    recoveryMs: 680,
    cooldownMs: 8_000,
  },
  {
    id: "lanternmoth-wing-cuff",
    name: "Wing Cuff",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 400,
    recoveryMs: 650,
    cooldownMs: 0,
  },
  {
    id: "huskbeetle-shell-slam",
    name: "Shell Slam",
    classId: "knight",
    slot: "core",
    targeting: { kind: "closest-opponent" },
    effects: [
      { kind: "damage", channel: "physical", coefficient: 1.3 },
      { kind: "apply-status", statusId: "exposed" },
    ],
    windUpMs: 600,
    recoveryMs: 750,
    cooldownMs: 9_000,
  },
  {
    id: "huskbeetle-mandible-nip",
    name: "Mandible Nip",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 430,
    recoveryMs: 660,
    cooldownMs: 0,
  },
  {
    id: "dewsnail-dew-spray",
    name: "Dew Spray",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.7 },
      { kind: "apply-status", statusId: "scalded" },
    ],
    windUpMs: 560,
    recoveryMs: 720,
    cooldownMs: 9_500,
  },
  {
    id: "dewsnail-rasp",
    name: "Rasp",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 450,
    recoveryMs: 700,
    cooldownMs: 0,
  },
];

function scaleStatsFromXp(base: BaseStats, nearestXp: number, xpAward: number): BaseStats {
  const ratio = xpAward / nearestXp;
  return {
    maxHealth: Math.max(1, Math.floor(base.maxHealth * ratio)),
    physical: Math.max(1, Math.floor(base.physical * ratio)),
    spell: Math.max(0, Math.floor(base.spell * ratio)),
    armor: Math.max(0, Math.floor(base.armor * ratio)),
    elementalResistance: Math.max(0, Math.floor(base.elementalResistance * ratio)),
    firePower: Math.max(0, Math.floor(base.firePower * ratio)),
    frostPower: Math.max(0, Math.floor(base.frostPower * ratio)),
    lightningPower: Math.max(0, Math.floor(base.lightningPower * ratio)),
    lightPower: Math.max(0, Math.floor(base.lightPower * ratio)),
    critChance: base.critChance,
    critDamage: base.critDamage,
  };
}

function brambling(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Brambling",
    family: "brambling",
    boss: false,
    base: stats,
    abilityIds: [...BRAMBLING_ABILITY_IDS],
    xpAward,
    spriteKey: "brambling",
  };
}

function lanternmoth(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Lanternmoth",
    family: "lanternmoth",
    boss: false,
    base: stats,
    abilityIds: [...LANTERNMOTH_ABILITY_IDS],
    xpAward,
    spriteKey: "lanternmoth",
  };
}

function huskbeetle(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Huskbeetle",
    family: "huskbeetle",
    boss: false,
    base: stats,
    abilityIds: [...HUSKBEETLE_ABILITY_IDS],
    xpAward,
    spriteKey: "huskbeetle",
  };
}

function dewsnail(id: string, stats: BaseStats, xpAward: number): OpponentDef {
  return {
    id,
    name: "Dewsnail",
    family: "dewsnail",
    boss: false,
    base: stats,
    abilityIds: [...DEWSNAIL_ABILITY_IDS],
    xpAward,
    spriteKey: "dewsnail",
  };
}

export const moonberryOpponents: OpponentDef[] = [
  brambling("brambling-1-7", PIPCAP_1_STATS, 7),
  brambling(
    "brambling-1-3",
    scaleStatsFromXp(PIPCAP_1_STATS, 7, 3),
    3,
  ),
  brambling(
    "brambling-1-2",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_1_STATS, 7, 3), 3, 2),
    2,
  ),
  lanternmoth("lanternmoth-1-6", PIPCAP_1_STATS, 6),
  lanternmoth(
    "lanternmoth-1-3",
    scaleStatsFromXp(PIPCAP_1_STATS, 6, 3),
    3,
  ),
  lanternmoth(
    "lanternmoth-1-2",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_1_STATS, 6, 3), 3, 2),
    2,
  ),
  huskbeetle("huskbeetle-1-5", PIPCAP_1_STATS, 5),
  huskbeetle(
    "huskbeetle-1-3",
    scaleStatsFromXp(PIPCAP_1_STATS, 5, 3),
    3,
  ),
  huskbeetle(
    "huskbeetle-1-2",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_1_STATS, 5, 3), 3, 2),
    2,
  ),
  dewsnail("dewsnail-1-5", PIPCAP_1_STATS, 5),
  dewsnail(
    "dewsnail-1-3",
    scaleStatsFromXp(PIPCAP_1_STATS, 5, 3),
    3,
  ),
  dewsnail(
    "dewsnail-1-2",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_1_STATS, 5, 3), 3, 2),
    2,
  ),

  brambling("brambling-2-7", PIPCAP_2_STATS, 7),
  brambling("brambling-2-6", PIPCAP_2_STATS, 6),
  brambling(
    "brambling-2-5",
    scaleStatsFromXp(PIPCAP_2_STATS, 6, 5),
    5,
  ),
  brambling(
    "brambling-2-4",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_2_STATS, 6, 5), 5, 4),
    4,
  ),
  brambling(
    "brambling-2-3",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_2_STATS, 6, 5), 5, 3),
    3,
  ),
  lanternmoth("lanternmoth-2-7", PIPCAP_2_STATS, 7),
  lanternmoth(
    "lanternmoth-2-5",
    scaleStatsFromXp(PIPCAP_2_STATS, 7, 5),
    5,
  ),
  lanternmoth(
    "lanternmoth-2-4",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_2_STATS, 7, 5), 5, 4),
    4,
  ),
  lanternmoth(
    "lanternmoth-2-3",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_2_STATS, 7, 5), 5, 3),
    3,
  ),
  huskbeetle("huskbeetle-2-6", PIPCAP_2_STATS, 6),
  huskbeetle(
    "huskbeetle-2-3",
    scaleStatsFromXp(PIPCAP_2_STATS, 6, 3),
    3,
  ),
  dewsnail("dewsnail-2-6", PIPCAP_2_STATS, 6),
  dewsnail(
    "dewsnail-2-3",
    scaleStatsFromXp(PIPCAP_2_STATS, 6, 3),
    3,
  ),

  brambling("brambling-3-8", PIPCAP_3_STATS, 8),
  brambling(
    "brambling-3-6",
    scaleStatsFromXp(PIPCAP_3_STATS, 8, 6),
    6,
  ),
  brambling(
    "brambling-3-5",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_3_STATS, 8, 6), 6, 5),
    5,
  ),
  brambling(
    "brambling-3-4",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_3_STATS, 8, 6), 6, 4),
    4,
  ),
  brambling(
    "brambling-3-2",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_3_STATS, 8, 6), 6, 2),
    2,
  ),
  lanternmoth("lanternmoth-3-8", PIPCAP_3_STATS, 8),
  lanternmoth(
    "lanternmoth-3-5",
    scaleStatsFromXp(PIPCAP_3_STATS, 8, 5),
    5,
  ),
  lanternmoth(
    "lanternmoth-3-4",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_3_STATS, 8, 5), 5, 4),
    4,
  ),
  lanternmoth(
    "lanternmoth-3-3",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_3_STATS, 8, 5), 5, 3),
    3,
  ),
  lanternmoth(
    "lanternmoth-3-2",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_3_STATS, 8, 5), 5, 2),
    2,
  ),
  huskbeetle("huskbeetle-3-8", PIPCAP_3_STATS, 8),
  huskbeetle(
    "huskbeetle-3-5",
    scaleStatsFromXp(PIPCAP_3_STATS, 8, 5),
    5,
  ),
  huskbeetle(
    "huskbeetle-3-4",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_3_STATS, 8, 5), 5, 4),
    4,
  ),
  dewsnail("dewsnail-3-8", PIPCAP_3_STATS, 8),
  dewsnail(
    "dewsnail-3-4",
    scaleStatsFromXp(PIPCAP_3_STATS, 8, 4),
    4,
  ),
  dewsnail(
    "dewsnail-3-3",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_3_STATS, 8, 4), 4, 3),
    3,
  ),
  dewsnail(
    "dewsnail-3-2",
    scaleStatsFromXp(scaleStatsFromXp(PIPCAP_3_STATS, 8, 4), 4, 2),
    2,
  ),
];
