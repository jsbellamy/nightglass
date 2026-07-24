import { describe, expect, it } from "vitest";
import { buildClassKitSlice, buildContent } from "../index";
import {
  hunterAbilities,
  hunterClass,
  hunterTier2,
  hunterTier3,
  hunterTier3Abilities,
} from "./hunter";
import { talentTierDefs } from "../../core/talents";

const TIER3_ABILITY_IDS = ["death-rain", "killshot"] as const;
const TIER3_STAT_IDS = ["master-fletcher", "trailhardened"] as const;

function abilityById(id: string) {
  const ability = hunterTier3Abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing tier 3 ability ${id}`);
  }
  return ability;
}

describe("Hunter Talent Tier 3 exports", () => {
  it("exports Stat Talents with five ranks and exact per-rank modifiers", () => {
    const [masterFletcher, trailhardened] = hunterTier3.statRow;
    expect(masterFletcher).toMatchObject({
      id: "master-fletcher",
      name: "Master Fletcher",
      perRank: { percent: { physicalPower: 0.06 } },
      maxRanks: 5,
      iconKey: "master-fletcher",
    });
    expect(trailhardened).toMatchObject({
      id: "trailhardened",
      name: "Trailhardened",
      perRank: { flat: { armor: 5 } },
      maxRanks: 5,
      iconKey: "trailhardened",
    });
  });

  it("exports mutually exclusive Ability Talents with approved targeting and effects", () => {
    expect(hunterTier3.abilityRow).toEqual([...TIER3_ABILITY_IDS]);

    expect(abilityById("death-rain")).toEqual({
      id: "death-rain",
      name: "Death Rain",
      classId: "hunter",
      slot: "talent",
      iconKey: "death-rain",
      targeting: { kind: "all-opponents" },
      effects: [
        { kind: "damage", channel: "physical", coefficient: 1.0 },
        { kind: "apply-status", statusId: "riven" },
      ],
      windUpMs: 700,
      recoveryMs: 700,
      cooldownMs: 15_000,
    });

    expect(abilityById("killshot")).toEqual({
      id: "killshot",
      name: "Killshot",
      classId: "hunter",
      slot: "talent",
      iconKey: "killshot",
      targeting: { kind: "closest-opponent" },
      effects: [{ kind: "damage", channel: "physical", coefficient: 3.4 }],
      windUpMs: 900,
      recoveryMs: 650,
      cooldownMs: 14_000,
    });
  });

  it("uses iconKey equal to id for every Tier 3 Stat and Ability Talent", () => {
    for (const statTalent of hunterTier3.statRow) {
      expect(statTalent.iconKey).toBe(statTalent.id);
      expect(TIER3_STAT_IDS).toContain(statTalent.id);
    }
    for (const ability of hunterTier3Abilities) {
      expect(ability.iconKey).toBe(ability.id);
      expect(TIER3_ABILITY_IDS).toContain(ability.id as (typeof TIER3_ABILITY_IDS)[number]);
    }
  });

  it("is assembled into shipped Class Kit and Content as the third talent tier", () => {
    expect(hunterClass.talentTiers).toBeUndefined();
    const shippedHunter = buildContent().classes.find((entry) => entry.id === "hunter");
    expect(shippedHunter?.talentTiers).toEqual([hunterTier2, hunterTier3]);
    expect(talentTierDefs(shippedHunter!)).toEqual([
      hunterClass.talents,
      hunterTier2,
      hunterTier3,
    ]);

    for (const id of TIER3_ABILITY_IDS) {
      expect(hunterAbilities.some((ability) => ability.id === id)).toBe(false);
    }
    const shipped = buildContent();
    const classKit = buildClassKitSlice();
    for (const id of TIER3_ABILITY_IDS) {
      expect(shipped.abilities.some((ability) => ability.id === id)).toBe(true);
      expect(classKit.abilities.some((ability) => ability.id === id)).toBe(true);
    }
    expect(classKit.abilities).toHaveLength(44);
    expect(
      classKit.abilities.filter((ability) => ability.classId === "hunter" && ability.slot === "talent"),
    ).toHaveLength(6);
  });
});
