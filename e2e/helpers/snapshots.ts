import { createEngine, type Engine } from "../../src/core/engine";
import { cloneSnapshot, type DropInstance, type Snapshot } from "../../src/core/snapshot";
import type { ClassId, EquipmentSlotId } from "../../src/core/types";
import { buildContent } from "../../src/data";
import { serializeEngineLegality, type SerializedEngineLegality } from "../../src/ui/engine-legality";

const DEFAULT_LOOT_SEED = 42;

function reachStageTwoFiveOpponentEngine(): Engine {
  const engine = createEngine(buildContent(), undefined, DEFAULT_LOOT_SEED);
  for (let i = 0; i < 500; i += 1) {
    engine.advanceBy(5_000);
    if (engine.snapshot().attempt?.stage === 2) {
      break;
    }
  }
  engine.selectStage(2);
  while (
    (engine.snapshot().attempt?.combatants.filter((combatant) => combatant.side === "opponent")
      .length ?? 0) < 5
  ) {
    engine.advanceBy(2_000);
  }
  return engine;
}

/** Stage 2 encounter 2 stress layout (five Opponents) for tile-geometry evidence. */
export function stageTwoFiveOpponentStressSnapshot(): Snapshot {
  const snapshot = cloneSnapshot(reachStageTwoFiveOpponentEngine().snapshot());
  snapshot.savedAtMs = Date.now();
  return snapshot;
}

/** Same layout with Opponents knocked out so one advance awards the Wave 2 Drop. */
export function stageTwoFiveOpponentDropSnapshot(): Snapshot {
  const snapshot = cloneSnapshot(reachStageTwoFiveOpponentEngine().snapshot());
  snapshot.savedAtMs = Date.now();
  const attempt = snapshot.attempt;
  if (!attempt) {
    throw new Error("stageTwoFiveOpponentDropSnapshot: missing Attempt");
  }
  for (const combatant of attempt.combatants) {
    if (combatant.side === "opponent") {
      combatant.health = 0;
      combatant.knockedOut = true;
      combatant.action = null;
    }
  }
  return snapshot;
}

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

/** Twelve unequipped Common salvage candidates plus the equipped review set. */
export function armorySalvageSnapshot(): Snapshot {
  const snapshot = armoryReviewSnapshot();
  const salvageCommons: DropInstance[] = Array.from({ length: 12 }, (_, index) => ({
    dropId: 200 + index,
    baseId: index % 3 === 0 ? "thornquill-blade" : index % 3 === 1 ? "leafmail-vest" : "berrybright-charm",
    itemLevel: ((index % 3) + 1) as 1 | 2 | 3,
    rarity: "common" as const,
    affixes: [],
    awardedAtMs: 25_000 - index,
    seen: true,
    locked: false,
    assignedTo: null,
  }));
  snapshot.progression.armory = [...snapshot.progression.armory, ...salvageCommons];
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
