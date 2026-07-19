import { describe, expect, it } from "vitest";
import { createEngine } from "./engine";
import type { EngineEvent } from "./events";
import type { Snapshot } from "./snapshot";
import { fixtureContent } from "./testing/fixture-content";
import type { Content } from "./types";

const LOOT_SEED = 0x5090;
const DURATION_MS = 30_000;

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
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED, () => 1_000);
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
    const oneMs = createEngine(engineContent, undefined, LOOT_SEED);
    const oneMsEvents = collectEvents(oneMs, DURATION_MS, 1);

    const sevenMs = createEngine(engineContent, undefined, LOOT_SEED);
    const sevenMsEvents = collectEvents(sevenMs, DURATION_MS, 7);

    const single = createEngine(engineContent, undefined, LOOT_SEED);
    const singleEvents = single.advanceBy(DURATION_MS);

    expect(stable(oneMsEvents)).toBe(stable(sevenMsEvents));
    expect(stable(oneMsEvents)).toBe(stable(singleEvents));
    expect(stable(oneMs.snapshot())).toBe(stable(sevenMs.snapshot()));
    expect(stable(oneMs.snapshot())).toBe(stable(single.snapshot()));
  });
});

describe("save/reload equivalence", () => {
  it("continues with identical events after restoring a mid-Attempt Snapshot", () => {
    const continuous = createEngine(engineContent, undefined, LOOT_SEED);
    const continuousEvents = collectEvents(continuous, 13_700, 7);
    continuousEvents.push(...collectEvents(continuous, DURATION_MS - 13_700, 7));

    const reloaded = createEngine(engineContent, undefined, LOOT_SEED);
    const reloadEvents = collectEvents(reloaded, 13_700, 7);
    const midFight = structuredClone(reloaded.snapshot());
    const restored = createEngine(engineContent, midFight, LOOT_SEED);
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
