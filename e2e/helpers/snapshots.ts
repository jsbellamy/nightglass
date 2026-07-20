import { expect, type Page } from "@playwright/test";
import { createEngine } from "../../src/core/engine";
import { cloneSnapshot, type DropInstance, type Snapshot } from "../../src/core/snapshot";
import type { ClassId, EquipmentSlotId } from "../../src/core/types";
import { buildContent } from "../../src/data";
import { postBusSnapshot } from "./bus";

export function talentsReadySnapshot(): Snapshot {
  const boot = createEngine(buildContent(), undefined, 42);
  boot.advanceBy(1);
  const snapshot = cloneSnapshot(boot.snapshot());
  snapshot.progression.characterXp.knight = 850;
  return snapshot;
}

export function armoryKeyboardSnapshot(): Snapshot {
  const engine = createEngine(buildContent(), undefined, 42);
  const snapshot = cloneSnapshot(engine.snapshot());
  snapshot.progression.armory = [
    {
      dropId: 1,
      baseId: "thornquill-blade",
      itemLevel: 3,
      rarity: "rare",
      affixes: [],
      awardedAtMs: 10_000,
      seen: false,
      locked: false,
      assignedTo: null,
    },
  ];
  return snapshot;
}

export function armoryColourSnapshot(): Snapshot {
  const engine = createEngine(buildContent(), undefined, 42);
  const snapshot = cloneSnapshot(engine.snapshot());
  const equipped: [string, ClassId, EquipmentSlotId][] = [
    ["thornquill-blade", "knight", "weapon"],
    ["leafmail-vest", "knight", "armor"],
  ];
  const armory: DropInstance[] = equipped.map((entry, index) => ({
    dropId: index + 1,
    baseId: entry[0],
    itemLevel: 1,
    rarity: index === 0 ? "rare" : "common",
    affixes: [],
    awardedAtMs: 10_000 - index,
    seen: true,
    locked: index === 0,
    assignedTo: { classId: entry[1], slot: entry[2] },
  }));
  armory.push({
    dropId: 99,
    baseId: "starfruit-prism",
    itemLevel: 2,
    rarity: "epic",
    affixes: [],
    awardedAtMs: 20_000,
    seen: true,
    locked: true,
    assignedTo: null,
  });
  snapshot.progression.armory = armory;
  return snapshot;
}

/** Re-seed the dock until the epic fixture wins over live tile pump snapshots. */
export async function stabilizeArmoryColourFixture(dock: Page): Promise<void> {
  const snapshot = armoryColourSnapshot();
  const epicName = dock.locator(
    ".armory-collection .equipment-card.rarity-epic .equipment-name",
  );
  await expect
    .poll(
      async () => {
        await postBusSnapshot(dock, snapshot);
        return (await epicName.textContent())?.trim() ?? "";
      },
      { timeout: 10_000 },
    )
    .not.toBe("");
}

export function keyboardBootSnapshot(): Snapshot {
  const snapshot = talentsReadySnapshot();
  snapshot.progression.armory = armoryKeyboardSnapshot().progression.armory;
  return snapshot;
}

export function stageThreeStressSnapshot(): Snapshot {
  const engine = createEngine(buildContent(), undefined, 42);
  const snapshot = cloneSnapshot(engine.snapshot());
  snapshot.progression.unlockedStage = 3;
  return snapshot;
}
