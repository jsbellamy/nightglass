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
} from "./classes/knight";
import {
  priestAbilities,
  priestClass,
  priestTier2,
  priestTier2Abilities,
} from "./classes/priest";
import {
  wizardAbilities,
  wizardClass,
  wizardTier2,
  wizardTier2Abilities,
} from "./classes/wizard";
import { buildEquipmentSlice } from "./equipment";
import { opponentAbilities } from "./opponents";
import { buildStageSlice } from "./stages";
import { statuses } from "./statuses";

/** Cumulative Character XP thresholds from issue #5 / vertical-slice-spec §7. */
export const XP_THRESHOLDS = [0, 100, 250, 450, 650, 850] as const;

const CLASS_KIT_ABILITIES = [
  ...knightAbilities,
  ...knightTier2Abilities,
  ...wizardAbilities,
  ...wizardTier2Abilities,
  ...priestAbilities,
  ...priestTier2Abilities,
  ...hunterAbilities,
  ...hunterTier2Abilities,
];

const SHIPPED_ABILITIES = [...CLASS_KIT_ABILITIES, ...opponentAbilities];

function withTalentTierTwo(
  classKit: ClassKitDef,
  tierTwo: TalentTierDef,
): ClassKitDef {
  return { ...classKit, talentTiers: [tierTwo] };
}

const CLASS_KITS: ClassKitDef[] = [
  withTalentTierTwo(knightClass, knightTier2),
  withTalentTierTwo(wizardClass, wizardTier2),
  withTalentTierTwo(priestClass, priestTier2),
  withTalentTierTwo(hunterClass, hunterTier2),
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
