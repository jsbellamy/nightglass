import { createEngine } from "../../src/core/engine";
import { cloneSnapshot, type DropInstance, type Snapshot } from "../../src/core/snapshot";
import type { ClassId, EquipmentSlotId } from "../../src/core/types";
import { buildContent } from "../../src/data";
import { serializeEngineLegality, type SerializedEngineLegality } from "../../src/ui/engine-legality";

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

/** Deterministic Armory review grid: equipped drops 1–12 plus unequipped 100–103. */
export function armoryReviewSnapshot(): Snapshot {
  const engine = createEngine(buildContent(), undefined, 42);
  const snapshot = cloneSnapshot(engine.snapshot());
  const equipped: [string, ClassId, EquipmentSlotId][] = [
    ["thornquill-blade", "knight", "weapon"],
    ["leafmail-vest", "knight", "armor"],
    ["berrybright-charm", "knight", "charm"],
    ["dewlight-focus", "wizard", "weapon"],
    ["plumweave-aegis", "wizard", "armor"],
    ["gloamberry-locket", "wizard", "charm"],
    ["moonpetal-relic", "priest", "weapon"],
    ["plumweave-aegis", "priest", "armor"],
    ["berrybright-charm", "priest", "charm"],
    ["bramblesong-bow", "hunter", "weapon"],
    ["leafmail-vest", "hunter", "armor"],
    ["gloamberry-locket", "hunter", "charm"],
  ];
  const armory: DropInstance[] = equipped.map((entry, index) => ({
    dropId: index + 1,
    baseId: entry[0],
    itemLevel: 1,
    rarity: index % 4 === 0 ? "rare" : "common",
    affixes: [],
    awardedAtMs: 10_000 - index,
    seen: true,
    locked: false,
    assignedTo: { classId: entry[1], slot: entry[2] },
  }));
  armory.push({
    dropId: 100,
    baseId: "starfruit-prism",
    itemLevel: 2,
    rarity: "epic",
    affixes: [],
    awardedAtMs: 20_000,
    seen: false,
    locked: false,
    assignedTo: null,
  });
  armory.push(
    {
      dropId: 101,
      baseId: "thornquill-blade",
      itemLevel: 1,
      rarity: "common",
      affixes: [],
      awardedAtMs: 19_000,
      seen: true,
      locked: false,
      assignedTo: null,
    },
    {
      dropId: 102,
      baseId: "leafmail-vest",
      itemLevel: 1,
      rarity: "common",
      affixes: [],
      awardedAtMs: 18_000,
      seen: true,
      locked: false,
      assignedTo: null,
    },
    {
      dropId: 103,
      baseId: "berrybright-charm",
      itemLevel: 1,
      rarity: "uncommon",
      affixes: [],
      awardedAtMs: 17_000,
      seen: true,
      locked: false,
      assignedTo: null,
    },
  );
  snapshot.progression.armory = armory;
  return snapshot;
}

export function engineLegalityForSnapshot(snapshot: Snapshot): SerializedEngineLegality {
  const content = buildContent();
  const engine = createEngine(content, snapshot, 42);
  return serializeEngineLegality(engine, snapshot, content);
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

/** Knight carries Hold the Line for effect-image-loading evidence (#467). */
export function holdTheLineStatusSnapshot(): Snapshot {
  const engine = createEngine(buildContent(), undefined, 42);
  engine.advanceBy(1);
  const snapshot = cloneSnapshot(engine.snapshot());
  const knight = snapshot.attempt?.combatants.find(
    (combatant) => combatant.side === "party" && combatant.defId === "knight",
  );
  if (!knight) {
    throw new Error("holdTheLineStatusSnapshot: missing Knight combatant");
  }
  knight.statuses = [
    { statusId: "hold-the-line", expiresAtMs: snapshot.simNowMs + 6_000 },
  ];
  snapshot.savedAtMs = Date.now();
  return snapshot;
}
