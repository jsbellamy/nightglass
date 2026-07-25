import {
  chooseFirstValidAbility,
  interimStrikeAbility,
} from "./combat";
import type { CombatantState } from "./snapshot";
import type {
  AbilityDef,
  ClassId,
  ClassKitDef,
  Content,
  EquipmentBaseDef,
  OpponentDef,
  StageDef,
  StageId,
  StatusEffectDef,
} from "./types";

export interface ContentIndex {
  content: Content;
  classesById: Map<ClassId, ClassKitDef>;
  opponentsById: Map<string, OpponentDef>;
  stagesById: Map<StageId, StageDef>;
  abilitiesById: Map<string, AbilityDef>;
  statusesById: Map<string, StatusEffectDef>;
  equipmentBasesById: Map<string, EquipmentBaseDef>;
}

interface ContentIndexInternals {
  basicAbilitiesByCombatantId: Map<string, AbilityDef>;
  partyCandidatesByLoadoutKey: Map<string, AbilityDef[]>;
  opponentCandidatesById: Map<string, AbilityDef[]>;
}

const indexInternals = new WeakMap<ContentIndex, ContentIndexInternals>();

function internals(index: ContentIndex): ContentIndexInternals {
  const state = indexInternals.get(index);
  if (!state) {
    throw new Error("Content Index was not built by indexContent()");
  }
  return state;
}

function partyLoadoutKey(classId: ClassId, loadout: [string, string, string]): string {
  return `${classId}:${loadout[0]}:${loadout[1]}:${loadout[2]}`;
}

function resolvePartyBasicAbility(
  classKit: ClassKitDef,
  abilitiesById: Map<string, AbilityDef>,
): AbilityDef {
  const ability = abilitiesById.get(classKit.basicAbilityId);
  if (!ability) {
    throw new Error(`Missing basic ability ${classKit.basicAbilityId} for ${classKit.id}`);
  }
  return ability;
}

function resolveOpponentBasicAbility(
  opponent: OpponentDef,
  abilitiesById: Map<string, AbilityDef>,
): AbilityDef {
  for (const abilityId of opponent.abilityIds) {
    const ability = abilitiesById.get(abilityId);
    if (ability?.slot === "basic") {
      return ability;
    }
  }
  return interimStrikeAbility(opponent);
}

export function indexContent(content: Content): ContentIndex {
  const abilitiesById = new Map(content.abilities.map((entry) => [entry.id, entry]));
  const basicAbilitiesByCombatantId = new Map<string, AbilityDef>();

  for (const classKit of content.classes) {
    basicAbilitiesByCombatantId.set(
      classKit.id,
      resolvePartyBasicAbility(classKit, abilitiesById),
    );
  }

  for (const opponent of content.opponents) {
    const basic = resolveOpponentBasicAbility(opponent, abilitiesById);
    basicAbilitiesByCombatantId.set(opponent.id, basic);
    if (!abilitiesById.has(basic.id)) {
      abilitiesById.set(basic.id, basic);
    }
  }

  const index: ContentIndex = {
    content,
    classesById: new Map(content.classes.map((entry) => [entry.id, entry])),
    opponentsById: new Map(content.opponents.map((entry) => [entry.id, entry])),
    stagesById: new Map(content.stages.map((entry) => [entry.id, entry])),
    abilitiesById,
    statusesById: new Map(content.statuses.map((entry) => [entry.id, entry])),
    equipmentBasesById: new Map(content.equipmentBases.map((entry) => [entry.id, entry])),
  };

  indexInternals.set(index, {
    basicAbilitiesByCombatantId,
    partyCandidatesByLoadoutKey: new Map(),
    opponentCandidatesById: new Map(),
  });

  return index;
}

export function basicAbilityFor(index: ContentIndex, combatant: CombatantState): AbilityDef {
  const ability = internals(index).basicAbilitiesByCombatantId.get(combatant.defId);
  if (!ability) {
    if (combatant.side === "party") {
      throw new Error(`Missing Class Kit ${combatant.defId}`);
    }
    throw new Error(`Missing opponent ${combatant.defId}`);
  }
  return ability;
}

function buildPartyCandidates(
  index: ContentIndex,
  classKit: ClassKitDef,
  loadout: [string, string, string],
): AbilityDef[] {
  const loadoutAbilities = loadout
    .map((abilityId) => index.abilitiesById.get(abilityId))
    .filter((ability): ability is AbilityDef => ability !== undefined);
  const basic = internals(index).basicAbilitiesByCombatantId.get(classKit.id);
  if (!basic) {
    throw new Error(`Missing Class Kit ${classKit.id}`);
  }
  return [...loadoutAbilities, basic];
}

function buildOpponentCandidates(index: ContentIndex, opponent: OpponentDef): AbilityDef[] {
  const { basicAbilitiesByCombatantId } = internals(index);
  const authored = opponent.abilityIds
    .map((abilityId) => index.abilitiesById.get(abilityId))
    .filter((ability): ability is AbilityDef => ability !== undefined);
  const specials = authored.filter((ability) => ability.slot !== "basic");
  const basic = basicAbilitiesByCombatantId.get(opponent.id);
  if (!basic) {
    throw new Error(`Missing opponent ${opponent.id}`);
  }
  return [...specials, basic];
}

export function candidatesFor(
  index: ContentIndex,
  combatant: CombatantState,
  loadouts: Record<ClassId, [string, string, string]>,
): AbilityDef[] {
  const memo = internals(index);

  if (combatant.side === "party") {
    const classId = combatant.defId as ClassId;
    const classKit = index.classesById.get(classId);
    if (!classKit) {
      throw new Error(`Missing Class Kit ${combatant.defId}`);
    }
    const loadout = loadouts[classId];
    const key = partyLoadoutKey(classId, loadout);
    const cached = memo.partyCandidatesByLoadoutKey.get(key);
    if (cached) {
      return cached;
    }
    const candidates = buildPartyCandidates(index, classKit, loadout);
    memo.partyCandidatesByLoadoutKey.set(key, candidates);
    return candidates;
  }

  const opponent = index.opponentsById.get(combatant.defId);
  if (!opponent) {
    throw new Error(`Missing opponent ${combatant.defId}`);
  }
  const cached = memo.opponentCandidatesById.get(opponent.id);
  if (cached) {
    return cached;
  }
  const candidates = buildOpponentCandidates(index, opponent);
  memo.opponentCandidatesById.set(opponent.id, candidates);
  return candidates;
}

export function chooseAbilityForCombatant(
  index: ContentIndex,
  combatant: CombatantState,
  loadouts: Record<ClassId, [string, string, string]>,
  combatants: CombatantState[],
  nowMs: number,
): AbilityDef | null {
  const candidates = candidatesFor(index, combatant, loadouts);
  return chooseFirstValidAbility(candidates, combatant, combatants, nowMs);
}
