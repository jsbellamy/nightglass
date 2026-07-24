import type { ClassKitDef, Content, TalentTierDef } from "../core/types";
import {
  hunterAbilities,
  hunterClass,
  hunterTier2,
  hunterTier2Abilities,
} from "./classes/hunter";
import {
  knightAbilities,
  knightClass,
  knightTier2,
  knightTier2Abilities,
  knightTier3,
  knightTier3Abilities,
} from "./classes/knight";
import {
  priestAbilities,
  priestClass,
  priestTier2,
  priestTier2Abilities,
  priestTier3,
  priestTier3Abilities,
} from "./classes/priest";
import {
  wizardAbilities,
  wizardClass,
  wizardTier2,
  wizardTier2Abilities,
  wizardTier3,
  wizardTier3Abilities,
} from "./classes/wizard";
import { buildEquipmentSlice } from "./equipment";
import { opponentAbilities } from "./opponents";
import { buildStageSlice } from "./stages";
import { statuses } from "./statuses";

/** Cumulative Character XP thresholds from issue #5 / vertical-slice-spec §7. */
export const XP_THRESHOLDS = [
  0, 100, 250, 450, 650, 850,
  1100, 1400, 2000, 2600, 3250, 3950,
  4700, 5500, 6400, 7400, 8500, 9700,
] as const;

const CLASS_KIT_ABILITIES = [
  ...knightAbilities,
  ...knightTier2Abilities,
  ...knightTier3Abilities,
  ...wizardAbilities,
  ...wizardTier2Abilities,
  ...wizardTier3Abilities,
  ...priestAbilities,
  ...priestTier2Abilities,
  ...priestTier3Abilities,
  ...hunterAbilities,
  ...hunterTier2Abilities,
];

const SHIPPED_ABILITIES = [...CLASS_KIT_ABILITIES, ...opponentAbilities];

function withTalentTiers(
  classKit: ClassKitDef,
  tiers: readonly TalentTierDef[],
): ClassKitDef {
  return { ...classKit, talentTiers: tiers as [TalentTierDef, ...TalentTierDef[]] };
}

const CLASS_KITS: ClassKitDef[] = [
  withTalentTiers(knightClass, [knightTier2, knightTier3]),
  withTalentTiers(wizardClass, [wizardTier2, wizardTier3]),
  withTalentTiers(priestClass, [priestTier2, priestTier3]),
  withTalentTiers(hunterClass, [hunterTier2]),
];

export interface ClassKitSlice {
  classes: Content["classes"];
  abilities: Content["abilities"];
  statuses: Content["statuses"];
  xpThresholds: Content["xpThresholds"];
}

export interface StageSlice {
  opponents: Content["opponents"];
  stages: Content["stages"];
}

export interface EquipmentSlice {
  equipmentBases: Content["equipmentBases"];
  affixBands: Content["affixBands"];
}

/** Class Kit content from issue #39. */
export function buildClassKitSlice(): ClassKitSlice {
  return {
    classes: CLASS_KITS,
    abilities: CLASS_KIT_ABILITIES,
    statuses,
    xpThresholds: [...XP_THRESHOLDS],
  };
}

/** Stage and opponent content from issue #40. */
export function buildContent(
  stageSlice: StageSlice = buildStageSlice(),
  equipmentSlice: EquipmentSlice = buildEquipmentSlice(),
): Content {
  const classKit = buildClassKitSlice();
  return {
    ...classKit,
    abilities: SHIPPED_ABILITIES,
    opponents: stageSlice.opponents,
    stages: stageSlice.stages,
    equipmentBases: equipmentSlice.equipmentBases,
    affixBands: equipmentSlice.affixBands,
  };
}

/** Default assembled Content for tests and early integration. */
export const content: Content = buildContent();
