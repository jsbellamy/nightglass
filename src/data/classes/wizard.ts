import type { AbilityDef, ClassKitDef, TalentTierDef } from "../../core/types";

export const wizardAbilities: AbilityDef[] = [
  {
    id: "arc-spark",
    name: "Arc Spark",
    classId: "wizard",
    slot: "basic",
    iconKey: "arc-spark",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "elemental", element: "lightning", coefficient: 1 }],
    windUpMs: 450,
    recoveryMs: 750,
    cooldownMs: 0,
  },
  {
    id: "cinder-bloom",
    name: "Cinder Bloom",
    classId: "wizard",
    slot: "core",
    iconKey: "cinder-bloom",
    targeting: { kind: "all-opponents" },
    effects: [{ kind: "damage", channel: "elemental", element: "fire", coefficient: 0.8 }],
    windUpMs: 600,
    recoveryMs: 700,
    cooldownMs: 7000,
  },
  {
    id: "frost-lance",
    name: "Frost Lance",
    classId: "wizard",
    slot: "core",
    iconKey: "frost-lance",
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "elemental", element: "frost", coefficient: 1.8 }],
    windUpMs: 800,
    recoveryMs: 600,
    cooldownMs: 8000,
  },
  {
    id: "prism-ward",
    name: "Prism Ward",
    classId: "wizard",
    slot: "core",
    iconKey: "prism-ward",
    targeting: { kind: "party" },
    effects: [{ kind: "apply-status", statusId: "warded" }],
    windUpMs: 300,
    recoveryMs: 500,
    cooldownMs: 12000,
    validWhile: "status-absent",
  },
  {
    id: "thunder-ring",
    name: "Thunder Ring",
    classId: "wizard",
    slot: "core",
    iconKey: "thunder-ring",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "lightning", coefficient: 0.6 },
      { kind: "apply-status", statusId: "stun", stunMs: 1000 },
    ],
    windUpMs: 500,
    recoveryMs: 800,
    cooldownMs: 11000,
  },
  {
    id: "starfall",
    name: "Starfall",
    classId: "wizard",
    slot: "talent",
    iconKey: "starfall",
    targeting: { kind: "all-opponents" },
    effects: [{ kind: "damage", channel: "elemental", element: "fire", coefficient: 1.6 }],
    windUpMs: 900,
    recoveryMs: 800,
    cooldownMs: 14000,
  },
  {
    id: "prismatic-shelter",
    name: "Prismatic Shelter",
    classId: "wizard",
    slot: "talent",
    iconKey: "prismatic-shelter",
    targeting: { kind: "party" },
    effects: [{ kind: "apply-status", statusId: "sheltered" }],
    windUpMs: 400,
    recoveryMs: 600,
    cooldownMs: 15000,
  },
];

export const wizardTier2Abilities: AbilityDef[] = [
  {
    id: "wildfire-sigil",
    name: "Wildfire Sigil",
    classId: "wizard",
    slot: "talent",
    iconKey: "wildfire-sigil",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "fire", coefficient: 0.9 },
      { kind: "apply-status", statusId: "scorched" },
    ],
    windUpMs: 700,
    recoveryMs: 700,
    cooldownMs: 14_000,
  },
  {
    id: "absolute-zero",
    name: "Absolute Zero",
    classId: "wizard",
    slot: "talent",
    iconKey: "absolute-zero",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.65 },
      { kind: "apply-status", statusId: "stun", stunMs: 1_000 },
    ],
    windUpMs: 650,
    recoveryMs: 750,
    cooldownMs: 15_000,
  },
];

export const wizardTier2: TalentTierDef = {
  statRow: [
    {
      id: "leyline-attunement",
      name: "Leyline Attunement",
      perRank: { flat: { elemental: 2 } },
      maxRanks: 5,
      iconKey: "leyline-attunement",
    },
    {
      id: "glassweave",
      name: "Glassweave",
      perRank: { percent: { maxHealth: 0.05 } },
      maxRanks: 5,
      iconKey: "glassweave",
    },
  ],
  abilityRow: ["wildfire-sigil", "absolute-zero"],
};

export const wizardTier3Abilities: AbilityDef[] = [
  {
    id: "comet-fall",
    name: "Comet Fall",
    classId: "wizard",
    slot: "talent",
    iconKey: "comet-fall",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "fire", coefficient: 2.0 },
      { kind: "apply-status", statusId: "scorched" },
    ],
    windUpMs: 900,
    recoveryMs: 800,
    cooldownMs: 16_000,
  },
  {
    id: "glacial-prison",
    name: "Glacial Prison",
    classId: "wizard",
    slot: "talent",
    iconKey: "glacial-prison",
    targeting: { kind: "all-opponents" },
    effects: [
      { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.7 },
      { kind: "apply-status", statusId: "stun", stunMs: 1_500 },
    ],
    windUpMs: 700,
    recoveryMs: 800,
    cooldownMs: 17_000,
  },
];

export const wizardTier3: TalentTierDef = {
  statRow: [
    {
      id: "arcane-overflow",
      name: "Arcane Overflow",
      perRank: { percent: { elementalPower: 0.06 } },
      maxRanks: 5,
      iconKey: "arcane-overflow",
    },
    {
      id: "runeward",
      name: "Runeward",
      perRank: { flat: { elementalResistance: 5 } },
      maxRanks: 5,
      iconKey: "runeward",
    },
  ],
  abilityRow: ["comet-fall", "glacial-prison"],
};

export const wizardClass: ClassKitDef = {
  id: "wizard",
  name: "Wizard",
  base: {
    maxHealth: 100,
    physical: 4,
    elemental: 16,
    armor: 10,
    elementalResistance: 24,
  },
  basicAbilityId: "arc-spark",
  coreAbilityIds: ["cinder-bloom", "frost-lance", "prism-ward", "thunder-ring"],
  defaultLoadout: ["prism-ward", "frost-lance", "cinder-bloom"],
  talents: {
    statRow: [
      {
        id: "elemental-practice",
        name: "Elemental Practice",
        perRank: { percent: { elementalPower: 0.05 } },
        maxRanks: 5,
        iconKey: "elemental-practice",
      },
      {
        id: "warding-lore",
        name: "Warding Lore",
        perRank: { flat: { elementalResistance: 4 } },
        maxRanks: 5,
        iconKey: "warding-lore",
      },
    ],
    abilityRow: ["starfall", "prismatic-shelter"],
  },
};
