import {
  livingCombatants,
  mitigateDamage,
  mitigationForChannel,
  opponentBasicAbility,
  opponentCombatants,
  partyBasicAbility,
  partyCombatants,
  powerForStats,
  rawDamageFromEffect,
  revalidateTarget,
  selectTarget,
} from "./combat";
import type { EngineEvent, EngineEventInput } from "./events";
import { initialLootRngState } from "./rng";
import type {
  AttemptState,
  CombatantState,
  ProgressionState,
  Snapshot,
} from "./snapshot";
import type {
  AbilityDef,
  ClassId,
  ClassKitDef,
  Content,
  OpponentDef,
  StageDef,
} from "./types";

export const SCHEMA_VERSION = 1;
const WAVE_TRANSITION_MS = 2_000;
const DEFEAT_HOLD_MS = 2_000;

const FORMATION_SLOTS = ["front", "middle", "back"] as const;

export interface Engine {
  advanceBy(ms: number): EngineEvent[];
  snapshot(): Snapshot;
  selectStage(stage: 1 | 2 | 3): EngineEvent[];
}

interface EngineState {
  schemaVersion: number;
  simNowMs: number;
  lootRngState: number;
  nextEventSeq: number;
  nextAttemptId: number;
  nextDropId: number;
  progression: ProgressionState;
  attempt: AttemptState | null;
  pendingEdits: Snapshot["pendingEdits"];
}

interface ContentIndex {
  content: Content;
  classesById: Map<ClassId, ClassKitDef>;
  opponentsById: Map<string, OpponentDef>;
  stagesById: Map<1 | 2 | 3, StageDef>;
  abilitiesById: Map<string, AbilityDef>;
}

function indexContent(content: Content): ContentIndex {
  return {
    content,
    classesById: new Map(content.classes.map((entry) => [entry.id, entry])),
    opponentsById: new Map(content.opponents.map((entry) => [entry.id, entry])),
    stagesById: new Map(content.stages.map((entry) => [entry.id, entry])),
    abilitiesById: new Map(content.abilities.map((entry) => [entry.id, entry])),
  };
}

function defaultProgression(content: Content): ProgressionState {
  const roster = content.classes.map((entry) => entry.id);
  if (roster.length === 0) {
    throw new Error("Content must define at least one Class Kit");
  }
  const pick = (index: number): ClassId => roster[index % roster.length]!;
  const characterXp = Object.fromEntries(
    roster.map((classId) => [classId, 0]),
  ) as Record<ClassId, number>;
  return {
    unlockedStage: 1,
    party: [pick(0), pick(1), pick(2)],
    reserve: pick(3),
    characterXp,
  };
}

function restoreProgression(
  saved: Snapshot["progression"],
  content: Content,
): ProgressionState {
  const defaults = defaultProgression(content);
  return {
    unlockedStage: saved.unlockedStage,
    party: saved.party,
    reserve: saved.reserve,
    characterXp: { ...defaults.characterXp, ...saved.characterXp },
  };
}

function makePartyCombatant(
  classId: ClassId,
  slotIndex: number,
  classKit: ClassKitDef,
): CombatantState {
  const slot = FORMATION_SLOTS[slotIndex] ?? "back";
  return {
    entityId: `party:${classId}:${slot}`,
    side: "party",
    defId: classId,
    health: classKit.base.maxHealth,
    maxHealth: classKit.base.maxHealth,
    knockedOut: false,
    action: null,
    cooldownReadyAtMs: {},
    statuses: [],
  };
}

function makeOpponentCombatant(
  opponent: OpponentDef,
  encounter: 1 | 2 | 3,
  index: number,
): CombatantState {
  return {
    entityId: `opp:${encounter}:${index}`,
    side: "opponent",
    defId: opponent.id,
    health: opponent.base.maxHealth,
    maxHealth: opponent.base.maxHealth,
    knockedOut: false,
    action: null,
    cooldownReadyAtMs: {},
    statuses: [],
  };
}

function resolveStage(index: ContentIndex, stage: 1 | 2 | 3): 1 | 2 | 3 {
  if (index.stagesById.has(stage)) {
    return stage;
  }
  const available = [...index.stagesById.keys()].sort((left, right) => left - right);
  const eligible = available.filter((entry) => entry <= stage);
  const fallback = eligible[eligible.length - 1] ?? available[0];
  if (!fallback) {
    throw new Error("Content must define at least one Stage");
  }
  return fallback;
}

function stageDefFor(index: ContentIndex, stage: 1 | 2 | 3): StageDef {
  const stageDef = index.stagesById.get(resolveStage(index, stage));
  if (!stageDef) {
    throw new Error(`Missing Stage ${stage} in Content`);
  }
  return stageDef;
}

function opponentIdsForEncounter(stageDef: StageDef, encounter: 1 | 2 | 3): string[] {
  if (encounter === 3) {
    return stageDef.boss.opponents;
  }
  return stageDef.waves[encounter - 1]?.opponents ?? [];
}

function spawnOpponents(
  index: ContentIndex,
  stage: 1 | 2 | 3,
  encounter: 1 | 2 | 3,
): CombatantState[] {
  const stageDef = stageDefFor(index, stage);
  return opponentIdsForEncounter(stageDef, encounter).map((opponentId, opponentIndex) => {
    const opponent = index.opponentsById.get(opponentId);
    if (!opponent) {
      throw new Error(`Missing opponent ${opponentId}`);
    }
    return makeOpponentCombatant(opponent, encounter, opponentIndex);
  });
}

function createAttempt(
  state: EngineState,
  index: ContentIndex,
  stage: 1 | 2 | 3,
  encounter: 1 | 2 | 3 = 1,
): AttemptState {
  const partyMembers = state.progression.party.map((classId, slotIndex) => {
    const classKit = index.classesById.get(classId);
    if (!classKit) {
      throw new Error(`Missing Class Kit ${classId}`);
    }
    return makePartyCombatant(classId, slotIndex, classKit);
  });
  return {
    id: state.nextAttemptId++,
    stage,
    encounter,
    phase: "fighting",
    phaseEndsAtMs: null,
    combatants: [...partyMembers, ...spawnOpponents(index, stage, encounter)],
  };
}

function emit(
  state: EngineState,
  events: EngineEvent[],
  event: EngineEventInput,
): void {
  events.push({ ...event, seq: state.nextEventSeq++, atMs: state.simNowMs } as EngineEvent);
}

function startFreshAttempt(
  state: EngineState,
  index: ContentIndex,
  stage: 1 | 2 | 3,
  events: EngineEvent[],
): void {
  state.attempt = createAttempt(state, index, stage, 1);
  emit(state, events, {
    type: "stage-attempt-started",
    stage,
    attemptId: state.attempt.id,
  });
  emit(state, events, {
    type: "wave-started",
    stage,
    encounter: 1,
    boss: false,
  });
}

function abilityForCombatant(index: ContentIndex, combatant: CombatantState): AbilityDef {
  if (combatant.side === "party") {
    const classKit = index.classesById.get(combatant.defId as ClassId);
    if (!classKit) {
      throw new Error(`Missing Class Kit ${combatant.defId}`);
    }
    return partyBasicAbility(index.content, classKit);
  }
  const opponent = index.opponentsById.get(combatant.defId);
  if (!opponent) {
    throw new Error(`Missing opponent ${combatant.defId}`);
  }
  return opponentBasicAbility(index.content, opponent);
}

function statsForCombatant(index: ContentIndex, combatant: CombatantState) {
  if (combatant.side === "party") {
    const classKit = index.classesById.get(combatant.defId as ClassId);
    if (!classKit) {
      throw new Error(`Missing Class Kit ${combatant.defId}`);
    }
    return classKit.base;
  }
  const opponent = index.opponentsById.get(combatant.defId);
  if (!opponent) {
    throw new Error(`Missing opponent ${combatant.defId}`);
  }
  return opponent.base;
}

function chooseActions(
  state: EngineState,
  index: ContentIndex,
  events: EngineEvent[],
): void {
  const attempt = state.attempt;
  if (!attempt || attempt.phase !== "fighting") {
    return;
  }

  for (const combatant of attempt.combatants) {
    if (combatant.knockedOut || combatant.action) {
      continue;
    }

    const ability = abilityForCombatant(index, combatant);
    const readyAt = combatant.cooldownReadyAtMs[ability.id] ?? 0;
    if (readyAt > state.simNowMs) {
      continue;
    }

    const target = selectTarget(ability.targeting, combatant, attempt.combatants);
    if (!target) {
      continue;
    }

    const impactAtMs = state.simNowMs + ability.windUpMs;
    const endsAtMs = impactAtMs + ability.recoveryMs;
    combatant.action = {
      abilityId: ability.id,
      startedAtMs: state.simNowMs,
      impactAtMs,
      endsAtMs,
      targetIds: [target.entityId],
      impactResolved: false,
    };
    emit(state, events, {
      type: "action-started",
      entityId: combatant.entityId,
      abilityId: ability.id,
      impactAtMs,
      targetIds: [target.entityId],
    });
  }
}

function resolveStatusExpiries(_state: EngineState, _events: EngineEvent[]): void {
  // Interim slice: no active Status Effects (#36).
}

function resolveImpacts(state: EngineState, index: ContentIndex, events: EngineEvent[]): void {
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }

  const due = attempt.combatants.filter(
    (combatant) =>
      combatant.action?.impactAtMs === state.simNowMs && !combatant.action.impactResolved,
  );
  if (due.length === 0) {
    return;
  }

  const pendingDamage: Array<{ target: CombatantState; amount: number }> = [];

  for (const actor of due) {
    const action = actor.action;
    if (!action) {
      continue;
    }
    action.impactResolved = true;

    const ability =
      index.abilitiesById.get(action.abilityId) ?? abilityForCombatant(index, actor);
    const readyAt = actor.cooldownReadyAtMs[ability.id] ?? 0;
    if (readyAt <= state.simNowMs && ability.cooldownMs > 0) {
      actor.cooldownReadyAtMs[ability.id] = state.simNowMs + ability.cooldownMs;
    }

    const target = revalidateTarget(
      ability.targeting,
      actor,
      attempt.combatants,
      action.targetIds[0],
    );

    const results: Extract<EngineEvent, { type: "impact" }>["results"] = [];
    if (!target) {
      emit(state, events, {
        type: "impact",
        entityId: actor.entityId,
        abilityId: action.abilityId,
        results,
      });
      continue;
    }

    const actorStats = statsForCombatant(index, actor);
    const targetStats = statsForCombatant(index, target);

    for (const effect of ability.effects) {
      if (effect.kind !== "damage") {
        continue;
      }
      const channel = effect.channel ?? "physical";
      const raw = rawDamageFromEffect(powerForStats(actorStats, channel), effect);
      const amount = mitigateDamage(raw, mitigationForChannel(targetStats, channel));
      pendingDamage.push({ target, amount });
      results.push({
        targetId: target.entityId,
        kind: "damage",
        channel,
        ...(effect.element ? { element: effect.element } : {}),
        amount,
        healthAfter: Math.max(0, target.health - amount),
      });
    }

    emit(state, events, {
      type: "impact",
      entityId: actor.entityId,
      abilityId: action.abilityId,
      results,
    });
  }

  for (const change of pendingDamage) {
    change.target.health = Math.max(0, change.target.health - change.amount);
  }

  for (const combatant of attempt.combatants) {
    if (!combatant.knockedOut && combatant.health === 0) {
      combatant.knockedOut = true;
      if (combatant.action && !combatant.action.impactResolved) {
        combatant.action = null;
      }
      emit(state, events, { type: "knockout", entityId: combatant.entityId });
    }
  }

  evaluateEncounterOutcome(state, index, events);
}

function evaluateEncounterOutcome(
  state: EngineState,
  index: ContentIndex,
  events: EngineEvent[],
): void {
  const attempt = state.attempt;
  if (!attempt || attempt.phase !== "fighting") {
    return;
  }

  const livingParty = livingCombatants(partyCombatants(attempt.combatants));
  const livingOpponents = livingCombatants(opponentCombatants(attempt.combatants));

  if (livingOpponents.length === 0) {
    emit(state, events, {
      type: "wave-cleared",
      stage: attempt.stage,
      encounter: attempt.encounter,
    });

    if (attempt.encounter === 3) {
      clearStage(state, index, events);
      return;
    }

    attempt.phase = "wave-transition";
    attempt.phaseEndsAtMs = state.simNowMs + WAVE_TRANSITION_MS;
    return;
  }

  if (livingParty.length === 0) {
    emit(state, events, { type: "party-defeat", stage: attempt.stage });
    attempt.phase = "defeat-hold";
    attempt.phaseEndsAtMs = state.simNowMs + DEFEAT_HOLD_MS;
  }
}

function clearStage(state: EngineState, index: ContentIndex, events: EngineEvent[]): void {
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }

  const clearedStage = attempt.stage;
  emit(state, events, { type: "stage-cleared", stage: clearedStage });

  if (clearedStage < 3) {
    const nextStage = (clearedStage + 1) as 1 | 2 | 3;
    state.progression.unlockedStage = Math.max(
      state.progression.unlockedStage,
      index.stagesById.has(nextStage) ? nextStage : clearedStage,
    ) as 1 | 2 | 3;
    state.attempt = null;
    startFreshAttempt(state, index, resolveStage(index, nextStage), events);
    return;
  }

  state.attempt = null;
  startFreshAttempt(state, index, resolveStage(index, 3), events);
}

function completeRecoveries(state: EngineState): void {
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }

  for (const combatant of attempt.combatants) {
    if (combatant.action?.endsAtMs === state.simNowMs) {
      combatant.action = null;
    }
  }
}

function finishWaveTransition(
  state: EngineState,
  index: ContentIndex,
  events: EngineEvent[],
): void {
  const attempt = state.attempt;
  if (
    !attempt ||
    attempt.phase !== "wave-transition" ||
    attempt.phaseEndsAtMs !== state.simNowMs
  ) {
    return;
  }

  const nextEncounter = (attempt.encounter + 1) as 1 | 2 | 3;
  const party = partyCombatants(attempt.combatants);
  attempt.encounter = nextEncounter;
  attempt.phase = "fighting";
  attempt.phaseEndsAtMs = null;
  attempt.combatants = [...party, ...spawnOpponents(index, attempt.stage, nextEncounter)];

  emit(state, events, {
    type: "wave-started",
    stage: attempt.stage,
    encounter: nextEncounter,
    boss: nextEncounter === 3,
  });
}

function finishDefeatHold(state: EngineState, index: ContentIndex, events: EngineEvent[]): void {
  const attempt = state.attempt;
  if (
    !attempt ||
    attempt.phase !== "defeat-hold" ||
    attempt.phaseEndsAtMs !== state.simNowMs
  ) {
    return;
  }

  const stage = attempt.stage;
  state.attempt = null;
  startFreshAttempt(state, index, stage, events);
}

function nextBoundaryMs(state: EngineState): number | null {
  const attempt = state.attempt;
  if (!attempt) {
    return null;
  }

  const boundaries: number[] = [];
  if (attempt.phaseEndsAtMs !== null) {
    boundaries.push(attempt.phaseEndsAtMs);
  }

  for (const combatant of attempt.combatants) {
    const action = combatant.action;
    if (!action) {
      continue;
    }
    if (!action.impactResolved) {
      boundaries.push(action.impactAtMs);
    }
    boundaries.push(action.endsAtMs);
  }

  return boundaries.length > 0 ? Math.min(...boundaries) : null;
}

function resolveBatch(state: EngineState, index: ContentIndex, events: EngineEvent[]): void {
  resolveStatusExpiries(state, events);
  resolveImpacts(state, index, events);
  completeRecoveries(state);
  finishWaveTransition(state, index, events);
  finishDefeatHold(state, index, events);
}

function toSnapshot(state: EngineState, now: () => number): Snapshot {
  return {
    schemaVersion: state.schemaVersion,
    savedAtMs: now(),
    simNowMs: state.simNowMs,
    lootRngState: state.lootRngState,
    nextEventSeq: state.nextEventSeq,
    nextAttemptId: state.nextAttemptId,
    nextDropId: state.nextDropId,
    progression: structuredClone(state.progression),
    attempt: state.attempt ? structuredClone(state.attempt) : null,
    pendingEdits: structuredClone(state.pendingEdits),
  };
}

function fromSnapshot(saved: Snapshot): EngineState {
  if (saved.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported Snapshot schemaVersion: ${saved.schemaVersion}`);
  }
  return {
    schemaVersion: saved.schemaVersion,
    simNowMs: saved.simNowMs,
    lootRngState: saved.lootRngState,
    nextEventSeq: saved.nextEventSeq,
    nextAttemptId: saved.nextAttemptId,
    nextDropId: saved.nextDropId,
    progression: structuredClone(saved.progression),
    attempt: saved.attempt ? structuredClone(saved.attempt) : null,
    pendingEdits: structuredClone(saved.pendingEdits),
  };
}

export function createEngine(
  content: Content,
  saved?: Snapshot,
  lootSeed?: number,
  now: () => number = Date.now,
): Engine {
  const index = indexContent(content);
  const state: EngineState = saved
    ? {
        ...fromSnapshot(saved),
        progression: restoreProgression(saved.progression, content),
      }
    : {
        schemaVersion: SCHEMA_VERSION,
        simNowMs: 0,
        lootRngState: initialLootRngState(lootSeed),
        nextEventSeq: 1,
        nextAttemptId: 1,
        nextDropId: 1,
        progression: defaultProgression(content),
        attempt: null,
        pendingEdits: [],
      };

  const bootEvents: EngineEvent[] = [];
  if (!saved) {
    startFreshAttempt(state, index, 1, bootEvents);
  }
  let bootEventsPending = bootEvents.length > 0;

  function advanceBy(ms: number): EngineEvent[] {
    if (!Number.isInteger(ms) || ms < 0) {
      throw new Error(`advanceBy expects a non-negative integer ms, got ${ms}`);
    }

    const events: EngineEvent[] = [];
    if (bootEventsPending) {
      events.push(...bootEvents);
      bootEventsPending = false;
    }

    const targetMs = state.simNowMs + ms;

    while (true) {
      chooseActions(state, index, events);
      const boundaryMs = nextBoundaryMs(state);
      if (boundaryMs === null || boundaryMs > targetMs) {
        break;
      }
      state.simNowMs = boundaryMs;
      resolveBatch(state, index, events);
      chooseActions(state, index, events);
    }

    state.simNowMs = targetMs;
    return events;
  }

  function selectStage(stage: 1 | 2 | 3): EngineEvent[] {
    if (stage > state.progression.unlockedStage) {
      throw new Error(`Stage ${stage} is locked (unlocked: ${state.progression.unlockedStage})`);
    }

    const events: EngineEvent[] = [];
    state.attempt = null;
    startFreshAttempt(state, index, stage, events);
    return events;
  }

  return {
    advanceBy,
    snapshot: () => toSnapshot(state, now),
    selectStage,
  };
}
