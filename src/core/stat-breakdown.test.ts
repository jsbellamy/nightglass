import { describe, expect, it } from "vitest";
import { createEngine } from "./engine";
import { equipmentModifiersForLoadout } from "./equipment";
import { characterStatsFor } from "./equipment-preview";
import { createDefaultProgression } from "./load-state";
import type { DropInstance, Snapshot } from "./snapshot";
import {
  characterStatBreakdown,
  characterStatsCommittedFor,
  statsDifferFromCommittedCombat,
} from "./stat-breakdown";
import { characterStats } from "./stats";
import { cloneClassTalentState, emptyTalentState } from "./talents";
import { fixtureContent } from "./testing/fixture-content";
import { scenario } from "./testing/scenario";

const LOOT_SEED = 42;

const knightKit = fixtureContent.classes.find((entry) => entry.id === "knight")!;

function knightTalents(statRanks: Record<string, number>) {
  const state = emptyTalentState(knightKit);
  const merged = { ...state.tierStates[0]!.statRanks, ...statRanks };
  state.statRanks = merged;
  state.tierStates[0] = { ...state.tierStates[0]!, statRanks: merged };
  return state;
}

function drop(
  overrides: Partial<DropInstance> & Pick<DropInstance, "dropId" | "baseId">,
): DropInstance {
  return {
    itemLevel: 1,
    rarity: "common",
    affixes: [],
    awardedAtMs: 0,
    seen: true,
    locked: false,
    assignedTo: null,
    ...overrides,
  };
}

function baseSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    schemaVersion: 1,
    savedAtMs: 0,
    simNowMs: 0,
    lootRngState: 0,
    nextEventSeq: 1,
    nextAttemptId: 1,
    nextDropId: 1,
    progression: createDefaultProgression(fixtureContent),
    attempt: null,
    pendingEdits: [],
    ...overrides,
  };
}

describe("characterStatBreakdown", () => {
  it("lists all five stats in contract order with labels", () => {
    const snapshot = baseSnapshot();
    const lines = characterStatBreakdown(snapshot, fixtureContent, "knight");

    expect(lines.map((line) => line.key)).toEqual([
      "maxHealth",
      "physical",
      "elemental",
      "armor",
      "elementalResistance",
    ]);
    expect(lines.map((line) => line.label)).toEqual([
      "Max Health",
      "Physical Power",
      "Elemental Power",
      "Armor",
      "Elemental Resistance",
    ]);
  });

  it("reports Class Kit base on every line with zero Equipment and Talent modifiers", () => {
    const snapshot = baseSnapshot();
    const lines = characterStatBreakdown(snapshot, fixtureContent, "knight");
    const base = knightKit.base;

    expect(lines[0]).toMatchObject({
      base: base.maxHealth,
      equipment: { flat: 0, percent: 0 },
      talents: { flat: 0, percent: 0 },
      total: base.maxHealth,
    });
    expect(lines[1]?.total).toBe(base.physical);
    expect(lines[4]?.total).toBe(base.elementalResistance);
  });

  it("applies flat-before-percent ordering and floor on totals", () => {
    const worn = drop({
      dropId: 1,
      baseId: "fixture-blade",
      assignedTo: { classId: "knight", slot: "weapon" },
    });
    const progression = createDefaultProgression(fixtureContent);
    progression.armory = [worn];
    progression.talents.knight = knightTalents({ "k-fortitude": 0, "k-swordcraft": 5 });
    const snapshot = baseSnapshot({ progression });
    const lines = characterStatBreakdown(snapshot, fixtureContent, "knight");

    const physical = lines.find((line) => line.key === "physical")!;
    // Knight 14 base + blade flat 2 = 16; +25% swordcraft → floor(16 * 1.25) = 20
    expect(physical.total).toBe(20);
    expect(physical.talents.percent).toBe(0.25);
  });

  it("groups Equipment flat and percent separately from Talent contributions", () => {
    const blade = drop({
      dropId: 2,
      baseId: "fixture-blade",
      affixes: [{ id: "percent-physical-power", value: 0.1 }],
      assignedTo: { classId: "knight", slot: "weapon" },
    });
    const progression = createDefaultProgression(fixtureContent);
    progression.armory = [blade];
    progression.talents.knight = knightTalents({ "k-fortitude": 0, "k-swordcraft": 2 });
    const snapshot = baseSnapshot({ progression });
    const physical = characterStatBreakdown(snapshot, fixtureContent, "knight").find(
      (line) => line.key === "physical",
    )!;

    expect(physical.equipment.flat).toBe(2);
    expect(physical.equipment.percent).toBe(0.1);
    expect(physical.talents.percent).toBe(0.1);
    expect(physical.total).toBe(characterStatsFor(snapshot, fixtureContent, "knight").physical);
  });

  it("reports zero percent on Armor and Elemental Resistance", () => {
    const snapshot = baseSnapshot();
    const lines = characterStatBreakdown(snapshot, fixtureContent, "knight");
    expect(lines.find((line) => line.key === "armor")?.equipment.percent).toBe(0);
    expect(lines.find((line) => line.key === "armor")?.talents.percent).toBe(0);
  });

  it("uses effective Talent and worn Equipment inputs matching characterStatsFor", () => {
    const candidate = drop({ dropId: 3, baseId: "fixture-blade" });
    const snapshot = baseSnapshot({
      progression: {
        ...createDefaultProgression(fixtureContent),
        armory: [candidate],
      },
      pendingEdits: [
        {
          kind: "talent",
          classId: "knight",
          statRanks: { "k-fortitude": 0, "k-swordcraft": 5 },
          abilityTalentId: null,
        },
      ],
    });

    const lines = characterStatBreakdown(snapshot, fixtureContent, "knight");
    const expected = characterStatsFor(snapshot, fixtureContent, "knight");
    expect(lines.map((line) => line.total)).toEqual([
      expected.maxHealth,
      expected.physical,
      expected.elemental,
      expected.armor,
      expected.elementalResistance,
    ]);
  });
});

describe("statsDifferFromCommittedCombat", () => {
  it("is false outside a Stage Attempt even with pending Talent edits", () => {
    const snapshot = baseSnapshot({
      progression: {
        ...createDefaultProgression(fixtureContent),
        characterXp: {
          ...createDefaultProgression(fixtureContent).characterXp,
          knight: 850,
        },
      },
      pendingEdits: [
        {
          kind: "talent",
          classId: "knight",
          statRanks: { "k-fortitude": 1, "k-swordcraft": 0 },
          abilityTalentId: null,
        },
      ],
    });
    expect(snapshot.attempt).toBeNull();
    expect(statsDifferFromCommittedCombat(snapshot, fixtureContent, "knight")).toBe(false);
  });

  it("is true mid-Attempt when effective Talents change combat stats", () => {
    const engine = midAttemptKnight();
    engine.allocateTalent("knight", "k-fortitude");
    const snapshot = engine.snapshot();
    expect(statsDifferFromCommittedCombat(snapshot, fixtureContent, "knight")).toBe(true);
  });

  it("is true mid-Attempt when Armory Equipment differs from Attempt loadouts", () => {
    const saved = scenario(fixtureContent).withDrops(1).build();
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.selectStage(1);
    const dropId = engine.snapshot().progression.armory[0]!.dropId;
    engine.equip(dropId, "knight", "weapon");
    const after = engine.snapshot();
    expect(statsDifferFromCommittedCombat(after, fixtureContent, "knight")).toBe(true);
  });

  it("matches characterStatsFor against committed Attempt configuration", () => {
    const engine = midAttemptKnight();
    const snapshot = engine.snapshot();
    const committed = characterStatsCommittedFor(snapshot, fixtureContent, "knight");
    const effective = characterStatsFor(snapshot, fixtureContent, "knight");
    expect(committed).toEqual(
      characterStats(
        knightKit,
        cloneClassTalentState(snapshot.progression.talents.knight!),
        equipmentModifiersForLoadout(
          snapshot.attempt!.equipmentLoadouts.knight ?? {},
          snapshot.progression.armory,
          fixtureContent,
        ),
      ),
    );
    expect(statsDifferFromCommittedCombat(snapshot, fixtureContent, "knight")).toBe(
      JSON.stringify(effective) !== JSON.stringify(committed),
    );
  });
});

function createEngineFromFixture() {
  const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
  const saved = boot.snapshot();
  saved.progression.characterXp.knight = 850;
  return createEngine(fixtureContent, saved, LOOT_SEED);
}

function midAttemptKnight() {
  const engine = createEngineFromFixture();
  engine.selectStage(1);
  return engine;
}
