import { describe, expect, it } from "vitest";
import { buildClassKitSlice, buildContent } from "../index";
import {
  wizardAbilities,
  wizardClass,
  wizardTier2,
  wizardTier3,
  wizardTier3Abilities,
} from "./wizard";
import { talentTierDefs } from "../../core/talents";

const TIER3_ABILITY_IDS = ["comet-fall", "glacial-prison"] as const;
const TIER3_STAT_IDS = ["arcane-overflow", "runeward"] as const;

function abilityById(id: string) {
  const ability = wizardTier3Abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing tier 3 ability ${id}`);
  }
  return ability;
}

describe("Wizard Talent Tier 3 exports", () => {
  it("exports Stat Talents with five ranks and exact per-rank modifiers", () => {
    const [arcaneOverflow, runeward] = wizardTier3.statRow;
    expect(arcaneOverflow).toMatchObject({
      id: "arcane-overflow",
      name: "Arcane Overflow",
      perRank: { percent: { elementalPower: 0.06 } },
      maxRanks: 5,
      iconKey: "arcane-overflow",
    });
    expect(runeward).toMatchObject({
      id: "runeward",
      name: "Runeward",
      perRank: { flat: { elementalResistance: 5 } },
      maxRanks: 5,
      iconKey: "runeward",
    });
  });

  it("exports mutually exclusive Ability Talents with approved targeting and effects", () => {
    expect(wizardTier3.abilityRow).toEqual([...TIER3_ABILITY_IDS]);

    expect(abilityById("comet-fall")).toEqual({
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
    });

    expect(abilityById("glacial-prison")).toEqual({
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
    });
  });

  it("uses iconKey equal to id for every Tier 3 Stat and Ability Talent", () => {
    for (const statTalent of wizardTier3.statRow) {
      expect(statTalent.iconKey).toBe(statTalent.id);
      expect(TIER3_STAT_IDS).toContain(statTalent.id);
    }
    for (const ability of wizardTier3Abilities) {
      expect(ability.iconKey).toBe(ability.id);
      expect(TIER3_ABILITY_IDS).toContain(ability.id as (typeof TIER3_ABILITY_IDS)[number]);
    }
  });

  it("is assembled into shipped Class Kit and Content as the third talent tier", () => {
    expect(wizardClass.talentTiers).toBeUndefined();
    const shippedWizard = buildContent().classes.find((entry) => entry.id === "wizard");
    expect(shippedWizard?.talentTiers).toEqual([wizardTier2, wizardTier3]);
    expect(talentTierDefs(shippedWizard!)).toEqual([
      wizardClass.talents,
      wizardTier2,
      wizardTier3,
    ]);

    for (const id of TIER3_ABILITY_IDS) {
      expect(wizardAbilities.some((ability) => ability.id === id)).toBe(false);
    }
    const shipped = buildContent();
    const classKit = buildClassKitSlice();
    for (const id of TIER3_ABILITY_IDS) {
      expect(shipped.abilities.some((ability) => ability.id === id)).toBe(true);
      expect(classKit.abilities.some((ability) => ability.id === id)).toBe(true);
    }
    expect(classKit.abilities).toHaveLength(40);
    expect(
      classKit.abilities.filter((ability) => ability.classId === "wizard" && ability.slot === "talent"),
    ).toHaveLength(6);
  });
});
