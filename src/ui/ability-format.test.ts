import { describe, expect, it } from "vitest";
import { fixtureContent } from "../core/testing/fixture-content";
import type { StatModifiers } from "../core/types";
import {
  actionCyclePhase,
  formatCooldownState,
  formatStatTalentDelta,
} from "./ability-format";
import {
  abilityRawDisplay,
  compareEquipmentStatDeltas,
  formatStatModifierPerRank,
  statLines,
} from "./snapshot-view";

const knightBasic = fixtureContent.abilities.find((entry) => entry.id === "knight-basic")!;

describe("statLines", () => {
  const allFields: StatModifiers = {
    percent: {
      maxHealth: 0.06,
      physicalPower: 0.05,
      elementalPower: 0.04,
    },
    flat: {
      maxHealth: 10,
      physical: 3,
      elemental: 2,
      armor: 7,
      elementalResistance: 4,
    },
  };

  it("emits all eight fields at ranks = 1 with Talent labels", () => {
    expect(statLines(allFields)).toEqual([
      { label: "Max Health", value: "+6%" },
      { label: "Physical", value: "+5%" },
      { label: "Elemental", value: "+4%" },
      { label: "Max Health", value: "+10" },
      { label: "Physical", value: "+3" },
      { label: "Elemental", value: "+2" },
      { label: "Armor", value: "+7" },
      { label: "Elemental Resistance", value: "+4" },
    ]);
  });

  it("scales flat and percent entries when ranks = 5", () => {
    expect(statLines(allFields, 5)).toEqual([
      { label: "Max Health", value: "+30%" },
      { label: "Physical", value: "+25%" },
      { label: "Elemental", value: "+20%" },
      { label: "Max Health", value: "+50" },
      { label: "Physical", value: "+15" },
      { label: "Elemental", value: "+10" },
      { label: "Armor", value: "+35" },
      { label: "Elemental Resistance", value: "+20" },
    ]);
  });
});

describe("stat label vocabulary across Talent and Armory", () => {
  it("uses the same statistic label on Talents and Armory compare", () => {
    const modifier = { flat: { physical: 5 } } satisfies StatModifiers;
    const talentLabel = statLines(modifier)[0]!.label;
    const armoryDelta = compareEquipmentStatDeltas([], [modifier])[0]!;
    expect(talentLabel).toBe("Physical");
    expect(armoryDelta.label).toBe(talentLabel);
    expect(formatStatModifierPerRank(modifier)).toBe("+5 Physical");
  });
});

describe("formatStatModifierPerRank and formatStatTalentDelta", () => {
  it("joins statLines for per-rank and ranked totals", () => {
    const modifier = {
      flat: { physical: 2 },
      percent: { physicalPower: 0.1 },
    } satisfies StatModifiers;
    expect(formatStatModifierPerRank(modifier)).toBe("+10% Physical, +2 Physical");
    expect(formatStatTalentDelta(modifier, 3)).toBe("+30% Physical, +6 Physical");
    expect(formatStatTalentDelta(modifier, 0)).toBeNull();
  });
});

describe("abilityRawDisplay", () => {
  const knightBase = fixtureContent.classes.find((entry) => entry.id === "knight")!.base;

  it("returns physical damage from the first damage effect", () => {
    const display = abilityRawDisplay(knightBasic, knightBase);
    expect(display).toEqual({ kind: "damage", value: 14, channel: "physical" });
  });
});

describe("formatCooldownState", () => {
  it("reports ready and remaining cooldown", () => {
    expect(formatCooldownState(1_000, 1_000)).toBe("Ready");
    expect(formatCooldownState(1_500, 1_000)).toBe("500ms remaining");
  });
});

describe("actionCyclePhase", () => {
  const action = {
    abilityId: "k-strike",
    startedAtMs: 0,
    impactAtMs: 350,
    endsAtMs: 700,
    targetIds: [],
    impactResolved: false,
  };

  it("steps through wind-up, impact, recovery, and idle", () => {
    expect(actionCyclePhase(action, 100)).toBe("Wind-up");
    expect(actionCyclePhase(action, 350)).toBe("Impact");
    expect(actionCyclePhase({ ...action, impactResolved: true }, 400)).toBe("Recovery");
    expect(actionCyclePhase({ ...action, impactResolved: true }, 700)).toBeNull();
  });
});
