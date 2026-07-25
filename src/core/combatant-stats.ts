import { effectiveStats, resolveStatModifiers, type ResolvedStats } from "./combat";
import type { ContentIndex } from "./content-index";
import { equipmentModifiersForLoadout } from "./equipment";
import type { AttemptState, CombatantState, ProgressionState } from "./snapshot";
import { characterStats } from "./stats";
import { emptyTalentState } from "./talents";
import type { ClassId } from "./types";

export interface StatLedger {
  statsFor(combatant: CombatantState): ResolvedStats;
  invalidate(classId: ClassId): void;
}

function baseStatsForCombatant(
  index: ContentIndex,
  combatant: CombatantState,
  progression: ProgressionState,
  attempt: AttemptState | null,
): ResolvedStats {
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
    return characterStats(classKit, talentState, equipmentMods);
  }

  const opponent = index.opponentsById.get(combatant.defId);
  if (!opponent) {
    throw new Error(`Missing opponent ${combatant.defId}`);
  }
  return resolveStatModifiers(opponent.base, []);
}

export function createStatLedger(
  index: ContentIndex,
  progression: ProgressionState,
  attempt: AttemptState | null,
): StatLedger {
  const baseByEntityId = new Map<string, ResolvedStats>();

  function statsFor(combatant: CombatantState): ResolvedStats {
    let base = baseByEntityId.get(combatant.entityId);
    if (!base) {
      base = baseStatsForCombatant(index, combatant, progression, attempt);
      baseByEntityId.set(combatant.entityId, base);
    }
    return effectiveStats(base, combatant.statuses, index.statusesById);
  }

  function invalidate(classId: ClassId): void {
    if (!attempt) {
      return;
    }
    for (const combatant of attempt.combatants) {
      if (combatant.side === "party" && combatant.defId === classId) {
        baseByEntityId.delete(combatant.entityId);
      }
    }
  }

  return { statsFor, invalidate };
}

export function statsForCombatant(
  index: ContentIndex,
  combatant: CombatantState,
  progression: ProgressionState,
  attempt: AttemptState | null,
): ReturnType<typeof effectiveStats> {
  const base = baseStatsForCombatant(index, combatant, progression, attempt);
  return effectiveStats(base, combatant.statuses, index.statusesById);
}
