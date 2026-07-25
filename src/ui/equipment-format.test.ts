import { describe, expect, it } from "vitest";
import { fixtureContent } from "../core/testing/fixture-content";
import type { DropInstance } from "../core/snapshot";
import {
  filterArmoryDrops,
  formatAffix,
  formatRarityLabel,
  equipmentBaseInitials,
  rareOrEpicDropNames,
  sortArmoryDrops,
  sweepableDropsAtItemLevel,
  sweepableItemLevels,
} from "./equipment-format";
import { compareEquipmentStatDeltas } from "./snapshot-view";

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

describe("equipment-format filters and sorts", () => {
  const armory: DropInstance[] = [
    drop({ dropId: 1, baseId: "fixture-blade", awardedAtMs: 100, seen: false, rarity: "common" }),
    drop({
      dropId: 2,
      baseId: "fixture-armor",
      awardedAtMs: 200,
      seen: true,
      rarity: "rare",
      locked: true,
      assignedTo: { classId: "knight", slot: "armor" },
    }),
    drop({
      dropId: 3,
      baseId: "fixture-blade-ii",
      itemLevel: 3,
      awardedAtMs: 300,
      seen: false,
      rarity: "epic",
    }),
    drop({
      dropId: 4,
      baseId: "fixture-focus",
      awardedAtMs: 150,
      seen: true,
      rarity: "uncommon",
    }),
  ];

  it("defaults to Unseen first, then newest", () => {
    const sorted = sortArmoryDrops(armory, "default", fixtureContent);
    expect(sorted.map((entry) => entry.dropId)).toEqual([3, 1, 2, 4]);
  });

  it("sorts by newest, Rarity, Tier, and name", () => {
    expect(sortArmoryDrops(armory, "newest", fixtureContent).map((entry) => entry.dropId)).toEqual([
      3, 2, 4, 1,
    ]);
    expect(sortArmoryDrops(armory, "rarity", fixtureContent).map((entry) => entry.dropId)).toEqual([
      3, 2, 4, 1,
    ]);
    expect(sortArmoryDrops(armory, "tier", fixtureContent).map((entry) => entry.dropId)).toEqual([
      3, 2, 4, 1,
    ]);
    const byName = sortArmoryDrops(armory, "name", fixtureContent).map((entry) => entry.dropId);
    expect(byName[0]).toBe(2);
    expect(byName).toContain(1);
    expect(byName).toContain(3);
    expect(byName).toContain(4);
  });

  it("applies each filter and combinations", () => {
    expect(
      filterArmoryDrops(armory, { slot: "weapon" }, fixtureContent).map((entry) => entry.dropId),
    ).toEqual([1, 3, 4]);
    expect(
      filterArmoryDrops(armory, { weaponClass: "knight" }, fixtureContent).map(
        (entry) => entry.dropId,
      ),
    ).toEqual([1, 3]);
    expect(
      filterArmoryDrops(armory, { tier: 2 }, fixtureContent).map((entry) => entry.dropId),
    ).toEqual([3]);
    expect(
      filterArmoryDrops(armory, { rarity: "rare" }, fixtureContent).map((entry) => entry.dropId),
    ).toEqual([2]);
    expect(
      filterArmoryDrops(armory, { assigned: "assigned" }, fixtureContent).map(
        (entry) => entry.dropId,
      ),
    ).toEqual([2]);
    expect(
      filterArmoryDrops(armory, { assigned: "available" }, fixtureContent).map(
        (entry) => entry.dropId,
      ),
    ).toEqual([1, 3, 4]);
    expect(
      filterArmoryDrops(armory, { locked: true }, fixtureContent).map((entry) => entry.dropId),
    ).toEqual([2]);
    expect(
      filterArmoryDrops(armory, { unseen: true }, fixtureContent).map((entry) => entry.dropId),
    ).toEqual([1, 3]);
    expect(
      filterArmoryDrops(
        armory,
        { slot: "weapon", weaponClass: "knight", unseen: true },
        fixtureContent,
      ).map((entry) => entry.dropId),
    ).toEqual([1, 3]);
  });

  it("formats rarity text and icon initials", () => {
    expect(formatRarityLabel("rare")).toBe("Rare");
    expect(equipmentBaseInitials("Fixture Blade")).toBe("FB");
    expect(equipmentBaseInitials("Leafmail")).toBe("LE");
  });

  it("computes stat deltas between two modifier sets", () => {
    const lines = compareEquipmentStatDeltas(
      [{ flat: { physical: 2 } }],
      [{ flat: { physical: 5 } }],
    );
    expect(lines).toEqual([
      { label: "Physical Power", before: "2", after: "5", delta: "+3" },
    ]);
  });

  it("omits zero-delta stat rows", () => {
    const lines = compareEquipmentStatDeltas(
      [{ flat: { physical: 5 } }],
      [{ flat: { physical: 5 } }],
    );
    expect(lines).toEqual([]);
  });

  it("detects rare/epic discard names", () => {
    expect(rareOrEpicDropNames(armory, fixtureContent)).toEqual([
      "Fixture Armor",
      "Fixture Blade II",
    ]);
  });
});

describe("Item Level sweep eligibility", () => {
  const armory: DropInstance[] = [
    drop({ dropId: 10, baseId: "fixture-blade", itemLevel: 1 }),
    drop({
      dropId: 11,
      baseId: "fixture-armor",
      itemLevel: 1,
      locked: true,
    }),
    drop({
      dropId: 12,
      baseId: "fixture-charm",
      itemLevel: 1,
      assignedTo: { classId: "knight", slot: "charm" },
    }),
    drop({ dropId: 20, baseId: "fixture-blade-ii", itemLevel: 2, rarity: "rare" }),
    drop({ dropId: 21, baseId: "fixture-focus", itemLevel: 2 }),
    drop({ dropId: 30, baseId: "fixture-blade", itemLevel: 3, rarity: "epic" }),
    drop({ dropId: 31, baseId: "fixture-armor", itemLevel: 3 }),
  ];

  it("lists sweepable drops at an Item Level in ascending dropId order", () => {
    expect(sweepableDropsAtItemLevel(armory, 1).map((entry) => entry.dropId)).toEqual([10]);
    expect(sweepableDropsAtItemLevel(armory, 2).map((entry) => entry.dropId)).toEqual([20, 21]);
    expect(sweepableDropsAtItemLevel(armory, 3).map((entry) => entry.dropId)).toEqual([30, 31]);
  });

  it("lists Item Levels with sweepable counts in ascending order", () => {
    expect(sweepableItemLevels(armory)).toEqual([
      { itemLevel: 1, count: 1 },
      { itemLevel: 2, count: 2 },
      { itemLevel: 3, count: 2 },
    ]);
  });
});

const NEW_AFFIX_IDS = [
  "flat-fire",
  "percent-fire-power",
  "flat-frost",
  "percent-frost-power",
  "flat-lightning",
  "percent-lightning-power",
  "flat-light",
  "percent-light-power",
  "flat-crit-chance",
  "flat-crit-damage",
] as const;

describe("formatAffix", () => {
  it.each(NEW_AFFIX_IDS)("formats %s as readable text", (id) => {
    const text = formatAffix({ id, value: 0.07 });
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toBe(id);
  });

  it("formats flat-crit-chance on the percent scale", () => {
    expect(formatAffix({ id: "flat-crit-chance", value: 0.07 })).toBe("+7% Critical Chance");
  });

  it("formats flat-crit-damage on the percent scale", () => {
    expect(formatAffix({ id: "flat-crit-damage", value: 0.25 })).toBe("+25% Critical Damage");
  });

  it("names every Affix with the same statistic vocabulary the Talent tiles use", () => {
    expect(formatAffix({ id: "flat-spell", value: 16 })).toBe("+16 Spell Power");
    expect(formatAffix({ id: "percent-spell-power", value: 0.14 })).toBe("+14% Spell Power");
    expect(formatAffix({ id: "flat-fire", value: 5 })).toBe("+5 Fire Power");
    expect(formatAffix({ id: "percent-fire-power", value: 0.08 })).toBe("+8% Fire Power");
    expect(formatAffix({ id: "flat-frost", value: 6 })).toBe("+6 Frost Power");
    expect(formatAffix({ id: "percent-frost-power", value: 0.14 })).toBe("+14% Frost Power");
    expect(formatAffix({ id: "flat-lightning", value: 9 })).toBe("+9 Lightning Power");
    expect(formatAffix({ id: "percent-lightning-power", value: 0.2 })).toBe("+20% Lightning Power");
    expect(formatAffix({ id: "flat-light", value: 12 })).toBe("+12 Light Power");
    expect(formatAffix({ id: "percent-light-power", value: 0.28 })).toBe("+28% Light Power");
  });
});
