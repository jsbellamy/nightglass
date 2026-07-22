import { describe, expect, it } from "vitest";
import type { AbilityDef, TalentTierDef } from "../../core/types";
import { isRegisteredIconKey } from "../../ui/icons";
import { buildContent } from "../index";
import {
  wizardAbilities,
  wizardClass,
  wizardTier2,
  wizardTier2Abilities,
} from "./wizard";

const EXPECTED_WIZARD_TIER2_ABILITIES: AbilityDef[] = [
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

const EXPECTED_WIZARD_TIER2: TalentTierDef = {
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

const TIER2_ABILITY_IDS = ["wildfire-sigil", "absolute-zero"] as const;
const TIER2_ICON_KEYS = [
  "wildfire-sigil",
  "absolute-zero",
  "leyline-attunement",
  "glassweave",
] as const;

describe("inactive Wizard Talent Tier 2 exports", () => {
  it("matches the approved Ability and Talent Tier definitions", () => {
    expect(wizardTier2Abilities).toEqual(EXPECTED_WIZARD_TIER2_ABILITIES);
    expect(wizardTier2).toEqual(EXPECTED_WIZARD_TIER2);
  });

  it("defines five-rank Stat Talents with the approved modifiers and icon keys", () => {
    const [leyline, glassweave] = wizardTier2.statRow;
    expect(leyline).toMatchObject({
      id: "leyline-attunement",
      perRank: { flat: { elemental: 2 } },
      maxRanks: 5,
      iconKey: "leyline-attunement",
    });
    expect(glassweave).toMatchObject({
      id: "glassweave",
      perRank: { percent: { maxHealth: 0.05 } },
      maxRanks: 5,
      iconKey: "glassweave",
    });
  });

  it("defines mutually exclusive all-opponent Ability Talents in the Tier 2 Ability Row", () => {
    expect(wizardTier2.abilityRow).toEqual([...TIER2_ABILITY_IDS]);
    const wildfire = wizardTier2Abilities.find((a) => a.id === "wildfire-sigil");
    const absoluteZero = wizardTier2Abilities.find((a) => a.id === "absolute-zero");
    expect(wildfire).toMatchObject({
      slot: "talent",
      iconKey: "wildfire-sigil",
      targeting: { kind: "all-opponents" },
    });
    expect(wildfire?.effects).toEqual([
      { kind: "damage", channel: "elemental", element: "fire", coefficient: 0.9 },
      { kind: "apply-status", statusId: "scorched" },
    ]);
    expect(absoluteZero).toMatchObject({
      slot: "talent",
      iconKey: "absolute-zero",
      targeting: { kind: "all-opponents" },
    });
    expect(absoluteZero?.effects).toEqual([
      { kind: "damage", channel: "elemental", element: "frost", coefficient: 0.65 },
      { kind: "apply-status", statusId: "stun", stunMs: 1_000 },
    ]);
  });

  it("leaves shipped Class Kit and Content unchanged during the inactive interim", () => {
    const content = buildContent();
    for (const id of TIER2_ABILITY_IDS) {
      expect(wizardAbilities.some((ability) => ability.id === id)).toBe(false);
      expect(content.abilities.some((ability) => ability.id === id)).toBe(false);
    }
    expect(wizardClass.talentTiers).toBeUndefined();
    expect(wizardClass.talents).toEqual({
      statRow: wizardClass.talents.statRow,
      abilityRow: ["starfall", "prismatic-shelter"],
    });
    for (const iconKey of TIER2_ICON_KEYS) {
      expect(isRegisteredIconKey(iconKey)).toBe(false);
    }
  });
});
