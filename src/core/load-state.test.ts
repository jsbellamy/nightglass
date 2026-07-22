import { describe, expect, it, vi } from "vitest";
import { createEngine, SCHEMA_VERSION } from "./engine";
import {
  createDefaultProgression,
  parseStoredSave,
  SAVE_SCHEMA_VERSION,
} from "./load-state";
import { content as testContent } from "../data";
import type { Snapshot } from "./snapshot";

const LOOT_SEED = 42;

describe("parseStoredSave", () => {
  it("corrupt JSON logs once and starts a fresh game", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const parsed = parseStoredSave("{not-json", testContent);
    expect(parsed.kind).toBe("fresh");
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("schemaVersion mismatch recovers durable progression and discards the in-flight Attempt", () => {
    const engine = createEngine(testContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const saved = engine.snapshot();
    saved.schemaVersion = SAVE_SCHEMA_VERSION + 99;
    saved.progression.unlockedStage = 2;
    saved.attempt = saved.attempt
      ? { ...saved.attempt, encounter: 2, stage: 2 }
      : null;

    const parsed = parseStoredSave(JSON.stringify(saved), testContent);
    expect(parsed.kind).toBe("tolerant");
    if (parsed.kind !== "tolerant") {
      return;
    }
    expect(parsed.snapshot.progression.unlockedStage).toBe(2);
    expect(parsed.snapshot.attempt).toBeNull();
    expect(parsed.snapshot.pendingEdits).toEqual([]);

    const restored = createEngine(testContent, parsed.snapshot, LOOT_SEED);
    expect(restored.snapshot().attempt).toMatchObject({ stage: 2, encounter: 1 });
  });

  it("exact-version restore keeps the in-flight Attempt", () => {
    const engine = createEngine(testContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const saved = engine.snapshot();
    saved.attempt = saved.attempt ? { ...saved.attempt, encounter: 2 } : null;
    expect(saved.schemaVersion).toBe(SCHEMA_VERSION);

    const parsed = parseStoredSave(JSON.stringify(saved), testContent);
    expect(parsed.kind).toBe("exact");
    if (parsed.kind !== "exact") {
      return;
    }
    expect(parsed.snapshot.attempt?.encounter).toBe(2);

    const restored = createEngine(testContent, parsed.snapshot, LOOT_SEED);
    expect(restored.snapshot().attempt?.encounter).toBe(2);
  });

  it("structurally damaged exact-version save recovers durable fields only", () => {
    const engine = createEngine(testContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const saved = engine.snapshot();
    const raw = JSON.parse(JSON.stringify(saved)) as Record<string, unknown>;
    raw["pendingEdits"] = "not-an-array";

    const parsed = parseStoredSave(JSON.stringify(raw), testContent);
    expect(parsed.kind).toBe("tolerant");
    if (parsed.kind !== "tolerant") {
      return;
    }
    expect(parsed.snapshot.attempt).toBeNull();
    expect(parsed.snapshot.progression.unlockedStage).toBe(saved.progression.unlockedStage);
  });

  it("current-schema save with Stage and Item Level 1–3 round-trips without data loss", () => {
    const progression = createDefaultProgression(testContent);
    progression.unlockedStage = 3;
    progression.armory = [
      {
        dropId: 1,
        baseId: "knight-blade",
        itemLevel: 2,
        rarity: "rare",
        affixes: [],
        awardedAtMs: 100,
        seen: true,
        locked: false,
        assignedTo: null,
      },
      {
        dropId: 2,
        baseId: "wizard-staff",
        itemLevel: 3,
        rarity: "common",
        affixes: [],
        awardedAtMs: 200,
        seen: false,
        locked: true,
        assignedTo: null,
      },
    ];
    const snapshot: Snapshot = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAtMs: 1,
      simNowMs: 2,
      lootRngState: 3,
      nextEventSeq: 4,
      nextAttemptId: 5,
      nextDropId: 6,
      progression,
      attempt: null,
      pendingEdits: [],
    };

    const parsed = parseStoredSave(JSON.stringify(snapshot), testContent);
    expect(parsed.kind).toBe("exact");
    if (parsed.kind !== "exact") {
      return;
    }
    expect(parsed.snapshot.progression.unlockedStage).toBe(3);
    expect(parsed.snapshot.progression.armory).toEqual(progression.armory);
  });

  it.each([4, 5, 6] as const)(
    "exact-schema save preserves unlockedStage %i and itemLevel %i in armory",
    (stage) => {
      const progression = createDefaultProgression(testContent);
      const raw = {
        schemaVersion: SAVE_SCHEMA_VERSION,
        savedAtMs: 0,
        simNowMs: 0,
        lootRngState: 0,
        nextEventSeq: 1,
        nextAttemptId: 1,
        nextDropId: 1,
        progression: {
          ...progression,
          unlockedStage: stage,
          armory: [
            {
              dropId: 1,
              baseId: "knight-blade",
              itemLevel: stage,
              rarity: "common",
              affixes: [],
              awardedAtMs: 0,
              seen: false,
              locked: false,
              assignedTo: null,
            },
          ],
        },
        attempt: null,
        pendingEdits: [],
      };

      const parsed = parseStoredSave(JSON.stringify(raw), testContent);
      expect(parsed.kind).toBe("exact");
      if (parsed.kind !== "exact") {
        return;
      }
      expect(parsed.snapshot.progression.unlockedStage).toBe(stage);
      expect(parsed.snapshot.progression.armory[0]?.itemLevel).toBe(stage);
    },
  );

  it.each([0, 7, 1.5, "2", Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid unlockedStage %p to default Stage 1",
    (invalid) => {
      const progression = createDefaultProgression(testContent);
      const raw = {
        schemaVersion: SAVE_SCHEMA_VERSION,
        savedAtMs: 0,
        simNowMs: 0,
        lootRngState: 0,
        nextEventSeq: 1,
        nextAttemptId: 1,
        nextDropId: 1,
        progression: { ...progression, unlockedStage: invalid },
        attempt: null,
        pendingEdits: [],
      };

      const parsed = parseStoredSave(JSON.stringify(raw), testContent);
      expect(parsed.kind).toBe("exact");
      if (parsed.kind !== "exact") {
        return;
      }
      expect(parsed.snapshot.progression.unlockedStage).toBe(1);
    },
  );

  it.each([0, 7, 1.5, "3", Number.NaN])(
    "drops armory entries with invalid itemLevel %p",
    (invalid) => {
      const progression = createDefaultProgression(testContent);
      const raw = {
        schemaVersion: SAVE_SCHEMA_VERSION,
        savedAtMs: 0,
        simNowMs: 0,
        lootRngState: 0,
        nextEventSeq: 1,
        nextAttemptId: 1,
        nextDropId: 1,
        progression: {
          ...progression,
          armory: [
            {
              dropId: 1,
              baseId: "knight-blade",
              itemLevel: invalid,
              rarity: "common",
              affixes: [],
              awardedAtMs: 0,
              seen: false,
              locked: false,
              assignedTo: null,
            },
          ],
        },
        attempt: null,
        pendingEdits: [],
      };

      const parsed = parseStoredSave(JSON.stringify(raw), testContent);
      expect(parsed.kind).toBe("exact");
      if (parsed.kind !== "exact") {
        return;
      }
      expect(parsed.snapshot.progression.armory).toEqual([]);
    },
  );
});
