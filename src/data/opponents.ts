import type { AbilityDef, BaseStats, OpponentDef } from "../core/types";
import {
  fowlHarvestOpponentAbilities,
  fowlHarvestOpponents,
} from "./fowl-harvest-opponents";

/**
 * Initial combat tuning for vertical-slice opponents (issue #40).
 * Adjust only toward pinned XP budgets and pacing targets from issue #5.
 */

const PIPCAP_1_STATS: BaseStats = {
  maxHealth: 55,
  physical: 9,
  elemental: 0,
  armor: 4,
  elementalResistance: 4,
};

const PIPCAP_2_STATS: BaseStats = {
  maxHealth: 95,
  physical: 13,
  elemental: 0,
  armor: 7,
  elementalResistance: 7,
};

const PIPCAP_3_STATS: BaseStats = {
  maxHealth: 140,
  physical: 18,
  elemental: 0,
  armor: 10,
  elementalResistance: 10,
};

const BOSS_1_STATS: BaseStats = {
  maxHealth: 420,
  physical: 16,
  elemental: 6,
  armor: 12,
  elementalResistance: 12,
};

const BOSS_2_STATS: BaseStats = {
  maxHealth: 700,
  physical: 22,
  elemental: 10,
  armor: 16,
  elementalResistance: 16,
};

const BOSS_3_STATS: BaseStats = {
  maxHealth: 1050,
  physical: 28,
  elemental: 14,
  armor: 20,
  elementalResistance: 20,
};

export const opponentAbilities: AbilityDef[] = [
  {
    id: "pipcap-1-basic",
    name: "Cap Bash",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 500,
    recoveryMs: 1000,
    cooldownMs: 0,
  },
  {
    id: "pipcap-2-basic",
    name: "Cap Bash",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 500,
    recoveryMs: 950,
    cooldownMs: 0,
  },
  {
    id: "pipcap-3-basic",
    name: "Cap Bash",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 500,
    recoveryMs: 900,
    cooldownMs: 0,
  },
  {
    id: "boss-1-basic",
    name: "Gore",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 600,
    recoveryMs: 900,
    cooldownMs: 0,
  },
  {
    id: "boss-1-sweep",
    name: "Bramble Sweep",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1.8 }],
    windUpMs: 1200,
    recoveryMs: 900,
    cooldownMs: 10_000,
  },
  {
    id: "boss-2-basic",
    name: "Spore Lash",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 600,
    recoveryMs: 900,
    cooldownMs: 0,
  },
  {
    id: "boss-2-sweep",
    name: "Gloomwave",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1.8 }],
    windUpMs: 1200,
    recoveryMs: 900,
    cooldownMs: 10_000,
  },
  {
    id: "boss-3-basic",
    name: "Thorn Rend",
    classId: "knight",
    slot: "basic",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
    windUpMs: 600,
    recoveryMs: 850,
    cooldownMs: 0,
  },
  {
    id: "boss-3-sweep",
    name: "Nightbloom Wrath",
    classId: "knight",
    slot: "core",
    targeting: { kind: "all-opponents" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 1.8 }],
    windUpMs: 1200,
    recoveryMs: 850,
    cooldownMs: 10_000,
  },
  ...fowlHarvestOpponentAbilities,
];

function pipcap(
  id: string,
  stats: BaseStats,
  basicAbilityId: string,
  xpAward: number,
): OpponentDef {
  return {
    id,
    name: "Pipcap",
    family: "pipcap",
    boss: false,
    base: stats,
    abilityIds: [basicAbilityId],
    xpAward,
    spriteKey: "pipcap",
  };
}

function boss(
  id: string,
  name: string,
  stats: BaseStats,
  basicAbilityId: string,
  sweepAbilityId: string,
  xpAward: number,
  spriteKey: string,
): OpponentDef {
  return {
    id,
    name,
    family: id,
    boss: true,
    base: stats,
    abilityIds: [basicAbilityId, sweepAbilityId],
    xpAward,
    spriteKey,
  };
}

/** Distinct OpponentDefs per roster XP slot; shared stats within a Pipcap tier. */
export const opponents: OpponentDef[] = [
  pipcap("pipcap-1-7a", PIPCAP_1_STATS, "pipcap-1-basic", 7),
  pipcap("pipcap-1-7b", PIPCAP_1_STATS, "pipcap-1-basic", 7),
  pipcap("pipcap-1-6", PIPCAP_1_STATS, "pipcap-1-basic", 6),
  pipcap("pipcap-1-5", PIPCAP_1_STATS, "pipcap-1-basic", 5),

  pipcap("pipcap-2-8a", PIPCAP_2_STATS, "pipcap-2-basic", 8),
  pipcap("pipcap-2-8b", PIPCAP_2_STATS, "pipcap-2-basic", 8),
  pipcap("pipcap-2-7a", PIPCAP_2_STATS, "pipcap-2-basic", 7),
  pipcap("pipcap-2-7b", PIPCAP_2_STATS, "pipcap-2-basic", 7),
  pipcap("pipcap-2-6", PIPCAP_2_STATS, "pipcap-2-basic", 6),

  pipcap("pipcap-3-8", PIPCAP_3_STATS, "pipcap-3-basic", 8),

  boss(
    "boss-1",
    "Bramblehorn",
    BOSS_1_STATS,
    "boss-1-basic",
    "boss-1-sweep",
    60,
    "boss-1",
  ),
  boss(
    "boss-2",
    "Gloomcap Matron",
    BOSS_2_STATS,
    "boss-2-basic",
    "boss-2-sweep",
    90,
    "boss-2",
  ),
  boss(
    "boss-3",
    "Thornmother Vane",
    BOSS_3_STATS,
    "boss-3-basic",
    "boss-3-sweep",
    120,
    "boss-3",
  ),
  ...fowlHarvestOpponents,
];
