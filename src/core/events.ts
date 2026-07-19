import type { ClassId, DamageChannel, Element } from "./types";

export type EngineEvent = { seq: number; atMs: number } & (
  | { type: "stage-attempt-started"; stage: 1 | 2 | 3; attemptId: number }
  | { type: "wave-started"; stage: 1 | 2 | 3; encounter: 1 | 2 | 3; boss: boolean }
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
  | { type: "wave-cleared"; stage: 1 | 2 | 3; encounter: 1 | 2 | 3 }
  | { type: "stage-cleared"; stage: 1 | 2 | 3 }
  | { type: "party-defeat"; stage: 1 | 2 | 3 }
  | { type: "xp-awarded"; classId: ClassId; amount: number; totalXp: number }
  | { type: "level-up"; classId: ClassId; level: number }
  | { type: "drop-awarded"; dropId: number }
  | { type: "config-applied" }
);

export type EngineEventInput = {
  [T in EngineEvent["type"]]: Omit<Extract<EngineEvent, { type: T }>, "seq" | "atMs">;
}[EngineEvent["type"]];
