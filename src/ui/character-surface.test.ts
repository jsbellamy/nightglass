// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../core/engine";
import { cloneSnapshot, type DropInstance, type Snapshot } from "../core/snapshot";
import { fixtureContent } from "../core/testing/fixture-content";
import type { ClassId, EquipmentSlotId } from "../core/types";
import { mountCharacterSurface } from "./character-surface";
import type { DockSurfaceMountOptions, DockTabIntent } from "./dock";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";

const LOOT_SEED = 42;

function drop(
  overrides: Partial<DropInstance> & Pick<DropInstance, "dropId" | "baseId">,
): DropInstance {
  return {
    itemLevel: 1,
    rarity: "common",
    affixes: [],
    awardedAtMs: 0,
    seen: true,
    locked: false,
    assignedTo: null,
    ...overrides,
  };
}

function equipmentSnapshot(armory: DropInstance[]): Snapshot {
  const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
  const snapshot = cloneSnapshot(engine.snapshot());
  snapshot.progression.armory = armory;
  return snapshot;
}

function mountOptions(
  selected: { current: ClassId },
  extras: {
    onCommand?: (command: { cmd: string; args: unknown }) => void;
    requestTab?: (tab: string, intent?: DockTabIntent) => void;
  } = {},
): DockSurfaceMountOptions {
  return {
    content: fixtureContent,
    onCommand: (extras.onCommand as DockSurfaceMountOptions["onCommand"]) ?? (() => undefined),
    getSelectedClassId: () => selected.current,
    requestTab: (extras.requestTab as DockSurfaceMountOptions["requestTab"]) ?? (() => undefined),
  };
}

function leveledKnightEngine() {
  const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
  boot.advanceBy(1);
  const saved = boot.snapshot();
  saved.progression.characterXp.knight = 850;
  return createEngine(fixtureContent, saved, LOOT_SEED);
}

describe("Character surface", () => {
  it("mounts Equipment, Loadout, and Talents sections without a Party panel", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);

    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.classList.contains("character-surface")).toBe(true);
    const sections = [...root.querySelectorAll<HTMLElement>("[data-character-section]")];
    expect(sections.map((section) => section.dataset["characterSection"])).toEqual([
      "equipment",
      "loadout",
      "talents",
    ]);
    expect(root.querySelector(".party-surface")).toBeNull();
    expect(root.querySelector(".formation-slot")).toBeNull();
    expect(root.querySelector(".party-swap")).toBeNull();
    expect(sections[0]?.querySelector(".character-equipment")).not.toBeNull();
    expect(sections[1]?.classList.contains("loadout-surface")).toBe(true);
    expect(sections[2]?.classList.contains("talents-surface")).toBe(true);

    surface.destroy();
  });

  it("gates Talent allocate buttons with the legality view", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = leveledKnightEngine();
    const snapshot = engine.snapshot();

    surface.render(snapshot, EMPTY_ENGINE_LEGALITY);
    const allocate = root.querySelector<HTMLButtonElement>(
      '[data-talent-id="k-fortitude"][data-talent-action="allocate"]',
    );
    expect(allocate?.disabled).toBe(true);

    const permitting: EngineLegalityView = {
      canAllocateTalent: () => true,
      canDeallocateTalent: () => false,
      canEquip: () => false,
    };
    surface.render(snapshot, permitting);
    expect(
      root.querySelector<HTMLButtonElement>(
        '[data-talent-id="k-fortitude"][data-talent-action="allocate"]',
      )?.disabled,
    ).toBe(false);

    surface.destroy();
  });

  it("destroys all composed sub-surfaces and the Equipment section", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.querySelector(".party-surface")).toBeNull();
    expect(root.querySelector(".character-equipment")).not.toBeNull();
    expect(root.querySelector(".loadout-surface")).not.toBeNull();
    expect(root.querySelector(".talents-surface")).not.toBeNull();

    surface.destroy();

    expect(root.querySelector(".character-equipment")).toBeNull();
    expect(root.querySelector(".loadout-surface")).toBeNull();
    expect(root.querySelector(".talents-surface")).toBeNull();
    expect(root.querySelector("[data-character-section]")).toBeNull();
    expect(root.classList.contains("character-surface")).toBe(false);
  });

  it("fans render to every composed surface including Equipment", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);

    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.querySelector(".party-surface")).toBeNull();
    expect(root.querySelector('[data-character-section="equipment"]')).not.toBeNull();
    expect(root.querySelector(".loadout-surface .dock-surface-title")?.textContent).toBe("Loadout");
    expect(root.querySelector(".talents-surface .dock-surface-title")?.textContent).toBe("Talents");

    surface.destroy();
  });
});

describe("Character surface Equipment section", () => {
  it("renders exactly three equipment-slot rows for the selected Character only", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const snapshot = equipmentSnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade",
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
      drop({
        dropId: 2,
        baseId: "fixture-focus",
        assignedTo: { classId: "wizard", slot: "weapon" },
      }),
    ]);

    surface.render(snapshot, EMPTY_ENGINE_LEGALITY);

    const rows = [...root.querySelectorAll<HTMLElement>("[data-equipment-slot]")];
    expect(rows.map((row) => row.dataset["equipmentSlot"])).toEqual([
      "weapon",
      "armor",
      "charm",
    ]);
    expect(root.querySelector('[data-equipment-slot="weapon"] .equipment-name')?.textContent).toBe(
      "Fixture Blade",
    );
    expect(root.textContent).not.toMatch(/Fixture Focus/);

    surface.destroy();
  });

  it("renders occupied slot contents with content-tier icon, meta, guaranteed stat, and Affixes", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const snapshot = equipmentSnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade",
        itemLevel: 2,
        rarity: "rare",
        affixes: [{ id: "flat-physical", value: 3 }],
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
    ]);

    surface.render(snapshot, EMPTY_ENGINE_LEGALITY);

    const weapon = root.querySelector<HTMLElement>('[data-equipment-slot="weapon"]');
    expect(weapon?.dataset["slotFilled"]).toBe("true");
    expect(weapon?.querySelector(".equipment-icon-img--content")).not.toBeNull();
    expect(weapon?.querySelector(".equipment-name")?.textContent).toBe("Fixture Blade");
    expect(weapon?.querySelector(".equipment-meta")?.textContent).toBe(
      "Tier 1 · Item Level 2",
    );
    expect(weapon?.querySelector(".equipment-guaranteed")?.textContent).toMatch(/Physical/);
    expect(weapon?.querySelector(".equipment-affix-list")?.textContent).toMatch(/Physical/);
    expect(weapon?.classList.contains("rarity-rare")).toBe(true);
    expect(weapon?.querySelector('[data-browse-slot="weapon"]')?.textContent).toBe("Swap");
    expect(weapon?.querySelector('[data-unequip-slot="weapon"]')?.textContent).toBe("Unequip");

    surface.destroy();
  });

  it("renders empty slots without an icon and with only the browse action", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const snapshot = equipmentSnapshot([]);

    surface.render(snapshot, EMPTY_ENGINE_LEGALITY);

    const armor = root.querySelector<HTMLElement>('[data-equipment-slot="armor"]');
    expect(armor?.dataset["slotFilled"]).toBe("false");
    expect(armor?.querySelector(".equipment-icon-img")).toBeNull();
    expect(armor?.querySelector(".equipment-slot-empty")?.textContent?.trim()).toBe("Empty");
    expect(armor?.querySelector('[data-browse-slot="armor"]')?.textContent).toBe("Choose");
    expect(armor?.querySelector("[data-unequip-slot]")).toBeNull();

    surface.destroy();
  });

  it("keeps the slot label and empty state as separate elements without concatenating WeaponEmpty", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const snapshot = equipmentSnapshot([]);

    surface.render(snapshot, EMPTY_ENGINE_LEGALITY);

    const weapon = root.querySelector<HTMLElement>('[data-equipment-slot="weapon"]');
    expect(weapon?.querySelector(".equipment-slot-label")?.textContent).toBe("Weapon");
    expect(weapon?.querySelector(".equipment-slot-empty")?.textContent?.trim()).toBe("Empty");
    expect(weapon?.textContent).not.toMatch(/WeaponEmpty/);

    surface.destroy();
  });

  it("publishes unequip without a confirmation dialog when Unequip is activated", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const onCommand = vi.fn();
    const surface = mountCharacterSurface(root, mountOptions(selected, { onCommand }));
    const snapshot = equipmentSnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade",
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
    ]);

    surface.render(snapshot, EMPTY_ENGINE_LEGALITY);
    root.querySelector<HTMLButtonElement>('[data-unequip-slot="weapon"]')?.click();

    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith({ cmd: "unequip", args: ["knight", "weapon"] });
    expect(root.querySelector(".armory-confirm")).toBeNull();
    expect(root.querySelector("[data-discard-confirm]")).toBeNull();

    surface.destroy();
  });

  it("omits Unequip from empty slots", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    surface.render(equipmentSnapshot([]), EMPTY_ENGINE_LEGALITY);

    expect(root.querySelector("[data-unequip-slot]")).toBeNull();

    surface.destroy();
  });

  it("requests the Armory tab with a browse-slot intent when Swap or Choose is activated", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const requestTab = vi.fn();
    const surface = mountCharacterSurface(root, mountOptions(selected, { requestTab }));
    const snapshot = equipmentSnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade",
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
    ]);

    surface.render(snapshot, EMPTY_ENGINE_LEGALITY);
    root.querySelector<HTMLButtonElement>('[data-browse-slot="weapon"]')?.click();
    expect(requestTab).toHaveBeenCalledWith("armory", {
      kind: "browse-slot",
      classId: "knight",
      slot: "weapon",
    } satisfies DockTabIntent);

    requestTab.mockClear();
    root.querySelector<HTMLButtonElement>('[data-browse-slot="armor"]')?.click();
    expect(requestTab).toHaveBeenCalledWith("armory", {
      kind: "browse-slot",
      classId: "knight",
      slot: "armor",
    } satisfies DockTabIntent);

    surface.destroy();
  });

  it("re-renders Equipment against a newly selected Character's assignments", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const snapshot = equipmentSnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade",
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
      drop({
        dropId: 2,
        baseId: "fixture-focus",
        assignedTo: { classId: "wizard", slot: "weapon" },
      }),
    ]);

    surface.render(snapshot, EMPTY_ENGINE_LEGALITY);
    expect(root.querySelector(".equipment-name")?.textContent).toBe("Fixture Blade");

    selected.current = "wizard";
    surface.render(snapshot, EMPTY_ENGINE_LEGALITY);
    expect(root.querySelector(".equipment-name")?.textContent).toBe("Fixture Focus");

    surface.destroy();
  });

  it("renders the next-Attempt note once in the Equipment section", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    surface.render(equipmentSnapshot([]), EMPTY_ENGINE_LEGALITY);

    const notes = root.querySelectorAll(
      '[data-character-section="equipment"] [data-next-attempt-note="true"]',
    );
    expect(notes).toHaveLength(1);
    expect(notes[0]?.textContent).toMatch(/next Stage Attempt/i);

    surface.destroy();
  });

  it("covers every EquipmentSlotId row in order", () => {
    const slots: EquipmentSlotId[] = ["weapon", "armor", "charm"];
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    surface.render(equipmentSnapshot([]), EMPTY_ENGINE_LEGALITY);

    expect(
      [...root.querySelectorAll<HTMLElement>("[data-equipment-slot]")].map(
        (row) => row.dataset["equipmentSlot"],
      ),
    ).toEqual(slots);

    surface.destroy();
  });
});
