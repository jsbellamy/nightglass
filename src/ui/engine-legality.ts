import type { Engine } from "../core/engine";
import type { EngineEvent } from "../core/events";
import type { Snapshot } from "../core/snapshot";
import type { ClassId, Content, EquipmentSlotId } from "../core/types";
import { rosterClassIds } from "./snapshot-view";

const SLOTS: EquipmentSlotId[] = ["weapon", "armor", "charm"];

export interface EngineLegalityView {
  canAllocateTalent(classId: ClassId, talentId: string): boolean;
  canDeallocateTalent(classId: ClassId, talentId: string): boolean;
  canEquip(dropId: number, classId: ClassId, slot: EquipmentSlotId): boolean;
}

export interface SerializedEngineLegality {
  talentAllocate: Record<string, boolean>;
  talentDeallocate: Record<string, boolean>;
  equip: Record<string, boolean>;
}

function talentKey(classId: ClassId, talentId: string): string {
  return `${classId}:${talentId}`;
}

function equipKey(dropId: number, classId: ClassId, slot: EquipmentSlotId): string {
  return `${dropId}:${classId}:${slot}`;
}

/**
 * Whether an event can change equip or talent legality.
 *
 * Exhaustive by construction: adding a variant to EngineEvent without adding a
 * case here is a compile error. The Presentation Event vocabulary is
 * append-only (docs/agents/code-style.md), so new variants will arrive — and
 * each one must be consciously classified rather than defaulting to "safe".
 */
export function invalidatesLegality(event: EngineEvent): boolean {
  switch (event.type) {
    case "level-up":
    case "drop-awarded":
    case "config-applied":
      return true;
    case "stage-attempt-started":
    case "wave-started":
    case "action-started":
    case "impact":
    case "status-applied":
    case "status-expired":
    case "knockout":
    case "revived":
    case "wave-cleared":
    case "stage-cleared":
    case "party-defeat":
    case "xp-awarded":
      return false;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

export function legalityViewFromEngine(engine: Engine): EngineLegalityView {
  return {
    canAllocateTalent: (classId, talentId) => engine.canAllocateTalent(classId, talentId),
    canDeallocateTalent: (classId, talentId) => engine.canDeallocateTalent(classId, talentId),
    canEquip: (dropId, classId, slot) => engine.canEquip(dropId, classId, slot),
  };
}

export function serializeEngineLegality(
  engine: Engine,
  snapshot: Snapshot,
  content: Content,
): SerializedEngineLegality {
  const talentAllocate: Record<string, boolean> = {};
  const talentDeallocate: Record<string, boolean> = {};
  const equip: Record<string, boolean> = {};

  for (const classId of rosterClassIds(snapshot)) {
    const classKit = content.classes.find((entry) => entry.id === classId);
    if (!classKit) {
      continue;
    }
    for (const statTalent of classKit.talents.statRow) {
      const key = talentKey(classId, statTalent.id);
      talentAllocate[key] = engine.canAllocateTalent(classId, statTalent.id);
      talentDeallocate[key] = engine.canDeallocateTalent(classId, statTalent.id);
    }
    for (const abilityId of classKit.talents.abilityRow) {
      const key = talentKey(classId, abilityId);
      talentAllocate[key] = engine.canAllocateTalent(classId, abilityId);
      talentDeallocate[key] = engine.canDeallocateTalent(classId, abilityId);
    }
  }

  for (const drop of snapshot.progression.armory) {
    for (const classId of rosterClassIds(snapshot)) {
      for (const slot of SLOTS) {
        equip[equipKey(drop.dropId, classId, slot)] = engine.canEquip(drop.dropId, classId, slot);
      }
    }
  }

  return { talentAllocate, talentDeallocate, equip };
}

export function legalityViewFromSerialized(data: SerializedEngineLegality): EngineLegalityView {
  return {
    canAllocateTalent: (classId, talentId) =>
      data.talentAllocate[talentKey(classId, talentId)] ?? false,
    canDeallocateTalent: (classId, talentId) =>
      data.talentDeallocate[talentKey(classId, talentId)] ?? false,
    canEquip: (dropId, classId, slot) => data.equip[equipKey(dropId, classId, slot)] ?? false,
  };
}

export const EMPTY_ENGINE_LEGALITY: EngineLegalityView = {
  canAllocateTalent: () => false,
  canDeallocateTalent: () => false,
  canEquip: () => false,
};
