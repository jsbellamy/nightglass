import {
  chooseFirstValidAbility,
  combatantById,
  effectiveStats,
  healAmount,
  isCombatantStunned,
  livingCombatants,
  mitigateDamage,
  mitigationForChannel,
  opponentAbilityCandidates,
  opponentCombatants,
  partyAbilityCandidates,
  partyCombatants,
  powerForStats,
  rawDamageFromEffect,
  revalidateTargets,
  resolveTargets,
  shouldApplyStun,
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
  type AttemptState,
  type CombatantState,
  type DropInstance,
  type EquipmentLoadout,
  type ProgressionState,
  type Snapshot,
} from "./snapshot";
import { createDefaultProgression } from "./load-state";
import {
  allocateTalentPoint,
  canAllocateTalentPoint,
  canDeallocateTalentPoint,
  deallocateTalentPoint,
  emptyTalentState,
  stripAbilityFromLoadout,
  type ClassTalentState,
} from "./talents";
import { characterStats } from "./stats";
import type {
  AbilityDef,
  ClassId,
  ClassKitDef,
  Content,
  EquipmentSlotId,
  OpponentDef,
  StageDef,
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
  snapshot(): Snapshot;
  beginFreshAttempt(): EngineEvent[];
  selectStage(stage: 1 | 2 | 3): EngineEvent[];
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
  stagesById: Map<1 | 2 | 3, StageDef>;
  abilitiesById: Map<string, AbilityDef>;
  statusesById: Map<string, StatusEffectDef>;
}

interface PendingImpactChange {
  targetId: string;
  healthDelta: number;
  knockedOut: boolean;
  revived: boolean;
  revivedHealth?: number;
  statusesToApply: Array<{ statusId: string; expiresAtMs: number }>;
  statusesToRefresh: Array<{ statusId: string; expiresAtMs: number }>;
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

function effectiveTalentState(state: EngineState, classId: ClassId): ClassTalentState {
  const pending = state.pendingEdits.find(
    (edit) => edit.kind === "talent" && edit.classId === classId,
  );
  if (pending?.kind === "talent") {
    return {
      statRanks: { ...pending.statRanks },
      abilityTalentId: pending.abilityTalentId,
    };
  }
  const applied = state.progression.talents[classId];
  if (!applied) {
    throw new Error(`Missing Talent state for ${classId}`);
  }
  return structuredClone(applied);
}

function setTalentDraft(state: EngineState, classId: ClassId, draft: ClassTalentState): void {
  state.pendingEdits = state.pendingEdits.filter(
    (edit) => !(edit.kind === "talent" && edit.classId === classId),
  );
  state.pendingEdits.push({
    kind: "talent",
    classId,
    statRanks: { ...draft.statRanks },
    abilityTalentId: draft.abilityTalentId,
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
  stage: 1 | 2 | 3,
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
): "applied" | "refreshed" {
  const existing = combatant.statuses.find((status) => status.statusId === statusId);
  if (existing) {
    existing.expiresAtMs = expiresAtMs;
    return "refreshed";
  }
  combatant.statuses.push({ statusId, expiresAtMs });
  return "applied";
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
        if (effect.kind === "damage") {
          const channel = effect.channel ?? "physical";
          const raw = rawDamageFromEffect(powerForStats(actorStats, channel), effect);
          const amount = mitigateDamage(raw, mitigationForChannel(targetStats, channel));
          projectedHealth = Math.max(0, projectedHealth - amount);
          results.push({
            targetId: target.entityId,
            kind: "damage",
            channel,
            ...(effect.element ? { element: effect.element } : {}),
            amount,
            healthAfter: projectedHealth,
          });
          const pending = ensurePending(target.entityId);
          pending.healthDelta -= amount;
        }

        if (effect.kind === "heal" && !preTargetKnockedOut) {
          const amount = healAmount(powerForStats(actorStats, "elemental"), effect);
          const capped = Math.min(target.maxHealth, projectedHealth + amount);
          const applied = capped - projectedHealth;
          projectedHealth = capped;
          results.push({
            targetId: target.entityId,
            kind: "heal",
            amount: applied,
            healthAfter: projectedHealth,
          });
          const pending = ensurePending(target.entityId);
          pending.healthDelta += applied;
        }

        if (effect.kind === "revive" && preTargetKnockedOut) {
          const amount = healAmount(powerForStats(actorStats, "elemental"), effect);
          projectedHealth = amount;
          results.push({
            targetId: target.entityId,
            kind: "heal",
            amount,
            healthAfter: projectedHealth,
          });
          const pending = ensurePending(target.entityId);
          pending.revived = true;
          pending.revivedHealth = amount;
          pending.knockedOut = false;
        }

        if (effect.kind === "apply-status") {
          const statusId = effect.statusId;
          if (!statusId) {
            continue;
          }
          const statusDef = index.statusesById.get(statusId);
          if (!statusDef) {
            continue;
          }
          if (statusDef.kind === "stun" && !shouldApplyStun(target, index.opponentsById)) {
            continue;
          }
          const durationMs = effect.stunMs ?? statusDef.durationMs;
          const expiresAtMs = state.simNowMs + durationMs;
          const pending = ensurePending(target.entityId);
          const existing = target.statuses.find((status) => status.statusId === statusId);
          if (existing) {
            pending.statusesToRefresh.push({ statusId, expiresAtMs });
          } else {
            pending.statusesToApply.push({ statusId, expiresAtMs });
          }
        }
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
      applyStatus(target, status.statusId, status.expiresAtMs);
      emit(state, events, {
        type: "status-applied",
        entityId: target.entityId,
        statusId: status.statusId,
        expiresAtMs: status.expiresAtMs,
      });
    }
    for (const status of pending.statusesToRefresh) {
      applyStatus(target, status.statusId, status.expiresAtMs);
      emit(state, events, {
        type: "status-applied",
        entityId: target.entityId,
        statusId: status.statusId,
        expiresAtMs: status.expiresAtMs,
      });
    }
  }

  cancelStunnedWindUps(state, index);
  resolveKnockouts(state, index, events);
  evaluateEncounterOutcome(state, index, events);
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
  stage: 1 | 2 | 3,
  encounter: 1 | 2 | 3,
): void {
  const stageDef = stageDefFor(index, stage);
  const dropCount = encounter === 3 ? 2 : 1;

  for (let awardIndex = 0; awardIndex < dropCount; awardIndex += 1) {
    const rolled = rollDrop({
      content: index.content,
      stage: stageDef,
      itemLevel: stage,
      lootRng: { state: state.lootRngState },
      dropId: state.nextDropId,
      awardedAtMs: state.simNowMs,
      uncommonFloor: encounter === 3 && awardIndex === 1,
    });
    state.lootRngState = rolled.lootRng.state;
    state.nextDropId += 1;
    state.progression.armory.push(rolled.drop);
    emit(state, events, { type: "drop-awarded", dropId: rolled.drop.dropId });
  }
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
    awardEncounterDrops(state, index, events, attempt.stage, attempt.encounter);
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

function unlockableAbilityIds(
  classKit: ClassKitDef,
  talentState: ClassTalentState,
): Set<string> {
  const ids = new Set<string>([classKit.basicAbilityId, ...classKit.coreAbilityIds]);
  if (talentState.abilityTalentId) {
    ids.add(talentState.abilityTalentId);
  }
  return ids;
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
      state.progression.talents[edit.classId] = {
        statRanks: { ...edit.statRanks },
        abilityTalentId: edit.abilityTalentId,
      };
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

function resolveBatch(state: EngineState, index: ContentIndex, events: EngineEvent[]): void {
  resolveStatusExpiries(state, events);
  resolveImpacts(state, index, events);
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
  const unlockable = unlockableAbilityIds(classKit, effectiveTalentState(state, classId));
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

  function beginFreshAttemptCommand(): EngineEvent[] {
    const events: EngineEvent[] = [];
    const stage = state.attempt?.stage ?? state.progression.unlockedStage;
    state.attempt = null;
    startFreshAttempt(state, index, stage, events);
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
    const draft = effectiveTalentState(state, classId);
    const level = characterLevel(state.progression, classId, index.content.xpThresholds);
    allocateTalentPoint(draft, classKit, talentId, level);
    setTalentDraft(state, classId, draft);
  }

  function deallocateTalent(classId: ClassId, talentId: string): void {
    const classKit = index.classesById.get(classId);
    if (!classKit) {
      throw new Error(`Missing Class Kit ${classId}`);
    }
    const draft = effectiveTalentState(state, classId);
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
      const draft = effectiveTalentState(state, classId);
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
      const draft = effectiveTalentState(state, classId);
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
