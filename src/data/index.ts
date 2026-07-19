import type { AffixBandDef, Content } from "../core/types";
import { hunterAbilities, hunterClass } from "./classes/hunter";
import { knightAbilities, knightClass } from "./classes/knight";
import { priestAbilities, priestClass } from "./classes/priest";
import { wizardAbilities, wizardClass } from "./classes/wizard";
import { statuses } from "./statuses";

/** Cumulative Character XP thresholds from issue #5 / vertical-slice-spec §7. */
export const XP_THRESHOLDS = [0, 100, 250, 450, 650, 850] as const;

const CLASS_KIT_ABILITIES = [
  ...knightAbilities,
  ...wizardAbilities,
  ...priestAbilities,
  ...hunterAbilities,
];

const CLASS_KITS = [knightClass, wizardClass, priestClass, hunterClass];

/** Placeholder Affix bands until issue #41 lands; values match fixture Content. */
const STUB_AFFIX_BANDS: AffixBandDef[] = [
  { id: "flat-physical", tier1: [1, 3], tier2: [2, 5] },
  { id: "percent-physical-power", tier1: [0.02, 0.04], tier2: [0.03, 0.06] },
  { id: "flat-elemental", tier1: [1, 3], tier2: [2, 5] },
  { id: "percent-elemental-power", tier1: [0.02, 0.04], tier2: [0.03, 0.06] },
  { id: "flat-max-health", tier1: [5, 10], tier2: [8, 15] },
  { id: "percent-max-health", tier1: [0.02, 0.04], tier2: [0.03, 0.06] },
  { id: "flat-armor", tier1: [2, 4], tier2: [3, 6] },
  { id: "flat-elemental-resistance", tier1: [2, 4], tier2: [3, 6] },
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

/**
 * Assembles shipped Content, composing optional sibling slices when present.
 * Issues #40 and #41 extend this by passing their stage/equipment slices; until
 * then fixture stubs keep `validateContent` usable with `{ fixture: true }`.
 */
export function buildContent(
  stageSlice: StageSlice = { opponents: [], stages: [] },
  equipmentSlice: EquipmentSlice = {
    equipmentBases: [],
    affixBands: STUB_AFFIX_BANDS,
  },
): Content {
  const classKit = buildClassKitSlice();
  return {
    ...classKit,
    opponents: stageSlice.opponents,
    stages: stageSlice.stages,
    equipmentBases: equipmentSlice.equipmentBases,
    affixBands: equipmentSlice.affixBands,
  };
}

/** Default assembled Content for tests and early integration. */
export const content: Content = buildContent();
