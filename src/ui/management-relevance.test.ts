import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import type { AttemptState, ProgressionState } from "../core/snapshot";
import { fixtureContent } from "../core/testing/fixture-content";
import {
  ATTEMPT_RELEVANCE,
  managementRelevanceKey,
  PROGRESSION_RELEVANCE,
} from "./management-relevance";

function baseSnapshot() {
  return structuredClone(createEngine(fixtureContent, undefined, 3).snapshot());
}

describe("managementRelevanceKey", () => {
  it('returns "null" for a null snapshot', () => {
    expect(managementRelevanceKey(null)).toBe("null");
  });

  it("changes when any management-relevant progression field changes", () => {
    const snapshot = baseSnapshot();
    const baseline = managementRelevanceKey(snapshot);

    const unlockedStage = structuredClone(snapshot);
    unlockedStage.progression.unlockedStage = 2;
    expect(managementRelevanceKey(unlockedStage)).not.toBe(baseline);

    const party = structuredClone(snapshot);
    party.progression.party = ["wizard", "knight", "priest"];
    expect(managementRelevanceKey(party)).not.toBe(baseline);

    const reserve = structuredClone(snapshot);
    reserve.progression.reserve = "wizard";
    expect(managementRelevanceKey(reserve)).not.toBe(baseline);

    const pendingParty = structuredClone(snapshot);
    pendingParty.progression.pendingParty = {
      members: ["wizard", "knight", "priest"],
      reserve: "hunter",
    };
    expect(managementRelevanceKey(pendingParty)).not.toBe(baseline);

    const armory = structuredClone(snapshot);
    armory.progression.armory = [
      {
        dropId: 99,
        baseId: "fixture-blade",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 1,
        seen: true,
        locked: false,
        assignedTo: null,
      },
    ];
    expect(managementRelevanceKey(armory)).not.toBe(baseline);

    const characterXp = structuredClone(snapshot);
    characterXp.progression.characterXp.knight = 999;
    expect(managementRelevanceKey(characterXp)).not.toBe(baseline);

    const talents = structuredClone(snapshot);
    talents.progression.talents.knight.statRanks["fortitude"] = 1;
    expect(managementRelevanceKey(talents)).not.toBe(baseline);

    const loadouts = structuredClone(snapshot);
    loadouts.progression.loadouts.knight = ["a", "b", "c"];
    expect(managementRelevanceKey(loadouts)).not.toBe(baseline);
  });

  it("changes when pendingEdits changes", () => {
    const snapshot = baseSnapshot();
    const baseline = managementRelevanceKey(snapshot);

    const edited = structuredClone(snapshot);
    edited.pendingEdits = [
      {
        kind: "formation",
        order: [...edited.progression.party].reverse() as typeof edited.progression.party,
      },
    ];
    expect(managementRelevanceKey(edited)).not.toBe(baseline);
  });

  it("changes when management-relevant attempt fields change", () => {
    const snapshot = baseSnapshot();
    if (!snapshot.attempt) {
      throw new Error("missing Attempt");
    }
    const baseline = managementRelevanceKey(snapshot);

    const id = structuredClone(snapshot);
    id.attempt!.id = snapshot.attempt.id + 1;
    expect(managementRelevanceKey(id)).not.toBe(baseline);

    const stage = structuredClone(snapshot);
    stage.attempt!.stage = 2;
    expect(managementRelevanceKey(stage)).not.toBe(baseline);

    const encounter = structuredClone(snapshot);
    encounter.attempt!.encounter = 2;
    expect(managementRelevanceKey(encounter)).not.toBe(baseline);

    const equipmentLoadouts = structuredClone(snapshot);
    equipmentLoadouts.attempt!.equipmentLoadouts.knight = { weapon: 1 };
    expect(managementRelevanceKey(equipmentLoadouts)).not.toBe(baseline);
  });

  it("stays stable when only combat churn or simNowMs changes", () => {
    const snapshot = baseSnapshot();
    if (!snapshot.attempt) {
      throw new Error("missing Attempt");
    }
    const baseline = managementRelevanceKey(snapshot);

    const phase = structuredClone(snapshot);
    phase.attempt!.phase = "wave-transition";
    phase.attempt!.phaseEndsAtMs = 12_000;
    expect(managementRelevanceKey(phase)).toBe(baseline);

    const combatants = structuredClone(snapshot);
    const partyCombatant = combatants.attempt!.combatants.find((c) => c.side === "party");
    if (!partyCombatant) {
      throw new Error("missing party combatant");
    }
    partyCombatant.health = Math.max(1, partyCombatant.health - 5);
    combatants.simNowMs += 250;
    expect(managementRelevanceKey(combatants)).toBe(baseline);
  });

  it("stays stable when attempt is absent and only top-level churn fields change", () => {
    const snapshot = baseSnapshot();
    snapshot.attempt = null;
    const baseline = managementRelevanceKey(snapshot);

    const churn = structuredClone(snapshot);
    churn.simNowMs += 500;
    churn.lootRngState += 1;
    churn.nextEventSeq += 1;
    expect(managementRelevanceKey(churn)).toBe(baseline);
  });
});

describe("management relevance coverage maps", () => {
  it("classifies every ProgressionState field and projects only relevant ones", () => {
    const progressionKeys = Object.keys(PROGRESSION_RELEVANCE) as (keyof ProgressionState)[];
    const expectedProgressionKeys: (keyof ProgressionState)[] = [
      "unlockedStage",
      "party",
      "reserve",
      "pendingParty",
      "armory",
      "characterXp",
      "talents",
      "loadouts",
    ];
    expect(progressionKeys.sort()).toEqual(expectedProgressionKeys.sort());
    expect(progressionKeys.every((key) => typeof PROGRESSION_RELEVANCE[key] === "boolean")).toBe(
      true,
    );
    expect(progressionKeys.filter((key) => PROGRESSION_RELEVANCE[key]).sort()).toEqual(
      expectedProgressionKeys.sort(),
    );
  });

  it("classifies every AttemptState field and projects only relevant ones", () => {
    const attemptKeys = Object.keys(ATTEMPT_RELEVANCE) as (keyof AttemptState)[];
    const expectedAttemptKeys: (keyof AttemptState)[] = [
      "id",
      "stage",
      "encounter",
      "phase",
      "phaseEndsAtMs",
      "equipmentLoadouts",
      "combatants",
    ];
    expect(attemptKeys.sort()).toEqual(expectedAttemptKeys.sort());

    const relevantAttemptKeys: (keyof AttemptState)[] = [
      "id",
      "stage",
      "encounter",
      "equipmentLoadouts",
    ];
    const ignoredAttemptKeys: (keyof AttemptState)[] = [
      "phase",
      "phaseEndsAtMs",
      "combatants",
    ];
    expect(attemptKeys.filter((key) => ATTEMPT_RELEVANCE[key]).sort()).toEqual(
      relevantAttemptKeys.sort(),
    );
    expect(ignoredAttemptKeys.every((key) => ATTEMPT_RELEVANCE[key] === false)).toBe(true);

    const snapshot = baseSnapshot();
    if (!snapshot.attempt) {
      throw new Error("missing Attempt");
    }
    const baseline = managementRelevanceKey(snapshot);

    for (const key of ignoredAttemptKeys) {
      const changed = structuredClone(snapshot);
      if (key === "phase") {
        changed.attempt!.phase = "defeat-hold";
      } else if (key === "phaseEndsAtMs") {
        changed.attempt!.phaseEndsAtMs = 99_999;
      } else if (key === "combatants") {
        changed.attempt!.combatants[0]!.health = 1;
      }
      expect(managementRelevanceKey(changed), key).toBe(baseline);
    }

    for (const key of relevantAttemptKeys) {
      const changed = structuredClone(snapshot);
      if (key === "id") {
        changed.attempt!.id += 1;
      } else if (key === "stage") {
        changed.attempt!.stage = 2;
      } else if (key === "encounter") {
        changed.attempt!.encounter = 2;
      } else if (key === "equipmentLoadouts") {
        changed.attempt!.equipmentLoadouts.wizard = { armor: 2 };
      }
      expect(managementRelevanceKey(changed), key).not.toBe(baseline);
    }
  });
});
