import type { ResolvedStats } from "./combat";
import { equipmentModifiersForLoadout, snapshotEquipmentLoadouts } from "./equipment";
import { characterStatsFor, statsForEquipmentLoadout } from "./equipment-preview";
import { effectiveTalentState, rosterClassIds } from "./pending-edits";
import type { Snapshot } from "./snapshot";
import { cloneClassTalentState, talentStatModifiers } from "./talents";
import type { ClassId, Content, StatModifiers, BaseStats } from "./types";

export type CharacterStatKey =
  | "maxHealth"
  | "physical"
  | "spell"
  | "armor"
  | "elementalResistance"
  | "firePower"
  | "frostPower"
  | "lightningPower"
  | "lightPower"
  | "critChance"
  | "critDamage";

export interface ModifierContribution {
  flat: number;
  percent: number;
}

export interface CharacterStatBreakdownLine {
  key: CharacterStatKey;
  label:
    | "Max Health"
    | "Physical Power"
    | "Spell Power"
    | "Armor"
    | "Elemental Resistance"
    | "Fire Power"
    | "Frost Power"
    | "Lightning Power"
    | "Light Power"
    | "Critical Chance"
    | "Critical Damage";
  base: number;
  equipment: ModifierContribution;
  talents: ModifierContribution;
  total: number;
}

interface StatLineDef {
  key: CharacterStatKey;
  label: CharacterStatBreakdownLine["label"];
  baseKey: keyof BaseStats;
  flatKey?: keyof NonNullable<StatModifiers["flat"]>;
  percentKey?: keyof NonNullable<StatModifiers["percent"]>;
  totalKey: keyof BaseStats;
}

const STAT_LINE_DEFS: StatLineDef[] = [
  {
    key: "maxHealth",
    label: "Max Health",
    baseKey: "maxHealth",
    flatKey: "maxHealth",
    percentKey: "maxHealth",
    totalKey: "maxHealth",
  },
  {
    key: "physical",
    label: "Physical Power",
    baseKey: "physical",
    flatKey: "physical",
    percentKey: "physicalPower",
    totalKey: "physical",
  },
  {
    key: "spell",
    label: "Spell Power",
    baseKey: "spell",
    flatKey: "spell",
    percentKey: "spellPower",
    totalKey: "spell",
  },
  {
    key: "armor",
    label: "Armor",
    baseKey: "armor",
    flatKey: "armor",
    totalKey: "armor",
  },
  {
    key: "elementalResistance",
    label: "Elemental Resistance",
    baseKey: "elementalResistance",
    flatKey: "elementalResistance",
    totalKey: "elementalResistance",
  },
  {
    key: "firePower",
    label: "Fire Power",
    baseKey: "firePower",
    flatKey: "firePower",
    percentKey: "firePower",
    totalKey: "firePower",
  },
  {
    key: "frostPower",
    label: "Frost Power",
    baseKey: "frostPower",
    flatKey: "frostPower",
    percentKey: "frostPower",
    totalKey: "frostPower",
  },
  {
    key: "lightningPower",
    label: "Lightning Power",
    baseKey: "lightningPower",
    flatKey: "lightningPower",
    percentKey: "lightningPower",
    totalKey: "lightningPower",
  },
  {
    key: "lightPower",
    label: "Light Power",
    baseKey: "lightPower",
    flatKey: "lightPower",
    percentKey: "lightPower",
    totalKey: "lightPower",
  },
  {
    key: "critChance",
    label: "Critical Chance",
    baseKey: "critChance",
    flatKey: "critChance",
    totalKey: "critChance",
  },
  {
    key: "critDamage",
    label: "Critical Damage",
    baseKey: "critDamage",
    flatKey: "critDamage",
    totalKey: "critDamage",
  },
];

function sumContribution(
  modifiers: StatModifiers[],
  flatKey: StatLineDef["flatKey"],
  percentKey: StatLineDef["percentKey"],
): ModifierContribution {
  let flat = 0;
  let percent = 0;
  for (const modifier of modifiers) {
    if (flatKey && modifier.flat?.[flatKey] !== undefined) {
      flat += modifier.flat[flatKey]!;
    }
    if (percentKey && modifier.percent?.[percentKey] !== undefined) {
      percent += modifier.percent[percentKey]!;
    }
  }
  return { flat, percent };
}

function classKitFor(content: Content, classId: ClassId) {
  const classKit = content.classes.find((entry) => entry.id === classId);
  if (!classKit) {
    throw new Error(`Missing Class Kit for ${classId}`);
  }
  return classKit;
}

function equipmentModifiersForSnapshot(snapshot: Snapshot, classId: ClassId, content: Content) {
  const roster = rosterClassIds(snapshot);
  const loadouts = snapshotEquipmentLoadouts(snapshot.progression.armory, roster);
  const loadout = loadouts[classId] ?? {};
  return equipmentModifiersForLoadout(loadout, snapshot.progression.armory, content);
}

/** Combat-committed BaseStats: applied Talents and Attempt Equipment loadouts. */
export function characterStatsCommittedFor(
  snapshot: Snapshot,
  content: Content,
  classId: ClassId,
): ResolvedStats {
  const classKit = classKitFor(content, classId);
  const talentState = cloneClassTalentState(snapshot.progression.talents[classId]!);
  const roster = rosterClassIds(snapshot);
  const loadout = snapshot.attempt
    ? (snapshot.attempt.equipmentLoadouts[classId] ?? {})
    : (snapshotEquipmentLoadouts(snapshot.progression.armory, roster)[classId] ?? {});
  return statsForEquipmentLoadout(
    classKit,
    talentState,
    loadout,
    snapshot.progression.armory,
    content,
  );
}

export function statsDifferFromCommittedCombat(
  snapshot: Snapshot,
  content: Content,
  classId: ClassId,
): boolean {
  if (!snapshot.attempt) {
    return false;
  }
  const effective = characterStatsFor(snapshot, content, classId);
  const committed = characterStatsCommittedFor(snapshot, content, classId);
  return (
    effective.stats.maxHealth !== committed.stats.maxHealth ||
    effective.stats.physical !== committed.stats.physical ||
    effective.stats.spell !== committed.stats.spell ||
    effective.stats.armor !== committed.stats.armor ||
    effective.stats.elementalResistance !== committed.stats.elementalResistance ||
    effective.stats.firePower !== committed.stats.firePower ||
    effective.stats.frostPower !== committed.stats.frostPower ||
    effective.stats.lightningPower !== committed.stats.lightningPower ||
    effective.stats.lightPower !== committed.stats.lightPower ||
    effective.stats.critChance !== committed.stats.critChance ||
    effective.stats.critDamage !== committed.stats.critDamage
  );
}

export function characterStatBreakdown(
  snapshot: Snapshot,
  content: Content,
  classId: ClassId,
): CharacterStatBreakdownLine[] {
  const classKit = classKitFor(content, classId);
  const talentState = effectiveTalentState(snapshot, classId);
  const equipmentMods = equipmentModifiersForSnapshot(snapshot, classId, content);
  const talentMods = talentStatModifiers(talentState, classKit);
  const totals = characterStatsFor(snapshot, content, classId);

  return STAT_LINE_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    base: classKit.base[def.baseKey],
    equipment: sumContribution(equipmentMods, def.flatKey, def.percentKey),
    talents: sumContribution(talentMods, def.flatKey, def.percentKey),
    total: totals.stats[def.totalKey],
  }));
}
