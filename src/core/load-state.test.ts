import { describe, expect, it, vi } from "vitest";
import { createEngine, SCHEMA_VERSION } from "./engine";
import {
  createDefaultProgression,
  parseStoredSave,
  SAVE_SCHEMA_VERSION,
} from "./load-state";
import { content as testContent } from "../data";
import type { Snapshot } from "./snapshot";
import type { Content, ClassKitDef } from "./types";

const LOOT_SEED = 42;

describe("tolerant talent save migration", () => {
  it("preserves legacy Tier 1 ranks and Ability Talent on tolerant load", () => {
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
        talents: {
          knight: {
            statRanks: { fortitude: 4, swordcraft: 1 },
            abilityTalentId: "hold-the-line",
          },
        },
      },
      attempt: null,
      pendingEdits: [],
    };

    const parsed = parseStoredSave(JSON.stringify(raw), testContent);
    expect(parsed.kind).toBe("exact");
    if (parsed.kind !== "exact") {
      return;
    }
    const knight = parsed.snapshot.progression.talents.knight!;
    expect(knight.statRanks).toEqual({ fortitude: 4, swordcraft: 1 });
    expect(knight.abilityTalentId).toBe("hold-the-line");
    expect(knight.tierStates[0]).toEqual({
      statRanks: { fortitude: 4, swordcraft: 1 },
      abilityTalentId: "hold-the-line",
    });
  });

  it("appends empty later Tier states when authored talentTiers are absent from save", () => {
    const progression = createDefaultProgression(testContent);
    const twoTierContent = {
      ...testContent,
      classes: testContent.classes.map((classKit) =>
        classKit.id === "knight"
          ? ({
              ...classKit,
              talentTiers: [
                {
                  statRow: [
                    {
                      id: "fortitude-2",
                      name: "Fortitude II",
                      perRank: { percent: { maxHealth: 0.04 } },
                      maxRanks: 5 as const,
                      iconKey: "fortitude-2",
                    },
                    {
                      id: "swordcraft-2",
                      name: "Swordcraft II",
                      perRank: { percent: { physicalPower: 0.04 } },
                      maxRanks: 5 as const,
                      iconKey: "swordcraft-2",
                    },
                  ],
                  abilityRow: ["hold-the-line-2", "falling-star-2"] as [string, string],
                },
              ],
            } satisfies ClassKitDef)
          : classKit,
      ),
    } satisfies Content;
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
        talents: {
          knight: {
            statRanks: { fortitude: 5, swordcraft: 0 },
            abilityTalentId: null,
          },
        },
      },
      attempt: null,
      pendingEdits: [],
    };

    const parsed = parseStoredSave(JSON.stringify(raw), twoTierContent);
    expect(parsed.kind).toBe("exact");
    if (parsed.kind !== "exact") {
      return;
    }
    const knight = parsed.snapshot.progression.talents.knight!;
    expect(knight.tierStates).toHaveLength(2);
    expect(knight.tierStates[1]).toEqual({
      statRanks: { "fortitude-2": 0, "swordcraft-2": 0 },
      abilityTalentId: null,
    });
  });
});

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

  it("exact-version restore keeps an in-flight Attempt at encounter 4", () => {
    const engine = createEngine(testContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const saved = engine.snapshot();
    saved.attempt = saved.attempt ? { ...saved.attempt, encounter: 4 } : null;

    const parsed = parseStoredSave(JSON.stringify(saved), testContent);
    expect(parsed.kind).toBe("exact");
    if (parsed.kind !== "exact") {
      return;
    }
    expect(parsed.snapshot.attempt?.encounter).toBe(4);

    const restored = createEngine(testContent, parsed.snapshot, LOOT_SEED);
    expect(restored.snapshot().attempt?.encounter).toBe(4);
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

  it.each([7, 8, 9, 10] as const)(
    "exact-schema save accepts unlockedStage %i and itemLevel %i in armory",
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

  it("exact-schema save round-trips Stage 9 progression and armory itemLevel", () => {
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
        unlockedStage: 9,
        armory: [
          {
            dropId: 1,
            baseId: "knight-blade",
            itemLevel: 9,
            rarity: "rare",
            affixes: [],
            awardedAtMs: 0,
            seen: true,
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
    expect(parsed.snapshot.progression.unlockedStage).toBe(9);
    expect(parsed.snapshot.progression.armory).toEqual(raw.progression.armory);
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

  it.each([0, 11, 1.5, "2", Number.NaN, Number.POSITIVE_INFINITY])(
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

  it.each([0, 11, 1.5, "3", Number.NaN])(
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
