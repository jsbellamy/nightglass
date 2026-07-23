import { describe, expect, it } from "vitest";
import { previewEffectRaw } from "../core/combat";
import { buildContent } from "../data/index";
import { fixtureContent } from "../core/testing/fixture-content";
import type { StatModifiers } from "../core/types";
import {
  actionCyclePhase,
  formatAbilityChoiceLabel,
  formatAbilityDescription,
  formatCooldownState,
  formatDurationMs,
  formatStatTalentDelta,
} from "./ability-format";
import {
  abilityRawDisplay,
  compareEquipmentStatDeltas,
  formatStatModifierPerRank,
  statLines,
} from "./snapshot-view";

const production = buildContent();
const knightBase = production.classes.find((entry) => entry.id === "knight")!.base;
const hunterBase = production.classes.find((entry) => entry.id === "hunter")!.base;
const priestBase = production.classes.find((entry) => entry.id === "priest")!.base;
const wizardBase = production.classes.find((entry) => entry.id === "wizard")!.base;

function abilityById(content: typeof production, id: string) {
  const ability = content.abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing ability ${id}`);
  }
  return ability;
}

const knightBasic = fixtureContent.abilities.find((entry) => entry.id === "knight-basic")!;

describe("formatDurationMs", () => {
  it("formats whole and fractional seconds for people", () => {
    expect(formatDurationMs(1200)).toBe("1.2s");
    expect(formatDurationMs(6000)).toBe("6s");
    expect(formatDurationMs(15_000)).toBe("15s");
  });
});

describe("formatAbilityDescription", () => {
  it("describes representative Knight, Hunter, and Priest Abilities at base stats", () => {
    expect(
      formatAbilityDescription(
        abilityById(production, "hold-the-line"),
        knightBase,
        production.statuses,
      ),
    ).toBe(
      "Hold the Line: While below 50% Health, grant yourself Hold the Line for 6s: +60 Armor and +30 Elemental Resistance",
    );
    expect(
      formatAbilityDescription(
        abilityById(production, "pommel-break"),
        knightBase,
        production.statuses,
      ),
    ).toBe(
      "Pommel Break: Deal 12 Physical Damage to the closest Opponent and Stun it for 1.2s",
    );
    expect(
      formatAbilityDescription(
        abilityById(production, "twin-fang"),
        hunterBase,
        production.statuses,
      ),
    ).toBe(
      "Twin Fang: Deal 17 then 17 Physical Damage to the closest Opponent",
    );
    expect(
      formatAbilityDescription(
        abilityById(production, "dawn-recall"),
        priestBase,
        production.statuses,
      ),
    ).toBe(
      "Dawn Recall: Revive the first Knocked Out Party Member with 26 Health",
    );
  });

  it("covers every AbilityTargeting variant", () => {
    expect(
      formatAbilityDescription(
        abilityById(production, "sweeping-arc"),
        knightBase,
        production.statuses,
      ),
    ).toContain("all Opponents");
    expect(
      formatAbilityDescription(
        abilityById(production, "shield-brace"),
        knightBase,
        production.statuses,
      ),
    ).toContain("yourself");
    expect(
      formatAbilityDescription(
        abilityById(production, "rallying-guard"),
        knightBase,
        production.statuses,
      ),
    ).toContain("your Party");
    expect(
      formatAbilityDescription(
        abilityById(production, "mending-light"),
        priestBase,
        production.statuses,
      ),
    ).toContain("the lowest-health Party Member");
  });

  it("covers all three validWhile activation conditions", () => {
    expect(
      formatAbilityDescription(
        abilityById(production, "shield-brace"),
        knightBase,
        production.statuses,
      ),
    ).toContain("While you lack Braced");
    expect(
      formatAbilityDescription(
        abilityById(production, "moonwell"),
        priestBase,
        production.statuses,
      ),
    ).toContain("While any Party Member is missing Health");
    expect(
      formatAbilityDescription(
        abilityById(production, "hold-the-line"),
        knightBase,
        production.statuses,
      ),
    ).toContain("While below 50% Health");
  });

  it("describes Scorched tick cadence and mixed damage plus status", () => {
    const wildfire = abilityById(production, "wildfire-sigil");
    const description = formatAbilityDescription(wildfire, wizardBase, production.statuses);
    const tickRaw = previewEffectRaw(
      production.statuses.find((entry) => entry.id === "scorched")!.tickEffect!,
      wizardBase,
    );
    expect(description).toContain("all Opponents");
    expect(description).toMatch(/Scorched/i);
    expect(description).toContain(`${tickRaw} Fire Elemental Damage every 1s`);
  });

  it("never exposes coefficients or Power totals", () => {
    const description = formatAbilityDescription(
      abilityById(production, "pommel-break"),
      knightBase,
      production.statuses,
    );
    expect(description.toLowerCase()).not.toMatch(/\bpower\b/);
    expect(description).not.toMatch(/coefficient|×|0\.\d/);
  });
});

describe("formatAbilityChoiceLabel", () => {
  it("uses compact mechanical summaries with activation conditions", () => {
    expect(
      formatAbilityChoiceLabel(
        abilityById(production, "pommel-break"),
        knightBase,
        production.statuses,
      ),
    ).toBe("Pommel Break — 12 Physical Damage + Stun 1.2s");
    expect(
      formatAbilityChoiceLabel(
        abilityById(production, "twin-fang"),
        hunterBase,
        production.statuses,
      ),
    ).toBe("Twin Fang — 17 + 17 Physical Damage");
    expect(
      formatAbilityChoiceLabel(
        abilityById(production, "shield-brace"),
        knightBase,
        production.statuses,
      ),
    ).toBe("Shield Brace — While you lack Braced, +50 Armor for 5s");
  });
});

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
  const knightBaseFixture = fixtureContent.classes.find((entry) => entry.id === "knight")!.base;

  it("returns physical damage from the first damage effect", () => {
    const display = abilityRawDisplay(knightBasic, knightBaseFixture);
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
