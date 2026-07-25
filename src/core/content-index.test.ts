import { describe, expect, it } from "vitest";
import { chooseAbilityForCombatant, indexContent } from "./content-index";
import { opponentEntityId, partyEntityId } from "./entity-id";
import { createDefaultProgression } from "./load-state";
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

describe("indexContent", () => {
  it("indexes every Content collection by id", () => {
    const index = indexContent(fixtureContent);
    expect(index.content).toBe(fixtureContent);
    expect(index.classesById.get("knight")).toBe(
      fixtureContent.classes.find((entry) => entry.id === "knight"),
    );
    expect(index.opponentsById.get("fixture-grunt")).toBe(
      fixtureContent.opponents.find((entry) => entry.id === "fixture-grunt"),
    );
    expect(index.stagesById.get(1)).toBe(
      fixtureContent.stages.find((entry) => entry.id === 1),
    );
    expect(index.abilitiesById.get("knight-basic")).toBe(
      fixtureContent.abilities.find((entry) => entry.id === "knight-basic"),
    );
    expect(index.statusesById.get("stun")).toBe(
      fixtureContent.statuses.find((entry) => entry.id === "stun"),
    );
  });
});

describe("chooseAbilityForCombatant", () => {
  const index = indexContent(fixtureContent);
  const progression = createDefaultProgression(fixtureContent);

  it("chooses the first valid Ability Loadout slot for a Party Character", () => {
    const knight = partyCombatant("knight", "front");
    const opponent = opponentCombatant("fixture-grunt");
    const ability = chooseAbilityForCombatant(
      index,
      knight,
      progression.loadouts,
      [knight, opponent],
      0,
    );
    expect(ability?.id).toBe("k-shield-brace");
  });

  it("chooses an Opponent Ability from its authored list", () => {
    const knight = partyCombatant("knight", "front");
    const opponent = opponentCombatant("fixture-grunt");
    const ability = chooseAbilityForCombatant(
      index,
      opponent,
      progression.loadouts,
      [knight, opponent],
      0,
    );
    expect(ability?.id).toBe("grunt-attack");
  });

  it("throws when a Party Character Class Kit is missing from Content", () => {
    const missing = partyCombatant("missing-class", "front");
    expect(() =>
      chooseAbilityForCombatant(index, missing, progression.loadouts, [missing], 0),
    ).toThrow("Missing Class Kit missing-class");
  });

  it("throws when an Opponent definition is missing from Content", () => {
    const missing = opponentCombatant("missing-opponent");
    expect(() =>
      chooseAbilityForCombatant(index, missing, progression.loadouts, [missing], 0),
    ).toThrow("Missing opponent missing-opponent");
  });
});
