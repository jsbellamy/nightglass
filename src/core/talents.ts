import type { ClassKitDef, ClassId, StatModifiers } from "./types";

export interface ClassTalentState {
  statRanks: Record<string, number>;
  abilityTalentId: string | null;
}

export function emptyTalentState(classKit: ClassKitDef): ClassTalentState {
  return {
    statRanks: Object.fromEntries(classKit.talents.statRow.map((talent) => [talent.id, 0])),
    abilityTalentId: null,
  };
}

export function totalStatPoints(statRanks: Record<string, number>): number {
  return Object.values(statRanks).reduce((sum, rank) => sum + rank, 0);
}

export function spentTalentPoints(state: ClassTalentState): number {
  return totalStatPoints(state.statRanks) + (state.abilityTalentId ? 1 : 0);
}

function statTalentFor(classKit: ClassKitDef, talentId: string) {
  return classKit.talents.statRow.find((talent) => talent.id === talentId);
}

function isAbilityTalent(classKit: ClassKitDef, talentId: string): boolean {
  return classKit.talents.abilityRow.includes(talentId);
}

export function allocateTalentPoint(
  state: ClassTalentState,
  classKit: ClassKitDef,
  talentId: string,
  level: number,
): void {
  if (isAbilityTalent(classKit, talentId)) {
    if (state.abilityTalentId && state.abilityTalentId !== talentId) {
      throw new Error("Ability Talents are mutually exclusive");
    }
    if (state.abilityTalentId === talentId) {
      throw new Error(`Ability Talent ${talentId} is already allocated`);
    }
    if (totalStatPoints(state.statRanks) < 5) {
      throw new Error("Ability Row unlocks only after five Stat Row points are spent");
    }
    if (spentTalentPoints(state) >= level) {
      throw new Error(`No Talent Points remaining for ${classKit.id} at Level ${level}`);
    }
    state.abilityTalentId = talentId;
    return;
  }

  if (spentTalentPoints(state) >= level) {
    throw new Error(`No Talent Points remaining for ${classKit.id} at Level ${level}`);
  }

  const statTalent = statTalentFor(classKit, talentId);
  if (statTalent) {
    const currentRank = state.statRanks[talentId] ?? 0;
    if (currentRank >= statTalent.maxRanks) {
      throw new Error(`Stat Talent ${talentId} is already at max rank`);
    }
    if (totalStatPoints(state.statRanks) >= 5) {
      throw new Error("Stat Row already has five points allocated");
    }
    state.statRanks[talentId] = currentRank + 1;
    return;
  }

  throw new Error(`Unknown Talent ${talentId} for ${classKit.id}`);
}

export function canAllocateTalentPoint(
  state: ClassTalentState,
  classKit: ClassKitDef,
  talentId: string,
  level: number,
): boolean {
  try {
    const draft = structuredClone(state);
    allocateTalentPoint(draft, classKit, talentId, level);
    return true;
  } catch {
    return false;
  }
}

export function deallocateTalentPoint(
  state: ClassTalentState,
  classKit: ClassKitDef,
  talentId: string,
  level: number,
): void {
  if (isAbilityTalent(classKit, talentId)) {
    if (state.abilityTalentId !== talentId) {
      throw new Error(`Ability Talent ${talentId} is not allocated`);
    }
    state.abilityTalentId = null;
    return;
  }

  const statTalent = statTalentFor(classKit, talentId);
  if (!statTalent) {
    throw new Error(`Unknown Talent ${talentId} for ${classKit.id}`);
  }

  const currentRank = state.statRanks[talentId] ?? 0;
  if (currentRank <= 0) {
    throw new Error(`Stat Talent ${talentId} has no points to remove`);
  }

  if (state.abilityTalentId && totalStatPoints(state.statRanks) <= 5) {
    throw new Error("Remove the Ability Talent before reducing the Stat Row below five points");
  }

  state.statRanks[talentId] = currentRank - 1;
  if (spentTalentPoints(state) > level) {
    throw new Error(`Talent allocation exceeds Level ${level} budget after deallocation`);
  }
}

export function canDeallocateTalentPoint(
  state: ClassTalentState,
  classKit: ClassKitDef,
  talentId: string,
  level: number,
): boolean {
  try {
    const draft = structuredClone(state);
    deallocateTalentPoint(draft, classKit, talentId, level);
    return true;
  } catch {
    return false;
  }
}

export function stripAbilityFromLoadout(
  loadout: [string, string, string],
  abilityId: string,
  classKit: ClassKitDef,
): [string, string, string] {
  const fallback = classKit.defaultLoadout.find((entry) => entry !== abilityId) ?? classKit.coreAbilityIds[0]!;
  return loadout.map((entry) => (entry === abilityId ? fallback : entry)) as [string, string, string];
}

export function talentStatModifiers(
  state: ClassTalentState,
  classKit: ClassKitDef,
): StatModifiers[] {
  const modifiers: StatModifiers[] = [];
  for (const statTalent of classKit.talents.statRow) {
    const ranks = state.statRanks[statTalent.id] ?? 0;
    for (let rank = 0; rank < ranks; rank += 1) {
      modifiers.push(statTalent.perRank);
    }
  }
  return modifiers;
}

export function defaultTalentsForClasses(
  classes: ClassKitDef[],
): Record<ClassId, ClassTalentState> {
  return Object.fromEntries(
    classes.map((classKit) => [classKit.id, emptyTalentState(classKit)]),
  ) as Record<ClassId, ClassTalentState>;
}
