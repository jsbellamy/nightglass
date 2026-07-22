import {
  chooseFirstValidAbility,
  combatantById,
  effectiveStats,
  isCombatantStunned,
  livingCombatants,
  opponentAbilityCandidates,
  opponentCombatants,
  partyAbilityCandidates,
  partyCombatants,
  revalidateTargets,
  resolveEffect,
  resolveTargets,
  shouldApplyStun,
  type EffectOutcome,
} from "./combat";
import {
  assignDrop,
  canEquipToSlot,
  discardDrops,
  equipmentModifiersForLoadout,
  findDrop,
  rollDrop,
  snapshotEquipmentLoadouts,
  unequipSlot,
  validateEquip,
} from "./equipment";
import type { EngineEvent, EngineEventInput } from "./events";
import { initialLootRngState } from "./rng";
import {
  cloneSnapshot,
  type ActiveStatus,
  type AttemptState,
  type CombatantState,
  type DropInstance,
  type EquipmentLoadout,
  type ProgressionState,
  type Snapshot,
} from "./snapshot";
import { createDefaultProgression } from "./load-state";
import * as pendingEdits from "./pending-edits";
import {
  allocateTalentPoint,
  canAllocateTalentPoint,
  canDeallocateTalentPoint,
  cloneClassTalentState,
  deallocateTalentPoint,
  emptyTalentState,
  normalizeClassTalentState,
  stripAbilityFromLoadout,
  type ClassTalentState,
} from "./talents";
import { characterStats } from "./stats";
import type {
  AbilityDef,
  BaseStats,
  ClassId,
  ClassKitDef,
  Content,
  EquipmentSlotId,
  OpponentDef,
  StageDef,
  StageId,
  StatusEffectDef,
} from "./types";
import { opponentEntityId, partyEntityId } from "./entity-id";
import { awardXp, levelFromXp, reserveXpAward } from "./xp";

export const SCHEMA_VERSION = 1;
const WAVE_TRANSITION_MS = 2_000;
const DEFEAT_HOLD_MS = 2_000;
const REVIVAL_RECOVERY_MS = 1_000;

export interface Engine {
  advanceBy(ms: number): EngineEvent[];
  /**
   * Advances the simulation like advanceBy, but awards no equipment drops.
   * Used for offline catch-up, where unattended time should progress combat
   * and XP without generating loot.
   */
  advanceOffline(ms: number): EngineEvent[];
  snapshot(): Snapshot;
  beginFreshAttempt(): EngineEvent[];
  selectStage(stage: StageId): EngineEvent[];
  setLoadout(classId: ClassId, loadout: [string, string, string]): void;
  setFormation(order: [ClassId, ClassId, ClassId]): void;
  allocateTalent(classId: ClassId, talentId: string): void;
  deallocateTalent(classId: ClassId, talentId: string): void;
  /** Whether allocateTalent(classId, talentId) would succeed right now. Never throws. */
  canAllocateTalent(classId: ClassId, talentId: string): boolean;
  /** Whether deallocateTalent(classId, talentId) would succeed right now. Never throws. */
  canDeallocateTalent(classId: ClassId, talentId: string): boolean;
  setParty(members: [ClassId, ClassId, ClassId], reserve: ClassId): void;
  equip(dropId: number, classId: ClassId, slot: EquipmentSlotId): void;
  /** Whether equip(dropId, classId, slot) would succeed right now. Never throws. */
  canEquip(dropId: number, classId: ClassId, slot: EquipmentSlotId): boolean;
  unequip(classId: ClassId, slot: EquipmentSlotId): void;
  setLocked(dropId: number, locked: boolean): void;
  markSeen(dropIds: number[]): void;
  discard(dropIds: number[]): void;
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
  stagesById: Map<StageId, StageDef>;
  abilitiesById: Map<string, AbilityDef>;
  statusesById: Map<string, StatusEffectDef>;
}

interface PendingImpactChange {
  targetId: string;
  healthDelta: number;
  knockedOut: boolean;
  revived: boolean;
  revivedHealth?: number;
  statusesToApply: Array<{
    statusId: string;
    expiresAtMs: number;
    sourceEntityId: string;
    sourcePhysical: number;
    sourceElemental: number;
  }>;
  statusesToRefresh: Array<{
    statusId: string;
    expiresAtMs: number;
    sourceEntityId: string;
    sourcePhysical: number;
    sourceElemental: number;
  }>;
}

interface StatusSourceSnapshot {
  entityId: string;
  physical: number;
  elemental: number;
}

function indexContent(content: Content): ContentIndex {
  return {
    content,
    classesById: new Map(content.classes.map((entry) => [entry.id, entry])),
    opponentsById: new Map(content.opponents.map((entry) => [entry.id, entry])),
    stagesById: new Map(content.stages.map((entry) => [entry.id, entry])),
    abilitiesById: new Map(content.abilities.map((entry) => [entry.id, entry])),
    statusesById: new Map(content.statuses.map((entry) => [entry.id, entry])),
  };
}

function restoreProgression(
  saved: Snapshot["progression"],
  content: Content,
): ProgressionState {
  const defaults = createDefaultProgression(content);
  return {
    unlockedStage: saved.unlockedStage,
    party: saved.party,
    reserve: saved.reserve,
    characterXp: { ...defaults.characterXp, ...saved.characterXp },
    talents: { ...defaults.talents, ...saved.talents },
    loadouts: { ...defaults.loadouts, ...saved.loadouts },
    armory: saved.armory ? structuredClone(saved.armory) : [],
    pendingParty: saved.pendingParty ?? null,
  };
}

function characterLevel(
  progression: ProgressionState,
  classId: ClassId,
  thresholds: number[],
): number {
  return levelFromXp(progression.characterXp[classId] ?? 0, thresholds);
}

/** Snapshot view of EngineState for pending-edit helpers (`savedAtMs` is unused). */
function pendingEditSnapshot(state: EngineState): Snapshot {
  return { ...state, savedAtMs: 0 };
}

function setTalentDraft(state: EngineState, classId: ClassId, draft: ClassTalentState): void {
  state.pendingEdits = state.pendingEdits.filter(
    (edit) => !(edit.kind === "talent" && edit.classId === classId),
  );
  const normalized = cloneClassTalentState(draft);
  state.pendingEdits.push({
    kind: "talent",
    classId,
    statRanks: { ...normalized.statRanks },
    abilityTalentId: normalized.abilityTalentId,
    tierStates: normalized.tierStates.map((tier) => ({
      statRanks: { ...tier.statRanks },
      abilityTalentId: tier.abilityTalentId,
    })),
  });
}

function makePartyCombatant(
  classId: ClassId,
  slotIndex: number,
  classKit: ClassKitDef,
  talentState: ClassTalentState,
  equipmentLoadout: EquipmentLoadout,
  armory: DropInstance[],
  content: Content,
): CombatantState {
  const equipmentMods = equipmentModifiersForLoadout(equipmentLoadout, armory, content);
  const stats = characterStats(classKit, talentState, equipmentMods);
  return {
    entityId: partyEntityId(classId, slotIndex),
    side: "party",
    defId: classId,
    health: stats.maxHealth,
    maxHealth: stats.maxHealth,
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
    entityId: opponentEntityId(String(encounter), index),
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

function nextStageId(
  stagesById: ReadonlyMap<StageId, StageDef>,
  current: StageId,
): StageId | null {
  const ordered = [...stagesById.keys()].sort((left, right) => left - right);
  const currentIndex = ordered.indexOf(current);
  if (currentIndex === -1) {
    return null;
  }
  if (currentIndex < ordered.length - 1) {
    return ordered[currentIndex + 1]!;
  }
  return current;
}

function resolveStage(index: ContentIndex, stage: StageId): StageId {
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

function stageDefFor(index: ContentIndex, stage: StageId): StageDef {
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
  stage: StageId,
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
  stage: StageId,
  encounter: 1 | 2 | 3 = 1,
  preserveParty?: CombatantState[],
  preserveEquipmentLoadouts?: Record<ClassId, EquipmentLoadout>,
): AttemptState {
  const roster = index.content.classes.map((entry) => entry.id);
  const equipmentLoadouts =
    preserveEquipmentLoadouts ??
    snapshotEquipmentLoadouts(state.progression.armory, roster);

  const partyMembers = state.progression.party.map((classId, slotIndex) => {
    const preserved = preserveParty?.find((combatant) => combatant.defId === classId);
    if (preserved) {
      return {
        ...structuredClone(preserved),
        entityId: partyEntityId(classId, slotIndex),
      };
    }
    const classKit = index.classesById.get(classId);
    if (!classKit) {
      throw new Error(`Missing Class Kit ${classId}`);
    }
    return makePartyCombatant(
      classId,
      slotIndex,
      classKit,
      state.progression.talents[classId] ?? emptyTalentState(classKit),
      equipmentLoadouts[classId] ?? {},
      state.progression.armory,
      index.content,
    );
  });
  return {
    id: state.nextAttemptId++,
    stage,
    encounter,
    phase: "fighting",
    phaseEndsAtMs: null,
    equipmentLoadouts,
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
  stage: StageId,
  events: EngineEvent[],
): void {
  if (state.progression.pendingParty) {
    state.progression.party = [...state.progression.pendingParty.members];
    state.progression.reserve = state.progression.pendingParty.reserve;
    state.progression.pendingParty = null;
  }

  applyPendingEdits(state, index, events, state.simNowMs);

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

function statsForCombatant(
  index: ContentIndex,
  combatant: CombatantState,
  progression: ProgressionState,
  attempt: AttemptState | null,
): ReturnType<typeof effectiveStats> {
  let base;
  if (combatant.side === "party") {
    const classId = combatant.defId as ClassId;
    const classKit = index.classesById.get(classId);
    if (!classKit) {
      throw new Error(`Missing Class Kit ${combatant.defId}`);
    }
    const talentState = progression.talents[classId] ?? emptyTalentState(classKit);
    const equipmentLoadout = attempt?.equipmentLoadouts[classId] ?? {};
    const equipmentMods = equipmentModifiersForLoadout(
      equipmentLoadout,
      progression.armory,
      index.content,
    );
    base = characterStats(classKit, talentState, equipmentMods);
  } else {
    const opponent = index.opponentsById.get(combatant.defId);
    if (!opponent) {
      throw new Error(`Missing opponent ${combatant.defId}`);
    }
    base = opponent.base;
  }
  return effectiveStats(base, combatant.statuses, index.statusesById);
}

function chooseAbilityForCombatant(
  index: ContentIndex,
  state: EngineState,
  combatant: CombatantState,
): AbilityDef | null {
  if (combatant.side === "party") {
    const classKit = index.classesById.get(combatant.defId as ClassId);
    if (!classKit) {
      throw new Error(`Missing Class Kit ${combatant.defId}`);
    }
    const loadout = state.progression.loadouts[combatant.defId as ClassId];
    const candidates = partyAbilityCandidates(
      index.content,
      classKit,
      loadout,
      index.abilitiesById,
    );
    return chooseFirstValidAbility(candidates, combatant, state.attempt!.combatants, state.simNowMs);
  }

  const opponent = index.opponentsById.get(combatant.defId);
  if (!opponent) {
    throw new Error(`Missing opponent ${combatant.defId}`);
  }
  const candidates = opponentAbilityCandidates(index.content, opponent, index.abilitiesById);
  return chooseFirstValidAbility(candidates, combatant, state.attempt!.combatants, state.simNowMs);
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
    if (isCombatantStunned(combatant, index.statusesById)) {
      continue;
    }

    const ability = chooseAbilityForCombatant(index, state, combatant);
    if (!ability) {
      continue;
    }

    const targets = resolveTargets(ability.targeting, combatant, attempt.combatants);
    if (targets.length === 0) {
      continue;
    }

    const impactAtMs = state.simNowMs + ability.windUpMs;
    const endsAtMs = impactAtMs + ability.recoveryMs;
    combatant.action = {
      abilityId: ability.id,
      startedAtMs: state.simNowMs,
      impactAtMs,
      endsAtMs,
      targetIds: targets.map((target) => target.entityId),
      impactResolved: false,
    };
    emit(state, events, {
      type: "action-started",
      entityId: combatant.entityId,
      abilityId: ability.id,
      impactAtMs,
      targetIds: targets.map((target) => target.entityId),
    });
  }
}

function startCooldown(
  actor: CombatantState,
  ability: AbilityDef,
  nowMs: number,
): void {
  if (ability.cooldownMs > 0) {
    actor.cooldownReadyAtMs[ability.id] = nowMs + ability.cooldownMs;
  }
}

function resolveStatusExpiries(state: EngineState, events: EngineEvent[]): void {
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }

  for (const combatant of attempt.combatants) {
    const remaining: typeof combatant.statuses = [];
    for (const status of combatant.statuses) {
      if (status.expiresAtMs === state.simNowMs) {
        emit(state, events, {
          type: "status-expired",
          entityId: combatant.entityId,
          statusId: status.statusId,
        });
      } else {
        remaining.push(status);
      }
    }
    combatant.statuses = remaining;
  }
}

function applyStatus(
  combatant: CombatantState,
  statusId: string,
  expiresAtMs: number,
  appliedAtMs: number,
  index: ContentIndex,
  source?: StatusSourceSnapshot,
): "applied" | "refreshed" {
  const statusDef = index.statusesById.get(statusId);
  const existing = combatant.statuses.find((status) => status.statusId === statusId);
  if (existing) {
    existing.expiresAtMs = expiresAtMs;
    writeTickSchedule(existing, statusDef, appliedAtMs, source);
    return "refreshed";
  }
  const created: ActiveStatus = { statusId, expiresAtMs };
  writeTickSchedule(created, statusDef, appliedAtMs, source);
  combatant.statuses.push(created);
  return "applied";
}

function writeTickSchedule(
  status: ActiveStatus,
  statusDef: StatusEffectDef | undefined,
  appliedAtMs: number,
  source?: StatusSourceSnapshot,
): void {
  if (!statusDef?.tickEveryMs || !statusDef.tickEffect || !source) {
    delete status.nextTickAtMs;
    delete status.sourceEntityId;
    delete status.sourcePower;
    return;
  }
  status.nextTickAtMs = appliedAtMs + statusDef.tickEveryMs;
  status.sourceEntityId = source.entityId;
  status.sourcePower = { physical: source.physical, elemental: source.elemental };
}

function sourceSnapshotFromStats(
  entityId: string,
  stats: BaseStats,
): StatusSourceSnapshot {
  return { entityId, physical: stats.physical, elemental: stats.elemental };
}

type ImpactResults = Extract<EngineEvent, { type: "impact" }>["results"];

function projectHealthFromOutcome(
  targetId: string,
  targetMaxHealth: number,
  projectedHealth: number,
  outcome: EffectOutcome,
  results: ImpactResults,
  ensurePending: (targetId: string) => PendingImpactChange,
): number {
  if (outcome.damageDetail) {
    const { amount, channel, element } = outcome.damageDetail;
    const healthAfter = Math.max(0, projectedHealth - amount);
    results.push({
      targetId,
      kind: "damage",
      channel,
      ...(element ? { element } : {}),
      amount,
      healthAfter,
    });
    ensurePending(targetId).healthDelta -= amount;
    return healthAfter;
  }

  if (outcome.revived && outcome.revivedHealth !== undefined) {
    const amount = outcome.revivedHealth;
    results.push({ targetId, kind: "heal", amount, healthAfter: amount });
    const pending = ensurePending(targetId);
    pending.revived = true;
    pending.revivedHealth = amount;
    pending.knockedOut = false;
    return amount;
  }

  if (outcome.healDetail) {
    const { amount } = outcome.healDetail;
    const healthAfter = Math.min(targetMaxHealth, projectedHealth + amount);
    results.push({ targetId, kind: "heal", amount, healthAfter });
    ensurePending(targetId).healthDelta += amount;
    return healthAfter;
  }

  return projectedHealth;
}

function queueStatusFromOutcome(
  target: CombatantState,
  outcome: EffectOutcome,
  simNowMs: number,
  index: ContentIndex,
  source: StatusSourceSnapshot,
  ensurePending: (targetId: string) => PendingImpactChange,
): void {
  const statusId = outcome.statusToApply?.statusId ?? outcome.statusToRefresh?.statusId;
  if (!statusId) {
    return;
  }
  const statusDef = index.statusesById.get(statusId);
  if (!statusDef) {
    return;
  }
  if (statusDef.kind === "stun" && !shouldApplyStun(target, index.opponentsById)) {
    return;
  }
  const durationMs = outcome.statusToApply?.durationMs ?? outcome.statusToRefresh?.durationMs;
  if (durationMs === undefined) {
    return;
  }
  const expiresAtMs = simNowMs + durationMs;
  const pending = ensurePending(target.entityId);
  const queued = {
    statusId,
    expiresAtMs,
    sourceEntityId: source.entityId,
    sourcePhysical: source.physical,
    sourceElemental: source.elemental,
  };
  if (outcome.statusToRefresh) {
    pending.statusesToRefresh.push(queued);
  } else if (outcome.statusToApply) {
    pending.statusesToApply.push(queued);
  }
}

function resolveImpacts(
  state: EngineState,
  index: ContentIndex,
  events: EngineEvent[],
  _awardDrops: boolean,
): void {
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

  const preHealth = new Map(
    attempt.combatants.map((combatant) => [combatant.entityId, combatant.health]),
  );
  const preKnockedOut = new Map(
    attempt.combatants.map((combatant) => [combatant.entityId, combatant.knockedOut]),
  );

  const pendingByTarget = new Map<string, PendingImpactChange>();

  function ensurePending(targetId: string): PendingImpactChange {
    const existing = pendingByTarget.get(targetId);
    if (existing) {
      return existing;
    }
    const created: PendingImpactChange = {
      targetId,
      healthDelta: 0,
      knockedOut: false,
      revived: false,
      statusesToApply: [],
      statusesToRefresh: [],
    };
    pendingByTarget.set(targetId, created);
    return created;
  }

  for (const actor of due) {
    const action = actor.action;
    if (!action) {
      continue;
    }
    action.impactResolved = true;

    const ability =
      index.abilitiesById.get(action.abilityId) ??
      chooseAbilityForCombatant(index, state, actor);
    if (!ability) {
      continue;
    }

    startCooldown(actor, ability, state.simNowMs);

    const targets = revalidateTargets(
      ability.targeting,
      actor,
      attempt.combatants,
      action.targetIds,
    );

    const results: Extract<EngineEvent, { type: "impact" }>["results"] = [];
    const actorStats = statsForCombatant(index, actor, state.progression, attempt);

    for (const target of targets) {
      const targetStats = statsForCombatant(index, target, state.progression, attempt);
      const preTargetHealth = preHealth.get(target.entityId) ?? target.health;
      const preTargetKnockedOut = preKnockedOut.get(target.entityId) ?? target.knockedOut;
      let projectedHealth = preTargetHealth;

      for (const effect of ability.effects) {
        const outcome = resolveEffect(
          effect,
          actorStats,
          {
            stats: targetStats,
            health: projectedHealth,
            maxHealth: target.maxHealth,
            knockedOut: preTargetKnockedOut,
            statuses: target.statuses,
          },
          index.statusesById,
        );

        projectedHealth = projectHealthFromOutcome(
          target.entityId,
          target.maxHealth,
          projectedHealth,
          outcome,
          results,
          ensurePending,
        );
        queueStatusFromOutcome(
          target,
          outcome,
          state.simNowMs,
          index,
          sourceSnapshotFromStats(actor.entityId, actorStats),
          ensurePending,
        );
      }
    }

    emit(state, events, {
      type: "impact",
      entityId: actor.entityId,
      abilityId: action.abilityId,
      results,
    });
  }

  for (const [targetId, pending] of pendingByTarget) {
    const target = combatantById(attempt.combatants, targetId);
    if (!target) {
      continue;
    }

    if (pending.revived) {
      target.knockedOut = false;
      target.health = pending.revivedHealth ?? target.health;
      target.action = {
        abilityId: "revival-recovery",
        startedAtMs: state.simNowMs,
        impactAtMs: state.simNowMs,
        endsAtMs: state.simNowMs + REVIVAL_RECOVERY_MS,
        targetIds: [],
        impactResolved: true,
      };
      emit(state, events, {
        type: "revived",
        entityId: target.entityId,
        health: target.health,
      });
    } else if (pending.healthDelta !== 0) {
      target.health = Math.max(0, target.health + pending.healthDelta);
    }

    for (const status of pending.statusesToApply) {
      applyStatus(
        target,
        status.statusId,
        status.expiresAtMs,
        state.simNowMs,
        index,
        {
          entityId: status.sourceEntityId,
          physical: status.sourcePhysical,
          elemental: status.sourceElemental,
        },
      );
      emit(state, events, {
        type: "status-applied",
        entityId: target.entityId,
        statusId: status.statusId,
        expiresAtMs: status.expiresAtMs,
      });
    }
    for (const status of pending.statusesToRefresh) {
      applyStatus(
        target,
        status.statusId,
        status.expiresAtMs,
        state.simNowMs,
        index,
        {
          entityId: status.sourceEntityId,
          physical: status.sourcePhysical,
          elemental: status.sourceElemental,
        },
      );
      emit(state, events, {
        type: "status-applied",
        entityId: target.entityId,
        statusId: status.statusId,
        expiresAtMs: status.expiresAtMs,
      });
    }
  }

  cancelStunnedWindUps(state, index);
}

function resolveStatusTicks(
  state: EngineState,
  index: ContentIndex,
  events: EngineEvent[],
): void {
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }

  for (const target of attempt.combatants) {
    if (target.knockedOut) {
      continue;
    }

    for (const status of target.statuses) {
      if (status.nextTickAtMs !== state.simNowMs) {
        continue;
      }
      if (status.nextTickAtMs >= status.expiresAtMs) {
        continue;
      }

      const statusDef = index.statusesById.get(status.statusId);
      if (!statusDef?.tickEffect || !status.sourceEntityId || !status.sourcePower) {
        continue;
      }

      const actorStats: BaseStats = {
        maxHealth: 0,
        physical: status.sourcePower.physical,
        elemental: status.sourcePower.elemental,
        armor: 0,
        elementalResistance: 0,
      };
      const targetStats = statsForCombatant(index, target, state.progression, attempt);
      const outcome = resolveEffect(
        statusDef.tickEffect,
        actorStats,
        {
          stats: targetStats,
          health: target.health,
          maxHealth: target.maxHealth,
          knockedOut: target.knockedOut,
          statuses: target.statuses,
        },
        index.statusesById,
      );

      const results: Extract<EngineEvent, { type: "impact" }>["results"] = [];
      if (outcome.damageDetail) {
        const { amount, channel, element } = outcome.damageDetail;
        const healthAfter = Math.max(0, target.health - amount);
        results.push({
          targetId: target.entityId,
          kind: "damage",
          channel,
          ...(element ? { element } : {}),
          amount,
          healthAfter,
        });
        target.health = healthAfter;
      }

      if (results.length > 0) {
        emit(state, events, {
          type: "impact",
          entityId: status.sourceEntityId,
          abilityId: `status:${status.statusId}`,
          results,
        });
      }

      const tickEveryMs = statusDef.tickEveryMs;
      if (tickEveryMs === undefined) {
        continue;
      }
      const nextTickAtMs = state.simNowMs + tickEveryMs;
      if (nextTickAtMs < status.expiresAtMs) {
        status.nextTickAtMs = nextTickAtMs;
      } else {
        delete status.nextTickAtMs;
      }
    }
  }
}

function cancelStunnedWindUps(state: EngineState, index: ContentIndex): void {
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }

  for (const combatant of attempt.combatants) {
    if (
      combatant.action &&
      !combatant.action.impactResolved &&
      isCombatantStunned(combatant, index.statusesById)
    ) {
      combatant.action = null;
    }
  }
}

function awardOpponentDefeatXp(
  state: EngineState,
  index: ContentIndex,
  events: EngineEvent[],
  opponentAward: number,
): void {
  if (opponentAward <= 0) {
    return;
  }

  const recipients = new Map<ClassId, number>();
  for (const classId of state.progression.party) {
    recipients.set(classId, (recipients.get(classId) ?? 0) + opponentAward);
  }
  const reserve = state.progression.reserve;
  recipients.set(reserve, (recipients.get(reserve) ?? 0) + reserveXpAward(opponentAward));

  for (const [classId, amount] of recipients) {
    const currentXp = state.progression.characterXp[classId] ?? 0;
    const result = awardXp(currentXp, amount, index.content.xpThresholds);
    state.progression.characterXp[classId] = result.totalXp;
    emit(state, events, {
      type: "xp-awarded",
      classId,
      amount,
      totalXp: result.totalXp,
    });
    for (let level = result.previousLevel + 1; level <= result.newLevel; level += 1) {
      emit(state, events, { type: "level-up", classId, level });
    }
  }
}

function resolveKnockouts(
  state: EngineState,
  index: ContentIndex,
  events: EngineEvent[],
): void {
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }

  for (const combatant of attempt.combatants) {
    if (!combatant.knockedOut && combatant.health <= 0) {
      combatant.knockedOut = true;
      combatant.health = 0;
      if (combatant.action && !combatant.action.impactResolved) {
        combatant.action = null;
      }
      emit(state, events, { type: "knockout", entityId: combatant.entityId });
      if (combatant.side === "opponent") {
        const opponentDef = index.opponentsById.get(combatant.defId);
        if (opponentDef) {
          awardOpponentDefeatXp(state, index, events, opponentDef.xpAward);
        }
      }
    }
  }
}

function awardEncounterDrops(
  state: EngineState,
  index: ContentIndex,
  events: EngineEvent[],
  stage: StageId,
  encounter: 1 | 2 | 3,
): void {
  const stageDef = stageDefFor(index, stage);
  if (encounter === 1) {
    return;
  }

  const rolled = rollDrop({
    content: index.content,
    stage: stageDef,
    itemLevel: stage,
    lootRng: { state: state.lootRngState },
    dropId: state.nextDropId,
    awardedAtMs: state.simNowMs,
    uncommonFloor: encounter === 3,
  });
  state.lootRngState = rolled.lootRng.state;
  state.nextDropId += 1;
  state.progression.armory.push(rolled.drop);
  emit(state, events, { type: "drop-awarded", dropId: rolled.drop.dropId });
}

function evaluateEncounterOutcome(
  state: EngineState,
  index: ContentIndex,
  events: EngineEvent[],
  awardDrops: boolean,
): void {
  const attempt = state.attempt;
  if (!attempt || attempt.phase !== "fighting") {
    return;
  }

  const livingParty = livingCombatants(partyCombatants(attempt.combatants));
  const livingOpponents = livingCombatants(opponentCombatants(attempt.combatants));

  if (livingOpponents.length === 0) {
    if (awardDrops) {
      awardEncounterDrops(state, index, events, attempt.stage, attempt.encounter);
    }
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

  const nextStage = nextStageId(index.stagesById, clearedStage);
  if (nextStage === null) {
    throw new Error(`Cleared Stage ${clearedStage} is not present in Content`);
  }

  if (nextStage !== clearedStage) {
    const unlocked = state.progression.unlockedStage;
    state.progression.unlockedStage =
      nextStage > unlocked ? nextStage : unlocked;
  }

  state.attempt = null;
  startFreshAttempt(state, index, nextStage, events);
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

function applyPendingEdits(
  state: EngineState,
  index: ContentIndex,
  events: EngineEvent[],
  boundaryMs: number,
): void {
  if (state.pendingEdits.length === 0) {
    return;
  }

  const attempt = state.attempt;
  const partyCombatantStates = attempt ? partyCombatants(attempt.combatants) : [];
  const byClassId = new Map(partyCombatantStates.map((combatant) => [combatant.defId, combatant]));

  for (const edit of state.pendingEdits) {
    if (edit.kind === "talent") {
      const classKit = index.classesById.get(edit.classId);
      if (!classKit) {
        throw new Error(`Missing Class Kit ${edit.classId}`);
      }
      const previousAbility = state.progression.talents[edit.classId]?.abilityTalentId ?? null;
      const previous = state.progression.talents[edit.classId] ?? emptyTalentState(classKit);
      state.progression.talents[edit.classId] = normalizeClassTalentState(classKit, {
        ...previous,
        statRanks: { ...edit.statRanks },
        abilityTalentId: edit.abilityTalentId,
        tierStates: edit.tierStates
          ? edit.tierStates.map((tier) => ({
              statRanks: { ...tier.statRanks },
              abilityTalentId: tier.abilityTalentId,
            }))
          : previous.tierStates.map((tier, tierIndex) =>
              tierIndex === 0
                ? {
                    statRanks: { ...edit.statRanks },
                    abilityTalentId: edit.abilityTalentId,
                  }
                : { statRanks: { ...tier.statRanks }, abilityTalentId: tier.abilityTalentId },
            ),
      });
      if (previousAbility && previousAbility !== edit.abilityTalentId) {
        state.progression.loadouts[edit.classId] = stripAbilityFromLoadout(
          state.progression.loadouts[edit.classId],
          previousAbility,
          classKit,
        );
      }
      const combatant = byClassId.get(edit.classId);
      if (combatant) {
        const equipmentLoadout = attempt?.equipmentLoadouts[edit.classId] ?? {};
        const equipmentMods = equipmentModifiersForLoadout(
          equipmentLoadout,
          state.progression.armory,
          index.content,
        );
        const stats = characterStats(
          classKit,
          state.progression.talents[edit.classId]!,
          equipmentMods,
        );
        combatant.maxHealth = stats.maxHealth;
        combatant.health = Math.min(combatant.health, combatant.maxHealth);
      }
      continue;
    }

    if (!attempt) {
      if (edit.kind === "loadout") {
        state.progression.loadouts[edit.classId] = [...edit.loadout];
      }
      continue;
    }

    if (edit.kind === "formation") {
      state.progression.party = [...edit.order];
      const reordered = edit.order.map((classId, slotIndex) => {
        const existing = byClassId.get(classId);
        if (!existing) {
          throw new Error(`Formation edit references missing Party Member ${classId}`);
        }
        return {
          ...existing,
          entityId: partyEntityId(classId, slotIndex),
        };
      });
      attempt.combatants = [...reordered, ...opponentCombatants(attempt.combatants)];
    }

    if (edit.kind === "loadout") {
      const classKit = index.classesById.get(edit.classId);
      if (!classKit) {
        throw new Error(`Missing Class Kit ${edit.classId}`);
      }
      const previous = state.progression.loadouts[edit.classId];
      state.progression.loadouts[edit.classId] = [...edit.loadout];
      const combatant = byClassId.get(edit.classId);
      if (!combatant) {
        continue;
      }
      const previousSet = new Set(previous);
      for (const abilityId of edit.loadout) {
        if (previousSet.has(abilityId)) {
          continue;
        }
        const ability = index.abilitiesById.get(abilityId);
        if (!ability) {
          continue;
        }
        const existingReady = combatant.cooldownReadyAtMs[abilityId] ?? 0;
        combatant.cooldownReadyAtMs[abilityId] = Math.max(
          existingReady,
          boundaryMs + ability.cooldownMs,
        );
      }
    }
  }

  state.pendingEdits = [];
  emit(state, events, { type: "config-applied" });
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

  applyPendingEdits(state, index, events, state.simNowMs);

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
    for (const status of combatant.statuses) {
      boundaries.push(status.expiresAtMs);
      if (
        status.nextTickAtMs !== undefined &&
        status.nextTickAtMs < status.expiresAtMs
      ) {
        boundaries.push(status.nextTickAtMs);
      }
    }
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

function resolveBatch(
  state: EngineState,
  index: ContentIndex,
  events: EngineEvent[],
  awardDrops: boolean,
): void {
  resolveStatusExpiries(state, events);
  resolveStatusTicks(state, index, events);
  resolveImpacts(state, index, events, awardDrops);
  resolveKnockouts(state, index, events);
  evaluateEncounterOutcome(state, index, events, awardDrops);
  completeRecoveries(state);
  finishWaveTransition(state, index, events);
  finishDefeatHold(state, index, events);
}

function toSnapshot(state: EngineState, now: () => number): Snapshot {
  return cloneSnapshot({
    schemaVersion: state.schemaVersion,
    savedAtMs: now(),
    simNowMs: state.simNowMs,
    lootRngState: state.lootRngState,
    nextEventSeq: state.nextEventSeq,
    nextAttemptId: state.nextAttemptId,
    nextDropId: state.nextDropId,
    progression: state.progression,
    attempt: state.attempt,
    pendingEdits: state.pendingEdits,
  });
}

function fromSnapshot(saved: Snapshot): EngineState {
  if (saved.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported Snapshot schemaVersion: ${saved.schemaVersion}`);
  }
  const cloned = cloneSnapshot(saved);
  return {
    schemaVersion: cloned.schemaVersion,
    simNowMs: cloned.simNowMs,
    lootRngState: cloned.lootRngState,
    nextEventSeq: cloned.nextEventSeq,
    nextAttemptId: cloned.nextAttemptId,
    nextDropId: cloned.nextDropId,
    progression: cloned.progression,
    attempt: cloned.attempt,
    pendingEdits: cloned.pendingEdits,
  };
}

function validateLoadout(
  index: ContentIndex,
  state: EngineState,
  classId: ClassId,
  loadout: [string, string, string],
): void {
  const classKit = index.classesById.get(classId);
  if (!classKit) {
    throw new Error(`Missing Class Kit ${classId}`);
  }
  const unlockable = new Set(
    pendingEdits.unlockableAbilityIds(
      classKit,
      pendingEdits.effectiveTalentState(pendingEditSnapshot(state), classId),
    ),
  );
  const unique = new Set(loadout);
  if (unique.size !== loadout.length) {
    throw new Error(`Loadout for ${classId} must not contain duplicate Abilities`);
  }
  for (const abilityId of loadout) {
    if (!unlockable.has(abilityId)) {
      throw new Error(`Ability ${abilityId} is not unlocked for ${classId}`);
    }
    if (!index.abilitiesById.has(abilityId)) {
      throw new Error(`Unknown Ability ${abilityId}`);
    }
  }
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
        progression: createDefaultProgression(content),
        attempt: null,
        pendingEdits: [],
      };

  const bootEvents: EngineEvent[] = [];
  if (!saved) {
    startFreshAttempt(state, index, 1, bootEvents);
  } else if (saved.attempt === null) {
    startFreshAttempt(state, index, state.progression.unlockedStage, bootEvents);
  }
  let bootEventsPending = bootEvents.length > 0;

  function assertNonNegativeIntegerMs(ms: number, method: "advanceBy" | "advanceOffline"): void {
    if (!Number.isInteger(ms) || ms < 0) {
      throw new Error(`${method} expects a non-negative integer ms, got ${ms}`);
    }
  }

  function advanceElapsed(ms: number, awardDrops: boolean): EngineEvent[] {
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
      resolveBatch(state, index, events, awardDrops);
      chooseActions(state, index, events);
    }

    state.simNowMs = targetMs;
    return events;
  }

  function advanceBy(ms: number): EngineEvent[] {
    assertNonNegativeIntegerMs(ms, "advanceBy");
    return advanceElapsed(ms, true);
  }

  function advanceOffline(ms: number): EngineEvent[] {
    assertNonNegativeIntegerMs(ms, "advanceOffline");
    return advanceElapsed(ms, false);
  }

  function beginFreshAttemptCommand(): EngineEvent[] {
    const events: EngineEvent[] = [];
    const stage = state.attempt?.stage ?? state.progression.unlockedStage;
    state.attempt = null;
    startFreshAttempt(state, index, stage, events);
    return events;
  }

  function selectStage(stage: StageId): EngineEvent[] {
    if (stage > state.progression.unlockedStage) {
      throw new Error(`Stage ${stage} is locked (unlocked: ${state.progression.unlockedStage})`);
    }

    const events: EngineEvent[] = [];
    state.attempt = null;
    startFreshAttempt(state, index, stage, events);
    return events;
  }

  function setLoadout(classId: ClassId, loadout: [string, string, string]): void {
    validateLoadout(index, state, classId, loadout);
    state.pendingEdits = state.pendingEdits.filter(
      (edit) => !(edit.kind === "loadout" && edit.classId === classId),
    );
    state.pendingEdits.push({ kind: "loadout", classId, loadout });
  }

  function setFormation(order: [ClassId, ClassId, ClassId]): void {
    const current = new Set(state.progression.party);
    const next = new Set(order);
    if (current.size !== next.size || [...current].some((classId) => !next.has(classId))) {
      throw new Error("Formation edit must keep the same three Party Members");
    }
    state.pendingEdits = state.pendingEdits.filter((edit) => edit.kind !== "formation");
    state.pendingEdits.push({ kind: "formation", order: [...order] });
  }

  function allocateTalent(classId: ClassId, talentId: string): void {
    const classKit = index.classesById.get(classId);
    if (!classKit) {
      throw new Error(`Missing Class Kit ${classId}`);
    }
    const draft = pendingEdits.effectiveTalentState(pendingEditSnapshot(state), classId);
    const level = characterLevel(state.progression, classId, index.content.xpThresholds);
    allocateTalentPoint(draft, classKit, talentId, level);
    setTalentDraft(state, classId, draft);
  }

  function deallocateTalent(classId: ClassId, talentId: string): void {
    const classKit = index.classesById.get(classId);
    if (!classKit) {
      throw new Error(`Missing Class Kit ${classId}`);
    }
    const draft = pendingEdits.effectiveTalentState(pendingEditSnapshot(state), classId);
    const level = characterLevel(state.progression, classId, index.content.xpThresholds);
    deallocateTalentPoint(draft, classKit, talentId, level);
    setTalentDraft(state, classId, draft);
  }

  function canAllocateTalent(classId: ClassId, talentId: string): boolean {
    const classKit = index.classesById.get(classId);
    if (!classKit) {
      return false;
    }
    try {
      const draft = pendingEdits.effectiveTalentState(pendingEditSnapshot(state), classId);
      const level = characterLevel(state.progression, classId, index.content.xpThresholds);
      return canAllocateTalentPoint(draft, classKit, talentId, level);
    } catch {
      return false;
    }
  }

  function canDeallocateTalent(classId: ClassId, talentId: string): boolean {
    const classKit = index.classesById.get(classId);
    if (!classKit) {
      return false;
    }
    try {
      const draft = pendingEdits.effectiveTalentState(pendingEditSnapshot(state), classId);
      const level = characterLevel(state.progression, classId, index.content.xpThresholds);
      return canDeallocateTalentPoint(draft, classKit, talentId, level);
    } catch {
      return false;
    }
  }

  function setParty(members: [ClassId, ClassId, ClassId], reserve: ClassId): void {
    const roster = new Set([...members, reserve]);
    if (roster.size !== 4) {
      throw new Error("Party and Reserve must use four distinct Classes");
    }
    for (const classId of roster) {
      if (!index.classesById.has(classId)) {
        throw new Error(`Unknown Class ${classId}`);
      }
    }
    state.progression.pendingParty = { members: [...members], reserve };
  }

  function equip(dropId: number, classId: ClassId, slot: EquipmentSlotId): void {
    const drop = findDrop(state.progression.armory, dropId);
    if (!drop) {
      throw new Error(`Unknown Drop ${dropId}`);
    }
    validateEquip(drop, index.content, classId, slot);
    assignDrop(state.progression.armory, dropId, classId, slot);
  }

  function canEquip(dropId: number, classId: ClassId, slot: EquipmentSlotId): boolean {
    const drop = findDrop(state.progression.armory, dropId);
    if (!drop) {
      return false;
    }
    return canEquipToSlot(drop, index.content, classId, slot);
  }

  function unequip(classId: ClassId, slot: EquipmentSlotId): void {
    if (!index.classesById.has(classId)) {
      throw new Error(`Unknown Class ${classId}`);
    }
    unequipSlot(state.progression.armory, classId, slot);
  }

  function setLocked(dropId: number, locked: boolean): void {
    const drop = findDrop(state.progression.armory, dropId);
    if (!drop) {
      throw new Error(`Unknown Drop ${dropId}`);
    }
    drop.locked = locked;
  }

  function markSeen(dropIds: number[]): void {
    for (const dropId of dropIds) {
      const drop = findDrop(state.progression.armory, dropId);
      if (!drop) {
        throw new Error(`Unknown Drop ${dropId}`);
      }
      drop.seen = true;
    }
  }

  function discard(dropIds: number[]): void {
    state.progression.armory = discardDrops(state.progression.armory, dropIds);
  }

  return {
    advanceBy,
    advanceOffline,
    snapshot: () => toSnapshot(state, now),
    beginFreshAttempt: beginFreshAttemptCommand,
    selectStage,
    setLoadout,
    setFormation,
    allocateTalent,
    deallocateTalent,
    canAllocateTalent,
    canDeallocateTalent,
    setParty,
    equip,
    canEquip,
    unequip,
    setLocked,
    markSeen,
    discard,
  };
}
