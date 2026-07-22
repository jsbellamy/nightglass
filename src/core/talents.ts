import type { ClassKitDef, ClassId, StatModifiers, TalentTierDef } from "./types";

export interface TierTalentState {
  statRanks: Record<string, number>;
  abilityTalentId: string | null;
}

export interface ClassTalentState extends TierTalentState {
  /** Tier 1 remains mirrored by the legacy top-level fields. */
  tierStates: TierTalentState[];
}

export function talentTierDefs(classKit: ClassKitDef): TalentTierDef[] {
  if (!classKit.talentTiers) {
    return [classKit.talents];
  }
  return [classKit.talents, ...classKit.talentTiers];
}

function emptyTierTalentState(tierDef: TalentTierDef): TierTalentState {
  return {
    statRanks: Object.fromEntries(tierDef.statRow.map((talent) => [talent.id, 0])),
    abilityTalentId: null,
  };
}

function syncLegacyTierOneFields(state: ClassTalentState): void {
  const tierOne = state.tierStates[0];
  if (!tierOne) {
    return;
  }
  state.statRanks = { ...tierOne.statRanks };
  state.abilityTalentId = tierOne.abilityTalentId;
}

function cloneTierTalentState(state: TierTalentState): TierTalentState {
  return {
    statRanks: { ...state.statRanks },
    abilityTalentId: state.abilityTalentId,
  };
}

export function cloneClassTalentState(state: ClassTalentState): ClassTalentState {
  const tierStates = state.tierStates.map((tier) => cloneTierTalentState(tier));
  return {
    statRanks: { ...tierStates[0]!.statRanks },
    abilityTalentId: tierStates[0]!.abilityTalentId,
    tierStates,
  };
}

export function normalizeClassTalentState(
  classKit: ClassKitDef,
  state: ClassTalentState,
): ClassTalentState {
  const tierDefs = talentTierDefs(classKit);
  const tierStates: TierTalentState[] = [];

  for (let tierIndex = 0; tierIndex < tierDefs.length; tierIndex += 1) {
    const tierDef = tierDefs[tierIndex]!;
    const existing = state.tierStates[tierIndex];
    if (existing) {
      const statRanks: Record<string, number> = Object.fromEntries(
        tierDef.statRow.map((talent) => [talent.id, existing.statRanks[talent.id] ?? 0]),
      );
      tierStates.push({
        statRanks,
        abilityTalentId:
          existing.abilityTalentId &&
          tierDef.abilityRow.includes(existing.abilityTalentId)
            ? existing.abilityTalentId
            : null,
      });
    } else if (tierIndex === 0) {
      const statRanks: Record<string, number> = Object.fromEntries(
        tierDef.statRow.map((talent) => [talent.id, state.statRanks[talent.id] ?? 0]),
      );
      const abilityTalentId =
        state.abilityTalentId && tierDef.abilityRow.includes(state.abilityTalentId)
          ? state.abilityTalentId
          : null;
      tierStates.push({ statRanks, abilityTalentId });
    } else {
      tierStates.push(emptyTierTalentState(tierDef));
    }
  }

  const normalized: ClassTalentState = {
    statRanks: tierStates[0]!.statRanks,
    abilityTalentId: tierStates[0]!.abilityTalentId,
    tierStates,
  };
  syncLegacyTierOneFields(normalized);
  return normalized;
}

export function emptyTalentState(classKit: ClassKitDef): ClassTalentState {
  const tierStates = talentTierDefs(classKit).map((tierDef) => emptyTierTalentState(tierDef));
  const state: ClassTalentState = {
    statRanks: tierStates[0]!.statRanks,
    abilityTalentId: tierStates[0]!.abilityTalentId,
    tierStates,
  };
  syncLegacyTierOneFields(state);
  return state;
}

export function totalStatPoints(statRanks: Record<string, number>): number {
  return Object.values(statRanks).reduce((sum, rank) => sum + rank, 0);
}

function spentTierPoints(tierState: TierTalentState): number {
  return totalStatPoints(tierState.statRanks) + (tierState.abilityTalentId ? 1 : 0);
}

export function spentTalentPoints(state: ClassTalentState): number {
  return state.tierStates.reduce((sum, tier) => sum + spentTierPoints(tier), 0);
}

function tierHasAnyPoints(tierState: TierTalentState): boolean {
  return spentTierPoints(tierState) > 0;
}

function resolveTalentTier(
  classKit: ClassKitDef,
  talentId: string,
): { tierIndex: number; tierDef: TalentTierDef } | null {
  const tierDefs = talentTierDefs(classKit);
  for (let tierIndex = 0; tierIndex < tierDefs.length; tierIndex += 1) {
    const tierDef = tierDefs[tierIndex]!;
    if (
      tierDef.statRow.some((talent) => talent.id === talentId) ||
      tierDef.abilityRow.includes(talentId)
    ) {
      return { tierIndex, tierDef };
    }
  }
  return null;
}

function isTierUnlocked(state: ClassTalentState, tierIndex: number): boolean {
  if (tierIndex === 0) {
    return true;
  }
  const previous = state.tierStates[tierIndex - 1];
  return previous !== undefined && spentTierPoints(previous) >= 6;
}

function statTalentFor(tierDef: TalentTierDef, talentId: string) {
  return tierDef.statRow.find((talent) => talent.id === talentId);
}

function isAbilityTalent(tierDef: TalentTierDef, talentId: string): boolean {
  return tierDef.abilityRow.includes(talentId);
}

function allocateTierTalentPoint(
  tierState: TierTalentState,
  tierDef: TalentTierDef,
  talentId: string,
): void {
  if (isAbilityTalent(tierDef, talentId)) {
    if (tierState.abilityTalentId && tierState.abilityTalentId !== talentId) {
      throw new Error("Ability Talents are mutually exclusive");
    }
    if (tierState.abilityTalentId === talentId) {
      throw new Error(`Ability Talent ${talentId} is already allocated`);
    }
    if (totalStatPoints(tierState.statRanks) < 5) {
      throw new Error("Ability Row unlocks only after five Stat Row points are spent");
    }
    tierState.abilityTalentId = talentId;
    return;
  }

  const statTalent = statTalentFor(tierDef, talentId);
  if (statTalent) {
    const currentRank = tierState.statRanks[talentId] ?? 0;
    if (currentRank >= statTalent.maxRanks) {
      throw new Error(`Stat Talent ${talentId} is already at max rank`);
    }
    if (totalStatPoints(tierState.statRanks) >= 5) {
      throw new Error("Stat Row already has five points allocated");
    }
    tierState.statRanks[talentId] = currentRank + 1;
    return;
  }

  throw new Error(`Unknown Talent ${talentId}`);
}

export function allocateTalentPoint(
  state: ClassTalentState,
  classKit: ClassKitDef,
  talentId: string,
  level: number,
): void {
  const location = resolveTalentTier(classKit, talentId);
  if (!location) {
    throw new Error(`Unknown Talent ${talentId} for ${classKit.id}`);
  }
  const { tierIndex, tierDef } = location;
  if (!isTierUnlocked(state, tierIndex)) {
    throw new Error(`Talent Tier ${tierIndex + 1} is locked until the previous Tier is complete`);
  }

  const tierState = state.tierStates[tierIndex]!;
  if (isAbilityTalent(tierDef, talentId)) {
    if (tierState.abilityTalentId && tierState.abilityTalentId !== talentId) {
      throw new Error("Ability Talents are mutually exclusive");
    }
    if (tierState.abilityTalentId === talentId) {
      throw new Error(`Ability Talent ${talentId} is already allocated`);
    }
  }

  if (spentTalentPoints(state) >= level) {
    throw new Error(`No Talent Points remaining for ${classKit.id} at Level ${level}`);
  }

  allocateTierTalentPoint(tierState, tierDef, talentId);
  if (tierIndex === 0) {
    syncLegacyTierOneFields(state);
  }
}

export function canAllocateTalentPoint(
  state: ClassTalentState,
  classKit: ClassKitDef,
  talentId: string,
  level: number,
): boolean {
  try {
    const draft = cloneClassTalentState(state);
    allocateTalentPoint(draft, classKit, talentId, level);
    return true;
  } catch {
    return false;
  }
}

function deallocateTierTalentPoint(
  tierState: TierTalentState,
  tierDef: TalentTierDef,
  talentId: string,
): void {
  if (isAbilityTalent(tierDef, talentId)) {
    if (tierState.abilityTalentId !== talentId) {
      throw new Error(`Ability Talent ${talentId} is not allocated`);
    }
    tierState.abilityTalentId = null;
    return;
  }

  const statTalent = statTalentFor(tierDef, talentId);
  if (!statTalent) {
    throw new Error(`Unknown Talent ${talentId}`);
  }

  const currentRank = tierState.statRanks[talentId] ?? 0;
  if (currentRank <= 0) {
    throw new Error(`Stat Talent ${talentId} has no points to remove`);
  }

  if (tierState.abilityTalentId && totalStatPoints(tierState.statRanks) <= 5) {
    throw new Error("Remove the Ability Talent before reducing the Stat Row below five points");
  }

  tierState.statRanks[talentId] = currentRank - 1;
}

export function deallocateTalentPoint(
  state: ClassTalentState,
  classKit: ClassKitDef,
  talentId: string,
  level: number,
): void {
  const location = resolveTalentTier(classKit, talentId);
  if (!location) {
    throw new Error(`Unknown Talent ${talentId} for ${classKit.id}`);
  }
  const { tierIndex, tierDef } = location;

  for (let laterTier = tierIndex + 1; laterTier < state.tierStates.length; laterTier += 1) {
    const later = state.tierStates[laterTier];
    if (later && tierHasAnyPoints(later)) {
      throw new Error(
        `Clear Talent Tier ${laterTier + 1} before reducing Tier ${tierIndex + 1}`,
      );
    }
  }

  const tierState = state.tierStates[tierIndex]!;
  deallocateTierTalentPoint(tierState, tierDef, talentId);
  if (tierIndex === 0) {
    syncLegacyTierOneFields(state);
  }

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
    const draft = cloneClassTalentState(state);
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
  const tierDefs = talentTierDefs(classKit);
  for (let tierIndex = 0; tierIndex < tierDefs.length; tierIndex += 1) {
    const tierDef = tierDefs[tierIndex]!;
    const tierState = state.tierStates[tierIndex];
    if (!tierState) {
      continue;
    }
    for (const statTalent of tierDef.statRow) {
      const ranks = tierState.statRanks[statTalent.id] ?? 0;
      for (let rank = 0; rank < ranks; rank += 1) {
        modifiers.push(statTalent.perRank);
      }
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
