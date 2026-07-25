import {
  chooseFirstValidAbility,
  opponentAbilityCandidates,
  partyAbilityCandidates,
} from "./combat";
import type { CombatantState } from "./snapshot";
import type {
  AbilityDef,
  ClassId,
  ClassKitDef,
  Content,
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
}

export function indexContent(content: Content): ContentIndex {
  return {
    content,
    classesById: new Map(content.classes.map((entry) => [entry.id, entry])),
    opponentsById: new Map(content.opponents.map((entry) => [entry.id, entry])),
    stagesById: new Map(content.stages.map((entry) => [entry.id, entry])),
    abilitiesById: new Map(content.abilities.map((entry) => [entry.id, entry])),
    statusesById: new Map(content.statuses.map((entry) => [entry.id, entry])),
  };
}

export function chooseAbilityForCombatant(
  index: ContentIndex,
  combatant: CombatantState,
  loadouts: Record<ClassId, [string, string, string]>,
  combatants: CombatantState[],
  nowMs: number,
): AbilityDef | null {
  if (combatant.side === "party") {
    const classKit = index.classesById.get(combatant.defId as ClassId);
    if (!classKit) {
      throw new Error(`Missing Class Kit ${combatant.defId}`);
    }
    const loadout = loadouts[combatant.defId as ClassId];
    const candidates = partyAbilityCandidates(
      index.content,
      classKit,
      loadout,
      index.abilitiesById,
    );
    return chooseFirstValidAbility(candidates, combatant, combatants, nowMs);
  }

  const opponent = index.opponentsById.get(combatant.defId);
  if (!opponent) {
    throw new Error(`Missing opponent ${combatant.defId}`);
  }
  const candidates = opponentAbilityCandidates(index.content, opponent, index.abilitiesById);
  return chooseFirstValidAbility(candidates, combatant, combatants, nowMs);
}
