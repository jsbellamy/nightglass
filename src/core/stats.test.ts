import { describe, expect, it } from "vitest";
import { REVIEWED_CLASS_BASES } from "../data/fixtures/class-kit-number-contract";
import { emptyTalentState } from "./talents";
import { characterStats } from "./stats";
import { fixtureContent } from "./testing/fixture-content";
import type { ClassTalentState } from "./talents";

const knightContract = REVIEWED_CLASS_BASES.find((entry) => entry.id === "knight")!;
const knightKit = fixtureContent.classes.find((entry) => entry.id === "knight")!;
const wizardKit = fixtureContent.classes.find((entry) => entry.id === "wizard")!;

describe("characterStats", () => {
  it("matches reviewed Level 1 Knight bases with no Talents or Equipment", () => {
    const talentState = emptyTalentState(knightKit);
    expect(characterStats(knightKit, talentState)).toEqual(knightContract.base);
  });

  it("derives Knight maxHealth after five Fortitude ranks (reviewed 6% per rank on 180 base)", () => {
    const talentState: ClassTalentState = {
      ...emptyTalentState(knightKit),
      statRanks: { "k-fortitude": 5, "k-swordcraft": 0 },
    };
    const stats = characterStats(knightKit, talentState);
    expect(stats.maxHealth).toBe(234);
    expect(stats.physical).toBe(14);
  });

  it("applies flat-then-percent ordering when flat and percentage bonuses target the same statistic", () => {
    const talentState = emptyTalentState(knightKit);
    const stats = characterStats(knightKit, talentState, [
      { flat: { physical: 6 } },
      { percent: { physicalPower: 0.1 } },
    ]);
    expect(stats.physical).toBe(22);
  });
});

describe("characterStats wizard talents", () => {
  it("derives Wizard stats from reviewed Level 1 base with mixed Talent ranks", () => {
    const talentState: ClassTalentState = {
      ...emptyTalentState(wizardKit),
      statRanks: { "w-elemental-practice": 3, "w-warding-lore": 2 },
    };
    const stats = characterStats(wizardKit, talentState);
    expect(stats.elemental).toBe(18);
    expect(stats.elementalResistance).toBe(32);
  });
});
