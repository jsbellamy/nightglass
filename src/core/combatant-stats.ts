import { effectiveStats } from "./combat";
import type { ContentIndex } from "./content-index";
import { equipmentModifiersForLoadout } from "./equipment";
import type { AttemptState, CombatantState, ProgressionState } from "./snapshot";
import { characterStats } from "./stats";
import { emptyTalentState } from "./talents";
import type { ClassId } from "./types";

export function statsForCombatant(
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
