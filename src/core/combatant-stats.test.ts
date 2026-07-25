import { describe, expect, it } from "vitest";
import { effectiveStats } from "./combat";
import { statsForCombatant } from "./combatant-stats";
import { indexContent } from "./content-index";
import { opponentEntityId, partyEntityId } from "./entity-id";
import { createDefaultProgression } from "./load-state";
import { emptyTalentState } from "./talents";
import { characterStats } from "./stats";
import type { CombatantState } from "./snapshot";
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
    const expected = effectiveStats(grunt.base, opponent.statuses, index.statusesById);
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
