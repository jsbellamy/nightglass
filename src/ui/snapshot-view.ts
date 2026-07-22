import type { CombatantState, Snapshot } from "../core/snapshot";
import type { ClassId, ClassKitDef, Content } from "../core/types";
import { levelFromXp } from "../core/xp";

export { createEngine, type Engine } from "../core/engine";

export {
  opponentCombatants,
  partyCombatants,
  previewEffectRaw,
} from "../core/combat";

export { FORMATION_SLOT_BY_INDEX, parseEntityId } from "../core/entity-id";

export {
  effectiveParty,
  effectiveFormation,
  rosterClassIds,
  effectiveTalentState,
  appliedLoadout,
  effectiveLoadout,
  unlockableAbilityIds,
} from "../core/pending-edits";

export {
  previewEquip,
  characterStatsFor,
  abilityRawDisplay,
  formatAbilityRawLine,
  formatStatModifierPerRank,
  statLines,
  compareAbilityRawChanges,
  compareEquipmentStatDeltas,
  equipmentLoadoutWithSwap,
  statsForEquipmentLoadout,
  statModifiersForSlotSwap,
  type AbilityRawChange,
  type AbilityRawDisplay,
  type EquipPreview,
  type StatDeltaLine,
  type StatLine,
} from "../core/equipment-preview";

export const CLASS_LABELS: Record<ClassId, string> = {
  knight: "Knight",
  wizard: "Wizard",
  priest: "Priest",
  hunter: "Hunter",
};

/** Class Kit lookup. Throws — a missing Class Kit is a Content bug, not a UI state. */
export function classKitFor(content: Content, classId: ClassId): ClassKitDef {
  const classKit = content.classes.find((entry) => entry.id === classId);
  if (!classKit) {
    throw new Error(`Missing Class Kit ${classId}`);
  }
  return classKit;
}

/** The live Combatant for a Character, or undefined outside a Stage Attempt. */
export function combatantForClass(
  snapshot: Snapshot,
  classId: ClassId,
): CombatantState | undefined {
  return snapshot.attempt?.combatants.find(
    (combatant) => combatant.side === "party" && combatant.defId === classId,
  );
}

/** Character Level from Character XP, using the Content's thresholds. */
export function levelFor(snapshot: Snapshot, content: Content, classId: ClassId): number {
  const xp = snapshot.progression.characterXp[classId];
  return levelFromXp(xp, content.xpThresholds);
}
