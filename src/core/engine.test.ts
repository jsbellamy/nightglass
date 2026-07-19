import { describe, expect, it } from "vitest";
import { createEngine } from "./engine";
import type { EngineEvent } from "./events";
import type { Snapshot } from "./snapshot";
import { fixtureContent } from "./testing/fixture-content";
import type { Content } from "./types";

const LOOT_SEED = 0x5090;
const DURATION_MS = 30_000;
const FIXTURE_NOW_MS = 1_000;
const fixtureNow = () => FIXTURE_NOW_MS;

const engineContent: Content = {
  ...fixtureContent,
  stages: [
    fixtureContent.stages[0]!,
    { ...fixtureContent.stages[0]!, id: 2, name: "Fixture Stage 2" },
    { ...fixtureContent.stages[0]!, id: 3, name: "Fixture Stage 3" },
  ],
};

function collectEvents(
  engine: ReturnType<typeof createEngine>,
  durationMs: number,
  chunkMs: number,
): EngineEvent[] {
  const events: EngineEvent[] = [];
  let remaining = durationMs;
  while (remaining > 0) {
    const step = Math.min(chunkMs, remaining);
    events.push(...engine.advanceBy(step));
    remaining -= step;
  }
  return events;
}

function stable(value: unknown): string {
  return JSON.stringify(value);
}

describe("createEngine boot", () => {
  it("starts a fresh Stage 1 Attempt with full Party restore", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED, fixtureNow);
    const snap = engine.snapshot();

    expect(snap.attempt).toMatchObject({
      stage: 1,
      encounter: 1,
      phase: "fighting",
    });
    expect(snap.attempt?.combatants.filter((c) => c.side === "party")).toHaveLength(3);
    expect(snap.attempt?.combatants.every((c) => c.health === c.maxHealth)).toBe(true);

    const events = engine.advanceBy(1);
    expect(events[0]?.type).toBe("stage-attempt-started");
    expect(events[1]?.type).toBe("wave-started");
  });
});

describe("chunk-equivalence advancement", () => {
  it("produces identical events and byte-equal Snapshots for 1ms, 7ms, and single-call chunking", () => {
    const oneMs = createEngine(engineContent, undefined, LOOT_SEED, fixtureNow);
    const oneMsEvents = collectEvents(oneMs, DURATION_MS, 1);

    const sevenMs = createEngine(engineContent, undefined, LOOT_SEED, fixtureNow);
    const sevenMsEvents = collectEvents(sevenMs, DURATION_MS, 7);

    const single = createEngine(engineContent, undefined, LOOT_SEED, fixtureNow);
    const singleEvents = single.advanceBy(DURATION_MS);

    expect(stable(oneMsEvents)).toBe(stable(sevenMsEvents));
    expect(stable(oneMsEvents)).toBe(stable(singleEvents));
    expect(stable(oneMs.snapshot())).toBe(stable(sevenMs.snapshot()));
    expect(stable(oneMs.snapshot())).toBe(stable(single.snapshot()));
  });
});

describe("save/reload equivalence", () => {
  it("continues with identical events after restoring a mid-Attempt Snapshot", () => {
    const continuous = createEngine(engineContent, undefined, LOOT_SEED, fixtureNow);
    const continuousEvents = collectEvents(continuous, 13_700, 7);
    continuousEvents.push(...collectEvents(continuous, DURATION_MS - 13_700, 7));

    const reloaded = createEngine(engineContent, undefined, LOOT_SEED, fixtureNow);
    const reloadEvents = collectEvents(reloaded, 13_700, 7);
    const midFight = structuredClone(reloaded.snapshot());
    const restored = createEngine(engineContent, midFight, LOOT_SEED, fixtureNow);
    reloadEvents.push(...collectEvents(restored, DURATION_MS - 13_700, 7));

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

    for (let ms = 0; ms < 60_000; ms += 1) {
      const events = engine.advanceBy(1);
      const snap = engine.snapshot();

      for (const event of events) {
        if (event.type === "wave-cleared" && event.encounter === 1) {
          sawWaveCleared = true;
          transitionStartMs = event.atMs;
        }
        if (event.type === "wave-started" && event.encounter === 2) {
          nextWaveStartMs = event.atMs;
        }
        if (event.type === "action-started" && snap.attempt?.phase === "wave-transition") {
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
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 10,
      nextAttemptId: 5,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["knight", "wizard", "knight"],
        reserve: "wizard",
        characterXp: { knight: 50, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-shield-brace", "k-rally", "k-sweep"],
          wizard: ["w-prism", "w-frost", "w-cinder"],
          priest: ["p-moonwell", "p-resurgence", "p-smite"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 4,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(engineContent, saved, LOOT_SEED);
    const events: EngineEvent[] = [];

    for (let ms = 0; ms < 10_000; ms += 1) {
      events.push(...engine.advanceBy(1));
      if (events.some((event) => event.type === "stage-attempt-started" && event.attemptId === 5)) {
        break;
      }
    }

    const defeat = events.find((event) => event.type === "party-defeat");
    const retry = events.find(
      (event) => event.type === "stage-attempt-started" && event.attemptId === 5,
    );
    expect(defeat).toBeDefined();
    expect(retry).toBeDefined();
    expect((retry?.atMs ?? 0) - (defeat?.atMs ?? 0)).toBe(2_000);

    const snap = engine.snapshot();
    expect(snap.progression.characterXp).toEqual({ knight: 50, wizard: 0, priest: 0, hunter: 0 });
    expect(
      snap.attempt?.combatants
        .filter((combatant) => combatant.side === "party")
        .every((combatant) => !combatant.knockedOut && combatant.health === combatant.maxHealth),
    ).toBe(true);
  });
});

describe("selectStage", () => {
  it("abandons the current Attempt without rolling back earned Character XP", () => {
    const engine = createEngine(engineContent, undefined, LOOT_SEED);
    engine.advanceBy(5_000);
    const before = engine.snapshot();
    before.progression.characterXp = { knight: 120, wizard: 40, priest: 0, hunter: 0 };
    before.progression.unlockedStage = 2;

    const restored = createEngine(engineContent, before, LOOT_SEED);
    const events = restored.selectStage(2);
    const after = restored.snapshot();

    expect(events.some((event) => event.type === "stage-attempt-started")).toBe(true);
    expect(after.progression.characterXp).toEqual({ knight: 120, wizard: 40, priest: 0, hunter: 0 });
    expect(after.attempt?.stage).toBe(2);
  });

  it("throws when selecting a locked Stage", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    expect(() => engine.selectStage(2)).toThrow(/locked/i);
  });
});

describe("Stage 3 clear auto-retry", () => {
  it("begins another Stage 3 Attempt after clearing Stage 3", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 9,
      nextDropId: 1,
      progression: {
        unlockedStage: 3,
        party: ["knight", "wizard", "knight"],
        reserve: "wizard",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-shield-brace", "k-rally", "k-sweep"],
          wizard: ["w-prism", "w-frost", "w-cinder"],
          priest: ["p-moonwell", "p-resurgence", "p-smite"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 8,
        stage: 3,
        encounter: 3,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(engineContent, saved, LOOT_SEED);
    const events: EngineEvent[] = [];
    let snap = engine.snapshot();

    for (let ms = 0; ms < 5_000; ms += 1) {
      events.push(...engine.advanceBy(1));
      if (events.some((event) => event.type === "stage-cleared" && event.stage === 3)) {
        snap = engine.snapshot();
        break;
      }
    }

    expect(events.some((event) => event.type === "stage-cleared" && event.stage === 3)).toBe(
      true,
    );
    expect(events.some((event) => event.type === "stage-attempt-started")).toBe(true);
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
  it("keeps lootRngState unchanged across snapshot round-trip and advancement", () => {
    const engine = createEngine(engineContent, undefined, LOOT_SEED);
    engine.advanceBy(10_000);
    const before = engine.snapshot().lootRngState;

    const reloaded = createEngine(engineContent, engine.snapshot(), LOOT_SEED);
    reloaded.advanceBy(5_000);
    expect(reloaded.snapshot().lootRngState).toBe(before);
  });
});

describe("full combat rules", () => {
  it("starts Ability cooldown at Impact, not Wind-up", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["knight", "wizard", "priest"],
        reserve: "hunter",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-pommel", "k-sweep", "k-rally"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-smite", "p-moonwell", "p-resurgence"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    expect(engine.snapshot().attempt?.combatants[0]?.cooldownReadyAtMs["k-pommel"]).toBeUndefined();
    engine.advanceBy(250);
    expect(engine.snapshot().attempt?.combatants[0]?.cooldownReadyAtMs["k-pommel"]).toBe(9250);
  });

  it("cancels Wind-up on Stun without starting cooldown and keeps cooldowns elapsing while stunned", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["knight", "wizard", "priest"],
        reserve: "hunter",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-sweep", "k-rally", "k-pommel"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-smite", "p-moonwell", "p-resurgence"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.advanceBy(1200);
    const knight = engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.action).toBeNull();
    expect(knight?.cooldownReadyAtMs["k-sweep"]).toBeUndefined();
    expect(knight?.cooldownReadyAtMs["k-pommel"]).toBe(3000);
  });

  it("ignores Stun on Boss opponents", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["knight", "wizard", "priest"],
        reserve: "hunter",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-pommel", "k-sweep", "k-rally"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-smite", "p-moonwell", "p-resurgence"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 3,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const events = engine.advanceBy(250);
    const boss = engine.snapshot().attempt?.combatants.find((c) => c.defId === "fixture-boss");
    expect(boss?.statuses.some((status) => status.statusId === "stun")).toBe(false);
    expect(events.some((event) => event.type === "status-applied" && event.statusId === "stun")).toBe(
      false,
    );
  });

  it("refreshes Status Effects instead of stacking", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["knight", "wizard", "priest"],
        reserve: "hunter",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-shield-brace", "k-sweep", "k-rally"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-smite", "p-moonwell", "p-resurgence"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.advanceBy(100);
    const knight = engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.statuses.filter((status) => status.statusId === "braced")).toHaveLength(1);
    expect(knight?.statuses[0]?.expiresAtMs).toBe(5100);
  });

  it("starts cooldown when retarget fails at Impact", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["knight", "wizard", "priest"],
        reserve: "hunter",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-pommel", "k-sweep", "k-rally"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-smite", "p-moonwell", "p-resurgence"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const events = engine.advanceBy(250);
    const impact = events.find((event) => event.type === "impact");
    expect(impact?.results).toHaveLength(0);
    expect(engine.snapshot().attempt?.combatants[0]?.cooldownReadyAtMs["k-pommel"]).toBe(9250);
  });

  it("clamps Healing so it cannot overheal", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["priest", "knight", "wizard"],
        reserve: "hunter",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-shield-brace", "k-sweep", "k-rally"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-moonwell", "p-resurgence", "p-smite"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.advanceBy(300);
    const knight = engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.health).toBe(180);
  });

  it("cancels unfinished Wind-up on Knockout without starting cooldown", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["knight", "wizard", "priest"],
        reserve: "hunter",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-sweep", "k-rally", "k-pommel"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-smite", "p-moonwell", "p-resurgence"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.advanceBy(400);
    const knight = engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.knockedOut).toBe(true);
    expect(knight?.action).toBeNull();
    expect(knight?.cooldownReadyAtMs["k-sweep"]).toBeUndefined();
  });

  it("revives the first Knocked Out ally by Formation order with 1000ms Recovery", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["priest", "knight", "wizard"],
        reserve: "hunter",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-shield-brace", "k-sweep", "k-rally"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-resurgence", "p-moonwell", "p-smite"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const events = engine.advanceBy(500);
    const revived = events.find((event) => event.type === "revived");
    expect(revived?.entityId).toBe("party:knight:middle");
    expect(revived?.health).toBe(7);
    const knight = engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.knockedOut).toBe(false);
    expect(knight?.action?.endsAtMs).toBe(1500);
  });

  it("lets two simultaneous lethal Impacts both land from pre-resolution health", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["knight", "wizard", "priest"],
        reserve: "hunter",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-sweep", "k-rally", "k-pommel"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-smite", "p-moonwell", "p-resurgence"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const events = engine.advanceBy(350);
    const impacts = events.filter((event) => event.type === "impact");
    expect(impacts).toHaveLength(2);
    const knight = engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight");
    const grunt = engine.snapshot().attempt?.combatants.find((c) => c.defId === "fixture-grunt");
    expect(knight?.knockedOut).toBe(true);
    expect(grunt?.knockedOut).toBe(true);
  });

  it("applies queued loadout edits at the Wave boundary with Activation Delay", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    engine.setLoadout("knight", ["k-pommel", "k-sweep", "k-rally"]);

    let transitionAt: number | null = null;
    for (let ms = 0; ms < 120_000; ms += 1) {
      const events = engine.advanceBy(1);
      if (events.some((event) => event.type === "wave-cleared" && event.encounter === 1)) {
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
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["knight", "wizard", "priest"],
        reserve: "knight",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-pommel", "k-sweep", "k-rally"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-smite", "p-moonwell", "p-resurgence"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const damageEvents = engine.advanceBy(200);
    const knightAfterDamage = engine.snapshot().attempt?.combatants.find(
      (c) => c.entityId === "party:knight:front",
    );
    expect(knightAfterDamage?.action).toMatchObject({
      abilityId: "k-pommel",
      impactAtMs: 250,
      impactResolved: false,
    });
    expect(knightAfterDamage?.health).toBeLessThan(180);
    expect(damageEvents.some((event) => event.type === "impact" && event.entityId === "opp:1:0")).toBe(
      true,
    );

    const impactEvents = engine.advanceBy(50);
    const knightAfterImpact = engine.snapshot().attempt?.combatants.find(
      (c) => c.entityId === "party:knight:front",
    );
    expect(knightAfterImpact?.action?.impactResolved).toBe(true);
    expect(
      impactEvents.some(
        (event) => event.type === "impact" && event.entityId === "party:knight:front",
      ),
    ).toBe(true);
  });

  it("queues setFormation and applies Formation order at the Wave boundary with config-applied", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    engine.setFormation(["priest", "knight", "wizard"]);

    for (let ms = 0; ms < 120_000; ms += 1) {
      const events = engine.advanceBy(1);
      if (!events.some((event) => event.type === "config-applied")) {
        continue;
      }

      const snap = engine.snapshot();
      expect(snap.progression.party).toEqual(["priest", "knight", "wizard"]);
      const party = snap.attempt?.combatants.filter((combatant) => combatant.side === "party") ?? [];
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
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["knight", "wizard", "priest"],
        reserve: "knight",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-pommel", "k-sweep", "k-rally"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-smite", "p-moonwell", "p-resurgence"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

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
    const knight = engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.statuses).toHaveLength(0);
  });

  it("includes kind heal in impact results for Healing and revival Abilities", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["priest", "knight", "wizard"],
        reserve: "knight",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-shield-brace", "k-sweep", "k-rally"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-moonwell", "p-resurgence", "p-smite"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const healEngine = createEngine(fixtureContent, saved, LOOT_SEED);
    const healEvents = healEngine.advanceBy(300);
    const healImpact = healEvents.find(
      (event): event is Extract<typeof event, { type: "impact" }> =>
        event.type === "impact" && event.abilityId === "p-moonwell",
    );
    expect(healImpact?.results.some((result) => result.kind === "heal")).toBe(true);

    const reviveSaved: Snapshot = {
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
    expect(reviveImpact?.results.some((result) => result.kind === "heal")).toBe(true);
  });

  it("throws when setLoadout receives duplicate Ability ids", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    expect(() => engine.setLoadout("knight", ["k-sweep", "k-sweep", "k-rally"])).toThrow(
      /duplicate Abilities/i,
    );
  });

  it("completes Recovery and advances cooldowns while a Character remains stunned", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: {
        unlockedStage: 1,
        party: ["knight", "wizard", "priest"],
        reserve: "knight",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        loadouts: {
          knight: ["k-pommel", "k-sweep", "k-rally"],
          wizard: ["w-frost", "w-cinder", "w-prism"],
          priest: ["p-smite", "p-moonwell", "p-resurgence"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
      },
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.advanceBy(900);
    let knight = engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.action).toBeNull();
    expect(knight?.statuses.some((status) => status.statusId === "stun")).toBe(true);
    expect((knight?.cooldownReadyAtMs["k-pommel"] ?? Infinity)).toBeLessThanOrEqual(
      engine.snapshot().simNowMs,
    );
    expect(
      engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight")?.action,
    ).toBeNull();

    engine.advanceBy(100);
    knight = engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.action).toBeNull();
    expect(knight?.statuses.some((status) => status.statusId === "stun")).toBe(true);

    engine.advanceBy(4000);
    knight = engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.statuses.some((status) => status.statusId === "stun")).toBe(false);

    engine.advanceBy(1);
    knight = engine.snapshot().attempt?.combatants.find((c) => c.defId === "knight");
    expect(knight?.action).not.toBeNull();
    expect(knight?.action?.impactResolved).toBe(false);
  });

  it("does not touch lootRngState during combat resolution", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const combatPath = join(new URL(".", import.meta.url).pathname, "combat.ts");
    const source = await readFile(combatPath, "utf8");
    expect(source).not.toMatch(/lootRngState/);
  });
});

describe("Presentation Event vocabulary", () => {
  it("defines events with only domain facts (no sprite, audio, or DOM fields)", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const eventsPath = join(new URL(".", import.meta.url).pathname, "events.ts");
    const enginePath = join(new URL(".", import.meta.url).pathname, "engine.ts");
    const forbidden = /sprite|audio|DOM|backdropKey|iconKey/i;

    for (const path of [eventsPath, enginePath]) {
      const source = await readFile(path, "utf8");
      expect(source).not.toMatch(forbidden);
    }
  });
});
