import { describe, expect, it } from "vitest";
import type { EngineEvent } from "../core/events";
import { invalidatesLegality } from "./engine-legality";

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
