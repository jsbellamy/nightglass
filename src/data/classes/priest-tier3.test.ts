import { describe, expect, it } from "vitest";
import { buildClassKitSlice, buildContent } from "../index";
import {
  priestAbilities,
  priestClass,
  priestTier2,
  priestTier3,
  priestTier3Abilities,
} from "./priest";
import { talentTierDefs } from "../../core/talents";

const TIER3_ABILITY_IDS = ["radiant-bulwark", "solar-verdict"] as const;
const TIER3_STAT_IDS = ["zealous-faith", "solar-study"] as const;

function abilityById(id: string) {
  const ability = priestTier3Abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing tier 3 ability ${id}`);
  }
  return ability;
}

describe("Priest Talent Tier 3 exports", () => {
  it("exports Stat Talents with five ranks and exact per-rank modifiers", () => {
    const [zealousFaith, solarStudy] = priestTier3.statRow;
    expect(zealousFaith).toMatchObject({
      id: "zealous-faith",
      name: "Zealous Faith",
      perRank: { percent: { maxHealth: 0.06 } },
      maxRanks: 5,
      iconKey: "zealous-faith",
    });
    expect(solarStudy).toMatchObject({
      id: "solar-study",
      name: "Solar Study",
      perRank: { percent: { elementalPower: 0.06 } },
      maxRanks: 5,
      iconKey: "solar-study",
    });
  });

  it("exports mutually exclusive Ability Talents with approved targeting and effects", () => {
    expect(priestTier3.abilityRow).toEqual([...TIER3_ABILITY_IDS]);

    expect(abilityById("radiant-bulwark")).toEqual({
      id: "radiant-bulwark",
      name: "Radiant Bulwark",
      classId: "priest",
      slot: "talent",
      iconKey: "radiant-bulwark",
      targeting: { kind: "party" },
      effects: [
        { kind: "heal", coefficient: 1.4 },
        { kind: "apply-status", statusId: "sheltered" },
      ],
      windUpMs: 700,
      recoveryMs: 700,
      cooldownMs: 16_000,
      validWhile: "any-ally-missing-health",
    });

    expect(abilityById("solar-verdict")).toEqual({
      id: "solar-verdict",
      name: "Solar Verdict",
      classId: "priest",
      slot: "talent",
      iconKey: "solar-verdict",
      targeting: { kind: "closest-opponent" },
      effects: [
        { kind: "damage", channel: "elemental", element: "light", coefficient: 3.0 },
        { kind: "apply-status", statusId: "exposed" },
      ],
      windUpMs: 850,
      recoveryMs: 700,
      cooldownMs: 14_000,
    });
  });

  it("uses iconKey equal to id for every Tier 3 Stat and Ability Talent", () => {
    for (const statTalent of priestTier3.statRow) {
      expect(statTalent.iconKey).toBe(statTalent.id);
      expect(TIER3_STAT_IDS).toContain(statTalent.id);
    }
    for (const ability of priestTier3Abilities) {
      expect(ability.iconKey).toBe(ability.id);
      expect(TIER3_ABILITY_IDS).toContain(ability.id as (typeof TIER3_ABILITY_IDS)[number]);
    }
  });

  it("is assembled into shipped Class Kit and Content as the third talent tier", () => {
    expect(priestClass.talentTiers).toBeUndefined();
    const shippedPriest = buildContent().classes.find((entry) => entry.id === "priest");
    expect(shippedPriest?.talentTiers).toEqual([priestTier2, priestTier3]);
    expect(talentTierDefs(shippedPriest!)).toEqual([
      priestClass.talents,
      priestTier2,
      priestTier3,
    ]);

    for (const id of TIER3_ABILITY_IDS) {
      expect(priestAbilities.some((ability) => ability.id === id)).toBe(false);
    }
    const shipped = buildContent();
    const classKit = buildClassKitSlice();
    for (const id of TIER3_ABILITY_IDS) {
      expect(shipped.abilities.some((ability) => ability.id === id)).toBe(true);
      expect(classKit.abilities.some((ability) => ability.id === id)).toBe(true);
    }
    expect(classKit.abilities).toHaveLength(42);
    expect(
      classKit.abilities.filter((ability) => ability.classId === "priest" && ability.slot === "talent"),
    ).toHaveLength(6);
  });
});
