import type { ClassId } from "./types";

export interface ActiveStatus {
  statusId: string;
  expiresAtMs: number;
}

export interface CombatActionState {
  abilityId: string;
  startedAtMs: number;
  impactAtMs: number;
  endsAtMs: number;
  targetIds: string[];
  impactResolved: boolean;
}

export interface CombatantState {
  entityId: string;
  side: "party" | "opponent";
  defId: string;
  health: number;
  maxHealth: number;
  knockedOut: boolean;
  action: CombatActionState | null;
  cooldownReadyAtMs: Record<string, number>;
  statuses: ActiveStatus[];
}

export interface AttemptState {
  id: number;
  stage: 1 | 2 | 3;
  encounter: 1 | 2 | 3;
  phase: "fighting" | "wave-transition" | "defeat-hold";
  phaseEndsAtMs: number | null;
  combatants: CombatantState[];
}

export type PendingEdit =
  | { kind: "formation"; order: [ClassId, ClassId, ClassId] }
  | { kind: "loadout"; classId: ClassId; loadout: [string, string, string] }
  | { kind: "talent" }
  | { kind: "equipment" };

export interface ProgressionState {
  unlockedStage: 1 | 2 | 3;
  party: [ClassId, ClassId, ClassId];
  reserve: ClassId;
  characterXp: Record<ClassId, number>;
  loadouts: Record<ClassId, [string, string, string]>;
}

export interface Snapshot {
  schemaVersion: number;
  savedAtMs: number;
  simNowMs: number;
  lootRngState: number;
  nextEventSeq: number;
  nextAttemptId: number;
  nextDropId: number;
  progression: ProgressionState;
  attempt: AttemptState | null;
  pendingEdits: PendingEdit[];
}

export function cloneSnapshot(snapshot: Snapshot): Snapshot {
  return structuredClone(snapshot);
}
