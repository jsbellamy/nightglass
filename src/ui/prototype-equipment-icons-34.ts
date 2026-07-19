/** PROTOTYPE — wayfinder #125 Equipment icon review helpers. Delete with the prototype. */

import type { DropInstance } from "../core/snapshot";

export const EQUIPMENT_ICONS_34_PROTOTYPE = "equipment-icons-34";

export const PROTOTYPE_ICON_KEYS = [
  "dewlight-focus",
  "starfruit-prism",
  "bramblesong-bow",
  "nightvine-longbow",
] as const;

export function isEquipmentIcons34Prototype(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): boolean {
  return new URLSearchParams(search).get("prototype") === EQUIPMENT_ICONS_34_PROTOTYPE;
}

export function prototypeIconUrl(iconKey: string): string {
  return `/prototype/equipment-icons-34/${iconKey}.png`;
}

/** Seeded Armory rows for the two prototype families (Tier I + Tier II). */
export function prototypeEquipmentIconDrops(): DropInstance[] {
  const bases: { baseId: string; itemLevel: 1 | 2; rarity: DropInstance["rarity"] }[] = [
    { baseId: "dewlight-focus", itemLevel: 1, rarity: "common" },
    { baseId: "starfruit-prism", itemLevel: 2, rarity: "uncommon" },
    { baseId: "bramblesong-bow", itemLevel: 1, rarity: "common" },
    { baseId: "nightvine-longbow", itemLevel: 2, rarity: "rare" },
  ];
  return bases.map((entry, index) => ({
    dropId: 9001 + index,
    baseId: entry.baseId,
    itemLevel: entry.itemLevel,
    rarity: entry.rarity,
    affixes: [],
    awardedAtMs: 1_000_000 - index,
    seen: index > 0,
    locked: false,
    assignedTo: null,
  }));
}
