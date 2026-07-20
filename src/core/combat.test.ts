import { describe, expect, it } from "vitest";
import {
  applyStatModifiers,
  chooseFirstValidAbility,
  effectiveStats,
  hasValidTarget,
  isAbilityValid,
  partyAbilityCandidates,
  previewEffectRaw,
  revalidateTargets,
  resolveEffect,
  selectFirstKnockedOutAlly,
  selectLowestHealthAlly,
  shouldApplyStun,
} from "./combat";
import type { CombatantState } from "./snapshot";
import { buildContent } from "../data";
import { fixtureContent } from "./testing/fixture-content";
import { opponentEntityId, partyEntityId } from "./entity-id";
import type { AbilityDef, BaseStats, ClassId } from "./types";

const abilitiesById = new Map(fixtureContent.abilities.map((ability) => [ability.id, ability]));
const statusesById = new Map(fixtureContent.statuses.map((status) => [status.id, status]));
const knightKit = fixtureContent.classes.find((entry) => entry.id === "knight")!;

const SLOT_INDEX = { front: 0, middle: 1, back: 2 } as const;

function partyCombatant(
  classId: string,
  slot: "front" | "middle" | "back",
  overrides: Partial<CombatantState> = {},
): CombatantState {
  return {
    entityId: partyEntityId(classId as ClassId, SLOT_INDEX[slot]),
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
    entityId: opponentEntityId("1", 0),
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

const emptyTarget = {
  stats: {
    maxHealth: 100,
    physical: 0,
    elemental: 0,
    armor: 0,
    elementalResistance: 0,
  },
  health: 100,
  maxHealth: 100,
  knockedOut: false,
  statuses: [] as const,
};

describe("damage mitigation at impact", () => {
  it("uses max(1, floor(raw × 100 / (100 + mitigation))) with mitigation clamped ≥ 0", () => {
    const actor = { ...emptyTarget.stats, physical: 100, elemental: 0 };
    const mitigated = (raw: number, mitigation: number) =>
      resolveEffect(
        { kind: "damage", channel: "physical", coefficient: raw / 100 },
        actor,
        { ...emptyTarget, stats: { ...emptyTarget.stats, armor: mitigation } },
        statusesById,
      ).damageDetail?.amount;

    expect(mitigated(100, 100)).toBe(50);
    expect(mitigated(100, -20)).toBe(100);
    expect(mitigated(1, 0)).toBe(1);
    expect(mitigated(50, 200)).toBe(16);
  });

  it("pairs Elemental Power with Elemental Resistance, not Armor", () => {
    const actorStats: BaseStats = {
      maxHealth: 100,
      physical: 10,
      elemental: 100,
      armor: 0,
      elementalResistance: 0,
    };
    const targetStats: BaseStats = {
      maxHealth: 200,
      physical: 0,
      elemental: 0,
      armor: 200,
      elementalResistance: 5,
    };
    const outcome = resolveEffect(
      { kind: "damage", channel: "elemental", coefficient: 1 },
      actorStats,
      { ...emptyTarget, stats: targetStats, health: 200, maxHealth: 200 },
      statusesById,
    );
    expect(outcome.damageDetail?.amount).toBe(95);
    const wrongMitigation = Math.max(
      1,
      Math.floor((100 * 100) / (100 + targetStats.armor)),
    );
    expect(outcome.damageDetail?.amount).not.toBe(wrongMitigation);
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
    const physicalPower = Math.floor((14 + 6) * 1.15);
    expect(
      previewEffectRaw({ kind: "damage", channel: "physical", coefficient: 0.9 }, stats),
    ).toBe(Math.floor(physicalPower * 0.9));
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

  it("requires below half health for Hold the Line", () => {
    const ability = buildContent().abilities.find((entry) => entry.id === "hold-the-line")!;
    const knight = partyCombatant("knight", "front", { health: 180, maxHealth: 180 });
    expect(isAbilityValid(ability, knight, [knight])).toBe(false);

    knight.health = 90;
    expect(isAbilityValid(ability, knight, [knight])).toBe(false);

    knight.health = 89;
    expect(isAbilityValid(ability, knight, [knight])).toBe(true);
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
    const outcome = resolveEffect(
      { kind: "heal", coefficient: 0.8 },
      { maxHealth: 100, physical: 0, elemental: 14, armor: 0, elementalResistance: 0 },
      { ...emptyTarget, health: 95, maxHealth: 100 },
      statusesById,
    );
    expect(outcome.healDetail?.amount).toBe(5);
    expect(
      previewEffectRaw({ kind: "heal", coefficient: 0.8 }, {
        maxHealth: 100,
        physical: 0,
        elemental: 14,
        armor: 0,
        elementalResistance: 0,
      }),
    ).toBe(11);
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
