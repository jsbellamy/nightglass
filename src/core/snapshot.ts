import type { ClassTalentState } from "./talents";
import type { AffixId, ClassId, EquipmentSlotId, Rarity } from "./types";

export interface DropInstance {
  dropId: number;
  baseId: string;
  itemLevel: 1 | 2 | 3;
  rarity: Rarity;
  affixes: { id: AffixId; value: number }[];
  awardedAtMs: number;
  seen: boolean;
  locked: boolean;
  assignedTo: { classId: ClassId; slot: EquipmentSlotId } | null;
}

export type EquipmentLoadout = Partial<Record<EquipmentSlotId, number>>;

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
  equipmentLoadouts: Record<ClassId, EquipmentLoadout>;
  combatants: CombatantState[];
}

export type PendingEdit =
  | { kind: "formation"; order: [ClassId, ClassId, ClassId] }
  | { kind: "loadout"; classId: ClassId; loadout: [string, string, string] }
  | {
      kind: "talent";
      classId: ClassId;
      statRanks: Record<string, number>;
      abilityTalentId: string | null;
    }
  | { kind: "equipment" };

export interface ProgressionState {
  unlockedStage: 1 | 2 | 3;
  party: [ClassId, ClassId, ClassId];
  reserve: ClassId;
  characterXp: Record<ClassId, number>;
  talents: Record<ClassId, ClassTalentState>;
  loadouts: Record<ClassId, [string, string, string]>;
  armory: DropInstance[];
  pendingParty: { members: [ClassId, ClassId, ClassId]; reserve: ClassId } | null;
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
