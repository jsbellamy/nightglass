import { describe, expect, it } from "vitest";
import {
  basicAbilityFor,
  candidatesFor,
  chooseAbilityForCombatant,
  indexContent,
} from "./content-index";
import {
  opponentAbilityCandidates,
  partyAbilityCandidates,
} from "./combat";
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
    expect(index.equipmentBasesById.get("fixture-blade")).toBe(
      fixtureContent.equipmentBases.find((entry) => entry.id === "fixture-blade"),
    );
  });

  it("registers interim Strike Abilities in abilitiesById", () => {
    const index = indexContent(fixtureContent);
    const interim = index.abilitiesById.get("fixture-boss-basic-interim");
    expect(interim?.id).toBe("fixture-boss-basic-interim");
    expect(interim?.name).toBe("Strike");
  });
});

describe("basicAbilityFor", () => {
  const index = indexContent(fixtureContent);

  it("returns the authored Basic Attack for an Opponent that has one", () => {
    const grunt = opponentCombatant("fixture-grunt");
    const ability = basicAbilityFor(index, grunt);
    expect(ability.id).toBe("grunt-attack");
    expect(ability.slot).toBe("basic");
  });

  it("returns the interim Strike for an Opponent without an authored Basic Attack", () => {
    const boss = opponentCombatant("fixture-boss");
    const ability = basicAbilityFor(index, boss);
    expect(ability.id).toBe("fixture-boss-basic-interim");
    expect(ability.name).toBe("Strike");
  });

  it("returns the same object identity across two calls for one Opponent", () => {
    const boss = opponentCombatant("fixture-boss");
    expect(basicAbilityFor(index, boss)).toBe(basicAbilityFor(index, boss));
  });
});

describe("candidatesFor", () => {
  const index = indexContent(fixtureContent);
  const progression = createDefaultProgression(fixtureContent);
  const abilitiesById = index.abilitiesById;

  it("matches partyAbilityCandidates order for a Party Member", () => {
    const knight = partyCombatant("knight", "front");
    const loadout = progression.loadouts.knight;
    const classKit = index.classesById.get("knight")!;
    const expected = partyAbilityCandidates(
      fixtureContent,
      classKit,
      loadout,
      abilitiesById,
    );
    const actual = candidatesFor(index, knight, progression.loadouts);
    expect(actual.map((ability) => ability.id)).toEqual(expected.map((ability) => ability.id));
  });

  it("matches opponentAbilityCandidates order for an Opponent", () => {
    const boss = opponentCombatant("fixture-boss");
    const opponent = index.opponentsById.get("fixture-boss")!;
    const expected = opponentAbilityCandidates(fixtureContent, opponent, abilitiesById);
    const actual = candidatesFor(index, boss, progression.loadouts);
    expect(actual.map((ability) => ability.id)).toEqual(expected.map((ability) => ability.id));
  });

  it("returns the same array identity for repeated calls with the same Loadout tuple", () => {
    const knight = partyCombatant("knight", "front");
    const first = candidatesFor(index, knight, progression.loadouts);
    const second = candidatesFor(index, knight, progression.loadouts);
    expect(first).toBe(second);
  });

  it("returns the same array identity for repeated Opponent candidate lookups", () => {
    const boss = opponentCombatant("fixture-boss");
    const first = candidatesFor(index, boss, progression.loadouts);
    const second = candidatesFor(index, boss, progression.loadouts);
    expect(first).toBe(second);
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
