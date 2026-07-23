import { describe, expect, it } from "vitest";
import type { EngineEvent } from "../core/events";
import { cloneSnapshot, type DropInstance } from "../core/snapshot";
import { talentTierDefs } from "../core/talents";
import type { ClassId, EquipmentSlotId } from "../core/types";
import { buildContent } from "../data";
import {
  invalidatesLegality,
  legalityViewFromSerialized,
  serializeEngineLegality,
} from "./engine-legality";
import { createEngine, rosterClassIds } from "./snapshot-view";

const SLOTS: EquipmentSlotId[] = ["weapon", "armor", "charm"];
const LOOT_SEED = 42;
const content = buildContent();

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

function mixedArmorySnapshot(armory: DropInstance[]) {
  const engine = createEngine(content, undefined, LOOT_SEED);
  const snapshot = cloneSnapshot(engine.snapshot());
  snapshot.progression.armory = armory;
  return snapshot;
}

function assertCanEquipEquivalence(
  engine: ReturnType<typeof createEngine>,
  view: ReturnType<typeof legalityViewFromSerialized>,
  snapshot: ReturnType<typeof mixedArmorySnapshot>,
): void {
  for (const entry of snapshot.progression.armory) {
    for (const classId of rosterClassIds(snapshot)) {
      for (const slot of SLOTS) {
        expect(
          view.canEquip(entry.dropId, classId, slot),
          `${entry.dropId}:${classId}:${slot}`,
        ).toBe(engine.canEquip(entry.dropId, classId, slot));
      }
    }
  }
}

function serializedKeyCount(
  legality: ReturnType<typeof serializeEngineLegality>,
): number {
  return Object.values(legality).reduce(
    (count, map) => count + Object.keys(map).length,
    0,
  );
}

const EVENT_STUBS: { type: EngineEvent["type"]; event: EngineEvent }[] = [
  {
    type: "stage-attempt-started",
    event: { seq: 1, atMs: 0, type: "stage-attempt-started", stage: 1, attemptId: 1 },
  },
  {
    type: "wave-started",
    event: { seq: 1, atMs: 0, type: "wave-started", stage: 1, encounter: 1, boss: false },
  },
  {
    type: "action-started",
    event: {
      seq: 1,
      atMs: 0,
      type: "action-started",
      entityId: "e1",
      abilityId: "slash",
      impactAtMs: 100,
      targetIds: ["e2"],
    },
  },
  {
    type: "impact",
    event: {
      seq: 1,
      atMs: 0,
      type: "impact",
      entityId: "e1",
      abilityId: "slash",
      results: [
        { targetId: "e2", kind: "damage", amount: 5, healthAfter: 10 },
      ],
    },
  },
  {
    type: "status-applied",
    event: {
      seq: 1,
      atMs: 0,
      type: "status-applied",
      entityId: "e1",
      statusId: "burn",
      expiresAtMs: 500,
    },
  },
  {
    type: "status-expired",
    event: { seq: 1, atMs: 0, type: "status-expired", entityId: "e1", statusId: "burn" },
  },
  { type: "knockout", event: { seq: 1, atMs: 0, type: "knockout", entityId: "e1" } },
  { type: "revived", event: { seq: 1, atMs: 0, type: "revived", entityId: "e1", health: 50 } },
  {
    type: "wave-cleared",
    event: { seq: 1, atMs: 0, type: "wave-cleared", stage: 1, encounter: 1 },
  },
  { type: "stage-cleared", event: { seq: 1, atMs: 0, type: "stage-cleared", stage: 1 } },
  { type: "party-defeat", event: { seq: 1, atMs: 0, type: "party-defeat", stage: 1 } },
  {
    type: "xp-awarded",
    event: { seq: 1, atMs: 0, type: "xp-awarded", classId: "knight", amount: 10, totalXp: 100 },
  },
  { type: "level-up", event: { seq: 1, atMs: 0, type: "level-up", classId: "knight", level: 2 } },
  { type: "drop-awarded", event: { seq: 1, atMs: 0, type: "drop-awarded", dropId: 1 } },
  { type: "config-applied", event: { seq: 1, atMs: 0, type: "config-applied" } },
];

describe("invalidatesLegality", () => {
  it("classifies every EngineEvent variant", () => {
    const classified = new Set(EVENT_STUBS.map(({ type }) => type));
    const unionTypes: EngineEvent["type"][] = [
      "stage-attempt-started",
      "wave-started",
      "action-started",
      "impact",
      "status-applied",
      "status-expired",
      "knockout",
      "revived",
      "wave-cleared",
      "stage-cleared",
      "party-defeat",
      "xp-awarded",
      "level-up",
      "drop-awarded",
      "config-applied",
    ];
    expect(classified).toEqual(new Set(unionTypes));
    for (const { event } of EVENT_STUBS) {
      expect(typeof invalidatesLegality(event)).toBe("boolean");
    }
  });

  it("returns true for level-up, drop-awarded, and config-applied", () => {
    expect(
      invalidatesLegality({ seq: 1, atMs: 0, type: "level-up", classId: "knight", level: 2 }),
    ).toBe(true);
    expect(invalidatesLegality({ seq: 1, atMs: 0, type: "drop-awarded", dropId: 1 })).toBe(true);
    expect(invalidatesLegality({ seq: 1, atMs: 0, type: "config-applied" })).toBe(true);
  });

  it("returns false for xp-awarded without treating it as a level change", () => {
    expect(
      invalidatesLegality({
        seq: 1,
        atMs: 0,
        type: "xp-awarded",
        classId: "knight",
        amount: 10,
        totalXp: 100,
      }),
    ).toBe(false);
  });

  it("returns false for combat presentation events", () => {
    expect(
      invalidatesLegality({
        seq: 1,
        atMs: 0,
        type: "impact",
        entityId: "e1",
        abilityId: "slash",
        results: [{ targetId: "e2", kind: "damage", amount: 1, healthAfter: 9 }],
      }),
    ).toBe(false);
    expect(invalidatesLegality({ seq: 1, atMs: 0, type: "knockout", entityId: "e1" })).toBe(false);
  });

  it("invalidates when level-up appears in a batch with xp-awarded", () => {
    const xp = {
      seq: 1,
      atMs: 0,
      type: "xp-awarded" as const,
      classId: "knight" as const,
      amount: 50,
      totalXp: 200,
    };
    const levelUp = { seq: 2, atMs: 0, type: "level-up" as const, classId: "knight" as const, level: 3 };
    expect(invalidatesLegality(xp)).toBe(false);
    expect(invalidatesLegality(levelUp)).toBe(true);
    expect([xp, levelUp].some(invalidatesLegality)).toBe(true);
  });
});

describe("Dock-derived equip legality", () => {
  const mixedArmory: DropInstance[] = [
    drop({
      dropId: 1,
      baseId: "thornquill-blade",
      assignedTo: { classId: "knight", slot: "weapon" },
    }),
    drop({ dropId: 2, baseId: "dewlight-focus" }),
    drop({ dropId: 3, baseId: "moonpetal-relic" }),
    drop({ dropId: 4, baseId: "bramblesong-bow" }),
    drop({
      dropId: 5,
      baseId: "leafmail-vest",
      assignedTo: { classId: "wizard", slot: "armor" },
    }),
    drop({ dropId: 6, baseId: "berrybright-charm" }),
  ];

  it("matches Engine.canEquip for every Drop, Class, and slot in a mixed Armory", () => {
    const snapshot = mixedArmorySnapshot(mixedArmory);
    const engine = createEngine(content, snapshot, LOOT_SEED);
    const serialized = serializeEngineLegality(engine, snapshot, content);
    expect(serialized).not.toHaveProperty("equip");
    const view = legalityViewFromSerialized(serialized, snapshot, content);
    assertCanEquipEquivalence(engine, view, snapshot);
  });

  it("matches Engine.canEquip while a pendingParty edit is uncommitted", () => {
    const snapshot = mixedArmorySnapshot([
      drop({ dropId: 1, baseId: "nightvine-longbow" }),
      drop({ dropId: 2, baseId: "leafmail-vest" }),
    ]);
    const { party, reserve } = snapshot.progression;
    snapshot.progression.pendingParty = {
      members: [reserve, party[1]!, party[2]!],
      reserve: party[0]!,
    };
    expect(rosterClassIds(snapshot)).toContain("hunter" satisfies ClassId);

    const engine = createEngine(content, snapshot, LOOT_SEED);
    const view = legalityViewFromSerialized(
      serializeEngineLegality(engine, snapshot, content),
      snapshot,
      content,
    );
    assertCanEquipEquivalence(engine, view, snapshot);
    expect(view.canEquip(1, "hunter", "weapon")).toBe(true);
    expect(engine.canEquip(1, "hunter", "weapon")).toBe(true);
  });

  it("matches Engine talent legality for every Stat and Ability Talent in every shipped tier", () => {
    const engine = createEngine(content, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const serialized = serializeEngineLegality(engine, snapshot, content);
    for (const classId of rosterClassIds(snapshot)) {
      const classKit = content.classes.find((entry) => entry.id === classId);
      if (!classKit) {
        continue;
      }
      for (const tierDef of talentTierDefs(classKit)) {
        for (const statTalent of tierDef.statRow) {
          const key = `${classId}:${statTalent.id}`;
          expect(serialized.talentAllocate[key]).toBe(
            engine.canAllocateTalent(classId, statTalent.id),
          );
          expect(serialized.talentDeallocate[key]).toBe(
            engine.canDeallocateTalent(classId, statTalent.id),
          );
        }
        for (const abilityId of tierDef.abilityRow) {
          const key = `${classId}:${abilityId}`;
          expect(serialized.talentAllocate[key]).toBe(engine.canAllocateTalent(classId, abilityId));
          expect(serialized.talentDeallocate[key]).toBe(
            engine.canDeallocateTalent(classId, abilityId),
          );
        }
      }
    }
  });

  it("keeps the serialized legality key count independent of Armory size", () => {
    const small = mixedArmorySnapshot(
      Array.from({ length: 5 }, (_, index) =>
        drop({ dropId: index + 1, baseId: "leafmail-vest" }),
      ),
    );
    const large = mixedArmorySnapshot(
      Array.from({ length: 200 }, (_, index) =>
        drop({ dropId: index + 1, baseId: "leafmail-vest" }),
      ),
    );
    const smallEngine = createEngine(content, small, LOOT_SEED);
    const largeEngine = createEngine(content, large, LOOT_SEED);
    expect(
      serializedKeyCount(serializeEngineLegality(smallEngine, small, content)),
    ).toBe(serializedKeyCount(serializeEngineLegality(largeEngine, large, content)));
  });
});
