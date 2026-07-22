import { describe, expect, it } from "vitest";
import { buildClassKitSlice, buildContent } from "../index";
import {
  knightAbilities,
  knightClass,
  knightTier2,
  knightTier2Abilities,
} from "./knight";
import { talentTierDefs } from "../../core/talents";

const TIER2_ABILITY_IDS = ["vanguard", "sundering-charge"] as const;
const TIER2_STAT_IDS = ["iron-discipline", "veterans-edge"] as const;

function abilityById(id: string) {
  const ability = knightTier2Abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing tier 2 ability ${id}`);
  }
  return ability;
}

describe("Knight Talent Tier 2 exports", () => {
  it("exports Stat Talents with five ranks and exact per-rank modifiers", () => {
    const [ironDiscipline, veteransEdge] = knightTier2.statRow;
    expect(ironDiscipline).toMatchObject({
      id: "iron-discipline",
      name: "Iron Discipline",
      perRank: { flat: { armor: 4 } },
      maxRanks: 5,
      iconKey: "iron-discipline",
    });
    expect(veteransEdge).toMatchObject({
      id: "veterans-edge",
      name: "Veteran’s Edge",
      perRank: { percent: { physicalPower: 0.05 } },
      maxRanks: 5,
      iconKey: "veterans-edge",
    });
  });

  it("exports mutually exclusive Ability Talents with approved targeting and effects", () => {
    expect(knightTier2.abilityRow).toEqual([...TIER2_ABILITY_IDS]);

    expect(abilityById("vanguard")).toEqual({
      id: "vanguard",
      name: "Vanguard",
      classId: "knight",
      slot: "talent",
      iconKey: "vanguard",
      targeting: { kind: "party" },
      effects: [
        { kind: "apply-status", statusId: "guarded" },
        { kind: "apply-status", statusId: "inspired" },
      ],
      windUpMs: 400,
      recoveryMs: 600,
      cooldownMs: 16_000,
    });

    expect(abilityById("sundering-charge")).toEqual({
      id: "sundering-charge",
      name: "Sundering Charge",
      classId: "knight",
      slot: "talent",
      iconKey: "sundering-charge",
      targeting: { kind: "closest-opponent" },
      effects: [
        { kind: "damage", channel: "physical", coefficient: 1.8 },
        { kind: "apply-status", statusId: "exposed" },
      ],
      windUpMs: 700,
      recoveryMs: 700,
      cooldownMs: 13_000,
    });
  });

  it("uses iconKey equal to id for every Tier 2 Stat and Ability Talent", () => {
    for (const statTalent of knightTier2.statRow) {
      expect(statTalent.iconKey).toBe(statTalent.id);
      expect(TIER2_STAT_IDS).toContain(statTalent.id);
    }
    for (const ability of knightTier2Abilities) {
      expect(ability.iconKey).toBe(ability.id);
      expect(TIER2_ABILITY_IDS).toContain(ability.id as (typeof TIER2_ABILITY_IDS)[number]);
    }
  });

  it("is assembled into shipped Class Kit and Content", () => {
    expect(knightClass.talentTiers).toBeUndefined();
    const shippedKnight = buildContent().classes.find((entry) => entry.id === "knight");
    expect(shippedKnight?.talentTiers).toEqual([knightTier2]);
    expect(talentTierDefs(shippedKnight!)).toEqual([knightClass.talents, knightTier2]);

    for (const id of TIER2_ABILITY_IDS) {
      expect(knightAbilities.some((ability) => ability.id === id)).toBe(false);
    }
    const shipped = buildContent();
    const classKit = buildClassKitSlice();
    for (const id of TIER2_ABILITY_IDS) {
      expect(shipped.abilities.some((ability) => ability.id === id)).toBe(true);
      expect(classKit.abilities.some((ability) => ability.id === id)).toBe(true);
    }
    expect(classKit.abilities).toHaveLength(36);
    expect(
      classKit.abilities.filter((ability) => ability.classId === "knight" && ability.slot === "talent"),
    ).toHaveLength(4);
  });
});
