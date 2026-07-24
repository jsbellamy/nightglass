import type { ClassId, DamageChannel, Element, StageId } from "./types";

export type EngineEvent = { seq: number; atMs: number } & (
  | { type: "stage-attempt-started"; stage: StageId; attemptId: number }
  | { type: "wave-started"; stage: StageId; encounter: number; boss: boolean }
  | {
      type: "action-started";
      entityId: string;
      abilityId: string;
      impactAtMs: number;
      targetIds: string[];
    }
  | {
      type: "impact";
      entityId: string;
      abilityId: string;
      results: {
        targetId: string;
        kind: "damage" | "heal";
        channel?: DamageChannel;
        element?: Element;
        amount: number;
        healthAfter: number;
      }[];
    }
  | { type: "status-applied"; entityId: string; statusId: string; expiresAtMs: number }
  | { type: "status-expired"; entityId: string; statusId: string }
  | { type: "knockout"; entityId: string }
  | { type: "revived"; entityId: string; health: number }
  | { type: "wave-cleared"; stage: StageId; encounter: number }
  | { type: "stage-cleared"; stage: StageId }
  | { type: "party-defeat"; stage: StageId }
  | { type: "xp-awarded"; classId: ClassId; amount: number; totalXp: number }
  | { type: "level-up"; classId: ClassId; level: number }
  | { type: "drop-awarded"; dropId: number }
  | { type: "config-applied" }
);

export type EngineEventInput = {
  [T in EngineEvent["type"]]: Omit<Extract<EngineEvent, { type: T }>, "seq" | "atMs">;
}[EngineEvent["type"]];
