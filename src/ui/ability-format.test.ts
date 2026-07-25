import { describe, expect, it } from "vitest";
import { previewEffectRaw, resolveStatModifiers } from "../core/combat";
import { characterStats } from "../core/stats";
import { emptyTalentState } from "../core/talents";
import { buildContent } from "../data/index";
import { fixtureContent } from "../core/testing/fixture-content";
import type { BaseStats, StatModifiers } from "../core/types";
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

function resolvedStats(base: BaseStats) {
  return resolveStatModifiers(base, []);
}

const knightBase = resolvedStats(production.classes.find((entry) => entry.id === "knight")!.base);
const hunterBase = resolvedStats(production.classes.find((entry) => entry.id === "hunter")!.base);
const priestBase = resolvedStats(production.classes.find((entry) => entry.id === "priest")!.base);
const wizardBase = resolvedStats(production.classes.find((entry) => entry.id === "wizard")!.base);

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

  it("describes arc-spark as Fire Elemental Damage when the Wizard has Fire Power", () => {
    const arcSpark = abilityById(production, "arc-spark");
    const wizardKit = production.classes.find((entry) => entry.id === "wizard")!;
    const fireWizard = characterStats(wizardKit, emptyTalentState(wizardKit), [
      { flat: { firePower: 5 } },
    ]);
    const expectedRaw = previewEffectRaw(
      { kind: "damage", channel: "elemental", element: "fire", coefficient: 1 },
      fireWizard,
    );
    expect(expectedRaw).toBe(21);
    expect(
      formatAbilityDescription(arcSpark, fireWizard, production.statuses),
    ).toBe(`Arc Spark: Deal ${expectedRaw} Fire Elemental Damage to the closest Opponent`);
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
      spellPower: 0.04,
      firePower: 0.08,
      frostPower: 0.14,
      lightningPower: 0.2,
      lightPower: 0.28,
    },
    flat: {
      maxHealth: 10,
      physical: 3,
      spell: 2,
      armor: 7,
      elementalResistance: 4,
      firePower: 5,
      frostPower: 6,
      lightningPower: 9,
      lightPower: 12,
      critChance: 0.07,
      critDamage: 0.25,
    },
  };

  it("emits every stat at ranks = 1 with the Stats surface vocabulary", () => {
    expect(statLines(allFields)).toEqual([
      { label: "Max Health", value: "+6%" },
      { label: "Physical Power", value: "+5%" },
      { label: "Spell Power", value: "+4%" },
      { label: "Fire Power", value: "+8%" },
      { label: "Frost Power", value: "+14%" },
      { label: "Lightning Power", value: "+20%" },
      { label: "Light Power", value: "+28%" },
      { label: "Max Health", value: "+10" },
      { label: "Physical Power", value: "+3" },
      { label: "Spell Power", value: "+2" },
      { label: "Armor", value: "+7" },
      { label: "Elemental Resistance", value: "+4" },
      { label: "Fire Power", value: "+5" },
      { label: "Frost Power", value: "+6" },
      { label: "Lightning Power", value: "+9" },
      { label: "Light Power", value: "+12" },
      { label: "Critical Chance", value: "+7%" },
      { label: "Critical Damage", value: "+25%" },
    ]);
  });

  it("scales flat and percent entries when ranks = 5", () => {
    expect(statLines(allFields, 5)).toEqual([
      { label: "Max Health", value: "+30%" },
      { label: "Physical Power", value: "+25%" },
      { label: "Spell Power", value: "+20%" },
      { label: "Fire Power", value: "+40%" },
      { label: "Frost Power", value: "+70%" },
      { label: "Lightning Power", value: "+100%" },
      { label: "Light Power", value: "+140%" },
      { label: "Max Health", value: "+50" },
      { label: "Physical Power", value: "+15" },
      { label: "Spell Power", value: "+10" },
      { label: "Armor", value: "+35" },
      { label: "Elemental Resistance", value: "+20" },
      { label: "Fire Power", value: "+25" },
      { label: "Frost Power", value: "+30" },
      { label: "Lightning Power", value: "+45" },
      { label: "Light Power", value: "+60" },
      { label: "Critical Chance", value: "+35%" },
      { label: "Critical Damage", value: "+125%" },
    ]);
  });

  it("is blind to no stat the Character Stats surface shows", () => {
    const emitted = new Set(statLines(allFields).map((line) => line.label));
    expect([...emitted].sort()).toEqual([
      "Armor",
      "Critical Chance",
      "Critical Damage",
      "Elemental Resistance",
      "Fire Power",
      "Frost Power",
      "Light Power",
      "Lightning Power",
      "Max Health",
      "Physical Power",
      "Spell Power",
    ]);
  });
});

describe("stat label vocabulary across Talent and Armory", () => {
  it("uses the same statistic label on Talents and Armory compare", () => {
    const modifier = { flat: { physical: 5 } } satisfies StatModifiers;
    const talentLabel = statLines(modifier)[0]!.label;
    const armoryDelta = compareEquipmentStatDeltas([], [modifier])[0]!;
    expect(talentLabel).toBe("Physical Power");
    expect(armoryDelta.label).toBe(talentLabel);
    expect(formatStatModifierPerRank(modifier)).toBe("+5 Physical Power");
  });
});

describe("formatStatModifierPerRank and formatStatTalentDelta", () => {
  it("joins statLines for per-rank and ranked totals", () => {
    const modifier = {
      flat: { physical: 2 },
      percent: { physicalPower: 0.1 },
    } satisfies StatModifiers;
    expect(formatStatModifierPerRank(modifier)).toBe("+10% Physical Power, +2 Physical Power");
    expect(formatStatTalentDelta(modifier, 3)).toBe("+30% Physical Power, +6 Physical Power");
    expect(formatStatTalentDelta(modifier, 0)).toBeNull();
  });
});

describe("abilityRawDisplay", () => {
  const knightBaseFixture = resolvedStats(
    fixtureContent.classes.find((entry) => entry.id === "knight")!.base,
  );

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
