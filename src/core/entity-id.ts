import type { ClassId, FormationSlot } from "./types";

/**
 * Combatant identity as carried by Snapshots and Presentation Events.
 * Party: `party:<classId>:<formationSlot>`. Opponent: `opp:<encounter>:<index>`.
 * The string form is persisted inside Snapshots, so this encoding is
 * save-compatible state: changing it requires a schema version bump.
 */
export type EntityId = string & { readonly __entityId: unique symbol };

export const FORMATION_SLOT_BY_INDEX: readonly FormationSlot[] = ["front", "middle", "back"];

export function partyEntityId(classId: ClassId, formationIndex: number): EntityId {
  const slot = FORMATION_SLOT_BY_INDEX[formationIndex] ?? "back";
  return `party:${classId}:${slot}` as EntityId;
}

export function opponentEntityId(defId: string, index: number): EntityId {
  return `opp:${defId}:${index}` as EntityId;
}

export type ParsedEntity =
  | { side: "party"; classId: ClassId; formationIndex: number }
  | { side: "opponent"; defId: string; index: number };

/** Throws on a malformed id — a malformed EntityId is a programming error, not a UI state. */
export function parseEntityId(entityId: string): ParsedEntity {
  const parts = entityId.split(":");
  if (parts.length !== 3) {
    throw new Error(`Malformed entity id: ${entityId}`);
  }
  const [prefix, second, third] = parts;
  if (prefix === "party") {
    if (second === undefined || third === undefined) {
      throw new Error(`Malformed entity id: ${entityId}`);
    }
    const classId = second as ClassId;
    const formationIndex = FORMATION_SLOT_BY_INDEX.indexOf(third as FormationSlot);
    if (formationIndex < 0) {
      throw new Error(`Malformed entity id: ${entityId}`);
    }
    return { side: "party", classId, formationIndex };
  }
  if (prefix === "opp") {
    if (second === undefined || third === undefined) {
      throw new Error(`Malformed entity id: ${entityId}`);
    }
    const index = Number(third);
    if (!Number.isFinite(index)) {
      throw new Error(`Malformed entity id: ${entityId}`);
    }
    return { side: "opponent", defId: second, index };
  }
  throw new Error(`Malformed entity id: ${entityId}`);
}

export function isPartyEntity(entityId: string): boolean {
  return parseEntityId(entityId).side === "party";
}
