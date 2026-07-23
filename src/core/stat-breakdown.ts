import { equipmentModifiersForLoadout, snapshotEquipmentLoadouts } from "./equipment";
import { characterStatsFor, statsForEquipmentLoadout } from "./equipment-preview";
import { effectiveTalentState, rosterClassIds } from "./pending-edits";
import type { Snapshot } from "./snapshot";
import { cloneClassTalentState, talentStatModifiers } from "./talents";
import type { BaseStats, ClassId, Content, StatModifiers } from "./types";

export type CharacterStatKey =
  | "maxHealth"
  | "physical"
  | "elemental"
  | "armor"
  | "elementalResistance";

export interface ModifierContribution {
  flat: number;
  percent: number;
}

export interface CharacterStatBreakdownLine {
  key: CharacterStatKey;
  label: "Max Health" | "Physical Power" | "Elemental Power" | "Armor" | "Elemental Resistance";
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
    key: "elemental",
    label: "Elemental Power",
    baseKey: "elemental",
    flatKey: "elemental",
    percentKey: "elementalPower",
    totalKey: "elemental",
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
): BaseStats {
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
    effective.maxHealth !== committed.maxHealth ||
    effective.physical !== committed.physical ||
    effective.elemental !== committed.elemental ||
    effective.armor !== committed.armor ||
    effective.elementalResistance !== committed.elementalResistance
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
    total: totals[def.totalKey],
  }));
}
