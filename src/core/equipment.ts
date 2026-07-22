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
];

const ALL_AFFIXES: AffixId[] = [
  "flat-physical",
  "percent-physical-power",
  "flat-elemental",
  "percent-elemental-power",
  ...DEFENSIVE_AFFIXES,
];

const OFFENSIVE_AFFIXES_BY_CLASS: Record<ClassId, [AffixId, AffixId]> = {
  knight: ["flat-physical", "percent-physical-power"],
  hunter: ["flat-physical", "percent-physical-power"],
  wizard: ["flat-elemental", "percent-elemental-power"],
  priest: ["flat-elemental", "percent-elemental-power"],
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
  return 4;
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
  if (affixId.includes("percent") && min >= 1) {
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

export function rollDrop(input: RollDropInput): RollDropResult {
  let lootRng = input.lootRng;

  const [slot, afterSlot] = rollSlotCategory(lootRng);
  lootRng = afterSlot;

  let weaponClass: ClassId | undefined;
  if (slot === "weapon") {
    const [pickedClass, afterClass] = rollClass(lootRng);
    weaponClass = pickedClass;
    lootRng = afterClass;
  }

  const tier = tierForItemLevel(input.itemLevel);
  const base = findEquipmentBase(input.content.equipmentBases, slot, tier, weaponClass);

  const [rarity, afterRarity] = rollRarity(lootRng, input.stage.rarityOdds);
  lootRng = afterRarity;

  let resolvedRarity = rarity;
  if (input.uncommonFloor && resolvedRarity === "common") {
    resolvedRarity = "uncommon";
  }

  const [affixes, afterAffixes] = rollAffixes(
    lootRng,
    input.content,
    slot,
    tier,
    resolvedRarity,
    weaponClass,
  );
  lootRng = afterAffixes;

  return {
    drop: {
      dropId: input.dropId,
      baseId: base.id,
      itemLevel: input.itemLevel,
      rarity: resolvedRarity,
      affixes,
      awardedAtMs: input.awardedAtMs,
      seen: false,
      locked: false,
      assignedTo: null,
    },
    lootRng,
  };
}

function affixToModifier(affix: { id: AffixId; value: number }): StatModifiers {
  switch (affix.id) {
    case "flat-physical":
      return { flat: { physical: affix.value } };
    case "percent-physical-power":
      return { percent: { physicalPower: affix.value } };
    case "flat-elemental":
      return { flat: { elemental: affix.value } };
    case "percent-elemental-power":
      return { percent: { elementalPower: affix.value } };
    case "flat-max-health":
      return { flat: { maxHealth: affix.value } };
    case "percent-max-health":
      return { percent: { maxHealth: affix.value } };
    case "flat-armor":
      return { flat: { armor: affix.value } };
    case "flat-elemental-resistance":
      return { flat: { elementalResistance: affix.value } };
    default:
      throw new Error(`Unknown Affix ${String(affix.id)}`);
  }
}

export function dropStatModifiers(drop: DropInstance, content: Content): StatModifiers[] {
  const base = content.equipmentBases.find((entry) => entry.id === drop.baseId);
  if (!base) {
    throw new Error(`Missing Equipment Base ${drop.baseId}`);
  }
  return [base.guaranteed, ...drop.affixes.map(affixToModifier)];
}

export function equipmentModifiersForLoadout(
  loadout: Partial<Record<EquipmentSlotId, number>>,
  armory: DropInstance[],
  content: Content,
): StatModifiers[] {
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
    modifiers.push(...dropStatModifiers(drop, content));
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

export function findDrop(armory: DropInstance[], dropId: number): DropInstance | undefined {
  return armory.find((entry) => entry.dropId === dropId);
}

export function equipViolation(
  drop: DropInstance,
  content: Content,
  classId: ClassId,
  slot: EquipmentSlotId,
): string | null {
  const base = content.equipmentBases.find((entry) => entry.id === drop.baseId);
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
  return equipViolation(drop, content, classId, slot) === null;
}

export function validateEquip(
  drop: DropInstance,
  content: Content,
  classId: ClassId,
  slot: EquipmentSlotId,
): void {
  const violation = equipViolation(drop, content, classId, slot);
  if (violation) {
    throw new Error(violation);
  }
}

export function assignDrop(
  armory: DropInstance[],
  dropId: number,
  classId: ClassId,
  slot: EquipmentSlotId,
): void {
  const drop = findDrop(armory, dropId);
  if (!drop) {
    throw new Error(`Unknown Drop ${dropId}`);
  }

  if (drop.assignedTo) {
    drop.assignedTo = null;
  }

  for (const other of armory) {
    if (other.assignedTo?.classId === classId && other.assignedTo.slot === slot) {
      other.assignedTo = null;
    }
  }

  drop.assignedTo = { classId, slot };
}

export function unequipSlot(armory: DropInstance[], classId: ClassId, slot: EquipmentSlotId): void {
  for (const drop of armory) {
    if (drop.assignedTo?.classId === classId && drop.assignedTo.slot === slot) {
      drop.assignedTo = null;
    }
  }
}

export function discardDrops(armory: DropInstance[], dropIds: number[]): DropInstance[] {
  const toDiscard = new Set(dropIds);
  for (const dropId of dropIds) {
    const drop = findDrop(armory, dropId);
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
  return armory.filter((drop) => !toDiscard.has(drop.dropId));
}
