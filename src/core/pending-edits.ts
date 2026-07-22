import type { Snapshot } from "./snapshot";
import { cloneClassTalentState, type ClassTalentState } from "./talents";
import type { ClassId, ClassKitDef } from "./types";

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

function reconcilePendingTalentState(
  applied: ClassTalentState,
  pending: Extract<Snapshot["pendingEdits"][number], { kind: "talent" }>,
): ClassTalentState {
  const merged = cloneClassTalentState(applied);
  merged.tierStates[0] = {
    statRanks: { ...pending.statRanks },
    abilityTalentId: pending.abilityTalentId,
  };
  merged.statRanks = { ...pending.statRanks };
  merged.abilityTalentId = pending.abilityTalentId;

  if (pending.tierStates) {
    for (let tierIndex = 0; tierIndex < pending.tierStates.length; tierIndex += 1) {
      const tier = pending.tierStates[tierIndex];
      if (!tier) {
        continue;
      }
      merged.tierStates[tierIndex] = {
        statRanks: { ...tier.statRanks },
        abilityTalentId: tier.abilityTalentId,
      };
      if (tierIndex === 0) {
        merged.statRanks = { ...tier.statRanks };
        merged.abilityTalentId = tier.abilityTalentId;
      }
    }
  }

  return merged;
}

/** Talent state including any uncommitted Talent pendingEdit. */
export function effectiveTalentState(snapshot: Snapshot, classId: ClassId): ClassTalentState {
  const pending = snapshot.pendingEdits.find(
    (edit) => edit.kind === "talent" && edit.classId === classId,
  );
  const applied = snapshot.progression.talents[classId]!;
  if (pending?.kind === "talent") {
    return reconcilePendingTalentState(applied, pending);
  }
  return cloneClassTalentState(applied);
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

/** Abilities this Character may place in its Ability Loadout: basic + Core + unlocked Ability Talents. */
export function unlockableAbilityIds(
  classKit: ClassKitDef,
  talentState: ClassTalentState,
): string[] {
  const ids = [classKit.basicAbilityId, ...classKit.coreAbilityIds];
  for (const tier of talentState.tierStates) {
    if (tier.abilityTalentId) {
      ids.push(tier.abilityTalentId);
    }
  }
  return ids;
}
