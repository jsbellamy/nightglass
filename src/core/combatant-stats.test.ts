import { describe, expect, it } from "vitest";
import { effectiveStats, powerFrom, resolveStatModifiers } from "./combat";
import { createStatLedger, statsForCombatant } from "./combatant-stats";
import { indexContent } from "./content-index";
import { createEngine, SCHEMA_VERSION } from "./engine";
import { opponentEntityId, partyEntityId } from "./entity-id";
import { createDefaultProgression } from "./load-state";
import { emptyTalentState, normalizeClassTalentState } from "./talents";
import { characterStats } from "./stats";
import type { AttemptState, CombatantState, DropInstance } from "./snapshot";
import { fixtureContent } from "./testing/fixture-content";
import type { ClassId } from "./types";

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
    initiativeReadyAtMs: 0,
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
    initiativeReadyAtMs: 0,
    action: null,
    cooldownReadyAtMs: {},
    statuses: [],
    ...overrides,
  };
}

function minimalAttempt(combatants: CombatantState[]): AttemptState {
  return {
    id: 1,
    stage: 1,
    encounter: 1,
    phase: "fighting",
    phaseEndsAtMs: null,
    equipmentLoadouts: {
      knight: {},
      wizard: {},
      priest: {},
      hunter: {},
    },
    combatants,
  };
}

describe("statsForCombatant", () => {
  const index = indexContent(fixtureContent);
  const progression = createDefaultProgression(fixtureContent);
  const knightKit = fixtureContent.classes.find((entry) => entry.id === "knight")!;
  const grunt = fixtureContent.opponents.find((entry) => entry.id === "fixture-grunt")!;

  it("derives Party Character stats from Class Kit, Talents, and Equipment", () => {
    const knight = partyCombatant("knight", "front");
    const expectedBase = characterStats(knightKit, emptyTalentState(knightKit));
    const expected = effectiveStats(expectedBase, knight.statuses, index.statusesById);
    expect(statsForCombatant(index, knight, progression, null)).toEqual(expected);
  });

  it("derives Opponent stats from authored base statistics", () => {
    const opponent = opponentCombatant("fixture-grunt");
    const expected = effectiveStats(
      resolveStatModifiers(grunt.base, []),
      opponent.statuses,
      index.statusesById,
    );
    expect(statsForCombatant(index, opponent, progression, null)).toEqual(expected);
  });

  it("throws when a Party Character Class Kit is missing from Content", () => {
    const missing = partyCombatant("missing-class", "front");
    expect(() => statsForCombatant(index, missing, progression, null)).toThrow(
      "Missing Class Kit missing-class",
    );
  });

  it("throws when an Opponent definition is missing from Content", () => {
    const missing = opponentCombatant("missing-opponent");
    expect(() => statsForCombatant(index, missing, progression, null)).toThrow(
      "Missing opponent missing-opponent",
    );
  });
});

describe("createStatLedger", () => {
  const index = indexContent(fixtureContent);
  const progression = createDefaultProgression(fixtureContent);
  const knightKit = fixtureContent.classes.find((entry) => entry.id === "knight")!;

  function knightWithSwordcraftRanks(ranks: number) {
    const next = emptyTalentState(knightKit);
    next.tierStates[0]!.statRanks["k-swordcraft"] = ranks;
    next.statRanks = { ...next.tierStates[0]!.statRanks };
    return normalizeClassTalentState(knightKit, next);
  }

  it("applies Status modifiers on every statsFor call without invalidation", () => {
    const knight = partyCombatant("knight", "front");
    const attempt = minimalAttempt([knight]);
    const ledger = createStatLedger(index, progression, attempt);
    const withoutBraced = ledger.statsFor(knight).stats.armor;
    knight.statuses = [{ statusId: "braced", expiresAtMs: 10_000 }];
    expect(ledger.statsFor(knight).stats.armor).toBe(withoutBraced + 50);
  });

  it("keeps cached base stats until invalidate after Talent changes", () => {
    const knight = partyCombatant("knight", "front");
    const attempt = minimalAttempt([knight]);
    const localProgression = structuredClone(progression);
    const ledger = createStatLedger(index, localProgression, attempt);
    const before = ledger.statsFor(knight).stats.physical;

    localProgression.talents.knight = knightWithSwordcraftRanks(5);

    expect(ledger.statsFor(knight).stats.physical).toBe(before);
    ledger.invalidate("knight");
    expect(ledger.statsFor(knight).stats.physical).toBe(17);
  });

  it("invalidates a Party Member after a Talent edit", () => {
    const knight = partyCombatant("knight", "front");
    const attempt = minimalAttempt([knight]);
    const localProgression = structuredClone(progression);
    const ledger = createStatLedger(index, localProgression, attempt);
    const baseline = ledger.statsFor(knight).stats.physical;

    localProgression.talents.knight = knightWithSwordcraftRanks(5);
    ledger.invalidate("knight");
    expect(ledger.statsFor(knight).stats.physical).toBeGreaterThan(baseline);
  });

  it("invalidates a Party Member after a Loadout edit", () => {
    const knight = partyCombatant("knight", "front");
    const attempt = minimalAttempt([knight]);
    const ledger = createStatLedger(index, progression, attempt);
    ledger.statsFor(knight);
    ledger.invalidate("knight");
    expect(ledger.statsFor(knight)).toEqual(
      statsForCombatant(index, knight, progression, attempt),
    );
  });

  it("invalidates each Party Member after a Formation edit", () => {
    const knight = partyCombatant("knight", "front");
    const wizard = partyCombatant("wizard", "middle");
    const priest = partyCombatant("priest", "back");
    const attempt = minimalAttempt([knight, wizard, priest]);
    const localProgression = structuredClone(progression);
    const ledger = createStatLedger(index, localProgression, attempt);

    knight.entityId = partyEntityId("knight", 1);
    wizard.entityId = partyEntityId("wizard", 0);
    priest.entityId = partyEntityId("priest", 2);
    attempt.combatants = [wizard, knight, priest];

    for (const classId of ["wizard", "knight", "priest"] as const) {
      ledger.invalidate(classId);
    }

    for (const combatant of attempt.combatants) {
      const expected = statsForCombatant(index, combatant, localProgression, attempt);
      expect(ledger.statsFor(combatant)).toEqual(expected);
    }
  });

  it("preserves Element Power on a second statsFor call for a cached Party Member", () => {
    const wizardKit = fixtureContent.classes.find((entry) => entry.id === "wizard")!;
    const wizard = partyCombatant("wizard", "middle");
    const attempt = minimalAttempt([wizard]);
    const localProgression = structuredClone(progression);
    const focus: DropInstance = {
      dropId: 88,
      baseId: "fixture-focus",
      itemLevel: 1,
      rarity: "uncommon",
      affixes: [
        { id: "flat-fire", value: 5 },
        { id: "flat-frost", value: 4 },
        { id: "flat-lightning", value: 3 },
        { id: "flat-light", value: 2 },
      ],
      awardedAtMs: 0,
      seen: true,
      locked: false,
      assignedTo: { classId: "wizard", slot: "weapon" },
    };
    localProgression.armory = [focus];
    attempt.equipmentLoadouts.wizard = { weapon: 88 };

    const ledger = createStatLedger(index, localProgression, attempt);
    const first = ledger.statsFor(wizard);
    const second = ledger.statsFor(wizard);

    for (const element of ["fire", "frost", "lightning", "light"] as const) {
      expect(powerFrom(second, "elemental", element)).toBe(powerFrom(first, "elemental", element));
    }
    expect(second.stats.firePower).toBe(first.stats.firePower);
    expect(second.stats.frostPower).toBe(first.stats.frostPower);
    expect(second.stats.lightningPower).toBe(first.stats.lightningPower);
    expect(second.stats.lightPower).toBe(first.stats.lightPower);
    expect(first.stats.firePower).toBe(
      characterStats(wizardKit, localProgression.talents.wizard!, [
        { flat: { firePower: 5 } },
        { flat: { frostPower: 4 } },
        { flat: { lightningPower: 3 } },
        { flat: { lightPower: 2 } },
      ]).stats.firePower,
    );
  });

  it("does not serialize the Stat Ledger in snapshot", () => {
    const engine = createEngine(fixtureContent, undefined, 0x5090);
    const snap = engine.snapshot();
    expect(snap).not.toHaveProperty("statLedger");
    expect(SCHEMA_VERSION).toBe(2);
  });
});
