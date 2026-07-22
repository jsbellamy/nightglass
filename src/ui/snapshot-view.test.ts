import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { cloneSnapshot } from "../core/snapshot";
import { fixtureContent } from "../core/testing/fixture-content";
import { emptyTalentState } from "../core/talents";
import type { Content } from "../core/types";
import { buildContent } from "../data";
import {
  CLASS_LABELS,
  appliedLoadout,
  classKitFor,
  combatantForClass,
  effectiveFormation,
  effectiveLoadout,
  effectiveParty,
  effectiveTalentState,
  levelFor,
  rosterClassIds,
  unlockableAbilityIds,
} from "./snapshot-view";

const LOOT_SEED = 42;
const content = buildContent();

function baseSnapshot() {
  const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
  engine.advanceBy(1);
  return engine.snapshot();
}

function fullRosterSnapshot() {
  const engine = createEngine(content, undefined, LOOT_SEED);
  engine.advanceBy(1);
  return engine.snapshot();
}

describe("Snapshot view Talent state", () => {
  it("reflects applied Talents when no Talent pendingEdit is open", () => {
    const snapshot = baseSnapshot();
    const applied = snapshot.progression.talents.knight!;

    const result = effectiveTalentState(snapshot, "knight");

    expect(result).toEqual(applied);
    expect(result).not.toBe(applied);
  });

  it("includes an uncommitted Talent pendingEdit", () => {
    const snapshot = baseSnapshot();
    snapshot.pendingEdits.push({
      kind: "talent",
      classId: "knight",
      statRanks: { "k-swordcraft": 2 },
      abilityTalentId: "k-hold-line",
    });

    const effective = effectiveTalentState(snapshot, "knight");
    expect(effective.statRanks["k-swordcraft"]).toBe(2);
    expect(effective.abilityTalentId).toBe("k-hold-line");
    expect(effective.tierStates[0]!.statRanks["k-swordcraft"]).toBe(2);
  });
});

describe("Snapshot view Ability Loadout", () => {
  it("reflects applied slots when no Loadout pendingEdit is open", () => {
    const snapshot = baseSnapshot();

    expect(effectiveLoadout(snapshot, "knight")).toEqual([
      "k-shield-brace",
      "k-rally",
      "k-sweep",
    ]);
  });

  it("includes an uncommitted Loadout pendingEdit", () => {
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

describe("Snapshot view Character Level", () => {
  it("derives Level from Character XP using Content thresholds", () => {
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

describe("Snapshot view Party roster and Combatants", () => {
  it("lists party members then reserve", () => {
    const snapshot = baseSnapshot();
    const { party, reserve } = snapshot.progression;

    expect(rosterClassIds(snapshot)).toEqual([...party, reserve]);
    expect(effectiveParty(snapshot)).toEqual({ members: [...party], reserve });
    expect(effectiveFormation(snapshot)).toEqual([...party]);
  });

  it("honours pendingParty for effective party and roster order", () => {
    const snapshot = fullRosterSnapshot();
    const { party, reserve } = snapshot.progression;
    snapshot.progression.pendingParty = {
      members: [reserve, party[1]!, party[2]!],
      reserve: party[0]!,
    };

    expect(effectiveParty(snapshot)).toEqual({
      members: [reserve, party[1]!, party[2]!],
      reserve: party[0]!,
    });
    expect(effectiveFormation(snapshot)).toEqual([...party]);
    expect(rosterClassIds(snapshot)).toEqual([reserve, party[1]!, party[2]!, party[0]!]);
  });

  it("honours a pending formation edit when no pendingParty is set", () => {
    const snapshot = fullRosterSnapshot();
    const { party, reserve } = snapshot.progression;
    const order: [typeof party[0], typeof party[1], typeof party[2]] = [
      party[2]!,
      party[0]!,
      party[1]!,
    ];
    snapshot.pendingEdits.push({ kind: "formation", order });

    expect(effectiveFormation(snapshot)).toEqual(order);
    expect(rosterClassIds(snapshot)).toEqual([...order, reserve]);
  });

  it("prefers pendingParty membership over a stale formation pending for chip order", () => {
    const snapshot = fullRosterSnapshot();
    const { party, reserve } = snapshot.progression;
    const order: [typeof party[0], typeof party[1], typeof party[2]] = [
      party[2]!,
      party[0]!,
      party[1]!,
    ];
    snapshot.pendingEdits.push({ kind: "formation", order });
    snapshot.progression.pendingParty = {
      members: [reserve, party[1]!, party[2]!],
      reserve: party[0]!,
    };

    expect(effectiveFormation(snapshot)).toEqual(order);
    expect(rosterClassIds(snapshot)).toEqual([reserve, party[1]!, party[2]!, party[0]!]);
    expect(new Set(rosterClassIds(snapshot)).size).toBe(4);
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

describe("Snapshot view Class Kit and unlockable Abilities", () => {
  it("resolves a Class Kit from Content", () => {
    const kit = classKitFor(fixtureContent, "knight");
    expect(kit.id).toBe("knight");
    expect(kit.basicAbilityId).toBe("knight-basic");
  });

  it("throws when Content omits a Class Kit", () => {
    const broken: Content = {
      ...fixtureContent,
      classes: fixtureContent.classes.filter((entry) => entry.id !== "knight"),
    };
    expect(() => classKitFor(broken, "knight")).toThrow(/Missing Class Kit knight/);
  });

  it("lists basic, Core, and unlocked Ability Talent ids for the Loadout picker", () => {
    const kit = classKitFor(fixtureContent, "knight");
    const withoutTalent = unlockableAbilityIds(kit, emptyTalentState(kit));
    expect(withoutTalent).toEqual([
      "knight-basic",
      "k-shield-brace",
      "k-sweep",
      "k-rally",
      "k-pommel",
    ]);

    const withTalent = emptyTalentState(kit);
    withTalent.abilityTalentId = "k-hold-line";
    withTalent.tierStates[0]!.abilityTalentId = "k-hold-line";
    const withTalentIds = unlockableAbilityIds(kit, withTalent);
    expect(withTalentIds).toContain("k-hold-line");
    expect(withTalentIds).toHaveLength(withoutTalent.length + 1);
  });
});

describe("Snapshot view Class labels", () => {
  it("maps each Class id to a player-facing label", () => {
    expect(CLASS_LABELS).toEqual({
      knight: "Knight",
      wizard: "Wizard",
      priest: "Priest",
      hunter: "Hunter",
    });
  });
});

describe("Snapshot view immutability", () => {
  it("leaves the Snapshot unchanged after reading every derived field", () => {
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
