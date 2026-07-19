import type { Content } from "../core/types";
import { hunterAbilities, hunterClass } from "./classes/hunter";
import { knightAbilities, knightClass } from "./classes/knight";
import { priestAbilities, priestClass } from "./classes/priest";
import { wizardAbilities, wizardClass } from "./classes/wizard";
import { buildEquipmentSlice } from "./equipment";
import { opponentAbilities } from "./opponents";
import { buildStageSlice } from "./stages";
import { statuses } from "./statuses";

/** Cumulative Character XP thresholds from issue #5 / vertical-slice-spec §7. */
export const XP_THRESHOLDS = [0, 100, 250, 450, 650, 850] as const;

const CLASS_KIT_ABILITIES = [
  ...knightAbilities,
  ...wizardAbilities,
  ...priestAbilities,
  ...hunterAbilities,
];

const SHIPPED_ABILITIES = [...CLASS_KIT_ABILITIES, ...opponentAbilities];

const CLASS_KITS = [knightClass, wizardClass, priestClass, hunterClass];

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
