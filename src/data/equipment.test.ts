import { describe, expect, it } from "vitest";
import type { AffixBandDef, EquipmentBaseDef } from "../core/types";
import { validateContent } from "../core/validate-content";
import { buildContent } from "./index";
import { AFFIX_BANDS, EQUIPMENT_BASES, buildEquipmentSlice } from "./equipment";

const EXPECTED_AFFIX_BANDS: AffixBandDef[] = [
  {
    id: "flat-physical",
    tier1: [1, 2],
    tier2: [3, 5],
    tier3: [6, 9],
    tier4: [10, 14],
    tier5: [15, 20],
  },
  {
    id: "flat-elemental",
    tier1: [1, 2],
    tier2: [3, 5],
    tier3: [6, 9],
    tier4: [10, 14],
    tier5: [15, 20],
  },
  {
    id: "percent-physical-power",
    tier1: [4, 8],
    tier2: [8, 14],
    tier3: [14, 20],
    tier4: [20, 28],
    tier5: [28, 38],
  },
  {
    id: "percent-elemental-power",
    tier1: [4, 8],
    tier2: [8, 14],
    tier3: [14, 20],
    tier4: [20, 28],
    tier5: [28, 38],
  },
  {
    id: "flat-max-health",
    tier1: [6, 12],
    tier2: [14, 24],
    tier3: [28, 44],
    tier4: [46, 70],
    tier5: [72, 104],
  },
  {
    id: "percent-max-health",
    tier1: [4, 8],
    tier2: [8, 14],
    tier3: [14, 20],
    tier4: [20, 28],
    tier5: [28, 38],
  },
  {
    id: "flat-armor",
    tier1: [3, 6],
    tier2: [7, 12],
    tier3: [13, 20],
    tier4: [21, 30],
    tier5: [31, 42],
  },
  {
    id: "flat-elemental-resistance",
    tier1: [3, 6],
    tier2: [7, 12],
    tier3: [13, 20],
    tier4: [21, 30],
    tier5: [31, 42],
  },
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
  {
    id: "fryerplate-cleaver",
    name: "Fryerplate Cleaver",
    slot: "weapon",
    tier: 3,
    weaponClass: "knight",
    guaranteed: { flat: { physical: 8 } },
    iconKey: "fryerplate-cleaver",
  },
  {
    id: "neonstorm-coil",
    name: "Neonstorm Coil",
    slot: "weapon",
    tier: 3,
    weaponClass: "wizard",
    guaranteed: { flat: { elemental: 8 } },
    iconKey: "neonstorm-coil",
  },
  {
    id: "roadside-reliquary",
    name: "Roadside Reliquary",
    slot: "weapon",
    tier: 3,
    weaponClass: "priest",
    guaranteed: { flat: { elemental: 8 } },
    iconKey: "roadside-reliquary",
  },
  {
    id: "huskstring-recurve",
    name: "Huskstring Recurve",
    slot: "weapon",
    tier: 3,
    weaponClass: "hunter",
    guaranteed: { flat: { physical: 8 } },
    iconKey: "huskstring-recurve",
  },
  {
    id: "feed-sack-brigandine",
    name: "Feed-Sack Brigandine",
    slot: "armor",
    tier: 3,
    guaranteed: { flat: { armor: 15 } },
    iconKey: "feed-sack-brigandine",
  },
  {
    id: "red-beacon-token",
    name: "Red Beacon Token",
    slot: "charm",
    tier: 3,
    guaranteed: { flat: { maxHealth: 30 } },
    iconKey: "red-beacon-token",
  },
  {
    id: "threshertooth-blade",
    name: "Threshertooth Blade",
    slot: "weapon",
    tier: 4,
    weaponClass: "knight",
    guaranteed: { flat: { physical: 12 } },
    iconKey: "threshertooth-blade",
  },
  {
    id: "mustard-sky-dynamo",
    name: "Mustard-Sky Dynamo",
    slot: "weapon",
    tier: 4,
    weaponClass: "wizard",
    guaranteed: { flat: { elemental: 12 } },
    iconKey: "mustard-sky-dynamo",
  },
  {
    id: "harvest-warning-lantern",
    name: "Harvest Warning Lantern",
    slot: "weapon",
    tier: 4,
    weaponClass: "priest",
    guaranteed: { flat: { elemental: 12 } },
    iconKey: "harvest-warning-lantern",
  },
  {
    id: "augerwire-longbow",
    name: "Augerwire Longbow",
    slot: "weapon",
    tier: 4,
    weaponClass: "hunter",
    guaranteed: { flat: { physical: 12 } },
    iconKey: "augerwire-longbow",
  },
  {
    id: "combineplate-harness",
    name: "Combineplate Harness",
    slot: "armor",
    tier: 4,
    guaranteed: { flat: { armor: 22 } },
    iconKey: "combineplate-harness",
  },
  {
    id: "black-oil-locket",
    name: "Black-Oil Locket",
    slot: "charm",
    tier: 4,
    guaranteed: { flat: { maxHealth: 44 } },
    iconKey: "black-oil-locket",
  },
  {
    id: "escapement-greatsword",
    name: "Escapement Greatsword",
    slot: "weapon",
    tier: 5,
    weaponClass: "knight",
    guaranteed: { flat: { physical: 16 } },
    iconKey: "escapement-greatsword",
  },
  {
    id: "aphelion-conduit",
    name: "Aphelion Conduit",
    slot: "weapon",
    tier: 5,
    weaponClass: "wizard",
    guaranteed: { flat: { elemental: 16 } },
    iconKey: "aphelion-conduit",
  },
  {
    id: "tolling-reliquary",
    name: "Tolling Reliquary",
    slot: "weapon",
    tier: 5,
    weaponClass: "priest",
    guaranteed: { flat: { elemental: 16 } },
    iconKey: "tolling-reliquary",
  },
  {
    id: "mainspring-repeater",
    name: "Mainspring Repeater",
    slot: "weapon",
    tier: 5,
    weaponClass: "hunter",
    guaranteed: { flat: { physical: 16 } },
    iconKey: "mainspring-repeater",
  },
  {
    id: "verdigris-carapace",
    name: "Verdigris Carapace",
    slot: "armor",
    tier: 5,
    guaranteed: { flat: { armor: 30 } },
    iconKey: "verdigris-carapace",
  },
  {
    id: "stopped-hour-pendulum",
    name: "Stopped-Hour Pendulum",
    slot: "charm",
    tier: 5,
    guaranteed: { flat: { maxHealth: 60 } },
    iconKey: "stopped-hour-pendulum",
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

  it("defines 30 Equipment Bases: 6 per tier, one per slot/class combination", () => {
    expect(slice.equipmentBases).toHaveLength(30);
    for (const tier of [1, 2, 3, 4, 5] as const) {
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
  it("ships all 30 bases exactly as tabled", () => {
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

  it("pins Tier III guaranteed statistics", () => {
    expect(baseById("fryerplate-cleaver").guaranteed).toEqual({ flat: { physical: 8 } });
    expect(baseById("neonstorm-coil").guaranteed).toEqual({ flat: { elemental: 8 } });
    expect(baseById("roadside-reliquary").guaranteed).toEqual({ flat: { elemental: 8 } });
    expect(baseById("huskstring-recurve").guaranteed).toEqual({ flat: { physical: 8 } });
    expect(baseById("feed-sack-brigandine").guaranteed).toEqual({ flat: { armor: 15 } });
    expect(baseById("red-beacon-token").guaranteed).toEqual({ flat: { maxHealth: 30 } });
  });

  it("pins Tier IV guaranteed statistics", () => {
    expect(baseById("threshertooth-blade").guaranteed).toEqual({ flat: { physical: 12 } });
    expect(baseById("mustard-sky-dynamo").guaranteed).toEqual({ flat: { elemental: 12 } });
    expect(baseById("harvest-warning-lantern").guaranteed).toEqual({ flat: { elemental: 12 } });
    expect(baseById("augerwire-longbow").guaranteed).toEqual({ flat: { physical: 12 } });
    expect(baseById("combineplate-harness").guaranteed).toEqual({ flat: { armor: 22 } });
    expect(baseById("black-oil-locket").guaranteed).toEqual({ flat: { maxHealth: 44 } });
  });

  it("pins Tier V guaranteed statistics", () => {
    expect(baseById("escapement-greatsword").guaranteed).toEqual({ flat: { physical: 16 } });
    expect(baseById("aphelion-conduit").guaranteed).toEqual({ flat: { elemental: 16 } });
    expect(baseById("tolling-reliquary").guaranteed).toEqual({ flat: { elemental: 16 } });
    expect(baseById("mainspring-repeater").guaranteed).toEqual({ flat: { physical: 16 } });
    expect(baseById("verdigris-carapace").guaranteed).toEqual({ flat: { armor: 30 } });
    expect(baseById("stopped-hour-pendulum").guaranteed).toEqual({ flat: { maxHealth: 60 } });
  });
});

describe("Affix bands from issue #8", () => {
  it("pins every Affix band row", () => {
    expect(AFFIX_BANDS).toEqual(EXPECTED_AFFIX_BANDS);
  });
});
