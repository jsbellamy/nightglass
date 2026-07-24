import type { DropInstance, ProgressionState, Snapshot, AttemptState } from "./snapshot";
import {
  defaultTalentsForClasses,
  emptyTalentState,
  normalizeClassTalentState,
  talentTierDefs,
  type TierTalentState,
} from "./talents";
import type { ClassId, ClassKitDef, Content, EquipmentSlotId, ItemLevel, StageId, TalentTierDef } from "./types";

/** Matches `SCHEMA_VERSION` in engine.ts — single integer save schema for the slice. */
export const SAVE_SCHEMA_VERSION = 1;

const CLASS_IDS = new Set<ClassId>(["knight", "wizard", "priest", "hunter"]);
const STAGE_IDS = new Set<StageId>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const RARITIES = new Set(["common", "uncommon", "rare", "epic"]);
const EQUIPMENT_SLOTS = new Set<EquipmentSlotId>(["weapon", "armor", "charm"]);

export type ParsedSave =
  | { kind: "exact"; snapshot: Snapshot }
  | { kind: "tolerant"; snapshot: Snapshot }
  | { kind: "fresh" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function field(raw: Record<string, unknown>, key: string): unknown {
  return raw[key];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isClassId(value: unknown): value is ClassId {
  return typeof value === "string" && CLASS_IDS.has(value as ClassId);
}

function isStageId(value: unknown): value is StageId {
  return typeof value === "number" && Number.isInteger(value) && STAGE_IDS.has(value as StageId);
}

function isItemLevel(value: unknown): value is ItemLevel {
  return isStageId(value);
}

export function createDefaultProgression(content: Content): ProgressionState {
  const roster = content.classes.map((entry) => entry.id);
  if (roster.length === 0) {
    throw new Error("Content must define at least one Class Kit");
  }
  const pick = (index: number): ClassId => roster[index % roster.length]!;
  const characterXp = Object.fromEntries(roster.map((classId) => [classId, 0])) as Record<
    ClassId,
    number
  >;
  const defaultLoadouts = Object.fromEntries(
    content.classes.map((entry) => [entry.id, [...entry.defaultLoadout] as [string, string, string]]),
  ) as Record<ClassId, [string, string, string]>;
  return {
    unlockedStage: 1,
    party: [pick(0), pick(1), pick(2)],
    reserve: pick(3),
    characterXp,
    talents: defaultTalentsForClasses(content.classes),
    loadouts: defaultLoadouts,
    armory: [],
    pendingParty: null,
  };
}

function loadPartyTriple(raw: unknown, fallback: [ClassId, ClassId, ClassId]): [ClassId, ClassId, ClassId] {
  if (!Array.isArray(raw) || raw.length !== 3) {
    return fallback;
  }
  const members = raw.map((entry) => (isClassId(entry) ? entry : null));
  if (members.some((entry) => entry === null)) {
    return fallback;
  }
  const unique = new Set(members);
  if (unique.size !== 3) {
    return fallback;
  }
  return members as [ClassId, ClassId, ClassId];
}

function loadCharacterXp(
  raw: unknown,
  defaults: Record<ClassId, number>,
): Record<ClassId, number> {
  const merged = { ...defaults };
  if (!isRecord(raw)) {
    return merged;
  }
  for (const classId of CLASS_IDS) {
    const value = field(raw, classId);
    if (isFiniteNumber(value) && value >= 0) {
      merged[classId] = Math.floor(value);
    }
  }
  return merged;
}

function loadLoadouts(
  raw: unknown,
  defaults: Record<ClassId, [string, string, string]>,
): Record<ClassId, [string, string, string]> {
  const merged = structuredClone(defaults);
  if (!isRecord(raw)) {
    return merged;
  }
  for (const classId of CLASS_IDS) {
    const entry = field(raw, classId);
    if (!Array.isArray(entry) || entry.length !== 3) {
      continue;
    }
    if (entry.every((abilityId) => typeof abilityId === "string")) {
      merged[classId] = [entry[0]!, entry[1]!, entry[2]!];
    }
  }
  return merged;
}

function parseTierFromRaw(
  raw: Record<string, unknown> | undefined,
  tierDef: TalentTierDef,
  emptyTier: TierTalentState,
): TierTalentState {
  const statRanks: Record<string, number> = { ...emptyTier.statRanks };
  if (raw) {
    const statRanksRaw = field(raw, "statRanks");
    if (isRecord(statRanksRaw)) {
      for (const [talentId, rank] of Object.entries(statRanksRaw)) {
        if (isFiniteNumber(rank) && rank >= 0) {
          statRanks[talentId] = Math.floor(rank);
        }
      }
    }
  }

  let abilityTalentId = emptyTier.abilityTalentId;
  if (raw) {
    const abilityRaw = field(raw, "abilityTalentId");
    if (abilityRaw === null) {
      abilityTalentId = null;
    } else if (typeof abilityRaw === "string" && tierDef.abilityRow.includes(abilityRaw)) {
      abilityTalentId = abilityRaw;
    }
  }

  return { statRanks, abilityTalentId };
}

function loadTalents(
  raw: unknown,
  defaults: ProgressionState["talents"],
  classes: ClassKitDef[],
): ProgressionState["talents"] {
  const merged = structuredClone(defaults);

  for (const classKit of classes) {
    const classId = classKit.id;
    const tierDefs = talentTierDefs(classKit);
    const empty = emptyTalentState(classKit);
    const entry = isRecord(raw) ? field(raw, classId) : undefined;

    if (!isRecord(entry)) {
      merged[classId] = normalizeClassTalentState(classKit, merged[classId]!);
      continue;
    }

    const tierStates: TierTalentState[] = [];
    const tierStatesRaw = field(entry, "tierStates");

    if (Array.isArray(tierStatesRaw)) {
      for (let tierIndex = 0; tierIndex < tierDefs.length; tierIndex += 1) {
        const tierDef = tierDefs[tierIndex]!;
        const emptyTier = empty.tierStates[tierIndex]!;
        const tierRaw = tierStatesRaw[tierIndex];
        tierStates.push(
          parseTierFromRaw(isRecord(tierRaw) ? tierRaw : undefined, tierDef, emptyTier),
        );
      }
    } else {
      tierStates.push(parseTierFromRaw(entry, tierDefs[0]!, empty.tierStates[0]!));
      for (let tierIndex = 1; tierIndex < tierDefs.length; tierIndex += 1) {
        tierStates.push({
          statRanks: { ...empty.tierStates[tierIndex]!.statRanks },
          abilityTalentId: empty.tierStates[tierIndex]!.abilityTalentId,
        });
      }
    }

    merged[classId] = normalizeClassTalentState(classKit, {
      statRanks: tierStates[0]!.statRanks,
      abilityTalentId: tierStates[0]!.abilityTalentId,
      tierStates,
    });
  }

  return merged;
}

function loadDropInstance(raw: unknown): DropInstance | null {
  if (!isRecord(raw)) {
    return null;
  }
  const dropId = field(raw, "dropId");
  const baseId = field(raw, "baseId");
  const itemLevel = field(raw, "itemLevel");
  const rarity = field(raw, "rarity");
  const awardedAtMs = field(raw, "awardedAtMs");
  const seen = field(raw, "seen");
  const locked = field(raw, "locked");
  const affixesRaw = field(raw, "affixes");
  if (
    !isFiniteNumber(dropId) ||
    typeof baseId !== "string" ||
    !isItemLevel(itemLevel) ||
    !RARITIES.has(rarity as DropInstance["rarity"]) ||
    !isFiniteNumber(awardedAtMs) ||
    typeof seen !== "boolean" ||
    typeof locked !== "boolean" ||
    !Array.isArray(affixesRaw)
  ) {
    return null;
  }
  const affixes: DropInstance["affixes"] = [];
  for (const affix of affixesRaw) {
    if (!isRecord(affix)) {
      return null;
    }
    const affixId = field(affix, "id");
    const affixValue = field(affix, "value");
    if (typeof affixId !== "string" || !isFiniteNumber(affixValue)) {
      return null;
    }
    affixes.push({ id: affixId as DropInstance["affixes"][number]["id"], value: affixValue });
  }
  let assignedTo: DropInstance["assignedTo"] = null;
  const assignedRaw = field(raw, "assignedTo");
  if (assignedRaw !== null) {
    if (!isRecord(assignedRaw)) {
      return null;
    }
    const classId = field(assignedRaw, "classId");
    const slot = field(assignedRaw, "slot");
    if (!isClassId(classId) || !EQUIPMENT_SLOTS.has(slot as EquipmentSlotId)) {
      return null;
    }
    assignedTo = {
      classId,
      slot: slot as EquipmentSlotId,
    };
  }
  return {
    dropId: Math.floor(dropId),
    baseId,
    itemLevel,
    rarity: rarity as DropInstance["rarity"],
    affixes,
    awardedAtMs: Math.floor(awardedAtMs),
    seen,
    locked,
    assignedTo,
  };
}

function loadArmory(raw: unknown): DropInstance[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const drops: DropInstance[] = [];
  for (const entry of raw) {
    const drop = loadDropInstance(entry);
    if (drop) {
      drops.push(drop);
    }
  }
  return drops;
}

function loadPendingParty(
  raw: unknown,
  fallbackParty: [ClassId, ClassId, ClassId],
  fallbackReserve: ClassId,
): ProgressionState["pendingParty"] {
  if (raw === null) {
    return null;
  }
  if (!isRecord(raw)) {
    return null;
  }
  const members = loadPartyTriple(field(raw, "members"), fallbackParty);
  const reserveRaw = field(raw, "reserve");
  const reserve = isClassId(reserveRaw) ? reserveRaw : fallbackReserve;
  const roster = new Set([...members, reserve]);
  if (roster.size !== 4) {
    return null;
  }
  return { members, reserve };
}

export function recoverDurableProgression(
  raw: unknown,
  content: Content,
): ProgressionState | null {
  if (!isRecord(raw)) {
    return null;
  }
  const defaults = createDefaultProgression(content);
  const party = loadPartyTriple(field(raw, "party"), defaults.party);
  const reserveRaw = field(raw, "reserve");
  const reserve = isClassId(reserveRaw) ? reserveRaw : defaults.reserve;
  const roster = new Set([...party, reserve]);
  if (roster.size !== 4) {
    return null;
  }
  for (const classId of roster) {
    if (!content.classes.some((entry) => entry.id === classId)) {
      return null;
    }
  }
  const unlockedRaw = field(raw, "unlockedStage");
  const unlockedStage = isStageId(unlockedRaw) ? unlockedRaw : defaults.unlockedStage;
  return {
    unlockedStage,
    party,
    reserve,
    characterXp: loadCharacterXp(field(raw, "characterXp"), defaults.characterXp),
    talents: loadTalents(field(raw, "talents"), defaults.talents, content.classes),
    loadouts: loadLoadouts(field(raw, "loadouts"), defaults.loadouts),
    armory: loadArmory(field(raw, "armory")),
    pendingParty: loadPendingParty(field(raw, "pendingParty"), party, reserve),
  };
}

function loadPositiveInt(raw: unknown, fallback: number): number {
  return isFiniteNumber(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

function isValidAttempt(raw: unknown): raw is AttemptState {
  if (!isRecord(raw)) {
    return false;
  }
  const encounter = field(raw, "encounter");
  const phase = field(raw, "phase");
  if (
    !isFiniteNumber(field(raw, "id")) ||
    !isStageId(field(raw, "stage")) ||
    !isFiniteNumber(encounter) ||
    encounter < 1 ||
    !Number.isInteger(encounter) ||
    !["fighting", "wave-transition", "defeat-hold"].includes(phase as string) ||
    !Array.isArray(field(raw, "combatants"))
  ) {
    return false;
  }
  return true;
}

function isExactSnapshot(raw: Record<string, unknown>): boolean {
  if (field(raw, "schemaVersion") !== SAVE_SCHEMA_VERSION) {
    return false;
  }
  if (!isRecord(field(raw, "progression"))) {
    return false;
  }
  const attempt = field(raw, "attempt");
  if (attempt !== null && attempt !== undefined && !isValidAttempt(attempt)) {
    return false;
  }
  if (
    !isFiniteNumber(field(raw, "savedAtMs")) ||
    !isFiniteNumber(field(raw, "simNowMs")) ||
    !isFiniteNumber(field(raw, "lootRngState")) ||
    !isFiniteNumber(field(raw, "nextEventSeq")) ||
    !isFiniteNumber(field(raw, "nextAttemptId")) ||
    !isFiniteNumber(field(raw, "nextDropId")) ||
    !Array.isArray(field(raw, "pendingEdits"))
  ) {
    return false;
  }
  return true;
}

function loadPendingEdits(raw: unknown): Snapshot["pendingEdits"] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return structuredClone(raw) as Snapshot["pendingEdits"];
}

function buildSnapshotFromRaw(
  raw: Record<string, unknown>,
  progression: ProgressionState,
  attempt: AttemptState | null,
  pendingEdits: Snapshot["pendingEdits"],
): Snapshot {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAtMs: loadPositiveInt(field(raw, "savedAtMs"), 0),
    simNowMs: loadPositiveInt(field(raw, "simNowMs"), 0),
    lootRngState: loadPositiveInt(field(raw, "lootRngState"), 0),
    nextEventSeq: Math.max(1, loadPositiveInt(field(raw, "nextEventSeq"), 1)),
    nextAttemptId: Math.max(1, loadPositiveInt(field(raw, "nextAttemptId"), 1)),
    nextDropId: Math.max(1, loadPositiveInt(field(raw, "nextDropId"), 1)),
    progression,
    attempt,
    pendingEdits,
  };
}

export function parseStoredSave(raw: string | null, content: Content): ParsedSave {
  if (raw === null || raw.trim() === "") {
    return { kind: "fresh" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("nightglass-save-v1: corrupt save JSON; starting a new game");
    return { kind: "fresh" };
  }

  if (!isRecord(parsed)) {
    console.error("nightglass-save-v1: unreadable save; starting a new game");
    return { kind: "fresh" };
  }

  const progression = recoverDurableProgression(field(parsed, "progression"), content);
  if (!progression) {
    console.error("nightglass-save-v1: unreadable progression; starting a new game");
    return { kind: "fresh" };
  }

  const exactShape =
    field(parsed, "schemaVersion") === SAVE_SCHEMA_VERSION && isExactSnapshot(parsed);
  if (exactShape) {
    const attemptRaw = field(parsed, "attempt");
    const attempt =
      attemptRaw === null || attemptRaw === undefined
        ? null
        : structuredClone(attemptRaw as AttemptState);
    return {
      kind: "exact",
      snapshot: buildSnapshotFromRaw(
        parsed,
        progression,
        attempt,
        loadPendingEdits(field(parsed, "pendingEdits")),
      ),
    };
  }

  return {
    kind: "tolerant",
    snapshot: buildSnapshotFromRaw(parsed, progression, null, []),
  };
}
