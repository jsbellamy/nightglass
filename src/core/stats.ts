import type { ClassTalentState } from "./talents";
import { talentStatModifiers } from "./talents";
import { resolveStatModifiers, type ResolvedStats } from "./combat";
import type { ClassKitDef, StatModifiers } from "./types";

/**
 * Derive a Character's current BaseStats from its Class Kit base, allocated
 * Talents, and worn Equipment. Modifier order is load-bearing:
 * resolveStatModifiers applies flat bonuses before percentage bonuses, so
 * callers must never pre-merge or reorder these arrays.
 */
export function characterStats(
  classKit: ClassKitDef,
  talentState: ClassTalentState,
  equipmentMods: StatModifiers[] = [],
): ResolvedStats {
  return resolveStatModifiers(classKit.base, [
    ...talentStatModifiers(talentState, classKit),
    ...equipmentMods,
  ]);
}
