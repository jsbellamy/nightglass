import { describe, expect, it } from "vitest";
import { fixtureContent } from "./testing/fixture-content";
import type { ClassKitDef } from "./types";
import {
  allocateTalentPoint,
  deallocateTalentPoint,
  emptyTalentState,
  spentTalentPoints,
  stripAbilityFromLoadout,
  talentStatModifiers,
  totalStatPoints,
} from "./talents";

const knightKit = fixtureContent.classes.find((entry) => entry.id === "knight")!;

const twoTierKnight = {
  ...knightKit,
  talentTiers: [
    {
      statRow: [
        {
          id: "k2-fortitude",
          name: "Fortitude II",
          perRank: { percent: { maxHealth: 0.04 } },
          maxRanks: 5 as const,
          iconKey: "k2-fortitude",
        },
        {
          id: "k2-swordcraft",
          name: "Swordcraft II",
          perRank: { percent: { physicalPower: 0.04 } },
          maxRanks: 5 as const,
          iconKey: "k2-swordcraft",
        },
      ],
      abilityRow: ["k2-hold-line", "k2-falling-star"] as [string, string],
    },
  ],
} satisfies ClassKitDef;

function fillTierOne(state: ReturnType<typeof emptyTalentState>, classKit: ClassKitDef, level: number) {
  for (let rank = 0; rank < 5; rank += 1) {
    allocateTalentPoint(state, classKit, rank % 2 === 0 ? "k-fortitude" : "k-swordcraft", level);
  }
  allocateTalentPoint(state, classKit, "k-hold-line", level);
}

describe("Talent Point budget", () => {
  it("equals the Character Level including Level 1", () => {
    const state = emptyTalentState(knightKit);
    expect(spentTalentPoints(state)).toBe(0);
    expect(() => allocateTalentPoint(state, knightKit, "k-fortitude", 1)).not.toThrow();
    expect(() => allocateTalentPoint(state, knightKit, "k-fortitude", 1)).toThrow(
      /Talent Points remaining/i,
    );
  });
});

describe("Stat Row", () => {
  it("accepts at most five points freely split across both Stat Talents", () => {
    const state = emptyTalentState(knightKit);
    allocateTalentPoint(state, knightKit, "k-fortitude", 5);
    allocateTalentPoint(state, knightKit, "k-fortitude", 5);
    allocateTalentPoint(state, knightKit, "k-fortitude", 5);
    allocateTalentPoint(state, knightKit, "k-swordcraft", 5);
    allocateTalentPoint(state, knightKit, "k-swordcraft", 5);
    expect(totalStatPoints(state.statRanks)).toBe(5);
    expect(() => allocateTalentPoint(state, knightKit, "k-fortitude", 6)).toThrow(/stat row/i);
  });

  it("caps each Stat Talent at five ranks", () => {
    const state = emptyTalentState(knightKit);
    for (let rank = 0; rank < 5; rank += 1) {
      allocateTalentPoint(state, knightKit, "k-fortitude", 6);
    }
    allocateTalentPoint(state, knightKit, "k-hold-line", 6);
    expect(() => allocateTalentPoint(state, knightKit, "k-fortitude", 6)).toThrow(
      /max rank|Talent Points remaining/i,
    );
  });
});

describe("Ability Row", () => {
  it("unlocks on the sixth point and enforces mutual exclusivity", () => {
    const state = emptyTalentState(knightKit);
    for (let rank = 0; rank < 5; rank += 1) {
      allocateTalentPoint(state, knightKit, rank % 2 === 0 ? "k-fortitude" : "k-swordcraft", 6);
    }
    expect(() => allocateTalentPoint(state, knightKit, "k-hold-line", 6)).not.toThrow();
    expect(state.abilityTalentId).toBe("k-hold-line");
    expect(() => allocateTalentPoint(state, knightKit, "k-falling-star", 6)).toThrow(
      /mutually exclusive/i,
    );
  });

  it("requires five Stat Row points before an Ability Talent can be bought", () => {
    const state = emptyTalentState(knightKit);
    allocateTalentPoint(state, knightKit, "k-fortitude", 5);
    allocateTalentPoint(state, knightKit, "k-fortitude", 5);
    allocateTalentPoint(state, knightKit, "k-fortitude", 5);
    allocateTalentPoint(state, knightKit, "k-fortitude", 5);
    expect(() => allocateTalentPoint(state, knightKit, "k-hold-line", 5)).toThrow(/stat row/i);
  });
});

describe("deallocateTalentPoint", () => {
  it("removes Ability Talents before Stat Row can drop below five", () => {
    const state = emptyTalentState(knightKit);
    for (let rank = 0; rank < 5; rank += 1) {
      allocateTalentPoint(state, knightKit, rank % 2 === 0 ? "k-fortitude" : "k-swordcraft", 6);
    }
    allocateTalentPoint(state, knightKit, "k-hold-line", 6);
    expect(() => deallocateTalentPoint(state, knightKit, "k-fortitude", 6)).toThrow(/ability/i);
    deallocateTalentPoint(state, knightKit, "k-hold-line", 6);
    deallocateTalentPoint(state, knightKit, "k-fortitude", 6);
    expect(totalStatPoints(state.statRanks)).toBe(4);
  });

  it("strips a removed Ability Talent from loadout slots", () => {
    const loadout: [string, string, string] = ["k-hold-line", "k-rally", "k-sweep"];
    const stripped = stripAbilityFromLoadout(loadout, "k-hold-line", knightKit);
    expect(stripped).not.toContain("k-hold-line");
    expect(stripped.every((abilityId) => knightKit.coreAbilityIds.includes(abilityId as never))).toBe(
      true,
    );
  });
});

describe("talentStatModifiers", () => {
  it("feeds per-rank modifiers into Power and Max Health math", () => {
    const state = emptyTalentState(knightKit);
    allocateTalentPoint(state, knightKit, "k-fortitude", 2);
    allocateTalentPoint(state, knightKit, "k-fortitude", 2);
    const modifiers = talentStatModifiers(state, knightKit);
    expect(modifiers).toHaveLength(2);
    expect(modifiers[0]).toEqual({ percent: { maxHealth: 0.06 } });
  });
});

describe("two Talent Tiers", () => {
  it("locks Tier 2 until all six Tier 1 points are spent", () => {
    const state = emptyTalentState(twoTierKnight);
    for (let rank = 0; rank < 5; rank += 1) {
      allocateTalentPoint(state, twoTierKnight, "k-fortitude", 12);
    }
    expect(() => allocateTalentPoint(state, twoTierKnight, "k2-fortitude", 12)).toThrow(/locked/i);
    allocateTalentPoint(state, twoTierKnight, "k-hold-line", 12);
    expect(() => allocateTalentPoint(state, twoTierKnight, "k2-fortitude", 12)).not.toThrow();
  });

  it("applies five-plus-one cadence and exclusivity independently in Tier 2", () => {
    const state = emptyTalentState(twoTierKnight);
    fillTierOne(state, twoTierKnight, 12);
    for (let rank = 0; rank < 5; rank += 1) {
      allocateTalentPoint(
        state,
        twoTierKnight,
        rank % 2 === 0 ? "k2-fortitude" : "k2-swordcraft",
        12,
      );
    }
    allocateTalentPoint(state, twoTierKnight, "k2-hold-line", 12);
    expect(state.tierStates[1]!.abilityTalentId).toBe("k2-hold-line");
    expect(() => allocateTalentPoint(state, twoTierKnight, "k2-falling-star", 12)).toThrow(
      /mutually exclusive/i,
    );
  });

  it("blocks Tier 1 reductions while Tier 2 holds points and enforces Tier 2 Stat floor with Ability", () => {
    const state = emptyTalentState(twoTierKnight);
    fillTierOne(state, twoTierKnight, 12);
    allocateTalentPoint(state, twoTierKnight, "k2-fortitude", 12);
    expect(() => deallocateTalentPoint(state, twoTierKnight, "k-fortitude", 12)).toThrow(/clear/i);
    for (let rank = 0; rank < 4; rank += 1) {
      allocateTalentPoint(state, twoTierKnight, "k2-fortitude", 12);
    }
    allocateTalentPoint(state, twoTierKnight, "k2-hold-line", 12);
    expect(() => deallocateTalentPoint(state, twoTierKnight, "k2-fortitude", 12)).toThrow(/ability/i);
  });

  it("caps total spend at Character Level across both Tiers", () => {
    const state = emptyTalentState(twoTierKnight);
    fillTierOne(state, twoTierKnight, 12);
    for (let rank = 0; rank < 5; rank += 1) {
      allocateTalentPoint(
        state,
        twoTierKnight,
        rank % 2 === 0 ? "k2-fortitude" : "k2-swordcraft",
        12,
      );
    }
    allocateTalentPoint(state, twoTierKnight, "k2-hold-line", 12);
    expect(spentTalentPoints(state)).toBe(12);
    expect(() => allocateTalentPoint(state, twoTierKnight, "k2-fortitude", 12)).toThrow(
      /Talent Points remaining/i,
    );
  });

  it("keeps Level 6 behavior unchanged with only Tier 1 available at budget", () => {
    const state = emptyTalentState(twoTierKnight);
    for (let rank = 0; rank < 5; rank += 1) {
      allocateTalentPoint(state, twoTierKnight, "k-fortitude", 6);
    }
    expect(() => allocateTalentPoint(state, twoTierKnight, "k2-fortitude", 6)).toThrow(/locked/i);
    allocateTalentPoint(state, twoTierKnight, "k-hold-line", 6);
    expect(spentTalentPoints(state)).toBe(6);
  });
});
