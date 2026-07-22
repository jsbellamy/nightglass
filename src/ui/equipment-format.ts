import type { DropInstance } from "../core/snapshot";
import type {
  ClassId,
  Content,
  EquipmentBaseDef,
  EquipmentSlotId,
  Rarity,
} from "../core/types";
import { formatStatModifierPerRank } from "../core/equipment-preview";
import { CLASS_LABELS } from "./snapshot-view";

export {
  compareAbilityRawChanges,
  compareEquipmentStatDeltas,
  equipmentLoadoutWithSwap,
  statsForEquipmentLoadout,
  statModifiersForSlotSwap,
  type AbilityRawChange,
  type StatDeltaLine,
} from "../core/equipment-preview";

export const RARITY_LABELS: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
};

export const RARITY_ORDER: Record<Rarity, number> = {
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

export const SLOT_LABELS: Record<EquipmentSlotId, string> = {
  weapon: "Weapon",
  armor: "Armor",
  charm: "Charm",
};

export type ArmorySortId = "default" | "newest" | "rarity" | "tier" | "name";

export interface ArmoryFilters {
  slot?: EquipmentSlotId;
  weaponClass?: ClassId;
  tier?: 1 | 2;
  rarity?: Rarity;
  assigned?: "assigned" | "available";
  locked?: boolean;
  unseen?: boolean;
}

export function formatRarityLabel(rarity: Rarity): string {
  return RARITY_LABELS[rarity];
}

export function equipmentBaseInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "?";
  }
  if (words.length === 1) {
    return words[0]!.slice(0, 2).toUpperCase();
  }
  return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
}

export function equipmentBaseForDrop(
  drop: DropInstance,
  content: Content,
): EquipmentBaseDef {
  const base = content.equipmentBases.find((entry) => entry.id === drop.baseId);
  if (!base) {
    throw new Error(`Missing Equipment Base ${drop.baseId}`);
  }
  return base;
}

export function formatAffix(affix: { id: string; value: number }): string {
  switch (affix.id) {
    case "flat-physical":
      return formatStatModifierPerRank({ flat: { physical: affix.value } });
    case "flat-elemental":
      return formatStatModifierPerRank({ flat: { elemental: affix.value } });
    case "flat-max-health":
      return formatStatModifierPerRank({ flat: { maxHealth: affix.value } });
    case "flat-armor":
      return formatStatModifierPerRank({ flat: { armor: affix.value } });
    case "flat-elemental-resistance":
      return formatStatModifierPerRank({ flat: { elementalResistance: affix.value } });
    case "percent-physical-power":
      return formatStatModifierPerRank({ percent: { physicalPower: affix.value } });
    case "percent-elemental-power":
      return formatStatModifierPerRank({ percent: { elementalPower: affix.value } });
    case "percent-max-health":
      return formatStatModifierPerRank({ percent: { maxHealth: affix.value } });
    default:
      return affix.id;
  }
}

export function formatGuaranteedStat(base: EquipmentBaseDef): string {
  return formatStatModifierPerRank(base.guaranteed);
}

export function formatAssignment(
  assignedTo: DropInstance["assignedTo"],
): string | null {
  if (!assignedTo) {
    return null;
  }
  return `${CLASS_LABELS[assignedTo.classId]} · ${SLOT_LABELS[assignedTo.slot]}`;
}

export function matchesArmoryFilters(
  drop: DropInstance,
  filters: ArmoryFilters,
  content: Content,
): boolean {
  const base = equipmentBaseForDrop(drop, content);

  if (filters.slot && base.slot !== filters.slot) {
    return false;
  }
  if (filters.weaponClass && base.weaponClass !== filters.weaponClass) {
    return false;
  }
  if (filters.tier && base.tier !== filters.tier) {
    return false;
  }
  if (filters.rarity && drop.rarity !== filters.rarity) {
    return false;
  }
  if (filters.assigned === "assigned" && !drop.assignedTo) {
    return false;
  }
  if (filters.assigned === "available" && drop.assignedTo) {
    return false;
  }
  if (filters.locked === true && !drop.locked) {
    return false;
  }
  if (filters.locked === false && drop.locked) {
    return false;
  }
  if (filters.unseen === true && drop.seen) {
    return false;
  }
  if (filters.unseen === false && !drop.seen) {
    return false;
  }
  return true;
}

export function filterArmoryDrops(
  drops: DropInstance[],
  filters: ArmoryFilters,
  content: Content,
): DropInstance[] {
  return drops.filter((drop) => matchesArmoryFilters(drop, filters, content));
}

function compareByNewest(a: DropInstance, b: DropInstance): number {
  return b.awardedAtMs - a.awardedAtMs || b.dropId - a.dropId;
}

function compareByRarity(
  a: DropInstance,
  b: DropInstance,
  content: Content,
): number {
  const rarityDelta = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
  if (rarityDelta !== 0) {
    return rarityDelta;
  }
  const tierDelta =
    equipmentBaseForDrop(b, content).tier - equipmentBaseForDrop(a, content).tier;
  if (tierDelta !== 0) {
    return tierDelta;
  }
  return compareByNewest(a, b);
}

function compareByTier(
  a: DropInstance,
  b: DropInstance,
  content: Content,
): number {
  const tierDelta =
    equipmentBaseForDrop(b, content).tier - equipmentBaseForDrop(a, content).tier;
  if (tierDelta !== 0) {
    return tierDelta;
  }
  return compareByRarity(a, b, content);
}

function compareByName(
  a: DropInstance,
  b: DropInstance,
  content: Content,
): number {
  const nameA = equipmentBaseForDrop(a, content).name;
  const nameB = equipmentBaseForDrop(b, content).name;
  const nameDelta = nameA.localeCompare(nameB);
  if (nameDelta !== 0) {
    return nameDelta;
  }
  return compareByNewest(a, b);
}

export function sortArmoryDrops(
  drops: DropInstance[],
  sort: ArmorySortId,
  content: Content,
): DropInstance[] {
  const sorted = [...drops];
  if (sort === "default") {
    sorted.sort((a, b) => {
      if (a.seen !== b.seen) {
        return a.seen ? 1 : -1;
      }
      return compareByNewest(a, b);
    });
    return sorted;
  }
  if (sort === "newest") {
    sorted.sort(compareByNewest);
    return sorted;
  }
  if (sort === "rarity") {
    sorted.sort((a, b) => compareByRarity(a, b, content));
    return sorted;
  }
  if (sort === "tier") {
    sorted.sort((a, b) => compareByTier(a, b, content));
    return sorted;
  }
  sorted.sort((a, b) => compareByName(a, b, content));
  return sorted;
}

export function isCompatibleWithSlot(
  drop: DropInstance,
  classId: ClassId,
  slot: EquipmentSlotId,
  canEquip: (dropId: number, classId: ClassId, slot: EquipmentSlotId) => boolean,
): boolean {
  return canEquip(drop.dropId, classId, slot);
}

export function discardableDrop(drop: DropInstance): boolean {
  return !drop.assignedTo && !drop.locked;
}

export function rareOrEpicDropNames(
  drops: DropInstance[],
  content: Content,
): string[] {
  return drops
    .filter((drop) => drop.rarity === "rare" || drop.rarity === "epic")
    .map((drop) => equipmentBaseForDrop(drop, content).name);
}
