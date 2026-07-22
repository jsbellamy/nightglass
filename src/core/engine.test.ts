import { describe, expect, it } from "vitest";
import { createEngine } from "./engine";
import type { EngineEvent } from "./events";
import type { DropInstance } from "./snapshot";
import { fixtureContent } from "./testing/fixture-content";
import { driveBy, scenario } from "./testing/scenario";
import type { ClassId, Content, StageDef, StageId } from "./types";

const LOOT_SEED = 0x5090;
const DURATION_MS = 30_000;
const FIXTURE_NOW_MS = 1_000;
const fixtureNow = () => FIXTURE_NOW_MS;

function dropIdsWhileClearingEncounter(
  engine: ReturnType<typeof createEngine>,
  encounter: 1 | 2 | 3,
): number[] {
  const drops: number[] = [];
  let elapsed = 0;
  while (elapsed < 300_000) {
    elapsed += 1;
    const events = driveBy(engine, 1);
    for (const event of events) {
      if (event.type === "drop-awarded") {
        drops.push(event.dropId);
      }
      if (event.type === "wave-cleared" && event.encounter === encounter) {
        return drops;
      }
    }
  }
  throw new Error(`encounter ${encounter} never cleared`);
}

function eventsWhileClearingEncounter(
  engine: ReturnType<typeof createEngine>,
  encounter: 1 | 2 | 3,
): EngineEvent[] {
  const collected: EngineEvent[] = [];
  let elapsed = 0;
  while (elapsed < 300_000) {
    elapsed += 1;
    const events = driveBy(engine, 1);
    collected.push(...events);
    if (
      events.some(
        (event) =>
          event.type === "wave-cleared" && event.encounter === encounter,
      )
    ) {
      return collected;
    }
  }
  throw new Error(`encounter ${encounter} never cleared`);
}

const engineContent: Content = {
  ...fixtureContent,
  stages: [
    fixtureContent.stages[0]!,
    { ...fixtureContent.stages[0]!, id: 2, name: "Fixture Stage 2" },
    { ...fixtureContent.stages[0]!, id: 3, name: "Fixture Stage 3" },
  ],
};

const fixtureStageTemplate = fixtureContent.stages[0]!;

function contentWithAuthoredStages(maxStage: StageId): Content {
  const stages: StageDef[] = [];
  for (let id = 1; id <= maxStage; id += 1) {
    stages.push({
      ...fixtureStageTemplate,
      id: id as StageId,
      name: `Fixture Stage ${id}`,
    });
  }
  return { ...engineContent, stages };
}

function savedAtStageBossEncounter(stage: StageId) {
  const saved = scenario()
    .atStage(stage)
    .atEncounter(3)
    .withParty(["knight", "wizard", "knight"], "wizard")
    .build();
  saved.lootRngState = LOOT_SEED;
  saved.progression.loadouts = {
    knight: ["k-shield-brace", "k-rally", "k-sweep"],
    wizard: ["w-prism", "w-frost", "w-cinder"],
    priest: ["p-moonwell", "p-resurgence", "p-smite"],
    hunter: ["k-shield-brace", "k-rally", "k-sweep"],
  };
  const boss = saved.attempt!.combatants.find((combatant) => combatant.side === "opponent");
  if (!boss) {
    throw new Error("boss encounter missing opponents");
  }
  boss.health = 1;
  return saved;
}

function driveUntilStageCleared(
  engine: ReturnType<typeof createEngine>,
  stage: StageId,
): EngineEvent[] {
  const events: EngineEvent[] = [];
  let elapsed = 0;
  while (elapsed < 300_000) {
    elapsed += 1;
    events.push(...driveBy(engine, 1));
    if (events.some((event) => event.type === "stage-cleared" && event.stage === stage)) {
      return events;
    }
  }
  throw new Error(`Stage ${stage} never cleared`);
}

const progressionContent: Content = {
  ...fixtureContent,
  abilities: [
    ...fixtureContent.abilities,
    {
      id: "hunter-basic",
      name: "Quick Shot",
      classId: "hunter",
      slot: "basic",
      targeting: { kind: "closest-opponent" },
      effects: [{ kind: "damage", channel: "physical", coefficient: 1 }],
      windUpMs: 350,
      recoveryMs: 650,
      cooldownMs: 0,
    },
    {
      id: "h-snare",
      name: "Snare",
      classId: "hunter",
      slot: "core",
      targeting: { kind: "closest-opponent" },
      effects: [{ kind: "damage", channel: "physical", coefficient: 0.9 }],
      windUpMs: 300,
      recoveryMs: 500,
      cooldownMs: 7000,
    },
    {
      id: "h-volley",
      name: "Volley",
      classId: "hunter",
      slot: "core",
      targeting: { kind: "all-opponents" },
      effects: [{ kind: "damage", channel: "physical", coefficient: 0.6 }],
      windUpMs: 500,
      recoveryMs: 700,
      cooldownMs: 8000,
    },
    {
      id: "h-mark",
      name: "Mark",
      classId: "hunter",
      slot: "core",
      targeting: { kind: "self" },
      effects: [{ kind: "apply-status", statusId: "braced" }],
      windUpMs: 200,
      recoveryMs: 400,
      cooldownMs: 9000,
      validWhile: "status-absent",
    },
    {
      id: "h-pierce",
      name: "Pierce",
      classId: "hunter",
      slot: "core",
      targeting: { kind: "closest-opponent" },
      effects: [{ kind: "damage", channel: "physical", coefficient: 1.3 }],
      windUpMs: 400,
      recoveryMs: 600,
      cooldownMs: 9000,
    },
    {
      id: "h-trap",
      name: "Trap",
      classId: "hunter",
      slot: "talent",
      iconKey: "h-trap",
      targeting: { kind: "closest-opponent" },
      effects: [{ kind: "damage", channel: "physical", coefficient: 1.1 }],
      windUpMs: 400,
      recoveryMs: 600,
      cooldownMs: 12000,
    },
    {
      id: "h-rain",
      name: "Arrow Rain",
      classId: "hunter",
      slot: "talent",
      iconKey: "h-rain",
      targeting: { kind: "all-opponents" },
      effects: [{ kind: "damage", channel: "physical", coefficient: 1.4 }],
      windUpMs: 700,
      recoveryMs: 800,
      cooldownMs: 14000,
    },
  ],
  classes: [
    ...fixtureContent.classes,
    {
      id: "hunter",
      name: "Hunter",
      base: {
        maxHealth: 95,
        physical: 13,
        elemental: 5,
        armor: 14,
        elementalResistance: 10,
      },
      basicAbilityId: "hunter-basic",
      coreAbilityIds: ["h-snare", "h-volley", "h-mark", "h-pierce"],
      defaultLoadout: ["h-snare", "h-mark", "h-volley"],
      talents: {
        statRow: [
          {
            id: "h-fleetness",
            name: "Fleetness",
            perRank: { percent: { physicalPower: 0.04 } },
            maxRanks: 5,
            iconKey: "h-fleetness",
          },
          {
            id: "h-keen-eye",
            name: "Keen Eye",
            perRank: { flat: { physical: 2 } },
            maxRanks: 5,
            iconKey: "h-keen-eye",
          },
        ],
        abilityRow: ["h-trap", "h-rain"],
      },
    },
  ],
};

function stable(value: unknown): string {
  return JSON.stringify(value);
}

describe("beginFreshAttempt", () => {
  it("discards the transient Attempt and starts Wave 1 at the resulting Stage", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    engine.advanceBy(5_000);
    const mid = engine.snapshot();
    expect(mid.attempt?.encounter).not.toBe(1);

    const events = engine.beginFreshAttempt();
    const after = engine.snapshot();
    expect(
      events.some(
        (event) => event.type === "wave-started" && event.encounter === 1,
      ),
    ).toBe(true);
    expect(after.attempt).toMatchObject({
      stage: mid.attempt?.stage ?? 1,
      encounter: 1,
      phase: "fighting",
    });
    expect(
      after.attempt?.combatants.every(
        (c) => c.side === "party" || c.health === c.maxHealth,
      ),
    ).toBe(true);
  });
});
describe("createEngine boot", () => {
  it("starts a fresh Stage 1 Attempt with full Party restore", () => {
    const engine = createEngine(
      fixtureContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    const snap = engine.snapshot();

    expect(snap.attempt).toMatchObject({
      stage: 1,
      encounter: 1,
      phase: "fighting",
    });
    expect(
      snap.attempt?.combatants.filter((c) => c.side === "party"),
    ).toHaveLength(3);
    expect(
      snap.attempt?.combatants.every((c) => c.health === c.maxHealth),
    ).toBe(true);

    const events = engine.advanceBy(1);
    expect(events[0]?.type).toBe("stage-attempt-started");
    expect(events[1]?.type).toBe("wave-started");
  });
});

describe("chunk-equivalence advancement", () => {
  it("produces identical events and byte-equal Snapshots for 1ms, 7ms, and single-call chunking", () => {
    const oneMs = createEngine(engineContent, undefined, LOOT_SEED, fixtureNow);
    const oneMsEvents = driveBy(oneMs, DURATION_MS, 1);

    const sevenMs = createEngine(
      engineContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    const sevenMsEvents = driveBy(sevenMs, DURATION_MS, 7);

    const single = createEngine(
      engineContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    const singleEvents = single.advanceBy(DURATION_MS);

    expect(stable(oneMsEvents)).toBe(stable(sevenMsEvents));
    expect(stable(oneMsEvents)).toBe(stable(singleEvents));
    expect(stable(oneMs.snapshot())).toBe(stable(sevenMs.snapshot()));
    expect(stable(oneMs.snapshot())).toBe(stable(single.snapshot()));
  });
});

function eventsWithoutDropAwards(events: EngineEvent[]): EngineEvent[] {
  return events.filter((event) => event.type !== "drop-awarded");
}

function stableEventsForOfflineParity(events: EngineEvent[]): string {
  return stable(
    eventsWithoutDropAwards(events).map((event) => {
      const { seq: _seq, ...withoutSeq } = event;
      return withoutSeq;
    }),
  );
}

function collectOfflineEvents(
  engine: ReturnType<typeof createEngine>,
  totalMs: number,
  stepMs: number,
): EngineEvent[] {
  const events: EngineEvent[] = [];
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining);
    events.push(...engine.advanceOffline(step));
    remaining -= step;
  }
  return events;
}

describe("advanceOffline", () => {
  it("awards no drops or drop-awarded events over a span that clears several encounters", () => {
    const engine = createEngine(
      engineContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    engine.advanceOffline(1);
    const armoryBefore = engine.snapshot().progression.armory.length;
    const events = engine.advanceOffline(DURATION_MS);
    expect(events.some((event) => event.type === "wave-cleared")).toBe(true);
    expect(events.filter((event) => event.type === "drop-awarded")).toEqual([]);
    expect(engine.snapshot().progression.armory.length).toBe(armoryBefore);
  });

  it("matches advanceBy on XP, level-up, and wave or stage events for the same seed and span", () => {
    const withDrops = createEngine(
      engineContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    const withoutDrops = createEngine(
      engineContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    const byEvents = withDrops.advanceBy(DURATION_MS);
    const offlineEvents = withoutDrops.advanceOffline(DURATION_MS);
    expect(stableEventsForOfflineParity(offlineEvents)).toBe(
      stableEventsForOfflineParity(byEvents),
    );
    expect(withDrops.snapshot().progression.characterXp).toEqual(
      withoutDrops.snapshot().progression.characterXp,
    );
  });

  it("does not change advanceBy drop awarding", () => {
    const engine = createEngine(
      engineContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    const events = engine.advanceBy(DURATION_MS);
    expect(events.some((event) => event.type === "drop-awarded")).toBe(true);
    expect(engine.snapshot().progression.armory.length).toBeGreaterThan(0);
  });

  it("throws on non-integer and negative elapsedMs like advanceBy", () => {
    const engine = createEngine(
      engineContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    expect(() => engine.advanceOffline(-1)).toThrow(/non-negative integer/);
    expect(() => engine.advanceOffline(1.5)).toThrow(/non-negative integer/);
    expect(() => engine.advanceBy(-1)).toThrow(/non-negative integer/);
    expect(() => engine.advanceBy(1.5)).toThrow(/non-negative integer/);
  });

  it("is chunk-neutral: many small calls match one large call", () => {
    const oneMs = createEngine(engineContent, undefined, LOOT_SEED, fixtureNow);
    const oneMsEvents = collectOfflineEvents(oneMs, DURATION_MS, 1);

    const sevenMs = createEngine(
      engineContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    const sevenMsEvents = collectOfflineEvents(sevenMs, DURATION_MS, 7);

    const single = createEngine(
      engineContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    const singleEvents = single.advanceOffline(DURATION_MS);

    expect(stable(oneMsEvents)).toBe(stable(sevenMsEvents));
    expect(stable(oneMsEvents)).toBe(stable(singleEvents));
    expect(stable(oneMs.snapshot())).toBe(stable(sevenMs.snapshot()));
    expect(stable(oneMs.snapshot())).toBe(stable(single.snapshot()));
  });
});

describe("save/reload equivalence", () => {
  it("continues with identical events after restoring a mid-Attempt Snapshot", () => {
    const continuous = createEngine(
      engineContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    const continuousEvents = driveBy(continuous, 13_700, 7);
    continuousEvents.push(
      ...driveBy(continuous, DURATION_MS - 13_700, 7),
    );

    const reloaded = createEngine(
      engineContent,
      undefined,
      LOOT_SEED,
      fixtureNow,
    );
    const reloadEvents = driveBy(reloaded, 13_700, 7);
    const midFight = structuredClone(reloaded.snapshot());
    const restored = createEngine(
      engineContent,
      midFight,
      LOOT_SEED,
      fixtureNow,
    );
    reloadEvents.push(...driveBy(restored, DURATION_MS - 13_700, 7));

    expect(stable(reloadEvents)).toBe(stable(continuousEvents));
    expect(stable(restored.snapshot())).toBe(stable(continuous.snapshot()));
  });
});

describe("wave transition", () => {
  it("holds exactly 2000ms with no new Action Cycles and preserves Knockouts across Waves", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);

    let sawWaveCleared = false;
    let transitionStartMs: number | null = null;
    let nextWaveStartMs: number | null = null;
    let actionDuringTransition = false;

    let elapsed = 0;
    while (elapsed < 60_000) {
      elapsed += 1;
      const events = driveBy(engine, 1);
      const snap = engine.snapshot();

      for (const event of events) {
        if (event.type === "wave-cleared" && event.encounter === 1) {
          sawWaveCleared = true;
          transitionStartMs = event.atMs;
        }
        if (event.type === "wave-started" && event.encounter === 2) {
          nextWaveStartMs = event.atMs;
        }
        if (
          event.type === "action-started" &&
          snap.attempt?.phase === "wave-transition"
        ) {
          actionDuringTransition = true;
        }
      }

      if (nextWaveStartMs !== null) {
        break;
      }
    }

    expect(sawWaveCleared).toBe(true);
    expect(transitionStartMs).not.toBeNull();
    expect(nextWaveStartMs).toBe((transitionStartMs ?? 0) + 2_000);
    expect(actionDuringTransition).toBe(false);

    const snap = engine.snapshot();
    expect(snap.attempt?.phase).toBe("fighting");
    expect(snap.attempt?.encounter).toBe(2);
  });
});

describe("Party Defeat and Retry", () => {
  it("waits 2000ms after Party Defeat then automatically Retries with full restore", () => {
    const saved = scenario()
      .withParty(["knight", "wizard", "knight"], "wizard")
      .withXp("knight", 50)
      .knockedOut("knight")
      .knockedOut("wizard")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.nextEventSeq = 10;
    saved.nextAttemptId = 5;
    saved.attempt!.id = 4;
    // Former progressionState helper always keyed all four ClassIds.
    saved.progression.characterXp = {
      knight: 50,
      wizard: 0,
      priest: 0,
      hunter: 0,
    };
    saved.progression.loadouts = {
      knight: ["k-shield-brace", "k-rally", "k-sweep"],
      wizard: ["w-prism", "w-frost", "w-cinder"],
      priest: ["p-moonwell", "p-resurgence", "p-smite"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 0,
        maxHealth: 180,
        knockedOut: true,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 0,
        maxHealth: 100,
        knockedOut: true,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:knight:back",
        side: "party",
        defId: "knight",
        health: 1,
        maxHealth: 180,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 40,
        maxHealth: 40,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(engineContent, saved, LOOT_SEED);
    const events: EngineEvent[] = [];

    let elapsed = 0;
    while (elapsed < 10_000) {
      elapsed += 1;
      events.push(...driveBy(engine, 1));
      if (
        events.some(
          (event) =>
            event.type === "stage-attempt-started" && event.attemptId === 5,
        )
      ) {
        break;
      }
    }

    const defeat = events.find((event) => event.type === "party-defeat");
    const retry = events.find(
      (event) =>
        event.type === "stage-attempt-started" && event.attemptId === 5,
    );
    expect(defeat).toBeDefined();
    expect(retry).toBeDefined();
    expect((retry?.atMs ?? 0) - (defeat?.atMs ?? 0)).toBe(2_000);

    const snap = engine.snapshot();
    expect(snap.progression.characterXp).toEqual({
      knight: 50,
      wizard: 0,
      priest: 0,
      hunter: 0,
    });
    expect(
      snap.attempt?.combatants
        .filter((combatant) => combatant.side === "party")
        .every(
          (combatant) =>
            !combatant.knockedOut && combatant.health === combatant.maxHealth,
        ),
    ).toBe(true);
  });
});

describe("selectStage", () => {
  it("abandons the current Attempt without rolling back earned Character XP", () => {
    const engine = createEngine(engineContent, undefined, LOOT_SEED);
    engine.advanceBy(5_000);
    const before = engine.snapshot();
    before.progression.characterXp = {
      knight: 120,
      wizard: 40,
      priest: 0,
      hunter: 0,
    };
    before.progression.unlockedStage = 2;

    const restored = createEngine(engineContent, before, LOOT_SEED);
    const events = restored.selectStage(2);
    const after = restored.snapshot();

    expect(events.some((event) => event.type === "stage-attempt-started")).toBe(
      true,
    );
    expect(after.progression.characterXp).toEqual({
      knight: 120,
      wizard: 40,
      priest: 0,
      hunter: 0,
    });
    expect(after.attempt?.stage).toBe(2);
  });

  it("throws when selecting a locked Stage", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const before = engine.snapshot();
    expect(() => engine.selectStage(2)).toThrow(/locked/i);
    expect(engine.snapshot()).toEqual(before);
  });
});

describe("content-driven stage progression", () => {
  it("unlocks Stage 2 then Stage 3 across successive clears with three authored Stages", () => {
    const content = contentWithAuthoredStages(3);
    let engine = createEngine(content, savedAtStageBossEncounter(1), LOOT_SEED);
    driveUntilStageCleared(engine, 1);
    expect(engine.snapshot().progression.unlockedStage).toBe(2);
    expect(engine.snapshot().attempt?.stage).toBe(2);

    engine = createEngine(content, savedAtStageBossEncounter(2), LOOT_SEED);
    driveUntilStageCleared(engine, 2);
    expect(engine.snapshot().progression.unlockedStage).toBe(3);
    expect(engine.snapshot().attempt?.stage).toBe(3);
  });

  it("unlocks Stage 4 on the first Stage 3 clear when six Stages are authored", () => {
    const content = contentWithAuthoredStages(6);
    const engine = createEngine(content, savedAtStageBossEncounter(3), LOOT_SEED);
    driveUntilStageCleared(engine, 3);
    const snap = engine.snapshot();
    expect(snap.progression.unlockedStage).toBe(4);
    expect(snap.attempt?.stage).toBe(4);
    expect(snap.attempt?.encounter).toBe(1);
  });

  it("unlocks each authored Stage through Stage 6 in order", () => {
    const content = contentWithAuthoredStages(6);
    let engine = createEngine(content, savedAtStageBossEncounter(1), LOOT_SEED);
    for (let stage = 1; stage <= 6; stage += 1) {
      let snap = engine.snapshot();
      const boss = snap.attempt?.combatants.find((combatant) => combatant.side === "opponent");
      if (boss) {
        boss.health = 1;
      }
      engine = createEngine(content, snap, LOOT_SEED);
      driveUntilStageCleared(engine, stage as StageId);
      snap = engine.snapshot();
      expect(snap.progression.unlockedStage).toBe(Math.min(stage + 1, 6) as StageId);
      if (stage < 6) {
        expect(snap.attempt?.stage).toBe((stage + 1) as StageId);
      } else {
        expect(snap.attempt?.stage).toBe(6);
      }
    }
  });

  it("repeats Stage 6 after a Stage 6 clear with normal clear events", () => {
    const content = contentWithAuthoredStages(6);
    const engine = createEngine(content, savedAtStageBossEncounter(6), LOOT_SEED);
    const events = driveUntilStageCleared(engine, 6);
    expect(events.some((event) => event.type === "wave-cleared" && event.encounter === 3)).toBe(
      true,
    );
    expect(events.some((event) => event.type === "stage-cleared" && event.stage === 6)).toBe(
      true,
    );
    expect(events.some((event) => event.type === "stage-attempt-started" && event.stage === 6)).toBe(
      true,
    );
    expect(
      events
        .filter((event) => event.type === "stage-attempt-started")
        .every((event) => event.stage <= 6),
    ).toBe(true);
    const snap = engine.snapshot();
    expect(snap.progression.unlockedStage).toBe(6);
    expect(snap.attempt?.stage).toBe(6);
    expect(snap.attempt?.encounter).toBe(1);
  });
});

describe("Stage 3 clear auto-retry", () => {
  it("begins another Stage 3 Attempt after clearing Stage 3", () => {
    const saved = scenario()
      .atStage(3)
      .atEncounter(3)
      .withParty(["knight", "wizard", "knight"], "wizard")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.nextAttemptId = 9;
    saved.attempt!.id = 8;
    saved.progression.loadouts = {
      knight: ["k-shield-brace", "k-rally", "k-sweep"],
      wizard: ["w-prism", "w-frost", "w-cinder"],
      priest: ["p-moonwell", "p-resurgence", "p-smite"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:knight:back",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:3:0",
        side: "opponent",
        defId: "fixture-boss",
        health: 1,
        maxHealth: 200,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(engineContent, saved, LOOT_SEED);
    const events: EngineEvent[] = [];
    let snap = engine.snapshot();

    let elapsed = 0;
    while (elapsed < 5_000) {
      elapsed += 1;
      events.push(...driveBy(engine, 1));
      if (
        events.some(
          (event) => event.type === "stage-cleared" && event.stage === 3,
        )
      ) {
        snap = engine.snapshot();
        break;
      }
    }

    expect(
      events.some(
        (event) => event.type === "stage-cleared" && event.stage === 3,
      ),
    ).toBe(true);
    expect(events.some((event) => event.type === "stage-attempt-started")).toBe(
      true,
    );
    expect(snap.attempt?.stage).toBe(3);
    expect(snap.attempt?.encounter).toBe(1);
    expect(
      snap.attempt?.combatants
        .filter((combatant) => combatant.side === "party")
        .every((combatant) => combatant.health === combatant.maxHealth),
    ).toBe(true);
  });
});

describe("loot RNG persistence", () => {
  it("keeps lootRngState unchanged during combat and across snapshot round-trip before Drops", () => {
    const engine = createEngine(engineContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const initial = engine.snapshot().lootRngState;
    engine.advanceBy(100);
    expect(engine.snapshot().lootRngState).toBe(initial);

    const reloaded = createEngine(engineContent, engine.snapshot(), LOOT_SEED);
    expect(reloaded.snapshot().lootRngState).toBe(initial);
    reloaded.advanceBy(100);
    expect(reloaded.snapshot().lootRngState).toBe(initial);
  });
});

describe("full combat rules", () => {
  it("starts Ability cooldown at Impact, not Wind-up", () => {
    const saved = scenario()
      .withParty(["knight", "wizard", "priest"], "hunter")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-pommel", "k-sweep", "k-rally"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-smite", "p-moonwell", "p-resurgence"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: {
          abilityId: "k-pommel",
          startedAtMs: 0,
          impactAtMs: 250,
          endsAtMs: 900,
          targetIds: ["opp:1:0"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 40,
        maxHealth: 40,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    expect(
      engine.snapshot().attempt?.combatants[0]?.cooldownReadyAtMs["k-pommel"],
    ).toBeUndefined();
    engine.advanceBy(250);
    expect(
      engine.snapshot().attempt?.combatants[0]?.cooldownReadyAtMs["k-pommel"],
    ).toBe(9250);
  });

  it("cancels Wind-up on Stun without starting cooldown and keeps cooldowns elapsing while stunned", () => {
    const saved = scenario()
      .withParty(["knight", "wizard", "priest"], "hunter")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-sweep", "k-rally", "k-pommel"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-smite", "p-moonwell", "p-resurgence"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: {
          abilityId: "k-sweep",
          startedAtMs: 0,
          impactAtMs: 500,
          endsAtMs: 1200,
          targetIds: ["opp:1:0"],
          impactResolved: false,
        },
        cooldownReadyAtMs: { "k-pommel": 3000 },
        statuses: [{ statusId: "stun", expiresAtMs: 1200 }],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-stunner",
        health: 50,
        maxHealth: 50,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.advanceBy(1200);
    const knight = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.action).toBeNull();
    expect(knight?.cooldownReadyAtMs["k-sweep"]).toBeUndefined();
    expect(knight?.cooldownReadyAtMs["k-pommel"]).toBe(3000);
  });

  it("ignores Stun on Boss opponents", () => {
    const saved = scenario()
      .atEncounter(3)
      .withParty(["knight", "wizard", "priest"], "hunter")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-pommel", "k-sweep", "k-rally"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-smite", "p-moonwell", "p-resurgence"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: {
          abilityId: "k-pommel",
          startedAtMs: 0,
          impactAtMs: 250,
          endsAtMs: 900,
          targetIds: ["opp:3:0"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:3:0",
        side: "opponent",
        defId: "fixture-boss",
        health: 200,
        maxHealth: 200,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const events = engine.advanceBy(250);
    const boss = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "fixture-boss");
    expect(boss?.statuses.some((status) => status.statusId === "stun")).toBe(
      false,
    );
    expect(
      events.some(
        (event) => event.type === "status-applied" && event.statusId === "stun",
      ),
    ).toBe(false);
  });

  it("refreshes Status Effects instead of stacking", () => {
    const saved = scenario()
      .withParty(["knight", "wizard", "priest"], "hunter")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-shield-brace", "k-sweep", "k-rally"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-smite", "p-moonwell", "p-resurgence"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: {
          abilityId: "k-shield-brace",
          startedAtMs: 0,
          impactAtMs: 100,
          endsAtMs: 500,
          targetIds: ["party:knight:front"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [{ statusId: "braced", expiresAtMs: 4000 }],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 40,
        maxHealth: 40,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.advanceBy(100);
    const knight = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "knight");
    expect(
      knight?.statuses.filter((status) => status.statusId === "braced"),
    ).toHaveLength(1);
    expect(knight?.statuses[0]?.expiresAtMs).toBe(5100);
  });

  it("starts cooldown when retarget fails at Impact", () => {
    const saved = scenario()
      .withParty(["knight", "wizard", "priest"], "hunter")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-pommel", "k-sweep", "k-rally"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-smite", "p-moonwell", "p-resurgence"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: {
          abilityId: "k-pommel",
          startedAtMs: 0,
          impactAtMs: 250,
          endsAtMs: 900,
          targetIds: ["opp:1:0"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 0,
        maxHealth: 40,
        knockedOut: true,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const events = engine.advanceBy(250);
    const impact = events.find((event) => event.type === "impact");
    expect(impact?.results).toHaveLength(0);
    expect(
      engine.snapshot().attempt?.combatants[0]?.cooldownReadyAtMs["k-pommel"],
    ).toBe(9250);
  });

  it("clamps Healing so it cannot overheal", () => {
    const saved = scenario()
      .withParty(["priest", "knight", "wizard"], "hunter")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-shield-brace", "k-sweep", "k-rally"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-moonwell", "p-resurgence", "p-smite"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:priest:front",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: {
          abilityId: "p-moonwell",
          startedAtMs: 0,
          impactAtMs: 300,
          endsAtMs: 800,
          targetIds: ["party:knight:middle"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:knight:middle",
        side: "party",
        defId: "knight",
        health: 175,
        maxHealth: 180,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:back",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 40,
        maxHealth: 40,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.advanceBy(300);
    const knight = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.health).toBe(180);
  });

  it("cancels unfinished Wind-up on Knockout without starting cooldown", () => {
    const saved = scenario()
      .withParty(["knight", "wizard", "priest"], "hunter")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-sweep", "k-rally", "k-pommel"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-smite", "p-moonwell", "p-resurgence"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 5,
        maxHealth: 180,
        knockedOut: false,
        action: {
          abilityId: "k-sweep",
          startedAtMs: 0,
          impactAtMs: 500,
          endsAtMs: 1200,
          targetIds: ["opp:1:0"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 40,
        maxHealth: 40,
        knockedOut: false,
        action: {
          abilityId: "grunt-attack",
          startedAtMs: 0,
          impactAtMs: 400,
          endsAtMs: 1000,
          targetIds: ["party:knight:front"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.advanceBy(400);
    const knight = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.knockedOut).toBe(true);
    expect(knight?.action).toBeNull();
    expect(knight?.cooldownReadyAtMs["k-sweep"]).toBeUndefined();
  });

  it("revives the first Knocked Out ally by Formation order with 1000ms Recovery", () => {
    const saved = scenario()
      .withParty(["priest", "knight", "wizard"], "hunter")
      .knockedOut("knight")
      .knockedOut("wizard")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-shield-brace", "k-sweep", "k-rally"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-resurgence", "p-moonwell", "p-smite"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:priest:front",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: {
          abilityId: "p-resurgence",
          startedAtMs: 0,
          impactAtMs: 500,
          endsAtMs: 1200,
          targetIds: ["party:knight:middle"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:knight:middle",
        side: "party",
        defId: "knight",
        health: 0,
        maxHealth: 180,
        knockedOut: true,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:back",
        side: "party",
        defId: "wizard",
        health: 0,
        maxHealth: 100,
        knockedOut: true,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 40,
        maxHealth: 40,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const events = engine.advanceBy(500);
    const revived = events.find((event) => event.type === "revived");
    expect(revived?.entityId).toBe("party:knight:middle");
    expect(revived?.health).toBe(7);
    const knight = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.knockedOut).toBe(false);
    expect(knight?.action?.endsAtMs).toBe(1500);
  });

  it("lets two simultaneous lethal Impacts both land from pre-resolution health", () => {
    const saved = scenario()
      .withParty(["knight", "wizard", "priest"], "hunter")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-sweep", "k-rally", "k-pommel"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-smite", "p-moonwell", "p-resurgence"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 6,
        maxHealth: 180,
        knockedOut: false,
        action: {
          abilityId: "knight-basic",
          startedAtMs: 0,
          impactAtMs: 350,
          endsAtMs: 1000,
          targetIds: ["opp:1:0"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 13,
        maxHealth: 40,
        knockedOut: false,
        action: {
          abilityId: "grunt-attack",
          startedAtMs: 0,
          impactAtMs: 350,
          endsAtMs: 1000,
          targetIds: ["party:knight:front"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const events = engine.advanceBy(350);
    const impacts = events.filter((event) => event.type === "impact");
    expect(impacts).toHaveLength(2);
    const knight = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "knight");
    const grunt = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "fixture-grunt");
    expect(knight?.knockedOut).toBe(true);
    expect(grunt?.knockedOut).toBe(true);
  });

  it("applies queued loadout edits at the Wave boundary with Activation Delay", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    engine.setLoadout("knight", ["k-pommel", "k-sweep", "k-rally"]);

    let transitionAt: number | null = null;
    let elapsed = 0;
    while (elapsed < 120_000) {
      elapsed += 1;
      const events = driveBy(engine, 1);
      if (
        events.some(
          (event) => event.type === "wave-cleared" && event.encounter === 1,
        )
      ) {
        transitionAt = engine.snapshot().simNowMs;
      }
      if (events.some((event) => event.type === "config-applied")) {
        const knight = engine.snapshot().progression.loadouts.knight;
        expect(knight).toEqual(["k-pommel", "k-sweep", "k-rally"]);
        const knightCombatant = engine
          .snapshot()
          .attempt?.combatants.find((c) => c.defId === "knight");
        expect(knightCombatant?.cooldownReadyAtMs["k-pommel"]).toBe(
          (transitionAt ?? 0) + 2_000 + 9000,
        );
        return;
      }
    }
    throw new Error("config-applied never emitted");
  });

  it("does not interrupt an in-flight Wind-up when the actor takes damage mid-fight", () => {
    const saved = scenario().build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-pommel", "k-sweep", "k-rally"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-smite", "p-moonwell", "p-resurgence"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: {
          abilityId: "k-pommel",
          startedAtMs: 0,
          impactAtMs: 250,
          endsAtMs: 900,
          targetIds: ["opp:1:0"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 40,
        maxHealth: 40,
        knockedOut: false,
        action: {
          abilityId: "grunt-attack",
          startedAtMs: 0,
          impactAtMs: 200,
          endsAtMs: 1000,
          targetIds: ["party:knight:front"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const damageEvents = engine.advanceBy(200);
    const knightAfterDamage = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.entityId === "party:knight:front");
    expect(knightAfterDamage?.action).toMatchObject({
      abilityId: "k-pommel",
      impactAtMs: 250,
      impactResolved: false,
    });
    expect(knightAfterDamage?.health).toBeLessThan(180);
    expect(
      damageEvents.some(
        (event) => event.type === "impact" && event.entityId === "opp:1:0",
      ),
    ).toBe(true);

    const impactEvents = engine.advanceBy(50);
    const knightAfterImpact = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.entityId === "party:knight:front");
    expect(knightAfterImpact?.action?.impactResolved).toBe(true);
    expect(
      impactEvents.some(
        (event) =>
          event.type === "impact" && event.entityId === "party:knight:front",
      ),
    ).toBe(true);
  });

  it("queues setFormation and applies Formation order at the Wave boundary with config-applied", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    engine.setFormation(["priest", "knight", "wizard"]);

    let elapsed = 0;
    while (elapsed < 120_000) {
      elapsed += 1;
      const events = driveBy(engine, 1);
      if (!events.some((event) => event.type === "config-applied")) {
        continue;
      }

      const snap = engine.snapshot();
      expect(snap.progression.party).toEqual(["priest", "knight", "wizard"]);
      const party =
        snap.attempt?.combatants.filter(
          (combatant) => combatant.side === "party",
        ) ?? [];
      expect(party.map((combatant) => combatant.entityId)).toEqual([
        "party:priest:front",
        "party:knight:middle",
        "party:wizard:back",
      ]);
      return;
    }
    throw new Error("config-applied never emitted after setFormation");
  });

  it("emits status-expired when a Status Effect duration elapses", () => {
    const saved = scenario().build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-pommel", "k-sweep", "k-rally"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-smite", "p-moonwell", "p-resurgence"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [{ statusId: "braced", expiresAtMs: 1000 }],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 40,
        maxHealth: 40,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const events = engine.advanceBy(1000);
    expect(
      events.some(
        (event) =>
          event.type === "status-expired" &&
          event.entityId === "party:knight:front" &&
          event.statusId === "braced",
      ),
    ).toBe(true);
    const knight = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.statuses).toHaveLength(0);
  });

  it("includes kind heal in impact results for Healing and revival Abilities", () => {
    const saved = scenario()
      .withParty(["priest", "knight", "wizard"], "knight")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-shield-brace", "k-sweep", "k-rally"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-moonwell", "p-resurgence", "p-smite"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:priest:front",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: {
          abilityId: "p-moonwell",
          startedAtMs: 0,
          impactAtMs: 300,
          endsAtMs: 800,
          targetIds: ["party:knight:middle"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:knight:middle",
        side: "party",
        defId: "knight",
        health: 120,
        maxHealth: 180,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:back",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 40,
        maxHealth: 40,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const healEngine = createEngine(fixtureContent, saved, LOOT_SEED);
    const healEvents = healEngine.advanceBy(300);
    const healImpact = healEvents.find(
      (event): event is Extract<typeof event, { type: "impact" }> =>
        event.type === "impact" && event.abilityId === "p-moonwell",
    );
    expect(healImpact?.results.some((result) => result.kind === "heal")).toBe(
      true,
    );

    const reviveSaved = {
      ...saved,
      attempt: {
        ...saved.attempt!,
        combatants: [
          {
            ...saved.attempt!.combatants[0]!,
            action: {
              abilityId: "p-resurgence",
              startedAtMs: 0,
              impactAtMs: 500,
              endsAtMs: 1200,
              targetIds: ["party:knight:middle"],
              impactResolved: false,
            },
          },
          {
            ...saved.attempt!.combatants[1]!,
            health: 0,
            knockedOut: true,
          },
          saved.attempt!.combatants[2]!,
          saved.attempt!.combatants[3]!,
        ],
      },
    };

    const reviveEngine = createEngine(fixtureContent, reviveSaved, LOOT_SEED);
    const reviveEvents = reviveEngine.advanceBy(500);
    const reviveImpact = reviveEvents.find(
      (event): event is Extract<typeof event, { type: "impact" }> =>
        event.type === "impact" && event.abilityId === "p-resurgence",
    );
    expect(reviveImpact?.results.some((result) => result.kind === "heal")).toBe(
      true,
    );
  });

  it("throws when setLoadout receives duplicate Ability ids", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    expect(() =>
      engine.setLoadout("knight", ["k-sweep", "k-sweep", "k-rally"]),
    ).toThrow(/duplicate Abilities/i);
  });

  it("completes Recovery and advances cooldowns while a Character remains stunned", () => {
    const saved = scenario().build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-pommel", "k-sweep", "k-rally"],
      wizard: ["w-frost", "w-cinder", "w-prism"],
      priest: ["p-smite", "p-moonwell", "p-resurgence"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: {
          abilityId: "k-pommel",
          startedAtMs: 0,
          impactAtMs: 250,
          endsAtMs: 900,
          targetIds: ["opp:1:0"],
          impactResolved: true,
        },
        cooldownReadyAtMs: { "k-pommel": 800 },
        statuses: [{ statusId: "stun", expiresAtMs: 5000 }],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: {
          abilityId: "w-frost",
          startedAtMs: 0,
          impactAtMs: 800,
          endsAtMs: 50_000,
          targetIds: ["opp:1:0"],
          impactResolved: true,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: {
          abilityId: "p-smite",
          startedAtMs: 0,
          impactAtMs: 450,
          endsAtMs: 50_000,
          targetIds: ["opp:1:0"],
          impactResolved: true,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 40,
        maxHealth: 40,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.advanceBy(900);
    let knight = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.action).toBeNull();
    expect(knight?.statuses.some((status) => status.statusId === "stun")).toBe(
      true,
    );
    expect(
      knight?.cooldownReadyAtMs["k-pommel"] ?? Infinity,
    ).toBeLessThanOrEqual(engine.snapshot().simNowMs);
    expect(
      engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight")
        ?.action,
    ).toBeNull();

    engine.advanceBy(100);
    knight = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.action).toBeNull();
    expect(knight?.statuses.some((status) => status.statusId === "stun")).toBe(
      true,
    );

    engine.advanceBy(4000);
    knight = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.statuses.some((status) => status.statusId === "stun")).toBe(
      false,
    );

    engine.advanceBy(1);
    knight = engine
      .snapshot()
      .attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.action).not.toBeNull();
    expect(knight?.action?.impactResolved).toBe(false);
  });

  it("does not touch lootRngState during combat resolution", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const combatPath = join(
      new URL(".", import.meta.url).pathname,
      "combat.ts",
    );
    const source = await readFile(combatPath, "utf8");
    expect(source).not.toMatch(/lootRngState/);
  });
});

describe("progression", () => {
  it("awards full Character XP to Party Members and floor(50%) to the Reserve on opponent defeat", () => {
    const saved = scenario()
      .withParty(["knight", "wizard", "priest"], "hunter")
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.progression.loadouts = {
      knight: ["k-shield-brace", "k-rally", "k-sweep"],
      wizard: ["w-prism", "w-frost", "w-cinder"],
      priest: ["p-moonwell", "p-resurgence", "p-smite"],
      hunter: ["k-shield-brace", "k-rally", "k-sweep"],
    };
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 1,
        maxHealth: 40,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(progressionContent, saved, LOOT_SEED);
    const events = engine.advanceBy(5_000);
    const xpEvents = events.filter((event) => event.type === "xp-awarded");
    expect(xpEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ classId: "knight", amount: 20, totalXp: 20 }),
        expect.objectContaining({ classId: "wizard", amount: 20, totalXp: 20 }),
        expect.objectContaining({ classId: "priest", amount: 20, totalXp: 20 }),
        expect.objectContaining({ classId: "hunter", amount: 10, totalXp: 10 }),
      ]),
    );
  });

  it("keeps partial Character XP when abandoning a Wave mid-Attempt", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    let elapsed = 0;
    while (elapsed < 120_000) {
      elapsed += 1;
      const events = driveBy(engine, 1);
      if (
        events.some(
          (event) => event.type === "knockout" && event.entityId === "opp:1:0",
        )
      ) {
        break;
      }
    }
    const partialXp = engine.snapshot().progression.characterXp.knight;
    expect(partialXp).toBeGreaterThan(0);
    engine.selectStage(1);
    expect(engine.snapshot().progression.characterXp.knight).toBe(partialXp);
  });

  it("reaches Level 2 after the fixture Stage 1 authored XP budget", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const events: EngineEvent[] = [];
    let elapsed = 0;
    while (elapsed < 300_000) {
      elapsed += 1;
      events.push(...driveBy(engine, 1));
      if (
        events.some(
          (event) => event.type === "stage-cleared" && event.stage === 1,
        )
      ) {
        break;
      }
    }
    const snap = engine.snapshot();
    expect(snap.progression.characterXp.knight).toBeGreaterThanOrEqual(100);
    expect(
      events.some(
        (event) => event.type === "level-up" && event.classId === "knight",
      ),
    ).toBe(true);
  });

  it("queues Talent edits until the Wave boundary and applies Activation Delay to newly slotted Abilities", () => {
    const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 850;
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    for (let rank = 0; rank < 5; rank += 1) {
      engine.allocateTalent(
        "knight",
        rank % 2 === 0 ? "k-fortitude" : "k-swordcraft",
      );
    }
    engine.allocateTalent("knight", "k-hold-line");
    engine.setLoadout("knight", ["k-hold-line", "k-sweep", "k-rally"]);

    let transitionAt: number | null = null;
    let elapsed = 0;
    while (elapsed < 300_000) {
      elapsed += 1;
      const events = driveBy(engine, 1);
      if (
        events.some(
          (event) => event.type === "wave-cleared" && event.encounter === 1,
        )
      ) {
        transitionAt = engine.snapshot().simNowMs;
      }
      if (events.some((event) => event.type === "config-applied")) {
        const snap = engine.snapshot();
        expect(snap.progression.talents.knight?.abilityTalentId).toBe(
          "k-hold-line",
        );
        expect(snap.progression.loadouts.knight).toEqual([
          "k-hold-line",
          "k-sweep",
          "k-rally",
        ]);
        const knight = snap.attempt?.combatants.find(
          (combatant) => combatant.defId === "knight",
        );
        expect(knight?.cooldownReadyAtMs["k-hold-line"]).toBe(
          (transitionAt ?? 0) + 2_000 + 15_000,
        );
        return;
      }
    }
    throw new Error("config-applied never emitted for talent boundary");
  });

  it("applies setParty at the next fresh Attempt", () => {
    const engine = createEngine(progressionContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    engine.setParty(["priest", "wizard", "hunter"], "knight");
    expect(engine.snapshot().progression.party).toEqual([
      "knight",
      "wizard",
      "priest",
    ]);
    engine.selectStage(1);
    expect(engine.snapshot().progression.party).toEqual([
      "priest",
      "wizard",
      "hunter",
    ]);
    expect(engine.snapshot().progression.reserve).toBe("knight");
  });
});

describe("Equipment and Drops", () => {
  it("awards zero Drops on encounter 1, one on encounters 2 and 3 per stage cycle", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);

    const encounterOneEvents = eventsWhileClearingEncounter(engine, 1);
    expect(
      encounterOneEvents.filter((event) => event.type === "drop-awarded"),
    ).toEqual([]);
    expect(engine.snapshot().nextDropId).toBe(1);

    const encounterTwoDrops = dropIdsWhileClearingEncounter(engine, 2);
    expect(encounterTwoDrops).toEqual([1]);
    expect(engine.snapshot().nextDropId).toBe(2);

    const encounterThreeDrops = dropIdsWhileClearingEncounter(engine, 3);
    expect(encounterThreeDrops).toEqual([2]);
    expect(engine.snapshot().nextDropId).toBe(3);
    expect(engine.snapshot().progression.armory).toHaveLength(2);
    expect(
      engine.snapshot().progression.armory.map((drop) => drop.dropId),
    ).toEqual([1, 2]);
  });

  it("rolls encounter 2 without uncommonFloor while encounter 3 enforces it", () => {
    let sawCommonOnEncounter2 = false;
    for (let seed = 0; seed < 500; seed += 1) {
      const engine = createEngine(fixtureContent, undefined, seed);
      engine.advanceBy(1);
      dropIdsWhileClearingEncounter(engine, 1);
      dropIdsWhileClearingEncounter(engine, 2);
      const encounterTwoDrop = engine.snapshot().progression.armory[0];
      if (encounterTwoDrop?.rarity === "common") {
        sawCommonOnEncounter2 = true;
      }
      dropIdsWhileClearingEncounter(engine, 3);
      const encounterThreeDrop =
        engine.snapshot().progression.armory[
          engine.snapshot().progression.armory.length - 1
        ];
      expect(encounterThreeDrop?.rarity).not.toBe("common");
    }
    expect(sawCommonOnEncounter2).toBe(true);
  });

  it("produces identical Drops for the same loot seed across two Engines", () => {
    const runCycle = () => {
      const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
      engine.advanceBy(1);
      dropIdsWhileClearingEncounter(engine, 1);
      dropIdsWhileClearingEncounter(engine, 2);
      dropIdsWhileClearingEncounter(engine, 3);
      return structuredClone(engine.snapshot().progression.armory);
    };

    expect(runCycle()).toEqual(runCycle());
  });

  it("pins fixture loot alignment for LOOT_SEED after one stage cycle", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    dropIdsWhileClearingEncounter(engine, 1);
    dropIdsWhileClearingEncounter(engine, 2);
    dropIdsWhileClearingEncounter(engine, 3);

    expect(engine.snapshot().progression.armory).toEqual([
      {
        dropId: 1,
        baseId: "fixture-armor",
        itemLevel: 1,
        rarity: "uncommon",
        affixes: [{ id: "percent-max-health", value: 0.04 }],
        awardedAtMs: expect.any(Number),
        seen: false,
        locked: false,
        assignedTo: null,
      },
      {
        dropId: 2,
        baseId: "fixture-charm",
        itemLevel: 1,
        rarity: "uncommon",
        affixes: [{ id: "flat-physical", value: 3 }],
        awardedAtMs: expect.any(Number),
        seen: false,
        locked: false,
        assignedTo: null,
      },
    ]);
  });

  it("keeps committed Drops through Party Defeat", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);

    let firstDropId: number | null = null;
    let elapsed = 0;
    while (elapsed < 300_000) {
      elapsed += 1;
      const events = driveBy(engine, 1);
      const awarded = events.find((event) => event.type === "drop-awarded");
      if (awarded) {
        firstDropId = awarded.dropId;
        break;
      }
    }
    expect(firstDropId).toBe(1);

    const saved = engine.snapshot();
    const attempt = saved.attempt;
    if (!attempt) {
      throw new Error("missing Attempt");
    }
    for (const combatant of attempt.combatants) {
      if (combatant.side === "party") {
        combatant.health = 0;
        combatant.knockedOut = true;
      }
    }
    saved.attempt = attempt;

    const defeated = createEngine(fixtureContent, saved, LOOT_SEED);
    let defeatElapsed = 0;
    while (defeatElapsed < 10_000) {
      defeatElapsed += 1;
      const events = driveBy(defeated, 1);
      if (events.some((event) => event.type === "party-defeat")) {
        break;
      }
    }

    expect(defeated.snapshot().progression.armory).toHaveLength(1);
    expect(defeated.snapshot().progression.armory[0]?.dropId).toBe(1);
  });

  it("keeps committed Drops through Stage abandonment via selectStage", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);

    let awardedDrop: DropInstance | null = null;
    let elapsed = 0;
    while (elapsed < 300_000) {
      elapsed += 1;
      const events = driveBy(engine, 1);
      const awarded = events.find((event) => event.type === "drop-awarded");
      if (awarded) {
        awardedDrop = structuredClone(
          engine
            .snapshot()
            .progression.armory.find(
              (drop) => drop.dropId === awarded.dropId,
            ) ?? null,
        );
        break;
      }
    }
    expect(awardedDrop).not.toBeNull();

    engine.selectStage(1);

    expect(engine.snapshot().progression.armory).toHaveLength(1);
    expect(engine.snapshot().progression.armory[0]).toEqual(awardedDrop);
    expect(engine.snapshot().attempt?.stage).toBe(1);
    expect(engine.snapshot().attempt?.encounter).toBe(1);
  });

  it("applies Equipment stats only from the next Stage Attempt", () => {
    const saved = scenario()
      .withParty(["knight", "wizard", "priest"], "hunter")
      .withDrops(1)
      .build();
    saved.lootRngState = LOOT_SEED;
    saved.nextDropId = 2;
    saved.attempt!.combatants = [
      {
        entityId: "party:knight:front",
        side: "party",
        defId: "knight",
        health: 180,
        maxHealth: 180,
        knockedOut: false,
        action: {
          abilityId: "knight-basic",
          startedAtMs: 0,
          impactAtMs: 1,
          endsAtMs: 1001,
          targetIds: ["opp:1:0"],
          impactResolved: false,
        },
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:wizard:middle",
        side: "party",
        defId: "wizard",
        health: 100,
        maxHealth: 100,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "party:priest:back",
        side: "party",
        defId: "priest",
        health: 110,
        maxHealth: 110,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
      {
        entityId: "opp:1:0",
        side: "opponent",
        defId: "fixture-grunt",
        health: 40,
        maxHealth: 40,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const beforeEquip = engine.advanceBy(1);
    const beforeDamage = beforeEquip.find((event) => event.type === "impact")
      ?.results[0]?.amount;
    expect(beforeDamage).toBe(13);

    engine.equip(1, "knight", "weapon");
    const duringAttempt = engine.advanceBy(5_000);
    const duringDamage = duringAttempt.find((event) => event.type === "impact")
      ?.results[0]?.amount;
    expect(duringDamage ?? beforeDamage).toBe(13);

    engine.selectStage(1);
    const snap = engine.snapshot();
    expect(snap.attempt?.equipmentLoadouts.knight?.weapon).toBe(1);

    let elapsed = 0;
    while (elapsed < 5_000) {
      elapsed += 1;
      const events = driveBy(engine, 1);
      const impact = events.find(
        (event): event is Extract<EngineEvent, { type: "impact" }> =>
          event.type === "impact" &&
          event.entityId === "party:knight:front" &&
          event.abilityId === "knight-basic",
      );
      if (impact?.results[0]?.kind === "damage") {
        expect(impact.results[0].amount).toBe(15);
        return;
      }
    }
    throw new Error("expected post-equip knight impact");
  });

  it("shares the loot stream between chunked advancement and reload", () => {
    const continuous = createEngine(fixtureContent, undefined, LOOT_SEED);
    continuous.advanceBy(1);
    let continuousDrop: number | null = null;
    let elapsed = 0;
    while (elapsed < 300_000) {
      elapsed += 7;
      const events = driveBy(continuous, 7);
      const awarded = events.find((event) => event.type === "drop-awarded");
      if (awarded) {
        continuousDrop = awarded.dropId;
        break;
      }
    }

    const reloaded = createEngine(fixtureContent, undefined, LOOT_SEED);
    reloaded.advanceBy(1);
    const mid = structuredClone(reloaded.snapshot());
    let reloadedDrop: number | null = null;
    let reloadedElapsed = mid.simNowMs;
    while (reloadedElapsed < 300_000) {
      reloadedElapsed += 1;
      const events = driveBy(reloaded, 1);
      const awarded = events.find((event) => event.type === "drop-awarded");
      if (awarded) {
        reloadedDrop = awarded.dropId;
        break;
      }
    }

    const restored = createEngine(fixtureContent, mid, LOOT_SEED);
    let restoredDrop: number | null = null;
    let restoredElapsed = mid.simNowMs;
    while (restoredElapsed < 300_000) {
      restoredElapsed += 7;
      const events = driveBy(restored, 7);
      const awarded = events.find((event) => event.type === "drop-awarded");
      if (awarded) {
        restoredDrop = awarded.dropId;
        break;
      }
    }

    expect(continuousDrop).toBe(1);
    expect(reloadedDrop).toBe(1);
    expect(restoredDrop).toBe(1);
    expect(restored.snapshot().progression.armory[0]).toEqual(
      reloaded.snapshot().progression.armory[0],
    );
  });
});

describe("Engine legality predicates", () => {
  function commandSucceeds(run: () => void): boolean {
    try {
      run();
      return true;
    } catch {
      return false;
    }
  }

  it("matches allocateTalent, deallocateTalent, and equip throw behavior across representative states", () => {
    const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 850;

    const fresh = () =>
      createEngine(fixtureContent, structuredClone(saved), LOOT_SEED);

    const allocateEngine = fresh();
    expect(allocateEngine.canAllocateTalent("knight", "k-fortitude")).toBe(
      commandSucceeds(() =>
        allocateEngine.allocateTalent("knight", "k-fortitude"),
      ),
    );

    const unknownTalent = fresh();
    expect(unknownTalent.canAllocateTalent("knight", "not-a-talent")).toBe(
      commandSucceeds(() =>
        unknownTalent.allocateTalent("knight", "not-a-talent"),
      ),
    );

    const unknownClass = fresh();
    expect(
      unknownClass.canAllocateTalent("not-a-class" as ClassId, "k-fortitude"),
    ).toBe(
      commandSucceeds(() =>
        unknownClass.allocateTalent("not-a-class" as ClassId, "k-fortitude"),
      ),
    );

    const capped = fresh();
    for (let rank = 0; rank < 5; rank += 1) {
      capped.allocateTalent(
        "knight",
        rank % 2 === 0 ? "k-fortitude" : "k-swordcraft",
      );
    }
    expect(capped.canAllocateTalent("knight", "k-fortitude")).toBe(
      commandSucceeds(() => capped.allocateTalent("knight", "k-fortitude")),
    );

    const mid = createEngine(fixtureContent, undefined, LOOT_SEED);
    mid.advanceBy(1);
    const midSaved = mid.snapshot();
    midSaved.progression.characterXp.knight = 250;
    const gated = createEngine(fixtureContent, midSaved, LOOT_SEED);
    expect(gated.canAllocateTalent("knight", "k-hold-line")).toBe(
      commandSucceeds(() => gated.allocateTalent("knight", "k-hold-line")),
    );

    const abilityLocked = fresh();
    for (let rank = 0; rank < 5; rank += 1) {
      abilityLocked.allocateTalent(
        "knight",
        rank % 2 === 0 ? "k-fortitude" : "k-swordcraft",
      );
    }
    abilityLocked.allocateTalent("knight", "k-hold-line");
    expect(abilityLocked.canDeallocateTalent("knight", "k-fortitude")).toBe(
      commandSucceeds(() =>
        abilityLocked.deallocateTalent("knight", "k-fortitude"),
      ),
    );
    expect(abilityLocked.canDeallocateTalent("knight", "k-hold-line")).toBe(
      commandSucceeds(() =>
        abilityLocked.deallocateTalent("knight", "k-hold-line"),
      ),
    );

    const armoryEngine = createEngine(fixtureContent, undefined, LOOT_SEED);
    armoryEngine.advanceBy(1);
    let dropId: number | null = null;
    let elapsed = 0;
    while (elapsed < 300_000) {
      elapsed += 1;
      const events = driveBy(armoryEngine, 1);
      const awarded = events.find((event) => event.type === "drop-awarded");
      if (awarded) {
        dropId = awarded.dropId;
        break;
      }
    }
    expect(dropId).not.toBeNull();
    const snap = armoryEngine.snapshot();
    const drop = snap.progression.armory.find(
      (entry) => entry.dropId === dropId,
    );
    expect(drop).toBeDefined();

    expect(armoryEngine.canEquip(dropId!, "knight", "weapon")).toBe(
      commandSucceeds(() => armoryEngine.equip(dropId!, "knight", "weapon")),
    );
    expect(armoryEngine.canEquip(dropId!, "wizard", "weapon")).toBe(
      commandSucceeds(() => armoryEngine.equip(dropId!, "wizard", "weapon")),
    );
    expect(armoryEngine.canEquip(dropId!, "knight", "armor")).toBe(
      commandSucceeds(() => armoryEngine.equip(dropId!, "knight", "armor")),
    );
    expect(armoryEngine.canEquip(9_999, "knight", "weapon")).toBe(false);
    expect(() => armoryEngine.equip(9_999, "knight", "weapon")).toThrow();
  });

  it("honours uncommitted pendingEdits when allocating mid-Attempt", () => {
    const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 850;
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.selectStage(1);

    expect(engine.canAllocateTalent("knight", "k-fortitude")).toBe(true);
    engine.allocateTalent("knight", "k-fortitude");
    expect(
      engine.snapshot().pendingEdits.some((edit) => edit.kind === "talent"),
    ).toBe(true);
    expect(engine.canAllocateTalent("knight", "k-fortitude")).toBe(
      commandSucceeds(() => engine.allocateTalent("knight", "k-fortitude")),
    );
    expect(
      engine.snapshot().progression.talents.knight?.statRanks["k-fortitude"],
    ).toBe(0);
  });

  it("never throws from legality queries", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    expect(() =>
      engine.canAllocateTalent("knight", "k-fortitude"),
    ).not.toThrow();
    expect(() =>
      engine.canAllocateTalent("bogus" as ClassId, "k-fortitude"),
    ).not.toThrow();
    expect(() => engine.canDeallocateTalent("knight", "missing")).not.toThrow();
    expect(() => engine.canEquip(0, "knight", "weapon")).not.toThrow();
  });
});

describe("Presentation Event vocabulary", () => {
  it("defines events with only domain facts (no sprite, audio, or DOM fields)", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const eventsPath = join(
      new URL(".", import.meta.url).pathname,
      "events.ts",
    );
    const enginePath = join(
      new URL(".", import.meta.url).pathname,
      "engine.ts",
    );
    const forbidden = /sprite|audio|DOM|backdropKey|iconKey/i;

    for (const path of [eventsPath, enginePath]) {
      const source = await readFile(path, "utf8");
      expect(source).not.toMatch(forbidden);
    }
  });
});
