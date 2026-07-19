import { describe, expect, it } from "vitest";
import { initialLootRngState } from "./rng";
import {
  assignDrop,
  discardDrops,
  rollDrop,
  snapshotEquipmentLoadouts,
} from "./equipment";
import type { DropInstance } from "./snapshot";
import { fixtureContent } from "./testing/fixture-content";
import type { AffixId, ClassId } from "./types";

const LOOT_SEED = 0x5090;
const STAGE = fixtureContent.stages[0]!;

function rollSequence(seed: number, count: number): DropInstance[] {
  let lootRng = { state: initialLootRngState(seed) };
  const drops: DropInstance[] = [];
  for (let dropId = 1; dropId <= count; dropId += 1) {
    const result = rollDrop({
      content: fixtureContent,
      stage: STAGE,
      itemLevel: 1,
      lootRng,
      dropId,
      awardedAtMs: dropId * 100,
    });
    lootRng = result.lootRng;
    drops.push(result.drop);
  }
  return drops;
}

describe("Equipment Drop rolling", () => {
  it("locks the full roll order for a recorded seed", () => {
    const [first, second] = rollSequence(LOOT_SEED, 2);
    expect(first).toEqual({
      dropId: 1,
      baseId: "fixture-armor",
      itemLevel: 1,
      rarity: "uncommon",
      affixes: [{ id: "percent-max-health", value: 0.04 }],
      awardedAtMs: 100,
      seen: false,
      locked: false,
      assignedTo: null,
    });
    expect(second).toEqual({
      dropId: 2,
      baseId: "fixture-charm",
      itemLevel: 1,
      rarity: "common",
      affixes: [],
      awardedAtMs: 200,
      seen: false,
      locked: false,
      assignedTo: null,
    });
  });

  it("produces the same next Drop after a loot-stream snapshot round-trip", () => {
    const continuous = rollSequence(LOOT_SEED, 1);
    let lootRng = { state: initialLootRngState(LOOT_SEED) };
    const first = rollDrop({
      content: fixtureContent,
      stage: STAGE,
      itemLevel: 1,
      lootRng,
      dropId: 1,
      awardedAtMs: 100,
    });
    lootRng = first.lootRng;

    const restored = rollDrop({
      content: fixtureContent,
      stage: STAGE,
      itemLevel: 1,
      lootRng: { state: lootRng.state },
      dropId: 2,
      awardedAtMs: 200,
    });

    expect(continuous[0]).toEqual(first.drop);
    expect(restored.drop).toEqual(rollSequence(LOOT_SEED, 2)[1]);
  });

  it("steps rarity odds via crafted stream positions instead of statistics", () => {
    const seeds: Array<{ seed: number; rarity: DropInstance["rarity"] }> = [
      { seed: 0x2, rarity: "common" },
      { seed: 0x1, rarity: "uncommon" },
      { seed: 0x3, rarity: "rare" },
      { seed: 0x19, rarity: "epic" },
    ];

    for (const entry of seeds) {
      const [drop] = rollSequence(entry.seed, 1);
      expect(drop!.rarity).toBe(entry.rarity);
    }
  });

  it("rolls Affix types without replacement from the eligible slot pool", () => {
    const affixes: AffixId[] = [];
    let lootRng = { state: initialLootRngState(0x19) };
    const rolled = rollDrop({
      content: fixtureContent,
      stage: STAGE,
      itemLevel: 1,
      lootRng,
      dropId: 1,
      awardedAtMs: 100,
    });
    lootRng = rolled.lootRng;
    affixes.push(...rolled.drop.affixes.map((affix) => affix.id));
    expect(rolled.drop.rarity).toBe("epic");
    expect(new Set(affixes).size).toBe(affixes.length);
    expect(affixes).toHaveLength(3);
  });

  it("applies the Boss second-Drop Uncommon floor without rerolling slot, Base, or Item Level", () => {
    let lootRng = { state: initialLootRngState(0x8888) };
    const withoutFloor = rollDrop({
      content: fixtureContent,
      stage: STAGE,
      itemLevel: 1,
      lootRng,
      dropId: 1,
      awardedAtMs: 100,
    });
    expect(withoutFloor.drop.rarity).toBe("common");

    lootRng = { state: initialLootRngState(0x8888) };
    const withFloor = rollDrop({
      content: fixtureContent,
      stage: STAGE,
      itemLevel: 1,
      lootRng,
      dropId: 2,
      awardedAtMs: 200,
      uncommonFloor: true,
    });
    expect(withFloor.drop.baseId).toBe("fixture-bow");
    expect(withFloor.drop.itemLevel).toBe(withoutFloor.drop.itemLevel);
    expect(withFloor.drop.rarity).toBe("uncommon");
    expect(withFloor.drop.affixes).toHaveLength(1);
  });
});

describe("Armory assignment", () => {
  it("empties the other slot when a piece is assigned exclusively elsewhere", () => {
    const armory: DropInstance[] = [
      {
        dropId: 1,
        baseId: "fixture-blade",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 1,
        seen: false,
        locked: false,
        assignedTo: { classId: "knight", slot: "weapon" },
      },
      {
        dropId: 2,
        baseId: "fixture-blade",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 2,
        seen: false,
        locked: false,
        assignedTo: { classId: "wizard", slot: "weapon" },
      },
    ];

    assignDrop(armory, 2, "knight", "weapon");
    expect(armory[0]?.assignedTo).toBeNull();
    expect(armory[1]?.assignedTo).toEqual({ classId: "knight", slot: "weapon" });
  });

  it("rejects discard for equipped or Locked pieces", () => {
    const armory: DropInstance[] = [
      {
        dropId: 1,
        baseId: "fixture-armor",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 1,
        seen: false,
        locked: false,
        assignedTo: { classId: "knight", slot: "armor" },
      },
      {
        dropId: 2,
        baseId: "fixture-charm",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 2,
        seen: false,
        locked: true,
        assignedTo: null,
      },
    ];

    expect(() => discardDrops(armory, [1])).toThrow(/equipped/i);
    expect(() => discardDrops(armory, [2])).toThrow(/Locked/i);
  });

  it("snapshots assignments into per-Class Equipment Loadouts", () => {
    const armory: DropInstance[] = [
      {
        dropId: 10,
        baseId: "fixture-blade",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 1,
        seen: false,
        locked: false,
        assignedTo: { classId: "knight", slot: "weapon" },
      },
    ];
    const roster: ClassId[] = ["knight", "wizard", "priest"];
    expect(snapshotEquipmentLoadouts(armory, roster)).toEqual({
      knight: { weapon: 10 },
      wizard: {},
      priest: {},
    });
  });
});
