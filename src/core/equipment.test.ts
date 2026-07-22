import { describe, expect, it } from "vitest";
import { initialLootRngState } from "./rng";
import {
  assignDrop,
  discardDrops,
  rollDrop,
  snapshotEquipmentLoadouts,
  tierForItemLevel,
} from "./equipment";
import type { DropInstance } from "./snapshot";
import { fixtureContent, fourTierFixtureContent } from "./testing/fixture-content";
import type { AffixId, ClassId, ItemLevel } from "./types";

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

describe("tierForItemLevel", () => {
  it("maps Item Levels 1–2/I, 3/II, 4–5/III, and 6/IV", () => {
    expect(tierForItemLevel(1)).toBe(1);
    expect(tierForItemLevel(2)).toBe(1);
    expect(tierForItemLevel(3)).toBe(2);
    expect(tierForItemLevel(4)).toBe(3);
    expect(tierForItemLevel(5)).toBe(3);
    expect(tierForItemLevel(6)).toBe(4);
  });
});

describe("Equipment Tier III/IV rolling", () => {
  const STAGE_IV = fourTierFixtureContent.stages[0]!;

  it("locks a Tier III roll to Tier III bases and Affix bands", () => {
    const rolled = rollDrop({
      content: fourTierFixtureContent,
      stage: STAGE_IV,
      itemLevel: 4,
      lootRng: { state: initialLootRngState(0xbeef) },
      dropId: 7,
      awardedAtMs: 700,
    });
    expect(rolled.drop.itemLevel).toBe(4);
    expect(rolled.drop.baseId).toBe("fixture-armor-iii");
    expect(rolled.drop.rarity).toBe("common");
    expect(rolled.drop.affixes).toEqual([]);
  });

  it("locks a Tier IV roll to Tier IV bases and Affix bands", () => {
    const rolled = rollDrop({
      content: fourTierFixtureContent,
      stage: STAGE_IV,
      itemLevel: 6,
      lootRng: { state: initialLootRngState(0xbeef) },
      dropId: 8,
      awardedAtMs: 800,
    });
    expect(rolled.drop.itemLevel).toBe(6);
    expect(rolled.drop.baseId).toBe("fixture-armor-iv");
    expect(rolled.drop.rarity).toBe("common");
    expect(rolled.drop.affixes).toEqual([]);
  });

  it("preserves Item Level 1–3 seeded rolls and next RNG state", () => {
    const cases: Array<{ itemLevel: ItemLevel; baseId: string; affixValue: number }> = [
      { itemLevel: 1, baseId: "fixture-armor", affixValue: 0.04 },
      { itemLevel: 2, baseId: "fixture-armor", affixValue: 0.04 },
      { itemLevel: 3, baseId: "fixture-armor-ii", affixValue: 0.06 },
    ];

    for (const { itemLevel, baseId, affixValue } of cases) {
      const rolled = rollDrop({
        content: fixtureContent,
        stage: STAGE,
        itemLevel,
        lootRng: { state: initialLootRngState(LOOT_SEED) },
        dropId: 1,
        awardedAtMs: 100,
      });
      expect(rolled.drop).toEqual({
        dropId: 1,
        baseId,
        itemLevel,
        rarity: "uncommon",
        affixes: [{ id: "percent-max-health", value: affixValue }],
        awardedAtMs: 100,
        seen: false,
        locked: false,
        assignedTo: null,
      });
    }
  });

  it("fails Tier III rolls without Tier III catalog data instead of falling back to Tier II", () => {
    expect(() =>
      rollDrop({
        content: fixtureContent,
        stage: STAGE,
        itemLevel: 4,
        lootRng: { state: initialLootRngState(LOOT_SEED) },
        dropId: 1,
        awardedAtMs: 100,
      }),
    ).toThrow(/tier=3/i);
  });

  it("fails Tier IV rolls when Tier IV Affix bands are missing", () => {
    const missingTier4Bands = {
      ...fourTierFixtureContent,
      affixBands: fourTierFixtureContent.affixBands.map(({ tier4: _tier4, ...band }) => band),
    };

    expect(() =>
      rollDrop({
        content: missingTier4Bands,
        stage: STAGE_IV,
        itemLevel: 6,
        lootRng: { state: initialLootRngState(LOOT_SEED) },
        dropId: 1,
        awardedAtMs: 100,
      }),
    ).toThrow(/Equipment Tier 4/i);
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
