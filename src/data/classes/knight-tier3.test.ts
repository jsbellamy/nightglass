import { describe, expect, it } from "vitest";
import { buildClassKitSlice, buildContent } from "../index";
import {
  knightAbilities,
  knightClass,
  knightTier2,
  knightTier3,
  knightTier3Abilities,
} from "./knight";
import { talentTierDefs } from "../../core/talents";

const TIER3_ABILITY_IDS = ["aegis-wall", "titans-cleave"] as const;
const TIER3_STAT_IDS = ["bulwark", "warblade"] as const;

function abilityById(id: string) {
  const ability = knightTier3Abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing tier 3 ability ${id}`);
  }
  return ability;
}

describe("Knight Talent Tier 3 exports", () => {
  it("exports Stat Talents with five ranks and exact per-rank modifiers", () => {
    const [bulwark, warblade] = knightTier3.statRow;
    expect(bulwark).toMatchObject({
      id: "bulwark",
      name: "Bulwark",
      perRank: { flat: { armor: 5 } },
      maxRanks: 5,
      iconKey: "bulwark",
    });
    expect(warblade).toMatchObject({
      id: "warblade",
      name: "Warblade",
      perRank: { percent: { physicalPower: 0.06 } },
      maxRanks: 5,
      iconKey: "warblade",
    });
  });

  it("exports mutually exclusive Ability Talents with approved targeting and effects", () => {
    expect(knightTier3.abilityRow).toEqual([...TIER3_ABILITY_IDS]);

    expect(abilityById("aegis-wall")).toEqual({
      id: "aegis-wall",
      name: "Aegis Wall",
      classId: "knight",
      slot: "talent",
      iconKey: "aegis-wall",
      targeting: { kind: "party" },
      effects: [
        { kind: "apply-status", statusId: "sheltered" },
        { kind: "apply-status", statusId: "inspired" },
      ],
      windUpMs: 400,
      recoveryMs: 600,
      cooldownMs: 18_000,
    });

    expect(abilityById("titans-cleave")).toEqual({
      id: "titans-cleave",
      name: "Titan's Cleave",
      classId: "knight",
      slot: "talent",
      iconKey: "titans-cleave",
      targeting: { kind: "all-opponents" },
      effects: [
        { kind: "damage", channel: "physical", coefficient: 2.1 },
        { kind: "apply-status", statusId: "exposed" },
      ],
      windUpMs: 800,
      recoveryMs: 800,
      cooldownMs: 15_000,
    });
  });

  it("uses iconKey equal to id for every Tier 3 Stat and Ability Talent", () => {
    for (const statTalent of knightTier3.statRow) {
      expect(statTalent.iconKey).toBe(statTalent.id);
      expect(TIER3_STAT_IDS).toContain(statTalent.id);
    }
    for (const ability of knightTier3Abilities) {
      expect(ability.iconKey).toBe(ability.id);
      expect(TIER3_ABILITY_IDS).toContain(ability.id as (typeof TIER3_ABILITY_IDS)[number]);
    }
  });

  it("is assembled into shipped Class Kit and Content as the third talent tier", () => {
    expect(knightClass.talentTiers).toBeUndefined();
    const shippedKnight = buildContent().classes.find((entry) => entry.id === "knight");
    expect(shippedKnight?.talentTiers).toEqual([knightTier2, knightTier3]);
    expect(talentTierDefs(shippedKnight!)).toEqual([
      knightClass.talents,
      knightTier2,
      knightTier3,
    ]);

    for (const id of TIER3_ABILITY_IDS) {
      expect(knightAbilities.some((ability) => ability.id === id)).toBe(false);
    }
    const shipped = buildContent();
    const classKit = buildClassKitSlice();
    for (const id of TIER3_ABILITY_IDS) {
      expect(shipped.abilities.some((ability) => ability.id === id)).toBe(true);
      expect(classKit.abilities.some((ability) => ability.id === id)).toBe(true);
    }
    expect(classKit.abilities).toHaveLength(40);
    expect(
      classKit.abilities.filter((ability) => ability.classId === "knight" && ability.slot === "talent"),
    ).toHaveLength(6);
  });
});
