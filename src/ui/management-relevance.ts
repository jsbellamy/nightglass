import type {
  AttemptState,
  ProgressionState,
  ReadonlySnapshot,
} from "../core/snapshot";

export const PROGRESSION_RELEVANCE = {
  unlockedStage: true,
  party: true,
  reserve: true,
  pendingParty: true,
  armory: true,
  characterXp: true,
  talents: true,
  loadouts: true,
} satisfies Record<keyof ProgressionState, boolean>;

export const ATTEMPT_RELEVANCE = {
  id: true,
  stage: true,
  encounter: true,
  phase: false,
  phaseEndsAtMs: false,
  equipmentLoadouts: true,
  combatants: false,
} satisfies Record<keyof AttemptState, boolean>;

function pickRelevantFields<K extends string>(
  source: { [P in K]: unknown },
  relevance: Record<K, boolean>,
): Partial<{ [P in K]: unknown }> {
  const picked: Partial<{ [P in K]: unknown }> = {};
  for (const key of Object.keys(relevance) as K[]) {
    if (relevance[key]) {
      picked[key] = source[key];
    }
  }
  return picked;
}

/**
 * Stable key for Snapshot fields that affect Management Dock surfaces.
 * Combat HP / cooldown / sim clock churn is excluded so pumps do not remount.
 */
export function managementRelevanceKey(snapshot: ReadonlySnapshot | null): string {
  if (!snapshot) {
    return "null";
  }
  const { progression, pendingEdits, attempt } = snapshot;
  return JSON.stringify({
    ...pickRelevantFields(progression, PROGRESSION_RELEVANCE),
    pendingEdits,
    attempt: attempt ? pickRelevantFields(attempt, ATTEMPT_RELEVANCE) : null,
  });
}
