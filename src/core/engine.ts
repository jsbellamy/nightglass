import {
  adaptiveElementForBasic,
  combatantById,
  isCombatantStunned,
  livingCombatants,
  opponentCombatants,
  partyCombatants,
  revalidateTargets,
  resolveEffect,
  resolveTargets,
  shouldApplyStun,
  type EffectOutcome,
} from "./combat";
import { createStatLedger, type StatLedger } from "./combatant-stats";
import {
  chooseAbilityForCombatant,
  indexContent,
  type ContentIndex,
} from "./content-index";
import {
  assignDrop,
  canEquipToSlot,
  discardDrops,
  equipmentModifiersForLoadout,
  nextRarity,
  rollDrop,
  rollSalvageDrop,
  SALVAGE_BATCH_SIZE,
  snapshotEquipmentLoadouts,
  unequipSlot,
  validateEquip,
} from "./equipment";
import type { EngineEvent, EngineEventInput } from "./events";
import { initialCombatRngState, initialLootRngState, mulberry32Step } from "./rng";
import {
  cloneSnapshot,
  freezeArmoryForSnapshot,
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
  replaceAbilityInLoadout,
  resolveTalentTier,
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
  Element,
  EquipmentSlotId,
  ItemLevel,
  OpponentDef,
  StageDef,
  StageId,
  StatusEffectDef,
} from "./types";
import { opponentEntityId, partyEntityId } from "./entity-id";
import { awardXp, levelFromXp, reserveXpAward } from "./xp";
import { createDueQueue, type DueEntry, type DueKind, type DueQueueWithIndex } from "./schedule";

export const SCHEMA_VERSION = 2;
const WAVE_TRANSITION_MS = 2_000;
const DEFEAT_HOLD_MS = 2_000;
const REVIVAL_RECOVERY_MS = 1_000;
const PHASE_END_ENTITY_ID = "attempt";

export interface OfflineAdvance {
  stagesCleared: number;
}

interface EventSink {
  push(event: EngineEvent): void;
}

function arrayEventSink(events: EngineEvent[]): EventSink {
  return {
    push(event) {
      events.push(event);
    },
  };
}

function countingEventSink(counter: { stagesCleared: number }): EventSink {
  return {
    push(event) {
      if (event.type === "stage-cleared") {
        counter.stagesCleared += 1;
      }
    },
  };
}

export interface Engine {
  advanceBy(ms: number): EngineEvent[];
  /**
   * Advances the simulation like advanceBy, but awards no equipment drops.
   * Used for offline catch-up, where unattended time should progress combat
   * and XP without generating loot.
   */
  advanceOffline(ms: number): EngineEvent[];
  /**
   * Advances like advanceOffline but accumulates counts instead of
   * materialising Presentation Events. For Offline Progress catch-up, where
   * the caller needs totals, not a per-event stream.
   */
  advanceOfflineSummary(ms: number): OfflineAdvance;
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
  salvage(dropIds: number[]): void;
}

/** Test seam for boundary-scan regression (#718); implemented on every Engine instance. */
export interface EngineTestSeam {
  nextBoundaryMs(): number | null;
  statusesRef(entityId: string): ActiveStatus[] | undefined;
}

/** Test seam — next boundary from Snapshot fields without booting an Engine (issue #718). */
export function nextBoundaryMsForSnapshot(
  snapshot: Pick<Snapshot, "attempt" | "simNowMs">,
): number | null {
  const queue = createDueQueue();
  rebuildDueQueue({
    simNowMs: snapshot.simNowMs,
    attempt: snapshot.attempt,
    dueQueue: queue,
  } as EngineState);
  return queue.nextDueMs();
}

interface EngineState {
  schemaVersion: number;
  simNowMs: number;
  lootRngState: number;
  combatRngState: number;
  nextEventSeq: number;
  nextAttemptId: number;
  nextDropId: number;
  progression: ProgressionState;
  attempt: AttemptState | null;
  statLedger: StatLedger | null;
  pendingEdits: Snapshot["pendingEdits"];
  dropIndex: Map<number, DropInstance>;
  dueQueue: DueQueueWithIndex;
}

function combatantIndexFor(state: EngineState, entityId: string): number {
  return state.attempt?.combatants.findIndex((combatant) => combatant.entityId === entityId) ?? -1;
}

function scheduleDue(state: EngineState, entry: DueEntry): void {
  state.dueQueue.scheduleWithIndex(entry, combatantIndexFor(state, entry.entityId));
}

function cancelActionSchedule(state: EngineState, entityId: string, abilityId: string): void {
  state.dueQueue.cancel(entityId, "action-impact", abilityId);
  state.dueQueue.cancel(entityId, "action-end", abilityId);
}

function cancelStatusSchedule(state: EngineState, entityId: string, statusId: string): void {
  state.dueQueue.cancel(entityId, "status-expiry", statusId);
  state.dueQueue.cancel(entityId, "status-tick", statusId);
}

function schedulePhaseEnd(state: EngineState): void {
  const attempt = state.attempt;
  state.dueQueue.cancel(PHASE_END_ENTITY_ID, "phase-end");
  if (!attempt || attempt.phaseEndsAtMs === null) {
    return;
  }
  scheduleDue(state, {
    atMs: attempt.phaseEndsAtMs,
    kind: "phase-end",
    entityId: PHASE_END_ENTITY_ID,
  });
}

function scheduleInitiative(
  state: EngineState,
  combatant: CombatantState,
  combatantIndex: number,
): void {
  state.dueQueue.cancel(combatant.entityId, "initiative-ready");
  if (combatant.initiativeReadyAtMs > state.simNowMs) {
    state.dueQueue.scheduleWithIndex(
      {
        atMs: combatant.initiativeReadyAtMs,
        kind: "initiative-ready",
        entityId: combatant.entityId,
      },
      combatantIndex,
    );
  }
}

function scheduleStatus(
  state: EngineState,
  combatant: CombatantState,
  status: ActiveStatus,
  combatantIndex: number,
): void {
  cancelStatusSchedule(state, combatant.entityId, status.statusId);
  state.dueQueue.scheduleWithIndex(
    {
      atMs: status.expiresAtMs,
      kind: "status-expiry",
      entityId: combatant.entityId,
      key: status.statusId,
    },
    combatantIndex,
  );
  if (
    !combatant.knockedOut &&
    status.nextTickAtMs !== undefined &&
    status.nextTickAtMs < status.expiresAtMs
  ) {
    state.dueQueue.scheduleWithIndex(
      {
        atMs: status.nextTickAtMs,
        kind: "status-tick",
        entityId: combatant.entityId,
        key: status.statusId,
      },
      combatantIndex,
    );
  }
}

function scheduleAction(
  state: EngineState,
  combatant: CombatantState,
  combatantIndex: number,
): void {
  const action = combatant.action;
  if (!action) {
    return;
  }
  cancelActionSchedule(state, combatant.entityId, action.abilityId);
  if (!action.impactResolved) {
    state.dueQueue.scheduleWithIndex(
      {
        atMs: action.impactAtMs,
        kind: "action-impact",
        entityId: combatant.entityId,
        key: action.abilityId,
      },
      combatantIndex,
    );
  }
  state.dueQueue.scheduleWithIndex(
    {
      atMs: action.endsAtMs,
      kind: "action-end",
      entityId: combatant.entityId,
      key: action.abilityId,
    },
    combatantIndex,
  );
}

function scheduleCombatant(
  state: EngineState,
  combatant: CombatantState,
  combatantIndex: number,
): void {
  scheduleInitiative(state, combatant, combatantIndex);
  for (const status of combatant.statuses) {
    scheduleStatus(state, combatant, status, combatantIndex);
  }
  scheduleAction(state, combatant, combatantIndex);
}

function rebuildDueQueue(state: EngineState): void {
  state.dueQueue.clear();
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }
  schedulePhaseEnd(state);
  for (let index = 0; index < attempt.combatants.length; index += 1) {
    scheduleCombatant(state, attempt.combatants[index]!, index);
  }
}

function reschedulePartyFormation(state: EngineState, previousEntityIds: string[]): void {
  for (const entityId of previousEntityIds) {
    state.dueQueue.cancelAllFor(entityId);
  }
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }
  for (let index = 0; index < attempt.combatants.length; index += 1) {
    const combatant = attempt.combatants[index]!;
    if (combatant.side === "party") {
      scheduleCombatant(state, combatant, index);
    }
  }
}

function rebuildDropIndex(armory: DropInstance[]): Map<number, DropInstance> {
  return new Map(armory.map((drop) => [drop.dropId, drop]));
}

function syncDropIndex(index: Map<number, DropInstance>, armory: DropInstance[]): void {
  index.clear();
  for (const drop of armory) {
    index.set(drop.dropId, drop);
  }
}

function replaceArmory(state: EngineState, armory: DropInstance[]): void {
  state.progression.armory = armory;
  syncDropIndex(state.dropIndex, armory);
}

function cowReplaceDrop(
  state: EngineState,
  dropId: number,
  update: (drop: DropInstance) => DropInstance,
): void {
  let next: DropInstance | undefined;
  state.progression.armory = state.progression.armory.map((drop) => {
    if (drop.dropId !== dropId) {
      return drop;
    }
    next = update(drop);
    return next;
  });
  if (!next) {
    throw new Error(`Unknown Drop ${dropId}`);
  }
  state.dropIndex.set(dropId, next);
}

function combatantStats(
  state: EngineState,
  index: ContentIndex,
  combatant: CombatantState,
): BaseStats {
  if (!state.attempt) {
    throw new Error("Cannot read combatant stats without an active Attempt");
  }
  if (!state.statLedger) {
    state.statLedger = createStatLedger(index, state.progression, state.attempt);
  }
  return state.statLedger.statsFor(combatant);
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
  spell: number;
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

function pushClassPendingEdits(
  state: EngineState,
  classId: ClassId,
  talentDraft: ClassTalentState,
  loadout?: [string, string, string],
): void {
  const remaining = state.pendingEdits.filter(
    (edit) =>
      !(
        (edit.kind === "talent" && edit.classId === classId) ||
        (edit.kind === "loadout" && edit.classId === classId)
      ),
  );
  const normalized = cloneClassTalentState(talentDraft);
  const edits: Snapshot["pendingEdits"] = [
    {
      kind: "talent",
      classId,
      statRanks: { ...normalized.statRanks },
      abilityTalentId: normalized.abilityTalentId,
      tierStates: normalized.tierStates.map((tier) => ({
        statRanks: { ...tier.statRanks },
        abilityTalentId: tier.abilityTalentId,
      })),
    },
  ];
  if (loadout) {
    edits.push({ kind: "loadout", classId, loadout: [...loadout] });
  }
  state.pendingEdits = [...remaining, ...edits];
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
    initiativeReadyAtMs: 0,
    action: null,
    cooldownReadyAtMs: {},
    statuses: [],
  };
}

function makeOpponentCombatant(
  opponent: OpponentDef,
  encounter: number,
  index: number,
): CombatantState {
  return {
    entityId: opponentEntityId(String(encounter), index),
    side: "opponent",
    defId: opponent.id,
    health: opponent.base.maxHealth,
    maxHealth: opponent.base.maxHealth,
    knockedOut: false,
    initiativeReadyAtMs: 0,
    action: null,
    cooldownReadyAtMs: {},
    statuses: [],
  };
}

function rollInitiativeForEncounter(state: EngineState, attempt: AttemptState): void {
  for (const combatant of attempt.combatants) {
    const [uniform, nextState] = mulberry32Step(state.combatRngState);
    state.combatRngState = nextState;
    const roll = Math.floor(uniform * 601);
    combatant.initiativeReadyAtMs = state.simNowMs + roll;
  }
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

function bossEncounter(stageDef: StageDef): number {
  return stageDef.waves.length + 1;
}

function opponentIdsForEncounter(stageDef: StageDef, encounter: number): string[] {
  if (encounter === bossEncounter(stageDef)) {
    return stageDef.boss.opponents;
  }
  return stageDef.waves[encounter - 1]?.opponents ?? [];
}

function spawnOpponents(
  index: ContentIndex,
  stage: StageId,
  encounter: number,
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
  encounter: number = 1,
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
  const attempt: AttemptState = {
    id: state.nextAttemptId++,
    stage,
    encounter,
    phase: "fighting",
    phaseEndsAtMs: null,
    equipmentLoadouts,
    combatants: [...partyMembers, ...spawnOpponents(index, stage, encounter)],
  };
  rollInitiativeForEncounter(state, attempt);
  return attempt;
}

function emit(
  state: EngineState,
  sink: EventSink,
  event: EngineEventInput,
): void {
  sink.push({ ...event, seq: state.nextEventSeq++, atMs: state.simNowMs } as EngineEvent);
}

function startFreshAttempt(
  state: EngineState,
  index: ContentIndex,
  stage: StageId,
  sink: EventSink,
): void {
  if (state.progression.pendingParty) {
    state.progression.party = [...state.progression.pendingParty.members];
    state.progression.reserve = state.progression.pendingParty.reserve;
    state.progression.pendingParty = null;
  }

  applyPendingEdits(state, index, sink, state.simNowMs);

  state.attempt = createAttempt(state, index, stage, 1);
  state.statLedger = createStatLedger(index, state.progression, state.attempt);
  rebuildDueQueue(state);
  const stageDef = stageDefFor(index, stage);
  emit(state, sink, {
    type: "stage-attempt-started",
    stage,
    attemptId: state.attempt.id,
  });
  emit(state, sink, {
    type: "wave-started",
    stage,
    encounter: 1,
    boss: bossEncounter(stageDef) === 1,
  });
}

function chooseActions(
  state: EngineState,
  index: ContentIndex,
  sink: EventSink,
): void {
  const attempt = state.attempt;
  if (!attempt || attempt.phase !== "fighting") {
    return;
  }

  for (const combatant of attempt.combatants) {
    if (combatant.knockedOut || combatant.action) {
      continue;
    }
    if (state.simNowMs < combatant.initiativeReadyAtMs) {
      continue;
    }
    if (isCombatantStunned(combatant, index.statusesById)) {
      continue;
    }

    const ability = chooseAbilityForCombatant(
      index,
      combatant,
      state.progression.loadouts,
      attempt.combatants,
      state.simNowMs,
    );
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
    scheduleAction(state, combatant, combatantIndexFor(state, combatant.entityId));

    const actorStats = combatantStats(state, index, combatant);
    let element: Element | undefined;
    if (ability.slot === "basic") {
      for (const effect of ability.effects) {
        if (
          effect.kind === "damage" &&
          (effect.channel ?? "physical") === "elemental" &&
          effect.element
        ) {
          element = adaptiveElementForBasic(effect, actorStats) ?? effect.element;
          break;
        }
      }
    }

    emit(state, sink, {
      type: "action-started",
      entityId: combatant.entityId,
      abilityId: ability.id,
      impactAtMs,
      targetIds: targets.map((target) => target.entityId),
      ...(element !== undefined ? { element } : {}),
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

function resolveStatusExpiry(
  state: EngineState,
  sink: EventSink,
  entry: DueEntry,
): void {
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }
  const combatant = combatantById(attempt.combatants, entry.entityId);
  if (!combatant || entry.key === undefined) {
    return;
  }
  const statusIndex = combatant.statuses.findIndex((status) => status.statusId === entry.key);
  if (statusIndex < 0) {
    return;
  }
  const status = combatant.statuses[statusIndex]!;
  if (status.expiresAtMs !== state.simNowMs) {
    return;
  }
  cancelStatusSchedule(state, combatant.entityId, status.statusId);
  combatant.statuses = combatant.statuses.filter((_, index) => index !== statusIndex);
  emit(state, sink, {
    type: "status-expired",
    entityId: combatant.entityId,
    statusId: status.statusId,
  });
}

function resolveStatusTick(
  state: EngineState,
  index: ContentIndex,
  sink: EventSink,
  entry: DueEntry,
): void {
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }
  const combatant = combatantById(attempt.combatants, entry.entityId);
  if (!combatant || combatant.knockedOut || entry.key === undefined) {
    return;
  }
  const status = combatant.statuses.find((candidate) => candidate.statusId === entry.key);
  if (!status || status.nextTickAtMs !== state.simNowMs) {
    return;
  }
  if (status.nextTickAtMs >= status.expiresAtMs) {
    return;
  }

  const statusDef = index.statusesById.get(status.statusId);
  if (!statusDef?.tickEffect || !status.sourceEntityId || !status.sourcePower) {
    return;
  }

  const actorStats: BaseStats = {
    maxHealth: 0,
    physical: status.sourcePower.physical,
    spell: status.sourcePower.spell,
    armor: 0,
    elementalResistance: 0,
    firePower: 0,
    frostPower: 0,
    lightningPower: 0,
    lightPower: 0,
    critChance: 0,
    critDamage: 1.5,
  };
  const targetStats = combatantStats(state, index, combatant);
  const outcome = resolveEffect(
    statusDef.tickEffect,
    actorStats,
    {
      stats: targetStats,
      health: combatant.health,
      maxHealth: combatant.maxHealth,
      knockedOut: combatant.knockedOut,
      statuses: combatant.statuses,
    },
    index.statusesById,
  );

  const results: Extract<EngineEvent, { type: "impact" }>["results"] = [];
  if (outcome.damageDetail) {
    const { amount, channel, element, crit } = outcome.damageDetail;
    const healthAfter = Math.max(0, combatant.health - amount);
    results.push({
      targetId: combatant.entityId,
      kind: "damage",
      channel,
      ...(element ? { element } : {}),
      amount,
      healthAfter,
      ...(crit ? { crit: true } : {}),
    });
    combatant.health = healthAfter;
  }

  if (results.length > 0) {
    emit(state, sink, {
      type: "impact",
      entityId: status.sourceEntityId,
      abilityId: `status:${status.statusId}`,
      results,
    });
  }

  const tickEveryMs = statusDef.tickEveryMs;
  if (tickEveryMs === undefined) {
    return;
  }
  const combatantIndex = combatantIndexFor(state, combatant.entityId);
  state.dueQueue.cancel(combatant.entityId, "status-tick", status.statusId);
  const nextTickAtMs = state.simNowMs + tickEveryMs;
  if (nextTickAtMs < status.expiresAtMs) {
    status.nextTickAtMs = nextTickAtMs;
    state.dueQueue.scheduleWithIndex(
      {
        atMs: nextTickAtMs,
        kind: "status-tick",
        entityId: combatant.entityId,
        key: status.statusId,
      },
      combatantIndex,
    );
  } else {
    delete status.nextTickAtMs;
  }
}

function applyStatus(
  state: EngineState,
  combatant: CombatantState,
  statusId: string,
  expiresAtMs: number,
  appliedAtMs: number,
  index: ContentIndex,
  source?: StatusSourceSnapshot,
): "applied" | "refreshed" {
  const statusDef = index.statusesById.get(statusId);
  const existing = combatant.statuses.find((status) => status.statusId === statusId);
  const combatantIndex = combatantIndexFor(state, combatant.entityId);
  if (existing) {
    existing.expiresAtMs = expiresAtMs;
    writeTickSchedule(existing, statusDef, appliedAtMs, source);
    scheduleStatus(state, combatant, existing, combatantIndex);
    return "refreshed";
  }
  const created: ActiveStatus = { statusId, expiresAtMs };
  writeTickSchedule(created, statusDef, appliedAtMs, source);
  combatant.statuses.push(created);
  scheduleStatus(state, combatant, created, combatantIndex);
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
  status.sourcePower = { physical: source.physical, spell: source.spell };
}

function sourceSnapshotFromStats(
  entityId: string,
  stats: BaseStats,
): StatusSourceSnapshot {
  return { entityId, physical: stats.physical, spell: stats.spell };
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
    const { amount, channel, element, crit } = outcome.damageDetail;
    const healthAfter = Math.max(0, projectedHealth - amount);
    results.push({
      targetId,
      kind: "damage",
      channel,
      ...(element ? { element } : {}),
      amount,
      healthAfter,
      ...(crit ? { crit: true } : {}),
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
    sourceElemental: source.spell,
  };
  if (outcome.statusToRefresh) {
    pending.statusesToRefresh.push(queued);
  } else if (outcome.statusToApply) {
    pending.statusesToApply.push(queued);
  }
}

function resolveImpactBatch(
  state: EngineState,
  index: ContentIndex,
  sink: EventSink,
  entries: DueEntry[],
): void {
  const attempt = state.attempt;
  if (!attempt || entries.length === 0) {
    return;
  }

  let preHealth: Map<string, number> | undefined;
  let preKnockedOut: Map<string, boolean> | undefined;
  let pendingByTarget: Map<string, PendingImpactChange> | undefined;

  function getPreHealth(targetId: string, target: CombatantState): number {
    if (!preHealth) {
      preHealth = new Map();
    }
    let value = preHealth.get(targetId);
    if (value === undefined) {
      value = target.health;
      preHealth.set(targetId, value);
    }
    return value;
  }

  function getPreKnockedOut(targetId: string, target: CombatantState): boolean {
    if (!preKnockedOut) {
      preKnockedOut = new Map();
    }
    let value = preKnockedOut.get(targetId);
    if (value === undefined) {
      value = target.knockedOut;
      preKnockedOut.set(targetId, value);
    }
    return value;
  }

  function ensurePending(targetId: string): PendingImpactChange {
    if (!pendingByTarget) {
      pendingByTarget = new Map();
    }
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

  let resolvedAny = false;
  for (const entry of entries) {
    if (entry.key === undefined) {
      continue;
    }
    const actor = combatantById(attempt.combatants, entry.entityId);
    const action = actor?.action;
    if (
      !actor ||
      !action ||
      action.abilityId !== entry.key ||
      action.impactAtMs !== state.simNowMs ||
      action.impactResolved
    ) {
      continue;
    }
    resolvedAny = true;
    action.impactResolved = true;
    state.dueQueue.cancel(actor.entityId, "action-impact", action.abilityId);

    const ability =
      index.abilitiesById.get(action.abilityId) ??
      chooseAbilityForCombatant(
        index,
        actor,
        state.progression.loadouts,
        attempt.combatants,
        state.simNowMs,
      );
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
    const actorStats = combatantStats(state, index, actor);

    for (const target of targets) {
      const targetStats = combatantStats(state, index, target);
      const preTargetHealth = getPreHealth(target.entityId, target);
      const preTargetKnockedOut = getPreKnockedOut(target.entityId, target);
      let projectedHealth = preTargetHealth;

      for (const effect of ability.effects) {
        const resolvedEffect =
          ability.slot === "basic" &&
          effect.kind === "damage" &&
          (effect.channel ?? "physical") === "elemental" &&
          effect.element
            ? {
                ...effect,
                element: adaptiveElementForBasic(effect, actorStats) ?? effect.element,
              }
            : effect;

        let crit = false;
        if (resolvedEffect.kind === "damage" && actorStats.critChance > 0) {
          const [uniform, nextState] = mulberry32Step(state.combatRngState);
          state.combatRngState = nextState;
          const chance = Math.min(1, Math.max(0, actorStats.critChance));
          crit = uniform < chance;
        }

        const outcome = resolveEffect(
          resolvedEffect,
          actorStats,
          {
            stats: targetStats,
            health: projectedHealth,
            maxHealth: target.maxHealth,
            knockedOut: preTargetKnockedOut,
            statuses: target.statuses,
          },
          index.statusesById,
          crit,
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

    emit(state, sink, {
      type: "impact",
      entityId: actor.entityId,
      abilityId: action.abilityId,
      results,
    });
  }

  if (!resolvedAny || pendingByTarget === undefined) {
    cancelStunnedWindUps(state, index);
    return;
  }

  for (const [targetId, pending] of pendingByTarget) {
    const target = combatantById(attempt.combatants, targetId);
    if (!target) {
      continue;
    }

    if (pending.revived) {
      if (target.action && !target.action.impactResolved) {
        cancelActionSchedule(state, target.entityId, target.action.abilityId);
      }
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
      scheduleAction(state, target, combatantIndexFor(state, target.entityId));
      emit(state, sink, {
        type: "revived",
        entityId: target.entityId,
        health: target.health,
      });
    } else if (pending.healthDelta !== 0) {
      target.health = Math.max(0, target.health + pending.healthDelta);
    }

    for (const status of pending.statusesToApply) {
      applyStatus(
        state,
        target,
        status.statusId,
        status.expiresAtMs,
        state.simNowMs,
        index,
        {
          entityId: status.sourceEntityId,
          physical: status.sourcePhysical,
          spell: status.sourceElemental,
        },
      );
      emit(state, sink, {
        type: "status-applied",
        entityId: target.entityId,
        statusId: status.statusId,
        expiresAtMs: status.expiresAtMs,
      });
    }
    for (const status of pending.statusesToRefresh) {
      applyStatus(
        state,
        target,
        status.statusId,
        status.expiresAtMs,
        state.simNowMs,
        index,
        {
          entityId: status.sourceEntityId,
          physical: status.sourcePhysical,
          spell: status.sourceElemental,
        },
      );
      emit(state, sink, {
        type: "status-applied",
        entityId: target.entityId,
        statusId: status.statusId,
        expiresAtMs: status.expiresAtMs,
      });
    }
  }

  cancelStunnedWindUps(state, index);
}

function resolveActionEnd(state: EngineState, entry: DueEntry): void {
  const attempt = state.attempt;
  if (!attempt || entry.key === undefined) {
    return;
  }
  const combatant = combatantById(attempt.combatants, entry.entityId);
  const action = combatant?.action;
  if (!combatant || !action || action.abilityId !== entry.key) {
    return;
  }
  if (action.endsAtMs !== state.simNowMs) {
    return;
  }
  combatant.action = null;
  state.dueQueue.cancel(combatant.entityId, "action-end", action.abilityId);
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
      cancelActionSchedule(state, combatant.entityId, combatant.action.abilityId);
      combatant.action = null;
    }
  }
}

function awardOpponentDefeatXp(
  state: EngineState,
  index: ContentIndex,
  sink: EventSink,
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
    emit(state, sink, {
      type: "xp-awarded",
      classId,
      amount,
      totalXp: result.totalXp,
    });
    for (let level = result.previousLevel + 1; level <= result.newLevel; level += 1) {
      emit(state, sink, { type: "level-up", classId, level });
    }
  }
}

function resolveKnockouts(
  state: EngineState,
  index: ContentIndex,
  sink: EventSink,
): void {
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }

  for (const combatant of attempt.combatants) {
    if (!combatant.knockedOut && combatant.health <= 0) {
      combatant.knockedOut = true;
      combatant.health = 0;
      for (const status of combatant.statuses) {
        if (status.nextTickAtMs !== undefined) {
          state.dueQueue.cancel(combatant.entityId, "status-tick", status.statusId);
        }
        delete status.nextTickAtMs;
      }
      if (combatant.action) {
        if (!combatant.action.impactResolved) {
          cancelActionSchedule(state, combatant.entityId, combatant.action.abilityId);
        } else {
          state.dueQueue.cancel(combatant.entityId, "action-end", combatant.action.abilityId);
        }
        combatant.action = null;
      }
      emit(state, sink, { type: "knockout", entityId: combatant.entityId });
      if (combatant.side === "opponent") {
        const opponentDef = index.opponentsById.get(combatant.defId);
        if (opponentDef) {
          awardOpponentDefeatXp(state, index, sink, opponentDef.xpAward);
        }
      }
    }
  }
}

function awardEncounterDrops(
  state: EngineState,
  index: ContentIndex,
  sink: EventSink,
  stage: StageId,
  encounter: number,
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
    uncommonFloor: encounter === bossEncounter(stageDef),
  });
  state.lootRngState = rolled.lootRng.state;
  state.nextDropId += 1;
  state.progression.armory.push(rolled.drop);
  state.dropIndex.set(rolled.drop.dropId, rolled.drop);
  emit(state, sink, { type: "drop-awarded", dropId: rolled.drop.dropId });
}

function evaluateEncounterOutcome(
  state: EngineState,
  index: ContentIndex,
  sink: EventSink,
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
      awardEncounterDrops(state, index, sink, attempt.stage, attempt.encounter);
    }
    emit(state, sink, {
      type: "wave-cleared",
      stage: attempt.stage,
      encounter: attempt.encounter,
    });

    if (attempt.encounter === bossEncounter(stageDefFor(index, attempt.stage))) {
      clearStage(state, index, sink);
      return;
    }

    attempt.phase = "wave-transition";
    attempt.phaseEndsAtMs = state.simNowMs + WAVE_TRANSITION_MS;
    schedulePhaseEnd(state);
    return;
  }

  if (livingParty.length === 0) {
    emit(state, sink, { type: "party-defeat", stage: attempt.stage });
    attempt.phase = "defeat-hold";
    attempt.phaseEndsAtMs = state.simNowMs + DEFEAT_HOLD_MS;
    schedulePhaseEnd(state);
  }
}

function clearStage(state: EngineState, index: ContentIndex, sink: EventSink): void {
  const attempt = state.attempt;
  if (!attempt) {
    return;
  }

  const clearedStage = attempt.stage;
  emit(state, sink, { type: "stage-cleared", stage: clearedStage });

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
  state.statLedger = null;
  state.dueQueue.clear();
  startFreshAttempt(state, index, nextStage, sink);
}

function applyPendingEdits(
  state: EngineState,
  index: ContentIndex,
  sink: EventSink,
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
      const previous = state.progression.talents[edit.classId] ?? emptyTalentState(classKit);
      const previousNormalized = normalizeClassTalentState(classKit, previous);
      const nextTalent = normalizeClassTalentState(classKit, {
        ...previousNormalized,
        statRanks: { ...edit.statRanks },
        abilityTalentId: edit.abilityTalentId,
        tierStates: edit.tierStates
          ? edit.tierStates.map((tier) => ({
              statRanks: { ...tier.statRanks },
              abilityTalentId: tier.abilityTalentId,
            }))
          : previousNormalized.tierStates.map((tier, tierIndex) =>
              tierIndex === 0
                ? {
                    statRanks: { ...edit.statRanks },
                    abilityTalentId: edit.abilityTalentId,
                  }
                : { statRanks: { ...tier.statRanks }, abilityTalentId: tier.abilityTalentId },
            ),
      });
      state.progression.talents[edit.classId] = nextTalent;
      for (let tierIndex = 0; tierIndex < previousNormalized.tierStates.length; tierIndex += 1) {
        const previousAbility = previousNormalized.tierStates[tierIndex]?.abilityTalentId ?? null;
        const nextAbility = nextTalent.tierStates[tierIndex]?.abilityTalentId ?? null;
        if (previousAbility && previousAbility !== nextAbility) {
          state.progression.loadouts[edit.classId] = stripAbilityFromLoadout(
            state.progression.loadouts[edit.classId]!,
            previousAbility,
            classKit,
          );
        }
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
      state.statLedger?.invalidate(edit.classId);
      continue;
    }

    if (!attempt) {
      if (edit.kind === "loadout") {
        state.progression.loadouts[edit.classId] = [...edit.loadout];
      }
      continue;
    }

    if (edit.kind === "formation") {
      const previousPartyEntityIds = partyCombatants(attempt.combatants).map(
        (combatant) => combatant.entityId,
      );
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
      reschedulePartyFormation(state, previousPartyEntityIds);
      for (const classId of edit.order) {
        state.statLedger?.invalidate(classId);
      }
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
      state.statLedger?.invalidate(edit.classId);
    }
  }

  state.pendingEdits = [];
  emit(state, sink, { type: "config-applied" });
}

function finishWaveTransition(
  state: EngineState,
  index: ContentIndex,
  sink: EventSink,
): void {
  const attempt = state.attempt;
  if (
    !attempt ||
    attempt.phase !== "wave-transition" ||
    attempt.phaseEndsAtMs !== state.simNowMs
  ) {
    return;
  }

  applyPendingEdits(state, index, sink, state.simNowMs);

  const previousOpponents = opponentCombatants(attempt.combatants);
  const stageDef = stageDefFor(index, attempt.stage);
  const nextEncounter = attempt.encounter + 1;
  const party = partyCombatants(attempt.combatants);
  attempt.encounter = nextEncounter;
  attempt.phase = "fighting";
  attempt.phaseEndsAtMs = null;
  state.dueQueue.cancel(PHASE_END_ENTITY_ID, "phase-end");
  for (const opponent of previousOpponents) {
    state.dueQueue.cancelAllFor(opponent.entityId);
  }
  attempt.combatants = [...party, ...spawnOpponents(index, attempt.stage, nextEncounter)];
  rollInitiativeForEncounter(state, attempt);
  for (let combatantIndex = 0; combatantIndex < attempt.combatants.length; combatantIndex += 1) {
    scheduleCombatant(state, attempt.combatants[combatantIndex]!, combatantIndex);
  }

  emit(state, sink, {
    type: "wave-started",
    stage: attempt.stage,
    encounter: nextEncounter,
    boss: nextEncounter === bossEncounter(stageDef),
  });
}

function finishDefeatHold(state: EngineState, index: ContentIndex, sink: EventSink): void {
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
  state.statLedger = null;
  state.dueQueue.clear();
  startFreshAttempt(state, index, stage, sink);
}

function nextBoundaryMs(state: EngineState): number | null {
  return state.dueQueue.nextDueMs();
}

function resolvePhaseEnd(
  state: EngineState,
  index: ContentIndex,
  sink: EventSink,
): void {
  const attempt = state.attempt;
  if (!attempt || attempt.phaseEndsAtMs !== state.simNowMs) {
    return;
  }
  if (attempt.phase === "wave-transition") {
    finishWaveTransition(state, index, sink);
    return;
  }
  if (attempt.phase === "defeat-hold") {
    finishDefeatHold(state, index, sink);
  }
}

function resolveBatch(
  state: EngineState,
  index: ContentIndex,
  sink: EventSink,
  awardDrops: boolean,
): void {
  const drained = state.dueQueue.drainAt(state.simNowMs);
  const phaseEndEntries: DueEntry[] = [];
  const actionEndEntries: DueEntry[] = [];
  const impactEntries: DueEntry[] = [];

  for (const entry of drained) {
    switch (entry.kind as DueKind) {
      case "phase-end":
        phaseEndEntries.push(entry);
        break;
      case "initiative-ready":
        break;
      case "status-expiry":
        resolveStatusExpiry(state, sink, entry);
        break;
      case "status-tick":
        resolveStatusTick(state, index, sink, entry);
        break;
      case "action-impact":
        impactEntries.push(entry);
        break;
      case "action-end":
        actionEndEntries.push(entry);
        break;
    }
  }

  resolveImpactBatch(state, index, sink, impactEntries);

  resolveKnockouts(state, index, sink);
  evaluateEncounterOutcome(state, index, sink, awardDrops);

  for (const entry of actionEndEntries) {
    resolveActionEnd(state, entry);
  }

  for (const _entry of phaseEndEntries) {
    resolvePhaseEnd(state, index, sink);
  }
}

function toSnapshot(state: EngineState, now: () => number): Snapshot {
  const { armory, ...progressionWithoutArmory } = state.progression;
  return {
    schemaVersion: state.schemaVersion,
    savedAtMs: now(),
    simNowMs: state.simNowMs,
    lootRngState: state.lootRngState,
    combatRngState: state.combatRngState,
    nextEventSeq: state.nextEventSeq,
    nextAttemptId: state.nextAttemptId,
    nextDropId: state.nextDropId,
    progression: {
      ...structuredClone(progressionWithoutArmory),
      armory: freezeArmoryForSnapshot(armory) as DropInstance[],
    },
    attempt: state.attempt ? structuredClone(state.attempt) : null,
    pendingEdits: structuredClone(state.pendingEdits),
  };
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
    combatRngState: cloned.combatRngState,
    nextEventSeq: cloned.nextEventSeq,
    nextAttemptId: cloned.nextAttemptId,
    nextDropId: cloned.nextDropId,
    progression: cloned.progression,
    attempt: cloned.attempt,
    statLedger: null,
    pendingEdits: cloned.pendingEdits,
    dropIndex: rebuildDropIndex(cloned.progression.armory),
    dueQueue: createDueQueue(),
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
  const progression = saved
    ? restoreProgression(saved.progression, content)
    : createDefaultProgression(content);
  const state: EngineState = saved
    ? {
        ...fromSnapshot(saved),
        progression,
        dropIndex: rebuildDropIndex(progression.armory),
      }
    : {
        schemaVersion: SCHEMA_VERSION,
        simNowMs: 0,
        lootRngState: initialLootRngState(lootSeed),
        combatRngState: initialCombatRngState(lootSeed),
        nextEventSeq: 1,
        nextAttemptId: 1,
        nextDropId: 1,
        progression,
        attempt: null,
        statLedger: null,
        pendingEdits: [],
        dropIndex: rebuildDropIndex(progression.armory),
        dueQueue: createDueQueue(),
      };

  if (saved?.attempt) {
    rebuildDueQueue(state);
  }

  const bootEvents: EngineEvent[] = [];
  if (!saved) {
    startFreshAttempt(state, index, 1, arrayEventSink(bootEvents));
  } else if (saved.attempt === null) {
    startFreshAttempt(state, index, state.progression.unlockedStage, arrayEventSink(bootEvents));
  }
  let bootEventsPending = bootEvents.length > 0;

  function assertNonNegativeIntegerMs(
    ms: number,
    method: "advanceBy" | "advanceOffline" | "advanceOfflineSummary",
  ): void {
    if (!Number.isInteger(ms) || ms < 0) {
      throw new Error(`${method} expects a non-negative integer ms, got ${ms}`);
    }
  }

  function advanceElapsed(ms: number, awardDrops: boolean, sink: EventSink): void {
    if (bootEventsPending) {
      for (const event of bootEvents) {
        sink.push(event);
      }
      bootEventsPending = false;
    }

    const targetMs = state.simNowMs + ms;

    while (true) {
      chooseActions(state, index, sink);
      const boundaryMs = nextBoundaryMs(state);
      if (boundaryMs === null || boundaryMs > targetMs) {
        break;
      }
      state.simNowMs = boundaryMs;
      resolveBatch(state, index, sink, awardDrops);
      chooseActions(state, index, sink);
    }

    state.simNowMs = targetMs;
  }

  function advanceBy(ms: number): EngineEvent[] {
    assertNonNegativeIntegerMs(ms, "advanceBy");
    const events: EngineEvent[] = [];
    advanceElapsed(ms, true, arrayEventSink(events));
    return events;
  }

  function advanceOffline(ms: number): EngineEvent[] {
    assertNonNegativeIntegerMs(ms, "advanceOffline");
    const events: EngineEvent[] = [];
    advanceElapsed(ms, false, arrayEventSink(events));
    return events;
  }

  function advanceOfflineSummary(ms: number): OfflineAdvance {
    assertNonNegativeIntegerMs(ms, "advanceOfflineSummary");
    const counter = { stagesCleared: 0 };
    advanceElapsed(ms, false, countingEventSink(counter));
    return { stagesCleared: counter.stagesCleared };
  }

  function beginFreshAttemptCommand(): EngineEvent[] {
    const events: EngineEvent[] = [];
    const sink = arrayEventSink(events);
    const stage = state.attempt?.stage ?? state.progression.unlockedStage;
    state.attempt = null;
    state.statLedger = null;
    state.dueQueue.clear();
    startFreshAttempt(state, index, stage, sink);
    return events;
  }

  function selectStage(stage: StageId): EngineEvent[] {
    if (stage > state.progression.unlockedStage) {
      throw new Error(`Stage ${stage} is locked (unlocked: ${state.progression.unlockedStage})`);
    }

    const events: EngineEvent[] = [];
    const sink = arrayEventSink(events);
    state.attempt = null;
    state.statLedger = null;
    state.dueQueue.clear();
    startFreshAttempt(state, index, stage, sink);
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
    const snapshot = pendingEditSnapshot(state);
    const draft = pendingEdits.effectiveTalentState(snapshot, classId);
    const loadout = pendingEdits.effectiveLoadout(snapshot, classId);
    const location = resolveTalentTier(classKit, talentId);
    const previousAbility =
      location && location.tierDef.abilityRow.includes(talentId)
        ? (draft.tierStates[location.tierIndex]?.abilityTalentId ?? null)
        : null;
    const level = characterLevel(state.progression, classId, index.content.xpThresholds);
    allocateTalentPoint(draft, classKit, talentId, level);
    if (
      previousAbility &&
      previousAbility !== talentId &&
      loadout.includes(previousAbility)
    ) {
      const nextLoadout = replaceAbilityInLoadout(loadout, previousAbility, talentId);
      pushClassPendingEdits(state, classId, draft, nextLoadout);
      return;
    }
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
    const drop = state.dropIndex.get(dropId);
    if (!drop) {
      throw new Error(`Unknown Drop ${dropId}`);
    }
    validateEquip(drop, index.content, classId, slot);
    replaceArmory(
      state,
      assignDrop(state.progression.armory, dropId, classId, slot, state.dropIndex),
    );
  }

  function canEquip(dropId: number, classId: ClassId, slot: EquipmentSlotId): boolean {
    const drop = state.dropIndex.get(dropId);
    if (!drop) {
      return false;
    }
    return canEquipToSlot(drop, index.content, classId, slot);
  }

  function unequip(classId: ClassId, slot: EquipmentSlotId): void {
    if (!index.classesById.has(classId)) {
      throw new Error(`Unknown Class ${classId}`);
    }
    replaceArmory(state, unequipSlot(state.progression.armory, classId, slot));
  }

  function setLocked(dropId: number, locked: boolean): void {
    if (!state.dropIndex.has(dropId)) {
      throw new Error(`Unknown Drop ${dropId}`);
    }
    cowReplaceDrop(state, dropId, (drop) => ({ ...drop, locked }));
  }

  function markSeen(dropIds: number[]): void {
    const unseen = new Set<number>();
    for (const dropId of dropIds) {
      const drop = state.dropIndex.get(dropId);
      if (!drop) {
        throw new Error(`Unknown Drop ${dropId}`);
      }
      if (!drop.seen) {
        unseen.add(dropId);
      }
    }
    if (unseen.size === 0) {
      return;
    }
    state.progression.armory = state.progression.armory.map((drop) => {
      if (!unseen.has(drop.dropId)) {
        return drop;
      }
      const next = { ...drop, seen: true };
      state.dropIndex.set(drop.dropId, next);
      return next;
    });
  }

  function discard(dropIds: number[]): void {
    replaceArmory(
      state,
      discardDrops(state.progression.armory, dropIds, state.dropIndex),
    );
  }

  function salvage(dropIds: number[]): void {
    if (dropIds.length !== SALVAGE_BATCH_SIZE) {
      throw new Error(`Salvage requires exactly 10 Drops, got ${dropIds.length}`);
    }

    const seen = new Set<number>();
    const batch: DropInstance[] = [];
    for (const dropId of dropIds) {
      if (seen.has(dropId)) {
        throw new Error(`Salvage received duplicate Drop ${dropId}`);
      }
      seen.add(dropId);

      const drop = state.dropIndex.get(dropId);
      if (!drop) {
        throw new Error(`Unknown Drop ${dropId}`);
      }
      if (drop.assignedTo !== null) {
        throw new Error(`Cannot salvage equipped Drop ${dropId}`);
      }
      if (drop.locked) {
        throw new Error(`Cannot salvage Locked Drop ${dropId}`);
      }
      batch.push(drop);
    }

    const batchRarity = batch[0]!.rarity;
    if (!batch.every((drop) => drop.rarity === batchRarity)) {
      throw new Error("Salvage requires one Rarity");
    }
    if (batchRarity === "epic") {
      throw new Error("Epic Equipment cannot be salvaged");
    }

    const upgradedRarity = nextRarity(batchRarity);
    if (!upgradedRarity) {
      throw new Error("Epic Equipment cannot be salvaged");
    }

    const toRemove = new Set(dropIds);
    const armory = state.progression.armory.filter((drop) => !toRemove.has(drop.dropId));
    for (const dropId of dropIds) {
      state.dropIndex.delete(dropId);
    }

    const rolled = rollSalvageDrop({
      content: index.content,
      itemLevel: Math.min(...batch.map((drop) => drop.itemLevel)) as ItemLevel,
      rarity: upgradedRarity,
      lootRng: { state: state.lootRngState },
      dropId: state.nextDropId,
      awardedAtMs: state.simNowMs,
    });
    state.lootRngState = rolled.lootRng.state;
    state.nextDropId += 1;
    armory.push(rolled.drop);
    state.dropIndex.set(rolled.drop.dropId, rolled.drop);
    state.progression.armory = armory;
  }

  return {
    advanceBy,
    advanceOffline,
    advanceOfflineSummary,
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
    salvage,
    nextBoundaryMs: () => nextBoundaryMs(state),
    statusesRef: (entityId: string) =>
      combatantById(state.attempt?.combatants ?? [], entityId)?.statuses,
  } as Engine;
}
