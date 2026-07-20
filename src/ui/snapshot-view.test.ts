import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { cloneSnapshot } from "../core/snapshot";
import { fixtureContent } from "../core/testing/fixture-content";
import type { Content } from "../core/types";
import {
  CLASS_LABELS,
  appliedLoadout,
  classKitFor,
  combatantForClass,
  effectiveLoadout,
  effectiveTalentState,
  levelFor,
  rosterClassIds,
  unlockableAbilityIds,
} from "./snapshot-view";

const LOOT_SEED = 42;

function baseSnapshot() {
  const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
  engine.advanceBy(1);
  return engine.snapshot();
}

describe("snapshot-view effectiveTalentState", () => {
  it("returns applied talents when no pendingEdit", () => {
    const snapshot = baseSnapshot();
    const applied = snapshot.progression.talents.knight!;

    const result = effectiveTalentState(snapshot, "knight");

    expect(result).toEqual(applied);
    expect(result).not.toBe(applied);
  });

  it("returns pending talent edit when present", () => {
    const snapshot = baseSnapshot();
    snapshot.pendingEdits.push({
      kind: "talent",
      classId: "knight",
      statRanks: { "k-swordcraft": 2 },
      abilityTalentId: "k-hold-line",
    });

    expect(effectiveTalentState(snapshot, "knight")).toEqual({
      statRanks: { "k-swordcraft": 2 },
      abilityTalentId: "k-hold-line",
    });
  });
});

describe("snapshot-view effectiveLoadout", () => {
  it("returns applied loadout when no pendingEdit", () => {
    const snapshot = baseSnapshot();

    expect(effectiveLoadout(snapshot, "knight")).toEqual([
      "k-shield-brace",
      "k-rally",
      "k-sweep",
    ]);
  });

  it("returns pending loadout edit when present", () => {
    const snapshot = baseSnapshot();
    const pending: [string, string, string] = ["k-pommel", "k-shield-brace", "k-sweep"];
    snapshot.pendingEdits.push({
      kind: "loadout",
      classId: "knight",
      loadout: pending,
    });

    expect(effectiveLoadout(snapshot, "knight")).toEqual(pending);
    expect(appliedLoadout(snapshot, "knight")).toEqual([
      "k-shield-brace",
      "k-rally",
      "k-sweep",
    ]);
  });
});

describe("snapshot-view levelFor", () => {
  it("reads xpThresholds from Content, not hardcoded production values", () => {
    const snapshot = baseSnapshot();
    snapshot.progression.characterXp.knight = 25;

    const customThresholds: Content["xpThresholds"] = [0, 10, 30, 60];
    const content: Content = {
      ...fixtureContent,
      xpThresholds: customThresholds,
    };

    expect(levelFor(snapshot, content, "knight")).toBe(2);
    expect(levelFor(snapshot, fixtureContent, "knight")).toBe(1);
  });
});

describe("snapshot-view roster and combatant", () => {
  it("lists party members then reserve", () => {
    const snapshot = baseSnapshot();
    const { party, reserve } = snapshot.progression;

    expect(rosterClassIds(snapshot)).toEqual([...party, reserve]);
  });

  it("finds a party Combatant by Class during an Attempt", () => {
    const snapshot = baseSnapshot();
    snapshot.attempt = {
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
      combatants: [
        {
          entityId: "party:knight",
          side: "party",
          defId: "knight",
          health: 100,
          maxHealth: 100,
          knockedOut: false,
          action: null,
          cooldownReadyAtMs: {},
          statuses: [],
        },
      ],
    };

    expect(combatantForClass(snapshot, "knight")?.entityId).toBe("party:knight");
    expect(combatantForClass(snapshot, "wizard")).toBeUndefined();
  });
});

describe("snapshot-view classKitFor and unlockableAbilityIds", () => {
  it("resolves Class Kits from Content", () => {
    const kit = classKitFor(fixtureContent, "knight");
    expect(kit.id).toBe("knight");
    expect(kit.basicAbilityId).toBe("knight-basic");
  });

  it("throws when a Class Kit is missing from Content", () => {
    const broken: Content = {
      ...fixtureContent,
      classes: fixtureContent.classes.filter((entry) => entry.id !== "knight"),
    };
    expect(() => classKitFor(broken, "knight")).toThrow(/Missing Class Kit knight/);
  });

  it("lists basic, core, and unlocked ability talent ids", () => {
    const kit = classKitFor(fixtureContent, "knight");
    const withoutTalent = unlockableAbilityIds(kit, {
      statRanks: {},
      abilityTalentId: null,
    });
    expect(withoutTalent).toEqual([
      "knight-basic",
      "k-shield-brace",
      "k-sweep",
      "k-rally",
      "k-pommel",
    ]);

    const withTalent = unlockableAbilityIds(kit, {
      statRanks: {},
      abilityTalentId: "k-hold-line",
    });
    expect(withTalent).toContain("k-hold-line");
    expect(withTalent).toHaveLength(withoutTalent.length + 1);
  });
});

describe("snapshot-view CLASS_LABELS", () => {
  it("maps every Class to a display label", () => {
    expect(CLASS_LABELS).toEqual({
      knight: "Knight",
      wizard: "Wizard",
      priest: "Priest",
      hunter: "Hunter",
    });
  });
});

describe("snapshot-view immutability", () => {
  it("does not mutate the Snapshot when calling every accessor", () => {
    const snapshot = baseSnapshot();
    snapshot.pendingEdits.push(
      {
        kind: "talent",
        classId: "wizard",
        statRanks: { "w-arcana": 1 },
        abilityTalentId: null,
      },
      {
        kind: "loadout",
        classId: "priest",
        loadout: ["p-moonwell", "p-resurgence", "p-smite"],
      },
    );
    snapshot.attempt = {
      id: 2,
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
      combatants: [
        {
          entityId: "party:hunter",
          side: "party",
          defId: "hunter",
          health: 80,
          maxHealth: 80,
          knockedOut: false,
          action: null,
          cooldownReadyAtMs: {},
          statuses: [],
        },
      ],
    };

    const before = cloneSnapshot(snapshot);
    const kit = classKitFor(fixtureContent, "knight");
    const talent = effectiveTalentState(snapshot, "knight");

    rosterClassIds(snapshot);
    effectiveTalentState(snapshot, "wizard");
    effectiveLoadout(snapshot, "priest");
    appliedLoadout(snapshot, "knight");
    combatantForClass(snapshot, "hunter");
    levelFor(snapshot, fixtureContent, "knight");
    unlockableAbilityIds(kit, talent);

    expect(snapshot).toEqual(before);
  });
});
