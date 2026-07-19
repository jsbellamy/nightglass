import { describe, expect, it } from "vitest";
import { fixtureContent } from "./testing/fixture-content";
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
