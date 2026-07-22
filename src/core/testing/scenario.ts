import { createEngine, SCHEMA_VERSION, type Engine } from "../engine";
import type { EngineEvent } from "../events";
import { opponentEntityId } from "../entity-id";
import { createDefaultProgression } from "../load-state";
import { initialLootRngState } from "../rng";
import type {
  AttemptState,
  CombatantState,
  DropInstance,
  ProgressionState,
  Snapshot,
} from "../snapshot";
import type { ClassId, StageId } from "../types";
import { fixtureContent } from "./fixture-content";

export interface ScenarioBuilder {
  atStage(stage: StageId): ScenarioBuilder;
  atEncounter(encounter: 1 | 2 | 3): ScenarioBuilder;
  withXp(classId: ClassId, xp: number): ScenarioBuilder;
  withParty(members: [ClassId, ClassId, ClassId], reserve: ClassId): ScenarioBuilder;
  withDrops(count: number): ScenarioBuilder;
  knockedOut(classId: ClassId): ScenarioBuilder;
  /** A valid Snapshot at the current SCHEMA_VERSION. */
  build(): Snapshot;
}

interface ScenarioState {
  stage: StageId;
  encounter: 1 | 2 | 3;
  party: [ClassId, ClassId, ClassId] | null;
  reserve: ClassId | null;
  xp: Partial<Record<ClassId, number>>;
  dropCount: number;
  knockedOut: ClassId[];
}

function opponentIdsForEncounter(encounter: 1 | 2 | 3): string[] {
  const stageDef = fixtureContent.stages[0];
  if (!stageDef) {
    throw new Error("fixtureContent must define at least one Stage");
  }
  if (encounter === 3) {
    return stageDef.boss.opponents;
  }
  return stageDef.waves[encounter - 1]?.opponents ?? [];
}

function makeOpponentCombatants(encounter: 1 | 2 | 3): CombatantState[] {
  return opponentIdsForEncounter(encounter).map((opponentId, index) => {
    const opponent = fixtureContent.opponents.find((entry) => entry.id === opponentId);
    if (!opponent) {
      throw new Error(`Missing opponent ${opponentId} in fixtureContent`);
    }
    return {
      entityId: opponentEntityId(String(encounter), index),
      side: "opponent" as const,
      defId: opponent.id,
      health: opponent.base.maxHealth,
      maxHealth: opponent.base.maxHealth,
      knockedOut: false,
      action: null,
      cooldownReadyAtMs: {},
      statuses: [],
    };
  });
}

function ensureClassXp(progression: ProgressionState, classId: ClassId): void {
  if (progression.characterXp[classId] === undefined) {
    progression.characterXp[classId] = 0;
  }
}

function applyKnockouts(attempt: AttemptState, classIds: ClassId[]): void {
  for (const classId of classIds) {
    const combatant = attempt.combatants.find(
      (entry) => entry.side === "party" && entry.defId === classId && !entry.knockedOut,
    );
    if (!combatant) {
      throw new Error(`No living Party Member with Class ${classId} to knock out`);
    }
    combatant.health = 0;
    combatant.knockedOut = true;
    combatant.action = null;
  }
}

function makeDrops(count: number): DropInstance[] {
  const base = fixtureContent.equipmentBases[0];
  if (!base) {
    throw new Error("fixtureContent must define at least one Equipment Base");
  }
  const drops: DropInstance[] = [];
  for (let i = 0; i < count; i += 1) {
    drops.push({
      dropId: i + 1,
      baseId: base.id,
      itemLevel: 1,
      rarity: "common",
      affixes: [],
      awardedAtMs: 1,
      seen: false,
      locked: false,
      assignedTo: null,
    });
  }
  return drops;
}

class Builder implements ScenarioBuilder {
  private readonly state: ScenarioState = {
    stage: 1,
    encounter: 1,
    party: null,
    reserve: null,
    xp: {},
    dropCount: 0,
    knockedOut: [],
  };

  atStage(stage: StageId): ScenarioBuilder {
    this.state.stage = stage;
    return this;
  }

  atEncounter(encounter: 1 | 2 | 3): ScenarioBuilder {
    this.state.encounter = encounter;
    return this;
  }

  withXp(classId: ClassId, xp: number): ScenarioBuilder {
    this.state.xp[classId] = xp;
    return this;
  }

  withParty(members: [ClassId, ClassId, ClassId], reserve: ClassId): ScenarioBuilder {
    this.state.party = members;
    this.state.reserve = reserve;
    return this;
  }

  withDrops(count: number): ScenarioBuilder {
    this.state.dropCount = count;
    return this;
  }

  knockedOut(classId: ClassId): ScenarioBuilder {
    this.state.knockedOut.push(classId);
    return this;
  }

  build(): Snapshot {
    const progression = createDefaultProgression(fixtureContent);
    if (this.state.party && this.state.reserve) {
      progression.party = [...this.state.party];
      progression.reserve = this.state.reserve;
    }
    for (const classId of [...progression.party, progression.reserve]) {
      ensureClassXp(progression, classId);
    }
    for (const [classId, xp] of Object.entries(this.state.xp) as [ClassId, number][]) {
      ensureClassXp(progression, classId);
      progression.characterXp[classId] = xp;
    }
    progression.unlockedStage = Math.max(
      progression.unlockedStage,
      this.state.stage,
    ) as StageId;
    progression.armory = makeDrops(this.state.dropCount);

    const seed: Snapshot = {
      schemaVersion: SCHEMA_VERSION,
      savedAtMs: 0,
      simNowMs: 0,
      lootRngState: initialLootRngState(),
      nextEventSeq: 1,
      nextAttemptId: 1,
      nextDropId: Math.max(1, this.state.dropCount + 1),
      progression,
      attempt: null,
      pendingEdits: [],
    };

    // Boot through the Engine so Attempt combatants match createAttempt.
    const engine = createEngine(fixtureContent, seed);
    const snapshot = engine.snapshot();
    const attempt = snapshot.attempt;
    if (!attempt) {
      throw new Error("scenario builder failed to produce an Attempt");
    }

    attempt.stage = this.state.stage;
    if (this.state.encounter !== attempt.encounter) {
      const party = attempt.combatants.filter((combatant) => combatant.side === "party");
      attempt.encounter = this.state.encounter;
      attempt.combatants = [...party, ...makeOpponentCombatants(this.state.encounter)];
    }

    applyKnockouts(attempt, this.state.knockedOut);
    return snapshot;
  }
}

export function scenario(): ScenarioBuilder {
  return new Builder();
}

/**
 * Advance in `stepMs` increments to `totalMs`, returning every event in order.
 * Replaces the hand-rolled drive loops. Chunk neutrality is a seam property
 * (docs/agents/code-style.md), so tests that assert it call this twice with
 * different stepMs and compare.
 */
export function driveBy(engine: Engine, totalMs: number, stepMs: number = 1): EngineEvent[] {
  if (!Number.isInteger(totalMs) || totalMs < 0) {
    throw new Error(`driveBy expects a non-negative integer totalMs, got ${totalMs}`);
  }
  if (!Number.isInteger(stepMs) || stepMs <= 0) {
    throw new Error(`driveBy expects a positive integer stepMs, got ${stepMs}`);
  }
  const events: EngineEvent[] = [];
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining);
    events.push(...engine.advanceBy(step));
    remaining -= step;
  }
  return events;
}
