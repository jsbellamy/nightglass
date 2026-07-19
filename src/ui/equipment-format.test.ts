import { describe, expect, it } from "vitest";
import { fixtureContent } from "../core/testing/fixture-content";
import type { DropInstance } from "../core/snapshot";
import {
  compareEquipmentStatDeltas,
  filterArmoryDrops,
  formatRarityLabel,
  equipmentBaseInitials,
  hasUnseenArmoryDrops,
  rareOrEpicDropNames,
  sortArmoryDrops,
} from "./equipment-format";

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
      { label: "Physical", before: "2", after: "5", delta: "+3" },
    ]);
  });

  it("detects unseen drops and rare/epic discard names", () => {
    expect(hasUnseenArmoryDrops(armory)).toBe(true);
    expect(hasUnseenArmoryDrops(armory.map((entry) => ({ ...entry, seen: true })))).toBe(false);
    expect(rareOrEpicDropNames(armory, fixtureContent)).toEqual([
      "Fixture Armor",
      "Fixture Blade II",
    ]);
  });
});
