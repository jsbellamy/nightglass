import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "./engine";
import { equipmentModifiersForLoadout } from "./equipment";
import { characterStatsFor, previewEquip } from "./equipment-preview";
import { createDefaultProgression } from "./load-state";
import type { DropInstance, Snapshot } from "./snapshot";
import { characterStats } from "./stats";
import { emptyTalentState } from "./talents";
import { fixtureContent } from "./testing/fixture-content";

const LOOT_SEED = 42;

const knightKit = fixtureContent.classes.find((entry) => entry.id === "knight")!;
const fixtureBlade = fixtureContent.equipmentBases.find((entry) => entry.id === "fixture-blade")!;

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

describe("previewEquip", () => {
  it("reports fixture-authored guaranteed and Affix statistic deltas for an unequipped weapon slot", () => {
    const guaranteedPhysical = fixtureBlade.guaranteed.flat!.physical!;
    const affixPhysical = 3;
    const candidate = drop({
      dropId: 10,
      baseId: "fixture-blade",
      rarity: "uncommon",
      affixes: [{ id: "flat-physical", value: affixPhysical }],
    });
    const snapshot = baseSnapshot({
      progression: {
        ...createDefaultProgression(fixtureContent),
        armory: [candidate],
      },
    });

    const preview = previewEquip(snapshot, fixtureContent, candidate.dropId, "knight", "weapon");

    expect(preview.statDeltas).toEqual([
      {
        label: "Physical",
        before: "0",
        after: String(guaranteedPhysical + affixPhysical),
        delta: `+${guaranteedPhysical + affixPhysical}`,
      },
    ]);
  });

  it("uses the effective Talent state so Ability raw values reflect an uncommitted talent Pending Edit", () => {
    const candidate = drop({ dropId: 11, baseId: "fixture-blade" });
    const appliedTalents = emptyTalentState(knightKit);
    const snapshot = baseSnapshot({
      progression: {
        ...createDefaultProgression(fixtureContent),
        talents: {
          ...createDefaultProgression(fixtureContent).talents,
          knight: appliedTalents,
        },
        armory: [candidate],
      },
      pendingEdits: [
        {
          kind: "talent",
          classId: "knight",
          // Five Swordcraft ranks: fixture perRank physicalPower 0.05 → +25% Physical Power.
          // Knight base physical 14; blade guaranteed flat physical 2.
          // Before: floor(14 * 1.25) = 17. After: floor((14 + 2) * 1.25) = 20.
          statRanks: { "k-fortitude": 0, "k-swordcraft": 5 },
          abilityTalentId: null,
        },
      ],
    });

    const preview = previewEquip(snapshot, fixtureContent, candidate.dropId, "knight", "weapon");
    const basicChange = preview.abilityChanges.find((change) => change.abilityId === "knight-basic");

    expect(basicChange).toEqual({
      abilityId: "knight-basic",
      abilityName: "Steel Cut",
      before: "17 damage",
      after: "20 damage",
    });
  });

  it("returns real deltas for a Character present only through pendingParty membership", () => {
    const worn = drop({
      dropId: 20,
      baseId: "fixture-armor",
      assignedTo: { classId: "knight", slot: "armor" },
    });
    const candidate = drop({
      dropId: 21,
      baseId: "fixture-armor-ii",
    });
    const snapshot = baseSnapshot({
      progression: {
        ...createDefaultProgression(fixtureContent),
        party: ["wizard", "priest", "hunter"],
        reserve: "knight",
        pendingParty: {
          members: ["knight", "wizard", "priest"],
          reserve: "hunter",
        },
        armory: [worn, candidate],
      },
    });

    const preview = previewEquip(snapshot, fixtureContent, candidate.dropId, "knight", "armor");

    // fixture-armor guaranteed armor 4 → fixture-armor-ii guaranteed armor 9
    expect(preview.statDeltas).toEqual([
      { label: "Armor", before: "4", after: "9", delta: "+5" },
    ]);
  });

  it("yields only zero deltas when the candidate Drop is identical to the worn Drop", () => {
    const worn = drop({
      dropId: 30,
      baseId: "fixture-blade",
      rarity: "uncommon",
      affixes: [{ id: "flat-physical", value: 2 }],
      assignedTo: { classId: "knight", slot: "weapon" },
    });
    const snapshot = baseSnapshot({
      progression: {
        ...createDefaultProgression(fixtureContent),
        armory: [worn],
      },
    });

    const preview = previewEquip(snapshot, fixtureContent, worn.dropId, "knight", "weapon");

    expect(preview.statDeltas.length).toBeGreaterThan(0);
    expect(preview.statDeltas.every((line) => line.delta === "0")).toBe(true);
    expect(preview.statDeltas).toEqual([
      { label: "Physical", before: "4", after: "4", delta: "0" },
    ]);
    expect(preview.abilityChanges).toEqual([]);
  });

  it("preserves flat-before-percentage ordering when a Drop carries both modifier kinds", () => {
    // Fixture blade: guaranteed flat physical 2. Affix percent-physical-power 0.04.
    // Knight base physical 14 → floor((14 + 2) * 1.04) = 16, not floor(14 * 1.04) + 2 = 16
    // (same here) — use a percent that diverges: 0.25 with flat 2 → floor(16 * 1.25) = 20
    // vs wrong percent-then-add: floor(14 * 1.25) + 2 = 19.
    const candidate = drop({
      dropId: 40,
      baseId: "fixture-blade",
      rarity: "uncommon",
      affixes: [{ id: "percent-physical-power", value: 0.25 }],
    });
    const snapshot = baseSnapshot({
      progression: {
        ...createDefaultProgression(fixtureContent),
        armory: [candidate],
      },
    });

    const preview = previewEquip(snapshot, fixtureContent, candidate.dropId, "knight", "weapon");
    const basicChange = preview.abilityChanges.find((change) => change.abilityId === "knight-basic");

    expect(basicChange?.after).toBe("20 damage");
  });
});

describe("characterStatsFor", () => {
  it("returns the same BaseStats the Engine derives for the Character and Snapshot", () => {
    const worn = drop({
      dropId: 50,
      baseId: "fixture-blade",
      assignedTo: { classId: "knight", slot: "weapon" },
    });
    const progression = createDefaultProgression(fixtureContent);
    progression.armory = [worn];
    progression.characterXp.knight = 850;
    progression.talents.knight = {
      ...emptyTalentState(knightKit),
      statRanks: { "k-fortitude": 1, "k-swordcraft": 2 },
    };

    const engine = createEngine(
      fixtureContent,
      baseSnapshot({ progression }),
      LOOT_SEED,
    );
    engine.selectStage(1);
    const snapshot = engine.snapshot();

    const talentState = snapshot.progression.talents.knight!;
    const loadout = snapshot.attempt!.equipmentLoadouts.knight ?? {};
    const engineDerived = characterStats(
      knightKit,
      talentState,
      equipmentModifiersForLoadout(loadout, snapshot.progression.armory, fixtureContent),
    );

    expect(characterStatsFor(snapshot, fixtureContent, "knight")).toEqual(engineDerived);
  });

  it("gives previewEquip the same current BaseStats as characterStatsFor", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "equipment-preview.ts"),
      "utf8",
    );
    const previewBody = source.slice(source.indexOf("export function previewEquip"));
    expect(previewBody).toMatch(/characterStatsFor\(/);
    expect(previewBody.match(/statsForEquipmentLoadout\(/g)?.length).toBe(1);
  });
});
