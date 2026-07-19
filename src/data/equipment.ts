import type { AffixBandDef, EquipmentBaseDef } from "../core/types";

/** Affix roll bands from issue #8 / vertical-slice-spec §8. Percent values are integers meaning %. */
export const AFFIX_BANDS: AffixBandDef[] = [
  { id: "flat-physical", tier1: [1, 2], tier2: [3, 5] },
  { id: "flat-elemental", tier1: [1, 2], tier2: [3, 5] },
  { id: "percent-physical-power", tier1: [4, 8], tier2: [8, 14] },
  { id: "percent-elemental-power", tier1: [4, 8], tier2: [8, 14] },
  { id: "flat-max-health", tier1: [6, 12], tier2: [14, 24] },
  { id: "percent-max-health", tier1: [4, 8], tier2: [8, 14] },
  { id: "flat-armor", tier1: [3, 6], tier2: [7, 12] },
  { id: "flat-elemental-resistance", tier1: [3, 6], tier2: [7, 12] },
];

/** Equipment Bases from issue #41 (display names authored; numbers from issue #8). */
export const EQUIPMENT_BASES: EquipmentBaseDef[] = [
  {
    id: "thornquill-blade",
    name: "Thornquill Blade",
    slot: "weapon",
    tier: 1,
    weaponClass: "knight",
    guaranteed: { flat: { physical: 2 } },
    iconKey: "thornquill-blade",
  },
  {
    id: "dewlight-focus",
    name: "Dewlight Focus",
    slot: "weapon",
    tier: 1,
    weaponClass: "wizard",
    guaranteed: { flat: { elemental: 2 } },
    iconKey: "dewlight-focus",
  },
  {
    id: "moonpetal-relic",
    name: "Moonpetal Relic",
    slot: "weapon",
    tier: 1,
    weaponClass: "priest",
    guaranteed: { flat: { elemental: 2 } },
    iconKey: "moonpetal-relic",
  },
  {
    id: "bramblesong-bow",
    name: "Bramblesong Bow",
    slot: "weapon",
    tier: 1,
    weaponClass: "hunter",
    guaranteed: { flat: { physical: 2 } },
    iconKey: "bramblesong-bow",
  },
  {
    id: "leafmail-vest",
    name: "Leafmail Vest",
    slot: "armor",
    tier: 1,
    guaranteed: { flat: { armor: 4 } },
    iconKey: "leafmail-vest",
  },
  {
    id: "berrybright-charm",
    name: "Berrybright Charm",
    slot: "charm",
    tier: 1,
    guaranteed: { flat: { maxHealth: 8 } },
    iconKey: "berrybright-charm",
  },
  {
    id: "duskthorn-edge",
    name: "Duskthorn Edge",
    slot: "weapon",
    tier: 2,
    weaponClass: "knight",
    guaranteed: { flat: { physical: 5 } },
    iconKey: "duskthorn-edge",
  },
  {
    id: "starfruit-prism",
    name: "Starfruit Prism",
    slot: "weapon",
    tier: 2,
    weaponClass: "wizard",
    guaranteed: { flat: { elemental: 5 } },
    iconKey: "starfruit-prism",
  },
  {
    id: "halcyon-lantern",
    name: "Halcyon Lantern",
    slot: "weapon",
    tier: 2,
    weaponClass: "priest",
    guaranteed: { flat: { elemental: 5 } },
    iconKey: "halcyon-lantern",
  },
  {
    id: "nightvine-longbow",
    name: "Nightvine Longbow",
    slot: "weapon",
    tier: 2,
    weaponClass: "hunter",
    guaranteed: { flat: { physical: 5 } },
    iconKey: "nightvine-longbow",
  },
  {
    id: "plumweave-aegis",
    name: "Plumweave Aegis",
    slot: "armor",
    tier: 2,
    guaranteed: { flat: { armor: 9 } },
    iconKey: "plumweave-aegis",
  },
  {
    id: "gloamberry-locket",
    name: "Gloamberry Locket",
    slot: "charm",
    tier: 2,
    guaranteed: { flat: { maxHealth: 18 } },
    iconKey: "gloamberry-locket",
  },
];

/** Equipment content from issue #41. */
export function buildEquipmentSlice(): {
  equipmentBases: EquipmentBaseDef[];
  affixBands: AffixBandDef[];
} {
  return {
    equipmentBases: EQUIPMENT_BASES,
    affixBands: AFFIX_BANDS,
  };
}
