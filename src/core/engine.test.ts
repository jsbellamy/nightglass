import { describe, expect, it } from "vitest";
import { createEngine } from "./engine";
import type { EngineEvent } from "./events";
import type { ProgressionState, Snapshot } from "./snapshot";
import { defaultTalentsForClasses } from "./talents";
import { fixtureContent } from "./testing/fixture-content";
import type { Content } from "./types";

const LOOT_SEED = 0x5090;
const DURATION_MS = 30_000;
const FIXTURE_NOW_MS = 1_000;
const fixtureNow = () => FIXTURE_NOW_MS;

const fixtureTalents = defaultTalentsForClasses(fixtureContent.classes);

function progressionState(
  overrides: Partial<ProgressionState> & Pick<ProgressionState, "party" | "reserve">,
): ProgressionState {
  return {
    unlockedStage: 1,
    characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
    loadouts: {
      knight: ["k-shield-brace", "k-rally", "k-sweep"],
      wizard: ["w-prism", "w-frost", "w-cinder"],
      priest: ["p-moonwell", "p-resurgence", "p-smite"],
      hunter: ["h-snare", "h-mark", "h-volley"],
    },
    talents: fixtureTalents,
    pendingParty: null,
    armory: [],
    ...overrides,
  };
}

const engineContent: Content = {
  ...fixtureContent,
  stages: [
    fixtureContent.stages[0]!,
    { ...fixtureContent.stages[0]!, id: 2, name: "Fixture Stage 2" },
    { ...fixtureContent.stages[0]!, id: 3, name: "Fixture Stage 3" },
  ],
};

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
          },
          {
            id: "h-keen-eye",
            name: "Keen Eye",
            perRank: { flat: { physical: 2 } },
            maxRanks: 5,
          },
        ],
        abilityRow: ["h-trap", "h-rain"],
      },
    },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 4,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 8,
        stage: 3,
        encounter: 3,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 3,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
      progression: progressionState({
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
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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

describe("progression", () => {
  it("awards full Character XP to Party Members and floor(50%) to the Reserve on opponent defeat", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 1,
      progression: progressionState({
        unlockedStage: 1,
        party: ["knight", "wizard", "priest"],
        reserve: "hunter",
        characterXp: { knight: 0, wizard: 0, priest: 0, hunter: 0 },
        talents: {
          knight: { statRanks: { "k-fortitude": 0, "k-swordcraft": 0 }, abilityTalentId: null },
          wizard: {
            statRanks: { "w-elemental-practice": 0, "w-warding-lore": 0 },
            abilityTalentId: null,
          },
          priest: { statRanks: { "p-devotion": 0, "p-blessing": 0 }, abilityTalentId: null },
          hunter: { statRanks: { "h-fleetness": 0, "h-keen-eye": 0 }, abilityTalentId: null },
        },
        loadouts: {
          knight: ["k-shield-brace", "k-rally", "k-sweep"],
          wizard: ["w-prism", "w-frost", "w-cinder"],
          priest: ["p-moonwell", "p-resurgence", "p-smite"],
          hunter: ["k-shield-brace", "k-rally", "k-sweep"],
        },
        pendingParty: null,
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
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
        ],
      },
      pendingEdits: [],
    };

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
    for (let ms = 0; ms < 120_000; ms += 1) {
      const events = engine.advanceBy(1);
      if (events.some((event) => event.type === "knockout" && event.entityId === "opp:1:0")) {
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
    for (let ms = 0; ms < 300_000; ms += 1) {
      events.push(...engine.advanceBy(1));
      if (events.some((event) => event.type === "stage-cleared" && event.stage === 1)) {
        break;
      }
    }
    const snap = engine.snapshot();
    expect(snap.progression.characterXp.knight).toBeGreaterThanOrEqual(100);
    expect(events.some((event) => event.type === "level-up" && event.classId === "knight")).toBe(
      true,
    );
  });

  it("queues Talent edits until the Wave boundary and applies Activation Delay to newly slotted Abilities", () => {
    const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 850;
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    for (let rank = 0; rank < 5; rank += 1) {
      engine.allocateTalent("knight", rank % 2 === 0 ? "k-fortitude" : "k-swordcraft");
    }
    engine.allocateTalent("knight", "k-hold-line");
    engine.setLoadout("knight", ["k-hold-line", "k-sweep", "k-rally"]);

    let transitionAt: number | null = null;
    for (let ms = 0; ms < 300_000; ms += 1) {
      const events = engine.advanceBy(1);
      if (events.some((event) => event.type === "wave-cleared" && event.encounter === 1)) {
        transitionAt = engine.snapshot().simNowMs;
      }
      if (events.some((event) => event.type === "config-applied")) {
        const snap = engine.snapshot();
        expect(snap.progression.talents.knight?.abilityTalentId).toBe("k-hold-line");
        expect(snap.progression.loadouts.knight).toEqual(["k-hold-line", "k-sweep", "k-rally"]);
        const knight = snap.attempt?.combatants.find((combatant) => combatant.defId === "knight");
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
    expect(engine.snapshot().progression.party).toEqual(["knight", "wizard", "priest"]);
    engine.selectStage(1);
    expect(engine.snapshot().progression.party).toEqual(["priest", "wizard", "hunter"]);
    expect(engine.snapshot().progression.reserve).toBe("knight");
  });
});

describe("Equipment and Drops", () => {
  it("awards one Drop per ordinary Wave clear and two sequential Boss Drops", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);

    const drops: number[] = [];
    for (let ms = 0; ms < 300_000; ms += 1) {
      const events = engine.advanceBy(1);
      for (const event of events) {
        if (event.type === "drop-awarded") {
          drops.push(event.dropId);
        }
      }
      const snap = engine.snapshot();
      if (snap.attempt?.encounter === 3 && snap.attempt.phase === "fighting") {
        break;
      }
    }

    for (let ms = 0; ms < 300_000; ms += 1) {
      const events = engine.advanceBy(1);
      for (const event of events) {
        if (event.type === "drop-awarded") {
          drops.push(event.dropId);
        }
      }
      if (drops.length >= 4) {
        break;
      }
    }

    expect(drops).toEqual([1, 2, 3, 4]);
    expect(engine.snapshot().progression.armory).toHaveLength(4);
  });

  it("keeps committed Drops through Party Defeat", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);

    let firstDropId: number | null = null;
    for (let ms = 0; ms < 300_000; ms += 1) {
      const events = engine.advanceBy(1);
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
    for (let ms = 0; ms < 10_000; ms += 1) {
      const events = defeated.advanceBy(1);
      if (events.some((event) => event.type === "party-defeat")) {
        break;
      }
    }

    expect(defeated.snapshot().progression.armory).toHaveLength(1);
    expect(defeated.snapshot().progression.armory[0]?.dropId).toBe(1);
  });

  it("applies Equipment stats only from the next Stage Attempt", () => {
    const saved: Snapshot = {
      schemaVersion: 1,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: LOOT_SEED,
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: 2,
      progression: progressionState({
        party: ["knight", "wizard", "priest"],
        reserve: "hunter",
        armory: [
          {
            dropId: 1,
            baseId: "fixture-blade",
            itemLevel: 1,
            rarity: "common",
            affixes: [],
            awardedAtMs: 1,
            seen: false,
            locked: false,
            assignedTo: null,
          },
        ],
      }),
      attempt: {
        id: 1,
        stage: 1,
        encounter: 1,
        phase: "fighting",
        phaseEndsAtMs: null,
        equipmentLoadouts: { knight: {}, wizard: {}, priest: {}, hunter: {} },
        combatants: [
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
        ],
      },
      pendingEdits: [],
    };

    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const beforeEquip = engine.advanceBy(1);
    const beforeDamage = beforeEquip.find((event) => event.type === "impact")?.results[0]?.amount;
    expect(beforeDamage).toBe(13);

    engine.equip(1, "knight", "weapon");
    const duringAttempt = engine.advanceBy(5_000);
    const duringDamage = duringAttempt.find((event) => event.type === "impact")?.results[0]?.amount;
    expect(duringDamage ?? beforeDamage).toBe(13);

    engine.selectStage(1);
    const snap = engine.snapshot();
    expect(snap.attempt?.equipmentLoadouts.knight?.weapon).toBe(1);

    for (let ms = 0; ms < 5_000; ms += 1) {
      const events = engine.advanceBy(1);
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
    for (let ms = 0; ms < 300_000; ms += 7) {
      const events = continuous.advanceBy(7);
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
    for (let ms = mid.simNowMs; ms < 300_000; ms += 1) {
      const events = reloaded.advanceBy(1);
      const awarded = events.find((event) => event.type === "drop-awarded");
      if (awarded) {
        reloadedDrop = awarded.dropId;
        break;
      }
    }

    const restored = createEngine(fixtureContent, mid, LOOT_SEED);
    let restoredDrop: number | null = null;
    for (let ms = mid.simNowMs; ms < 300_000; ms += 7) {
      const events = restored.advanceBy(7);
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
