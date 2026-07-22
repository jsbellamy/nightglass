import { previewEffectRaw } from "./combat";
import {
  equipmentModifiersForLoadout,
  findDrop,
  snapshotEquipmentLoadouts,
} from "./equipment";
import {
  effectiveLoadout,
  effectiveTalentState,
  rosterClassIds,
} from "./pending-edits";
import type { DropInstance, EquipmentLoadout, Snapshot } from "./snapshot";
import { characterStats } from "./stats";
import type { ClassTalentState } from "./talents";
import type {
  AbilityDef,
  BaseStats,
  ClassId,
  ClassKitDef,
  Content,
  EquipmentSlotId,
  StatModifiers,
} from "./types";

export interface StatLine {
  label: string;
  value: string;
}

function formatSignedStatAmount(amount: number, asPercent: boolean): string {
  const rounded = asPercent ? Math.round(amount) : amount;
  if (rounded === 0) {
    return asPercent ? "+0%" : "+0";
  }
  const prefix = rounded > 0 ? `+${rounded}` : String(rounded);
  return asPercent ? `${prefix}%` : prefix;
}

/** One walk over StatModifiers. `ranks` multiplies both flat and percent entries. */
export function statLines(modifier: StatModifiers, ranks = 1): StatLine[] {
  const lines: StatLine[] = [];
  if (modifier.percent?.maxHealth) {
    lines.push({
      label: "Max Health",
      value: formatSignedStatAmount(modifier.percent.maxHealth * ranks * 100, true),
    });
  }
  if (modifier.percent?.physicalPower) {
    lines.push({
      label: "Physical",
      value: formatSignedStatAmount(modifier.percent.physicalPower * ranks * 100, true),
    });
  }
  if (modifier.percent?.elementalPower) {
    lines.push({
      label: "Elemental",
      value: formatSignedStatAmount(modifier.percent.elementalPower * ranks * 100, true),
    });
  }
  if (modifier.flat?.maxHealth) {
    lines.push({
      label: "Max Health",
      value: formatSignedStatAmount(modifier.flat.maxHealth * ranks, false),
    });
  }
  if (modifier.flat?.physical) {
    lines.push({
      label: "Physical",
      value: formatSignedStatAmount(modifier.flat.physical * ranks, false),
    });
  }
  if (modifier.flat?.elemental) {
    lines.push({
      label: "Elemental",
      value: formatSignedStatAmount(modifier.flat.elemental * ranks, false),
    });
  }
  if (modifier.flat?.armor) {
    lines.push({
      label: "Armor",
      value: formatSignedStatAmount(modifier.flat.armor * ranks, false),
    });
  }
  if (modifier.flat?.elementalResistance) {
    lines.push({
      label: "Elemental Resistance",
      value: formatSignedStatAmount(modifier.flat.elementalResistance * ranks, false),
    });
  }
  return lines;
}

export function formatStatModifierPerRank(modifier: StatModifiers): string {
  return statLines(modifier)
    .map((line) => `${line.value} ${line.label}`)
    .join(", ");
}

export interface AbilityRawDisplay {
  kind: "damage" | "heal";
  value: number;
  channel?: "physical" | "elemental";
}

export function abilityRawDisplay(
  ability: AbilityDef,
  stats: BaseStats,
): AbilityRawDisplay | null {
  for (const effect of ability.effects) {
    if (effect.kind === "damage") {
      const channel = effect.channel ?? "physical";
      const value = previewEffectRaw(effect, stats);
      if (value === null) {
        continue;
      }
      return {
        kind: "damage",
        value,
        channel,
      };
    }
    if (effect.kind === "heal") {
      const value = previewEffectRaw(effect, stats);
      if (value === null) {
        continue;
      }
      return {
        kind: "heal",
        value,
      };
    }
  }
  return null;
}

export function formatAbilityRawLine(display: AbilityRawDisplay | null): string | null {
  if (!display) {
    return null;
  }
  if (display.kind === "damage") {
    return `${display.value} damage`;
  }
  return `${display.value} heal`;
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
    if (delta === 0) {
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

/** Every aggregated label with an explicit `"0"` delta (identical-swap previews). */
function zeroEquipmentStatDeltas(modifiers: StatModifiers[]): StatDeltaLine[] {
  const totals = statTotalsFromModifiers(modifiers);
  return [...totals.keys()].sort().map((label) => {
    const value = totals.get(label) ?? 0;
    return {
      label,
      before: formatStatValue(label, value),
      after: formatStatValue(label, value),
      delta: "0",
    };
  });
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

export interface EquipPreview {
  statDeltas: StatDeltaLine[];
  abilityChanges: AbilityRawChange[];
}

/**
 * What equipping `dropId` on `classId` in `slot` would change, against that
 * Character's current Equipment Loadout. Honours Pending Edits: the Talent
 * state and Ability Loadout used are the effective ones, not the applied ones.
 */
export function previewEquip(
  snapshot: Snapshot,
  content: Content,
  dropId: number,
  classId: ClassId,
  slot: EquipmentSlotId,
): EquipPreview {
  const drop = findDrop(snapshot.progression.armory, dropId);
  if (!drop) {
    throw new Error(`Missing Drop ${dropId} in Armory`);
  }

  const roster = rosterClassIds(snapshot);
  const loadouts = snapshotEquipmentLoadouts(snapshot.progression.armory, roster);
  const currentLoadout = { ...loadouts[classId] };
  const candidateLoadout = { ...currentLoadout, [slot]: drop.dropId };
  const { current: currentMods, candidate: candidateMods } = {
    current: equipmentModifiersForLoadout(currentLoadout, snapshot.progression.armory, content),
    candidate: equipmentModifiersForLoadout(candidateLoadout, snapshot.progression.armory, content),
  };
  const statDeltas =
    currentLoadout[slot] === dropId
      ? zeroEquipmentStatDeltas(currentMods)
      : compareEquipmentStatDeltas(currentMods, candidateMods);

  const classKit = content.classes.find((entry) => entry.id === classId);
  if (!classKit) {
    throw new Error(`Missing Class Kit for ${classId}`);
  }
  const talentState = effectiveTalentState(snapshot, classId);
  const loadout = effectiveLoadout(snapshot, classId);
  const abilitiesById = new Map(content.abilities.map((ability) => [ability.id, ability]));
  const basicAbility = abilitiesById.get(classKit.basicAbilityId);
  if (!basicAbility) {
    throw new Error(`Missing basic Ability for ${classId}`);
  }
  const currentStats = statsForEquipmentLoadout(
    classKit,
    talentState,
    currentLoadout,
    snapshot.progression.armory,
    content,
  );
  const candidateStats = statsForEquipmentLoadout(
    classKit,
    talentState,
    candidateLoadout,
    snapshot.progression.armory,
    content,
  );
  const abilityChanges = compareAbilityRawChanges(
    loadout,
    basicAbility,
    currentStats,
    candidateStats,
    abilitiesById,
  );

  return { statDeltas, abilityChanges };
}
