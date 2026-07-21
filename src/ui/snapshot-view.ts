import type { CombatantState, Snapshot } from "../core/snapshot";
import type { ClassTalentState } from "../core/talents";
import type { ClassId, ClassKitDef, Content } from "../core/types";
import { levelFromXp } from "../core/xp";

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

/** Party + Reserve honouring an uncommitted pendingParty. */
export function effectiveParty(snapshot: Snapshot): {
  members: [ClassId, ClassId, ClassId];
  reserve: ClassId;
} {
  const pending = snapshot.progression.pendingParty;
  if (pending) {
    return { members: [...pending.members], reserve: pending.reserve };
  }
  return {
    members: [...snapshot.progression.party],
    reserve: snapshot.progression.reserve,
  };
}

/**
 * Formation Front/Middle/Back for ↑↓ commands: a pending formation edit, else
 * the applied Party (Engine.setFormation validates against applied members).
 */
export function effectiveFormation(snapshot: Snapshot): [ClassId, ClassId, ClassId] {
  const pending = snapshot.pendingEdits.find((edit) => edit.kind === "formation");
  if (pending?.kind === "formation") {
    return [...pending.order];
  }
  return [...snapshot.progression.party];
}

/**
 * Rail chip order: pendingParty membership wins when set; otherwise Formation
 * order (pending or applied) followed by Reserve. Always four distinct Classes
 * when the Snapshot is well-formed.
 */
export function rosterClassIds(snapshot: Snapshot): ClassId[] {
  const { members, reserve } = effectiveParty(snapshot);
  if (snapshot.progression.pendingParty) {
    return [...members, reserve];
  }
  return [...effectiveFormation(snapshot), reserve];
}

/** Talent state including any uncommitted Talent pendingEdit. */
export function effectiveTalentState(snapshot: Snapshot, classId: ClassId): ClassTalentState {
  const pending = snapshot.pendingEdits.find(
    (edit) => edit.kind === "talent" && edit.classId === classId,
  );
  if (pending?.kind === "talent") {
    return {
      statRanks: { ...pending.statRanks },
      abilityTalentId: pending.abilityTalentId,
    };
  }
  return structuredClone(snapshot.progression.talents[classId]!);
}

/** The applied Ability Loadout, ignoring pendingEdits. */
export function appliedLoadout(snapshot: Snapshot, classId: ClassId): [string, string, string] {
  return [...snapshot.progression.loadouts[classId]!] as [string, string, string];
}

/** Ability Loadout including any uncommitted Loadout pendingEdit. */
export function effectiveLoadout(snapshot: Snapshot, classId: ClassId): [string, string, string] {
  const pending = snapshot.pendingEdits.find(
    (edit) => edit.kind === "loadout" && edit.classId === classId,
  );
  if (pending?.kind === "loadout") {
    return [...pending.loadout] as [string, string, string];
  }
  return appliedLoadout(snapshot, classId);
}

/** Abilities this Character may place in its Ability Loadout: basic + Core + unlocked Ability Talent. */
export function unlockableAbilityIds(
  classKit: ClassKitDef,
  talentState: ClassTalentState,
): string[] {
  const ids = [classKit.basicAbilityId, ...classKit.coreAbilityIds];
  if (talentState.abilityTalentId) {
    ids.push(talentState.abilityTalentId);
  }
  return ids;
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
