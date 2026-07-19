import { describe, expect, it } from "vitest";
import {
  applyStatModifiers,
  chooseFirstValidAbility,
  effectiveStats,
  hasValidTarget,
  healAmount,
  isAbilityValid,
  mitigateDamage,
  partyAbilityCandidates,
  powerForStats,
  rawFromCoefficient,
  revalidateTargets,
  selectFirstKnockedOutAlly,
  selectLowestHealthAlly,
  shouldApplyStun,
} from "./combat";
import type { CombatantState } from "./snapshot";
import { fixtureContent } from "./testing/fixture-content";
import type { AbilityDef, BaseStats } from "./types";

const abilitiesById = new Map(fixtureContent.abilities.map((ability) => [ability.id, ability]));
const statusesById = new Map(fixtureContent.statuses.map((status) => [status.id, status]));
const knightKit = fixtureContent.classes.find((entry) => entry.id === "knight")!;

function partyCombatant(
  classId: string,
  slot: "front" | "middle" | "back",
  overrides: Partial<CombatantState> = {},
): CombatantState {
  return {
    entityId: `party:${classId}:${slot}`,
    side: "party",
    defId: classId,
    health: 100,
    maxHealth: 100,
    knockedOut: false,
    action: null,
    cooldownReadyAtMs: {},
    statuses: [],
    ...overrides,
  };
}

function opponentCombatant(id: string, overrides: Partial<CombatantState> = {}): CombatantState {
  return {
    entityId: `opp:1:0`,
    side: "opponent",
    defId: id,
    health: 40,
    maxHealth: 40,
    knockedOut: false,
    action: null,
    cooldownReadyAtMs: {},
    statuses: [],
    ...overrides,
  };
}

describe("mitigation formula", () => {
  it("uses max(1, floor(raw × 100 / (100 + mitigation))) with mitigation clamped ≥ 0", () => {
    expect(mitigateDamage(100, 100)).toBe(50);
    expect(mitigateDamage(100, -20)).toBe(100);
    expect(mitigateDamage(1, 0)).toBe(1);
    expect(mitigateDamage(50, 200)).toBe(16);
  });
});

describe("Power math", () => {
  const base: BaseStats = {
    maxHealth: 180,
    physical: 14,
    elemental: 16,
    armor: 30,
    elementalResistance: 12,
  };

  it("applies floor((base + flat) × (1 + summed%)) before floor(Power × coefficient)", () => {
    const stats = applyStatModifiers(base, [
      { flat: { physical: 6 } },
      { percent: { physicalPower: 0.1 } },
      { percent: { physicalPower: 0.05 } },
    ]);
    expect(stats.physical).toBe(Math.floor((14 + 6) * 1.15));
    expect(rawFromCoefficient(powerForStats(stats, "physical"), 0.9)).toBe(
      Math.floor(Math.floor((14 + 6) * 1.15) * 0.9),
    );
  });

  it("combines flat modifiers before summed percentage modifiers", () => {
    const stats = effectiveStats(
      base,
      [{ statusId: "braced", expiresAtMs: 10_000 }],
      statusesById,
    );
    expect(stats.armor).toBe(80);
  });
});

describe("first-valid slot priority", () => {
  it("falls through to the free basic attack when loadout Abilities are invalid", () => {
    const combatants = [
      partyCombatant("knight", "front", {
        health: 180,
        maxHealth: 180,
        statuses: [{ statusId: "braced", expiresAtMs: 10_000 }],
        cooldownReadyAtMs: {
          "k-shield-brace": 50_000,
          "k-rally": 50_000,
          "k-sweep": 50_000,
        },
      }),
      opponentCombatant("fixture-grunt"),
    ];
    const loadout: [string, string, string] = ["k-shield-brace", "k-rally", "k-sweep"];
    const candidates = partyAbilityCandidates(
      fixtureContent,
      knightKit,
      loadout,
      abilitiesById,
    );
    const chosen = chooseFirstValidAbility(candidates, combatants[0]!, combatants, 0);
    expect(chosen?.slot).toBe("basic");
  });
});

describe("validWhile gates", () => {
  it("blocks buff Abilities while their Status Effect is present", () => {
    const ability = abilitiesById.get("k-shield-brace")!;
    const actor = partyCombatant("knight", "front", {
      statuses: [{ statusId: "braced", expiresAtMs: 5_000 }],
    });
    expect(isAbilityValid(ability, actor, [actor])).toBe(false);
  });

  it("requires any ally missing health for Moonwell", () => {
    const ability = abilitiesById.get("p-moonwell")!;
    const priest = partyCombatant("priest", "middle", { health: 110, maxHealth: 110 });
    const knight = partyCombatant("knight", "front", { health: 180, maxHealth: 180 });
    expect(isAbilityValid(ability, priest, [knight, priest])).toBe(false);
    knight.health = 150;
    expect(isAbilityValid(ability, priest, [knight, priest])).toBe(true);
  });
});

describe("heal targeting", () => {
  it("picks the lowest health percentage among living allies with Front→Middle→Back ties", () => {
    const combatants = [
      partyCombatant("knight", "front", { health: 90, maxHealth: 180 }),
      partyCombatant("wizard", "middle", { health: 40, maxHealth: 100 }),
      partyCombatant("priest", "back", { health: 55, maxHealth: 110 }),
    ];
    const priest = combatants[2]!;
    expect(selectLowestHealthAlly(priest, combatants)?.defId).toBe("wizard");

    combatants[1]!.health = 55;
    expect(selectLowestHealthAlly(priest, combatants)?.defId).toBe("knight");
  });
});

describe("revival targeting", () => {
  it("targets the first Knocked Out ally by Formation order", () => {
    const combatants = [
      partyCombatant("knight", "front", { knockedOut: true, health: 0 }),
      partyCombatant("wizard", "middle", { knockedOut: true, health: 0 }),
      partyCombatant("priest", "back"),
    ];
    const priest = combatants[2]!;
    expect(selectFirstKnockedOutAlly(priest, combatants)?.defId).toBe("knight");
  });
});

describe("retarget once", () => {
  it("retargets once at Impact and fails when no replacement exists", () => {
    const actor = partyCombatant("knight", "front");
    const original = opponentCombatant("fixture-grunt");
    const deadTarget = { ...original, knockedOut: true, health: 0 };
    const living = opponentCombatant("fixture-grunt", { entityId: "opp:1:1" });

    const retargeted = revalidateTargets(
      { kind: "closest-opponent" },
      actor,
      [actor, deadTarget, living],
      [deadTarget.entityId],
    );
    expect(retargeted[0]?.entityId).toBe(living.entityId);

    const failed = revalidateTargets(
      { kind: "closest-opponent" },
      actor,
      [actor, deadTarget],
      [deadTarget.entityId],
    );
    expect(failed).toHaveLength(0);
  });
});

describe("healing", () => {
  it("ignores mitigation and cannot overheal", () => {
    const power = 14;
    expect(healAmount(power, { kind: "heal", coefficient: 0.8 })).toBe(11);
  });
});

describe("Stun immunity", () => {
  it("prevents Stun on Boss opponents", () => {
    const boss = opponentCombatant("fixture-boss");
    expect(shouldApplyStun(boss, new Map(fixtureContent.opponents.map((o) => [o.id, o])))).toBe(
      false,
    );
    const grunt = opponentCombatant("fixture-grunt");
    expect(shouldApplyStun(grunt, new Map(fixtureContent.opponents.map((o) => [o.id, o])))).toBe(
      true,
    );
  });
});

describe("revival requires a knocked-out ally", () => {
  it("has no valid target when no ally is Knocked Out", () => {
    const ability = abilitiesById.get("p-resurgence") as AbilityDef;
    const priest = partyCombatant("priest", "back");
    const knight = partyCombatant("knight", "front");
    expect(hasValidTarget(ability, priest, [knight, priest])).toBe(false);
  });
});
