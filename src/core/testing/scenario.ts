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
import type { ClassId, Content, StageId } from "../types";
import { fixtureContent } from "./fixture-content";

export interface ScenarioBuilder {
  atStage(stage: StageId): ScenarioBuilder;
  atEncounter(encounter: number): ScenarioBuilder;
  withXp(classId: ClassId, xp: number): ScenarioBuilder;
  withParty(members: [ClassId, ClassId, ClassId], reserve: ClassId): ScenarioBuilder;
  withDrops(count: number): ScenarioBuilder;
  knockedOut(classId: ClassId): ScenarioBuilder;
  withOpponentsAtOneHealth(): ScenarioBuilder;
  /** A valid Snapshot at the current SCHEMA_VERSION. */
  build(): Snapshot;
}

interface ScenarioState {
  stage: StageId;
  encounter: number;
  party: [ClassId, ClassId, ClassId] | null;
  reserve: ClassId | null;
  xp: Partial<Record<ClassId, number>>;
  dropCount: number;
  knockedOut: ClassId[];
  opponentsAtOneHealth: boolean;
}

function stageDefFor(content: Content, stage: StageId) {
  const stageDef = content.stages.find((entry) => entry.id === stage);
  if (!stageDef) {
    throw new Error(`Content missing Stage ${stage}`);
  }
  return stageDef;
}

function bossEncounter(stageDef: ReturnType<typeof stageDefFor>): number {
  return stageDef.waves.length + 1;
}

function opponentIdsForEncounter(
  content: Content,
  stage: StageId,
  encounter: number,
): string[] {
  const stageDef = stageDefFor(content, stage);
  if (encounter === bossEncounter(stageDef)) {
    return stageDef.boss.opponents;
  }
  return stageDef.waves[encounter - 1]?.opponents ?? [];
}

function makeOpponentCombatants(
  content: Content,
  stage: StageId,
  encounter: number,
): CombatantState[] {
  return opponentIdsForEncounter(content, stage, encounter).map((opponentId, index) => {
    const opponent = content.opponents.find((entry) => entry.id === opponentId);
    if (!opponent) {
      throw new Error(`Missing opponent ${opponentId} in Content`);
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

function makeDrops(content: Content, count: number): DropInstance[] {
  const base = content.equipmentBases[0];
  if (!base) {
    throw new Error("Content must define at least one Equipment Base");
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

function applyOpponentHealthFloor(attempt: AttemptState, health: number): void {
  for (const combatant of attempt.combatants) {
    if (combatant.side === "opponent") {
      combatant.health = health;
    }
  }
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
    opponentsAtOneHealth: false,
  };

  constructor(private readonly content: Content) {}

  atStage(stage: StageId): ScenarioBuilder {
    this.state.stage = stage;
    return this;
  }

  atEncounter(encounter: number): ScenarioBuilder {
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

  withOpponentsAtOneHealth(): ScenarioBuilder {
    this.state.opponentsAtOneHealth = true;
    return this;
  }

  build(): Snapshot {
    const progression = createDefaultProgression(this.content);
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
    progression.armory = makeDrops(this.content, this.state.dropCount);

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
    const engine = createEngine(this.content, seed);
    const snapshot = engine.snapshot();
    const attempt = snapshot.attempt;
    if (!attempt) {
      throw new Error("scenario builder failed to produce an Attempt");
    }

    attempt.stage = this.state.stage;
    if (this.state.encounter !== attempt.encounter || this.state.stage !== attempt.stage) {
      const party = attempt.combatants.filter((combatant) => combatant.side === "party");
      attempt.encounter = this.state.encounter;
      attempt.combatants = [
        ...party,
        ...makeOpponentCombatants(this.content, this.state.stage, this.state.encounter),
      ];
    }

    if (this.state.opponentsAtOneHealth) {
      applyOpponentHealthFloor(attempt, 1);
    }

    applyKnockouts(attempt, this.state.knockedOut);
    return snapshot;
  }
}

export function scenario(content: Content = fixtureContent): ScenarioBuilder {
  return new Builder(content);
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
