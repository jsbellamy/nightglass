export type ClassId = "knight" | "wizard" | "priest" | "hunter";
export type DamageChannel = "physical" | "elemental";
export type Element = "fire" | "frost" | "lightning" | "light";
export type FormationSlot = "front" | "middle" | "back";

export interface Rng {
  next(): number;
}

export interface BaseStats {
  maxHealth: number;
  physical: number;
  elemental: number;
  armor: number;
  elementalResistance: number;
}

export type AbilityTargeting =
  | { kind: "closest-opponent" }
  | { kind: "all-opponents" }
  | { kind: "self" }
  | { kind: "party" }
  | { kind: "lowest-health-ally" }
  | { kind: "first-knocked-out-ally" };

export interface StatModifiers {
  flat?: Partial<BaseStats>;
  percent?: Partial<Record<"maxHealth" | "physicalPower" | "elementalPower", number>>;
}

export interface StatusEffectDef {
  id: string;
  name: string;
  kind: "buff" | "debuff" | "stun";
  durationMs: number;
  modifiers?: StatModifiers;
  tickEveryMs?: number;
  tickEffect?: AbilityEffect;
}

export interface AbilityEffect {
  kind: "damage" | "heal" | "revive" | "apply-status";
  channel?: DamageChannel;
  element?: Element;
  coefficient?: number;
  statusId?: string;
  stunMs?: number;
}

export interface AbilityDef {
  id: string;
  name: string;
  classId: ClassId;
  slot: "basic" | "core" | "talent";
  targeting: AbilityTargeting;
  effects: AbilityEffect[];
  windUpMs: number;
  recoveryMs: number;
  cooldownMs: number;
  validWhile?: "status-absent" | "any-ally-missing-health" | "below-half-health";
}

export interface StatTalentDef {
  id: string;
  name: string;
  perRank: StatModifiers;
  maxRanks: 5;
}

export interface TalentTierDef {
  statRow: [StatTalentDef, StatTalentDef];
  abilityRow: [string, string];
}

export interface ClassKitDef {
  id: ClassId;
  name: string;
  base: BaseStats;
  basicAbilityId: string;
  coreAbilityIds: [string, string, string, string];
  defaultLoadout: [string, string, string];
  talents: TalentTierDef;
}

export interface OpponentDef {
  id: string;
  name: string;
  family: string;
  boss: boolean;
  base: BaseStats;
  abilityIds: string[];
  xpAward: number;
  spriteKey: string;
}

export interface WaveDef {
  opponents: string[];
}

export interface StageDef {
  id: 1 | 2 | 3;
  name: string;
  waves: [WaveDef, WaveDef];
  boss: WaveDef;
  rarityOdds: [number, number, number, number];
  backdropKey: string;
}

export type EquipmentSlotId = "weapon" | "armor" | "charm";
export type Rarity = "common" | "uncommon" | "rare" | "epic";
export type AffixId =
  | "flat-physical"
  | "percent-physical-power"
  | "flat-elemental"
  | "percent-elemental-power"
  | "flat-max-health"
  | "percent-max-health"
  | "flat-armor"
  | "flat-elemental-resistance";

export interface EquipmentBaseDef {
  id: string;
  name: string;
  slot: EquipmentSlotId;
  tier: 1 | 2;
  weaponClass?: ClassId;
  guaranteed: StatModifiers;
  iconKey: string;
}

export interface AffixBandDef {
  id: AffixId;
  tier1: [number, number];
  tier2: [number, number];
}

export interface Content {
  classes: ClassKitDef[];
  abilities: AbilityDef[];
  statuses: StatusEffectDef[];
  opponents: OpponentDef[];
  stages: StageDef[];
  equipmentBases: EquipmentBaseDef[];
  affixBands: AffixBandDef[];
  xpThresholds: number[];
}
