import { mulberry32Step } from "./rng";
import type { DropInstance } from "./snapshot";
import type {
  AffixBandDef,
  AffixId,
  ClassId,
  Content,
  EquipmentBaseDef,
  EquipmentSlotId,
  EquipmentTier,
  ItemLevel,
  Rarity,
  StageDef,
  StatModifiers,
} from "./types";

const CLASS_IDS: ClassId[] = ["knight", "wizard", "priest", "hunter"];
const SLOT_CATEGORIES: EquipmentSlotId[] = ["weapon", "armor", "charm"];
const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic"];
const AFFIX_COUNT_BY_RARITY: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
};

const DEFENSIVE_AFFIXES: AffixId[] = [
  "flat-max-health",
  "percent-max-health",
  "flat-armor",
  "flat-elemental-resistance",
  "flat-crit-chance",
  "flat-crit-damage",
];

const ALL_AFFIXES: AffixId[] = [
  "flat-physical",
  "percent-physical-power",
  "flat-spell",
  "percent-spell-power",
  "flat-fire",
  "percent-fire-power",
  "flat-frost",
  "percent-frost-power",
  "flat-lightning",
  "percent-lightning-power",
  "flat-light",
  "percent-light-power",
  ...DEFENSIVE_AFFIXES,
];

const OFFENSIVE_AFFIXES_BY_CLASS: Record<ClassId, AffixId[]> = {
  knight: ["flat-physical", "percent-physical-power"],
  hunter: ["flat-physical", "percent-physical-power"],
  wizard: [
    "flat-spell",
    "percent-spell-power",
    "flat-fire",
    "percent-fire-power",
    "flat-frost",
    "percent-frost-power",
    "flat-lightning",
    "percent-lightning-power",
    "flat-light",
    "percent-light-power",
  ],
  priest: [
    "flat-spell",
    "percent-spell-power",
    "flat-fire",
    "percent-fire-power",
    "flat-frost",
    "percent-frost-power",
    "flat-lightning",
    "percent-lightning-power",
    "flat-light",
    "percent-light-power",
  ],
};

export interface LootRng {
  state: number;
}

export interface RollDropInput {
  content: Content;
  stage: StageDef;
  itemLevel: ItemLevel;
  lootRng: LootRng;
  dropId: number;
  awardedAtMs: number;
  uncommonFloor?: boolean;
}

export interface RollDropResult {
  drop: DropInstance;
  lootRng: LootRng;
}

function nextUniform(lootRng: LootRng): [number, LootRng] {
  const [value, state] = mulberry32Step(lootRng.state);
  return [value, { state }];
}

export function tierForItemLevel(itemLevel: ItemLevel): EquipmentTier {
  if (itemLevel <= 2) {
    return 1;
  }
  if (itemLevel === 3) {
    return 2;
  }
  if (itemLevel <= 5) {
    return 3;
  }
  if (itemLevel <= 6) {
    return 4;
  }
  return 5;
}

function rollSlotCategory(lootRng: LootRng): [EquipmentSlotId, LootRng] {
  const [roll, next] = nextUniform(lootRng);
  const index = Math.min(SLOT_CATEGORIES.length - 1, Math.floor(roll * SLOT_CATEGORIES.length));
  return [SLOT_CATEGORIES[index]!, next];
}

function rollClass(lootRng: LootRng): [ClassId, LootRng] {
  const [roll, next] = nextUniform(lootRng);
  const index = Math.min(CLASS_IDS.length - 1, Math.floor(roll * CLASS_IDS.length));
  return [CLASS_IDS[index]!, next];
}

function findEquipmentBase(
  bases: EquipmentBaseDef[],
  slot: EquipmentSlotId,
  tier: EquipmentTier,
  weaponClass?: ClassId,
): EquipmentBaseDef {
  const match = bases.find((base) => {
    if (base.slot !== slot || base.tier !== tier) {
      return false;
    }
    if (slot === "weapon") {
      return base.weaponClass === weaponClass;
    }
    return base.weaponClass === undefined;
  });
  if (!match) {
    throw new Error(
      `Missing Equipment Base for slot=${slot} tier=${tier}${weaponClass ? ` class=${weaponClass}` : ""}`,
    );
  }
  return match;
}

function rollRarity(lootRng: LootRng, odds: StageDef["rarityOdds"]): [Rarity, LootRng] {
  const [roll, next] = nextUniform(lootRng);
  const threshold = roll * 100;
  let cumulative = 0;
  for (let index = 0; index < odds.length; index += 1) {
    cumulative += odds[index] ?? 0;
    if (threshold < cumulative) {
      return [RARITIES[index]!, next];
    }
  }
  return ["epic", next];
}

function affixPoolForSlot(slot: EquipmentSlotId, weaponClass?: ClassId): AffixId[] {
  if (slot === "armor") {
    return [...DEFENSIVE_AFFIXES];
  }
  if (slot === "charm") {
    return [...ALL_AFFIXES];
  }
  if (!weaponClass) {
    throw new Error("Weapon Drops require a Class");
  }
  return [...OFFENSIVE_AFFIXES_BY_CLASS[weaponClass], ...DEFENSIVE_AFFIXES];
}

function affixBandFor(
  bands: AffixBandDef[],
  affixId: AffixId,
  tier: EquipmentTier,
): [number, number] {
  const band = bands.find((entry) => entry.id === affixId);
  if (!band) {
    throw new Error(`Missing Affix band for ${affixId} at Equipment Tier ${tier}`);
  }
  switch (tier) {
    case 1:
      return band.tier1;
    case 2:
      return band.tier2;
    case 3: {
      if (!band.tier3) {
        throw new Error(`Missing Affix band for ${affixId} at Equipment Tier 3`);
      }
      return band.tier3;
    }
    case 4: {
      if (!band.tier4) {
        throw new Error(`Missing Affix band for ${affixId} at Equipment Tier 4`);
      }
      return band.tier4;
    }
    case 5: {
      if (!band.tier5) {
        throw new Error(`Missing Affix band for ${affixId} at Equipment Tier 5`);
      }
      return band.tier5;
    }
    default:
      throw new Error(`Missing Affix band for ${affixId} at Equipment Tier ${tier}`);
  }
}

function rollBandValue(
  band: [number, number],
  affixId: AffixId,
  uniform: number,
): number {
  const [min, max] = band;
  if (
    (affixId.includes("percent") ||
      affixId === "flat-crit-chance" ||
      affixId === "flat-crit-damage") &&
    min >= 1
  ) {
    const rolled = min + Math.floor(uniform * (max - min + 1));
    return rolled / 100;
  }
  if (Number.isInteger(min) && Number.isInteger(max)) {
    return min + Math.floor(uniform * (max - min + 1));
  }
  const minC = Math.round(min * 100);
  const maxC = Math.round(max * 100);
  return (minC + Math.floor(uniform * (maxC - minC + 1))) / 100;
}

function rollAffixes(
  lootRng: LootRng,
  content: Content,
  slot: EquipmentSlotId,
  tier: EquipmentTier,
  rarity: Rarity,
  weaponClass?: ClassId,
): [{ id: AffixId; value: number }[], LootRng] {
  const count = AFFIX_COUNT_BY_RARITY[rarity];
  if (count === 0) {
    return [[], lootRng];
  }

  let rng = lootRng;
  const pool = [...affixPoolForSlot(slot, weaponClass)];
  const affixes: { id: AffixId; value: number }[] = [];

  for (let index = 0; index < count; index += 1) {
    const [pickRoll, afterPick] = nextUniform(rng);
    rng = afterPick;
    const pickIndex = Math.min(pool.length - 1, Math.floor(pickRoll * pool.length));
    const affixId = pool.splice(pickIndex, 1)[0]!;

    const [valueRoll, afterValue] = nextUniform(rng);
    rng = afterValue;
    const value = rollBandValue(affixBandFor(content.affixBands, affixId, tier), affixId, valueRoll);
    affixes.push({ id: affixId, value });
  }

  return [affixes, rng];
}

function rollDropPrefix(lootRng: LootRng): [
  { slot: EquipmentSlotId; weaponClass?: ClassId | undefined },
  LootRng,
] {
  let rng = lootRng;
  const [slot, afterSlot] = rollSlotCategory(rng);
  rng = afterSlot;

  let weaponClass: ClassId | undefined;
  if (slot === "weapon") {
    const [pickedClass, afterClass] = rollClass(rng);
    weaponClass = pickedClass;
    rng = afterClass;
  }

  return [{ slot, weaponClass }, rng];
}

function completeDropRoll(input: {
  content: Content;
  itemLevel: ItemLevel;
  rarity: Rarity;
  lootRng: LootRng;
  dropId: number;
  awardedAtMs: number;
  slot: EquipmentSlotId;
  weaponClass?: ClassId | undefined;
}): RollDropResult {
  const tier = tierForItemLevel(input.itemLevel);
  const base = findEquipmentBase(
    input.content.equipmentBases,
    input.slot,
    tier,
    input.weaponClass,
  );

  const [affixes, afterAffixes] = rollAffixes(
    input.lootRng,
    input.content,
    input.slot,
    tier,
    input.rarity,
    input.weaponClass,
  );

  return {
    drop: {
      dropId: input.dropId,
      baseId: base.id,
      itemLevel: input.itemLevel,
      rarity: input.rarity,
      affixes,
      awardedAtMs: input.awardedAtMs,
      seen: false,
      locked: false,
      assignedTo: null,
    },
    lootRng: afterAffixes,
  };
}

export function rollDrop(input: RollDropInput): RollDropResult {
  const [prefix, afterPrefix] = rollDropPrefix(input.lootRng);

  const [rarity, afterRarity] = rollRarity(afterPrefix, input.stage.rarityOdds);

  let resolvedRarity = rarity;
  if (input.uncommonFloor && resolvedRarity === "common") {
    resolvedRarity = "uncommon";
  }

  return completeDropRoll({
    content: input.content,
    itemLevel: input.itemLevel,
    rarity: resolvedRarity,
    lootRng: afterRarity,
    dropId: input.dropId,
    awardedAtMs: input.awardedAtMs,
    slot: prefix.slot,
    weaponClass: prefix.weaponClass,
  });
}

export function nextRarity(rarity: Rarity): Rarity | null {
  switch (rarity) {
    case "common":
      return "uncommon";
    case "uncommon":
      return "rare";
    case "rare":
      return "epic";
    case "epic":
      return null;
    default:
      throw new Error(`Unknown Rarity ${String(rarity)}`);
  }
}

export const SALVAGE_BATCH_SIZE = 10;

const SALVAGE_INPUT_RARITIES: Rarity[] = ["common", "uncommon", "rare"];

function sortSalvageCandidates(drops: readonly DropInstance[]): DropInstance[] {
  return [...drops].sort((left, right) => {
    if (left.itemLevel !== right.itemLevel) {
      return right.itemLevel - left.itemLevel;
    }
    if (left.awardedAtMs !== right.awardedAtMs) {
      return left.awardedAtMs - right.awardedAtMs;
    }
    return left.dropId - right.dropId;
  });
}

export function salvageEligibleAtRarity(
  armory: readonly DropInstance[],
  rarity: Rarity,
): DropInstance[] {
  if (rarity === "epic") {
    return [];
  }
  return sortSalvageCandidates(
    armory.filter(
      (drop) => drop.assignedTo === null && !drop.locked && drop.rarity === rarity,
    ),
  );
}

export function selectSalvageBatchForRarity(
  armory: DropInstance[],
  rarity: Rarity,
): { rarity: Rarity; dropIds: number[] } | null {
  const sorted = salvageEligibleAtRarity(armory, rarity);
  if (sorted.length < SALVAGE_BATCH_SIZE) {
    return null;
  }
  return {
    rarity,
    dropIds: sorted.slice(0, SALVAGE_BATCH_SIZE).map((drop) => drop.dropId),
  };
}

export function selectSalvageBatch(
  armory: DropInstance[],
): { rarity: Rarity; dropIds: number[] } | null {
  for (const rarity of SALVAGE_INPUT_RARITIES) {
    const batch = selectSalvageBatchForRarity(armory, rarity);
    if (batch) {
      return batch;
    }
  }

  return null;
}

export interface RollSalvageDropInput {
  content: Content;
  itemLevel: ItemLevel;
  rarity: Rarity;
  lootRng: LootRng;
  dropId: number;
  awardedAtMs: number;
}

export function rollSalvageDrop(input: RollSalvageDropInput): RollDropResult {
  const [prefix, afterPrefix] = rollDropPrefix(input.lootRng);

  return completeDropRoll({
    content: input.content,
    itemLevel: input.itemLevel,
    rarity: input.rarity,
    lootRng: afterPrefix,
    dropId: input.dropId,
    awardedAtMs: input.awardedAtMs,
    slot: prefix.slot,
    weaponClass: prefix.weaponClass,
  });
}

/** The one Affix → statistic mapping. Display formatters read it rather than restating it. */
export function affixToModifier(affix: { id: AffixId; value: number }): StatModifiers {
  switch (affix.id) {
    case "flat-physical":
      return { flat: { physical: affix.value } };
    case "percent-physical-power":
      return { percent: { physicalPower: affix.value } };
    case "flat-spell":
      return { flat: { spell: affix.value } };
    case "percent-spell-power":
      return { percent: { spellPower: affix.value } };
    case "flat-fire":
      return { flat: { firePower: affix.value } };
    case "percent-fire-power":
      return { percent: { firePower: affix.value } };
    case "flat-frost":
      return { flat: { frostPower: affix.value } };
    case "percent-frost-power":
      return { percent: { frostPower: affix.value } };
    case "flat-lightning":
      return { flat: { lightningPower: affix.value } };
    case "percent-lightning-power":
      return { percent: { lightningPower: affix.value } };
    case "flat-light":
      return { flat: { lightPower: affix.value } };
    case "percent-light-power":
      return { percent: { lightPower: affix.value } };
    case "flat-max-health":
      return { flat: { maxHealth: affix.value } };
    case "percent-max-health":
      return { percent: { maxHealth: affix.value } };
    case "flat-armor":
      return { flat: { armor: affix.value } };
    case "flat-elemental-resistance":
      return { flat: { elementalResistance: affix.value } };
    case "flat-crit-chance":
      return { flat: { critChance: affix.value } };
    case "flat-crit-damage":
      return { flat: { critDamage: affix.value } };
    default:
      throw new Error(`Unknown Affix ${String(affix.id)}`);
  }
}

export function dropStatModifiers(
  drop: DropInstance,
  equipmentBasesById: Map<string, EquipmentBaseDef>,
): StatModifiers[] {
  const base = equipmentBasesById.get(drop.baseId);
  if (!base) {
    throw new Error(`Missing Equipment Base ${drop.baseId}`);
  }
  return [base.guaranteed, ...drop.affixes.map(affixToModifier)];
}

function equipmentBasesMapFromContent(content: Content): Map<string, EquipmentBaseDef> {
  return new Map(content.equipmentBases.map((entry) => [entry.id, entry]));
}

export function equipmentModifiersForLoadout(
  loadout: Partial<Record<EquipmentSlotId, number>>,
  armory: DropInstance[],
  content: Content,
): StatModifiers[] {
  const equipmentBasesById = equipmentBasesMapFromContent(content);
  const modifiers: StatModifiers[] = [];
  for (const slot of SLOT_CATEGORIES) {
    const dropId = loadout[slot];
    if (dropId === undefined) {
      continue;
    }
    const drop = armory.find((entry) => entry.dropId === dropId);
    if (!drop) {
      throw new Error(`Missing Drop ${dropId} in Armory`);
    }
    modifiers.push(...dropStatModifiers(drop, equipmentBasesById));
  }
  return modifiers;
}

export function snapshotEquipmentLoadouts(
  armory: DropInstance[],
  roster: ClassId[],
): Record<ClassId, Partial<Record<EquipmentSlotId, number>>> {
  const loadouts = Object.fromEntries(roster.map((classId) => [classId, {}])) as Record<
    ClassId,
    Partial<Record<EquipmentSlotId, number>>
  >;
  for (const drop of armory) {
    if (!drop.assignedTo) {
      continue;
    }
    const { classId, slot } = drop.assignedTo;
    loadouts[classId] ??= {};
    loadouts[classId]![slot] = drop.dropId;
  }
  return loadouts;
}

export function findDrop(
  armory: readonly DropInstance[],
  dropId: number,
  index?: ReadonlyMap<number, DropInstance>,
): DropInstance | undefined {
  if (index) {
    return index.get(dropId);
  }
  return armory.find((entry) => entry.dropId === dropId);
}

export function equipViolation(
  drop: DropInstance,
  equipmentBasesById: Map<string, EquipmentBaseDef>,
  classId: ClassId,
  slot: EquipmentSlotId,
): string | null {
  const base = equipmentBasesById.get(drop.baseId);
  if (!base) {
    return `Missing Equipment Base ${drop.baseId}`;
  }
  if (base.slot !== slot) {
    return `Drop ${drop.dropId} is not compatible with slot ${slot}`;
  }
  if (base.slot === "weapon" && base.weaponClass !== classId) {
    return `Weapon Drop ${drop.dropId} is restricted to Class ${base.weaponClass}`;
  }
  return null;
}

export function canEquipToSlot(
  drop: DropInstance,
  content: Content,
  classId: ClassId,
  slot: EquipmentSlotId,
): boolean {
  return equipViolation(drop, equipmentBasesMapFromContent(content), classId, slot) === null;
}

export function validateEquip(
  drop: DropInstance,
  content: Content,
  classId: ClassId,
  slot: EquipmentSlotId,
): void {
  const violation = equipViolation(drop, equipmentBasesMapFromContent(content), classId, slot);
  if (violation) {
    throw new Error(violation);
  }
}

export function assignDrop(
  armory: readonly DropInstance[],
  dropId: number,
  classId: ClassId,
  slot: EquipmentSlotId,
  index?: ReadonlyMap<number, DropInstance>,
): DropInstance[] {
  const drop = findDrop(armory, dropId, index);
  if (!drop) {
    throw new Error(`Unknown Drop ${dropId}`);
  }

  const copyIds = new Set<number>([dropId]);
  for (const other of armory) {
    if (other.assignedTo?.classId === classId && other.assignedTo.slot === slot) {
      copyIds.add(other.dropId);
    }
  }

  return armory.map((entry) => {
    if (!copyIds.has(entry.dropId)) {
      return entry as DropInstance;
    }
    if (entry.dropId === dropId) {
      return { ...entry, assignedTo: { classId, slot } };
    }
    return { ...entry, assignedTo: null };
  });
}

export function unequipSlot(
  armory: readonly DropInstance[],
  classId: ClassId,
  slot: EquipmentSlotId,
): DropInstance[] {
  const copyIds = new Set<number>();
  for (const drop of armory) {
    if (drop.assignedTo?.classId === classId && drop.assignedTo.slot === slot) {
      copyIds.add(drop.dropId);
    }
  }
  if (copyIds.size === 0) {
    return armory as DropInstance[];
  }
  return armory.map((entry) =>
    copyIds.has(entry.dropId) ? { ...entry, assignedTo: null } : (entry as DropInstance),
  );
}

export function discardDrops(
  armory: readonly DropInstance[],
  dropIds: number[],
  index?: ReadonlyMap<number, DropInstance>,
): DropInstance[] {
  const toDiscard = new Set(dropIds);
  for (const dropId of dropIds) {
    const drop = findDrop(armory, dropId, index);
    if (!drop) {
      throw new Error(`Unknown Drop ${dropId}`);
    }
    if (drop.assignedTo) {
      throw new Error(`Cannot discard equipped Drop ${dropId}`);
    }
    if (drop.locked) {
      throw new Error(`Cannot discard Locked Drop ${dropId}`);
    }
  }
  return armory.filter((drop) => !toDiscard.has(drop.dropId)) as DropInstance[];
}
