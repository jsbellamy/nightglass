import {
  equipmentModifiersForLoadout,
  snapshotEquipmentLoadouts,
} from "../core/equipment";
import { characterStats } from "../core/stats";
import type { DropInstance, EquipmentLoadout } from "../core/snapshot";
import type { ClassTalentState } from "../core/talents";
import type {
  AbilityDef,
  BaseStats,
  ClassId,
  ClassKitDef,
  Content,
  EquipmentBaseDef,
  EquipmentSlotId,
  Rarity,
  StatModifiers,
} from "../core/types";
import {
  abilityRawDisplay,
  formatAbilityRawLine,
  formatStatModifierPerRank,
  statLines,
} from "./ability-format";

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

export const CLASS_LABELS: Record<ClassId, string> = {
  knight: "Knight",
  wizard: "Wizard",
  priest: "Priest",
  hunter: "Hunter",
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

export interface StatDeltaLine {
  label: string;
  before: string;
  after: string;
  delta: string;
}

function numericStatValue(value: string): number {
  return Number(value.replace("%", ""));
}

function aggregationLabel(line: { label: string; value: string }): string {
  return line.value.includes("%") ? `${line.label} %` : line.label;
}

function statTotalsFromModifiers(modifiers: StatModifiers[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const modifier of modifiers) {
    for (const line of statLines(modifier)) {
      const key = aggregationLabel(line);
      totals.set(key, (totals.get(key) ?? 0) + numericStatValue(line.value));
    }
  }
  return totals;
}

function formatStatValue(label: string, value: number): string {
  if (label.endsWith("%")) {
    return `${Math.round(value)}%`;
  }
  return String(value);
}

function formatDelta(delta: number, label: string): string {
  const rounded = label.endsWith("%") ? Math.round(delta) : delta;
  if (rounded === 0) {
    return "0";
  }
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

export function compareEquipmentStatDeltas(
  currentMods: StatModifiers[],
  candidateMods: StatModifiers[],
): StatDeltaLine[] {
  const before = statTotalsFromModifiers(currentMods);
  const after = statTotalsFromModifiers(candidateMods);
  const labels = new Set([...before.keys(), ...after.keys()]);
  const lines: StatDeltaLine[] = [];

  for (const label of [...labels].sort()) {
    const beforeValue = before.get(label) ?? 0;
    const afterValue = after.get(label) ?? 0;
    const delta = afterValue - beforeValue;
    if (delta === 0 && beforeValue === 0 && afterValue === 0) {
      continue;
    }
    lines.push({
      label,
      before: formatStatValue(label, beforeValue),
      after: formatStatValue(label, afterValue),
      delta: formatDelta(delta, label),
    });
  }
  return lines;
}

export interface AbilityRawChange {
  abilityId: string;
  abilityName: string;
  before: string | null;
  after: string | null;
}

export function compareAbilityRawChanges(
  loadoutAbilityIds: string[],
  basicAbility: AbilityDef,
  currentStats: BaseStats,
  candidateStats: BaseStats,
  abilitiesById: Map<string, AbilityDef>,
): AbilityRawChange[] {
  const changes: AbilityRawChange[] = [];
  const abilityIds = [basicAbility.id, ...loadoutAbilityIds];

  for (const abilityId of abilityIds) {
    const ability = abilitiesById.get(abilityId);
    if (!ability) {
      continue;
    }
    const before = formatAbilityRawLine(abilityRawDisplay(ability, currentStats));
    const after = formatAbilityRawLine(abilityRawDisplay(ability, candidateStats));
    if (before === after) {
      continue;
    }
    changes.push({
      abilityId,
      abilityName: ability.name,
      before,
      after,
    });
  }
  return changes;
}

export function equipmentLoadoutWithSwap(
  armory: DropInstance[],
  roster: ClassId[],
  classId: ClassId,
  slot: EquipmentSlotId,
  candidateDropId: number,
): EquipmentLoadout {
  const loadouts = snapshotEquipmentLoadouts(armory, roster);
  const next = { ...loadouts[classId] };
  next[slot] = candidateDropId;
  return next;
}

export function statsForEquipmentLoadout(
  classKit: ClassKitDef,
  talentState: ClassTalentState,
  loadout: EquipmentLoadout,
  armory: DropInstance[],
  content: Content,
): BaseStats {
  const equipmentMods = equipmentModifiersForLoadout(loadout, armory, content);
  return characterStats(classKit, talentState, equipmentMods);
}

export function statModifiersForSlotSwap(
  armory: DropInstance[],
  roster: ClassId[],
  classId: ClassId,
  slot: EquipmentSlotId,
  candidateDrop: DropInstance,
  content: Content,
): { current: StatModifiers[]; candidate: StatModifiers[] } {
  const loadouts = snapshotEquipmentLoadouts(armory, roster);
  const currentLoadout = loadouts[classId] ?? {};
  const candidateLoadout = { ...currentLoadout, [slot]: candidateDrop.dropId };
  return {
    current: equipmentModifiersForLoadout(currentLoadout, armory, content),
    candidate: equipmentModifiersForLoadout(candidateLoadout, armory, content),
  };
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
