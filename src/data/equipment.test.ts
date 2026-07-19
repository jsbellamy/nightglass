import { describe, expect, it } from "vitest";
import type { AffixBandDef, EquipmentBaseDef } from "../core/types";
import { validateContent } from "../core/validate-content";
import { buildContent } from "./index";
import { AFFIX_BANDS, EQUIPMENT_BASES, buildEquipmentSlice } from "./equipment";

const EXPECTED_AFFIX_BANDS: AffixBandDef[] = [
  { id: "flat-physical", tier1: [1, 2], tier2: [3, 5] },
  { id: "flat-elemental", tier1: [1, 2], tier2: [3, 5] },
  { id: "percent-physical-power", tier1: [4, 8], tier2: [8, 14] },
  { id: "percent-elemental-power", tier1: [4, 8], tier2: [8, 14] },
  { id: "flat-max-health", tier1: [6, 12], tier2: [14, 24] },
  { id: "percent-max-health", tier1: [4, 8], tier2: [8, 14] },
  { id: "flat-armor", tier1: [3, 6], tier2: [7, 12] },
  { id: "flat-elemental-resistance", tier1: [3, 6], tier2: [7, 12] },
];

const EXPECTED_BASES: EquipmentBaseDef[] = [
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

function baseById(id: string): EquipmentBaseDef {
  const base = EQUIPMENT_BASES.find((entry) => entry.id === id);
  if (!base) {
    throw new Error(`missing base ${id}`);
  }
  return base;
}

describe("assembled Equipment content", () => {
  const slice = buildEquipmentSlice();
  const content = buildContent(undefined, slice);

  it("passes validateContent with fixture stubs for sibling slices", () => {
    expect(validateContent(content, { fixture: true })).toEqual([]);
  });

  it("defines 12 Equipment Bases: 6 per tier, one per slot/class combination", () => {
    expect(slice.equipmentBases).toHaveLength(12);
    for (const tier of [1, 2] as const) {
      const tierBases = slice.equipmentBases.filter((base) => base.tier === tier);
      expect(tierBases).toHaveLength(6);
      for (const classId of ["knight", "wizard", "priest", "hunter"] as const) {
        expect(
          tierBases.find((base) => base.slot === "weapon" && base.weaponClass === classId),
        ).toBeDefined();
      }
      expect(
        tierBases.find((base) => base.slot === "armor" && base.weaponClass === undefined),
      ).toBeDefined();
      expect(
        tierBases.find((base) => base.slot === "charm" && base.weaponClass === undefined),
      ).toBeDefined();
    }
  });

  it("passes equipment cardinality through validateContent", () => {
    const violations = validateContent(content).filter((violation) =>
      violation.includes("equipmentBases"),
    );
    expect(violations).toEqual([]);
  });
});

describe("Equipment Bases from issue #8", () => {
  it("ships all 12 bases exactly as tabled", () => {
    expect(EQUIPMENT_BASES).toEqual(EXPECTED_BASES);
  });

  it("pins Tier I guaranteed statistics", () => {
    expect(baseById("thornquill-blade").guaranteed).toEqual({ flat: { physical: 2 } });
    expect(baseById("dewlight-focus").guaranteed).toEqual({ flat: { elemental: 2 } });
    expect(baseById("moonpetal-relic").guaranteed).toEqual({ flat: { elemental: 2 } });
    expect(baseById("bramblesong-bow").guaranteed).toEqual({ flat: { physical: 2 } });
    expect(baseById("leafmail-vest").guaranteed).toEqual({ flat: { armor: 4 } });
    expect(baseById("berrybright-charm").guaranteed).toEqual({ flat: { maxHealth: 8 } });
  });

  it("pins Tier II guaranteed statistics", () => {
    expect(baseById("duskthorn-edge").guaranteed).toEqual({ flat: { physical: 5 } });
    expect(baseById("starfruit-prism").guaranteed).toEqual({ flat: { elemental: 5 } });
    expect(baseById("halcyon-lantern").guaranteed).toEqual({ flat: { elemental: 5 } });
    expect(baseById("nightvine-longbow").guaranteed).toEqual({ flat: { physical: 5 } });
    expect(baseById("plumweave-aegis").guaranteed).toEqual({ flat: { armor: 9 } });
    expect(baseById("gloamberry-locket").guaranteed).toEqual({ flat: { maxHealth: 18 } });
  });
});

describe("Affix bands from issue #8", () => {
  it("pins every Affix band row", () => {
    expect(AFFIX_BANDS).toEqual(EXPECTED_AFFIX_BANDS);
  });
});
