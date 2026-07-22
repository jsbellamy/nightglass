// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { cloneSnapshot, type DropInstance, type Snapshot } from "../core/snapshot";
import type { ClassId, Content } from "../core/types";
import { fixtureContent } from "../core/testing/fixture-content";
import { buildContent } from "../data";
import { mountArmorySurface } from "./armory-surface";
import { mountManagementDock } from "./dock";
import {
  legalityViewFromEngine,
  legalityViewFromSerialized,
  serializeEngineLegality,
} from "./engine-legality";
import {
  filterArmoryDrops,
  type ArmoryFilters,
} from "./equipment-format";
import { rosterClassIds } from "./snapshot-view";

const fullContent = buildContent();

const LOOT_SEED = 42;

function renderArmory(
  surface: ReturnType<typeof mountArmorySurface>,
  snapshot: Snapshot,
): void {
  const engine = createEngine(fixtureContent, snapshot, LOOT_SEED);
  surface.render(snapshot, legalityViewFromEngine(engine));
}

function mountWithSelection(
  root: HTMLElement,
  selected: { current: ClassId },
  onCommand?: (command: import("./bus").TileCommand) => void,
): ReturnType<typeof mountArmorySurface> {
  return mountArmorySurface(root, {
    content: fixtureContent,
    getSelectedClassId: () => selected.current,
    selectClassId: (classId) => {
      selected.current = classId;
    },
    ...(onCommand ? { onCommand } : {}),
  });
}

function renderDock(
  dock: ReturnType<typeof mountManagementDock>,
  snapshot: Snapshot,
): void {
  const engine = createEngine(fixtureContent, snapshot, LOOT_SEED);
  dock.render(snapshot, legalityViewFromEngine(engine));
}

function activateFocused(): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) {
    throw new Error("expected a focused element");
  }
  active.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}

function dragBetween(source: HTMLElement, target: HTMLElement): void {
  const dataTransfer = new DataTransfer();
  source.dispatchEvent(
    new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
  );
  target.dispatchEvent(
    new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer }),
  );
  target.dispatchEvent(
    new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }),
  );
  target.dispatchEvent(
    new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }),
  );
  source.dispatchEvent(
    new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }),
  );
}

function drop(overrides: Partial<DropInstance> & Pick<DropInstance, "dropId" | "baseId">): DropInstance {
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

function armorySnapshot(armory: DropInstance[]): Snapshot {
  return armorySnapshotFor(fixtureContent, armory);
}

function armorySnapshotFor(content: Content, armory: DropInstance[]): Snapshot {
  const engine = createEngine(content, undefined, LOOT_SEED);
  const snapshot = cloneSnapshot(engine.snapshot());
  snapshot.progression.armory = armory;
  return snapshot;
}

/** Hunter pending-in / Knight pending-out over the default full Roster. */
function pendingHunterInSnapshot(armory: DropInstance[]): Snapshot {
  const snapshot = armorySnapshotFor(fullContent, armory);
  const { party, reserve } = snapshot.progression;
  snapshot.progression.pendingParty = {
    members: [reserve, party[1]!, party[2]!],
    reserve: party[0]!,
  };
  return snapshot;
}

describe("Armory surface", () => {
  it("renders a compact horizontal Character selector with name and Level above the worn strip", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    const selector = root.querySelector<HTMLElement>('[data-armory-character-selector="true"]');
    expect(selector).not.toBeNull();
    expect(selector?.getAttribute("role")).toBe("tablist");
    const chips = [...root.querySelectorAll<HTMLElement>(".armory-character-selector [data-character-chip]")];
    expect(chips.map((chip) => chip.dataset["characterChip"])).toEqual(rosterClassIds(snapshot));
    expect(chips.every((chip) => chip.querySelector(".character-chip-name")?.textContent?.length)).toBe(
      true,
    );
    expect(chips.every((chip) => chip.querySelector(".character-chip-level")?.textContent?.match(/^Level /))).toBe(
      true,
    );
    expect(root.querySelector(".armory-character-selector .character-chip-position")).toBeNull();
    expect(
      root.querySelector('.armory-character-selector [data-character-chip="knight"]')?.getAttribute(
        "aria-selected",
      ),
    ).toBe("true");

    const wornStrip = root.querySelector('[data-armory-worn-strip="true"]');
    expect(wornStrip).not.toBeNull();
    expect(selector!.compareDocumentPosition(wornStrip!) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    surface.destroy();
  });

  it("moves Armory Character selection with Arrow keys and retargets the worn strip", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
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
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    const roster = rosterClassIds(snapshot);
    const knightChip = root.querySelector<HTMLElement>('.armory-character-selector [data-character-chip="knight"]');
    knightChip?.focus();
    knightChip?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    renderArmory(surface, snapshot);
    expect(selected.current).toBe(roster[1]);
    expect(
      root.querySelector(`.armory-character-selector [data-character-chip="${roster[1]}"]`)?.getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
    expect(
      root.querySelector('[data-worn-slot="weapon"]')?.getAttribute("aria-label"),
    ).toMatch(/Fixture Focus/);

    const lastClass = roster[roster.length - 1]!;
    const lastChip = root.querySelector<HTMLElement>(
      `.armory-character-selector [data-character-chip="${lastClass}"]`,
    );
    lastChip?.focus();
    lastChip?.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    renderArmory(surface, snapshot);
    expect(selected.current).toBe(roster[0]);

    lastChip?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    renderArmory(surface, snapshot);
    expect(selected.current).toBe(lastClass);

    surface.destroy();
  });

  it("renders a worn loadout strip for the selected Class above the full-width collection grid", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountWithSelection(root, selected);
    renderArmory(
      surface,
      armorySnapshot([
        drop({
          dropId: 1,
          baseId: "fixture-blade",
          assignedTo: { classId: "knight", slot: "weapon" },
        }),
      ]),
    );

    expect(root.querySelector(".armory-slot-strip")).toBeNull();
    const strip = root.querySelector<HTMLElement>('[data-armory-worn-strip="true"]');
    expect(strip).not.toBeNull();
    expect(strip?.getAttribute("aria-label")).toMatch(/Worn loadout/i);
    const slots = [...root.querySelectorAll<HTMLElement>("[data-worn-slot]")];
    expect(slots.map((slot) => slot.dataset["wornSlot"])).toEqual(["weapon", "armor", "charm"]);
    expect(
      root.querySelector<HTMLElement>('[data-worn-slot="weapon"]')?.dataset["slotFilled"],
    ).toBe("true");
    expect(
      root.querySelector('[data-worn-slot="weapon"] .equipment-icon-img--content'),
    ).not.toBeNull();
    expect(
      root.querySelector<HTMLElement>('[data-worn-slot="armor"]')?.dataset["slotFilled"],
    ).toBe("false");
    expect(
      root.querySelector<HTMLElement>('[data-worn-slot="charm"]')?.dataset["slotFilled"],
    ).toBe("false");

    const panes = root.querySelector(".armory-panes");
    expect(panes?.querySelector(".armory-grid")).not.toBeNull();
    expect(panes?.querySelector(".armory-detail")).toBeNull();
    expect(root.querySelector('[data-armory-collection="true"]')).not.toBeNull();
    expect(root.querySelector('[data-armory-detail="true"]')).toBeNull();

    surface.destroy();
  });

  it("applies browse-slot filters when a filled worn slot is activated without a detail pane", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade",
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
      drop({ dropId: 2, baseId: "fixture-armor" }),
      drop({ dropId: 3, baseId: "fixture-focus" }),
    ]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    root.querySelector<HTMLButtonElement>('[data-worn-slot="weapon"]')?.click();
    renderArmory(surface, snapshot);

    expect(
      root
        .querySelector<HTMLButtonElement>('[data-slot-filter="weapon"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      [...root.querySelectorAll<HTMLElement>(".armory-grid .equipment-card")].map(
        (card) => card.dataset["dropId"],
      ),
    ).toEqual([]);
    expect(
      root
        .querySelector<HTMLElement>('.armory-grid .equipment-card[data-drop-id="1"]'),
    ).toBeNull();
    expect(root.querySelector('[data-armory-detail="true"]')).toBeNull();

    surface.destroy();
  });

  it("applies browse-slot filters with an empty compatible collection when an empty worn slot is activated", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade" }),
      drop({ dropId: 2, baseId: "fixture-armor" }),
    ]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    root.querySelector<HTMLButtonElement>('[data-worn-slot="armor"]')?.click();
    renderArmory(surface, snapshot);

    expect(
      root
        .querySelector<HTMLButtonElement>('[data-slot-filter="armor"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      [...root.querySelectorAll<HTMLElement>(".armory-grid .equipment-card")].map(
        (card) => card.dataset["dropId"],
      ),
    ).toEqual(["2"]);
    expect(root.querySelector('[data-armory-detail="true"]')).toBeNull();

    surface.destroy();
  });

  it("re-renders the worn strip when the selected Class changes", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
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
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);
    expect(
      root.querySelector('[data-worn-slot="weapon"] .equipment-icon-img--content'),
    ).not.toBeNull();

    selected.current = "wizard";
    renderArmory(surface, snapshot);
    expect(
      root.querySelector('[data-worn-slot="weapon"]')?.getAttribute("aria-label"),
    ).toMatch(/Fixture Focus/);

    surface.destroy();
  });

  it("orders the collection Unseen-first then newest by default", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", awardedAtMs: 100, seen: true }),
      drop({ dropId: 2, baseId: "fixture-armor", awardedAtMs: 300, seen: false }),
      drop({ dropId: 3, baseId: "fixture-charm", awardedAtMs: 200, seen: false }),
    ]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    const ids = [...root.querySelectorAll<HTMLElement>(".armory-grid .equipment-card")].map(
      (card) => card.dataset["dropId"],
    );
    expect(ids).toEqual(["2", "3", "1"]);

    surface.destroy();
  });

  it("renders Armory collection tiles as icon-first Drops with Unseen and Locked badges, omitting assignment prose", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade",
        rarity: "rare",
        seen: false,
        locked: true,
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
      drop({
        dropId: 2,
        baseId: "fixture-armor",
        rarity: "rare",
        seen: false,
        locked: true,
      }),
    ]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    expect(
      root.querySelector('.armory-grid .equipment-card[data-drop-id="1"]'),
    ).toBeNull();
    const tile = root.querySelector<HTMLElement>('.armory-grid .equipment-card[data-drop-id="2"]');
    expect(tile?.classList.contains("rarity-rare")).toBe(true);
    const icon = tile?.querySelector<HTMLImageElement>(".equipment-icon-img--content");
    expect(icon?.width).toBe(34);
    expect(icon?.height).toBe(34);
    expect(tile?.getAttribute("aria-label")).toMatch(/Fixture Armor/);
    expect(tile?.querySelector(".equipment-name")).toBeNull();
    expect(tile?.textContent).not.toMatch(/Unseen/);
    expect(tile?.querySelector('[data-unseen-marker="true"]')?.getAttribute("aria-label")).toBe(
      "Unseen",
    );
    expect(tile?.querySelector(".locked-marker")?.getAttribute("aria-label")).toBe("Locked");
    expect(tile?.querySelector(".locked-marker")?.textContent).not.toMatch(/Locked/);
    expect(tile?.querySelector(".assigned-marker")).toBeNull();
    expect(tile?.textContent).not.toMatch(/Knight/);
    expect(tile?.classList.contains("locked-tile")).toBe(true);
    expect(tile?.querySelector('[data-tile-lock="2"]')).not.toBeNull();
    expect(root.querySelector(".armory-filter")).toBeNull();

    surface.destroy();
  });

  it("does not render interim detail movement controls in the Armory surface", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade" }),
      drop({
        dropId: 2,
        baseId: "fixture-blade",
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
    ]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    expect(root.querySelector('[data-armory-detail="true"]')).toBeNull();
    expect(root.querySelector('[data-equip-button="true"]')).toBeNull();
    expect(root.querySelector('[data-unequip-slot]')).toBeNull();
    expect(root.querySelector('[data-cross-equip-confirm="true"]')).toBeNull();
    expect(root.querySelector(".armory-compare-columns")).toBeNull();

    surface.destroy();
  });

  it("collapses filters to a segmented slot control and a state menu", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", awardedAtMs: 100, seen: false }),
      drop({
        dropId: 2,
        baseId: "fixture-armor",
        awardedAtMs: 200,
        rarity: "rare",
        locked: true,
      }),
      drop({ dropId: 3, baseId: "fixture-focus", awardedAtMs: 300, rarity: "uncommon" }),
    ]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    expect(root.querySelectorAll("[data-slot-filter]")).toHaveLength(4);
    root.querySelector<HTMLButtonElement>('[data-slot-filter="weapon"]')?.click();
    renderArmory(surface, snapshot);
    expect(
      [...root.querySelectorAll<HTMLElement>(".armory-grid .equipment-card")].map(
        (card) => card.dataset["dropId"],
      ),
    ).toEqual(["1", "3"]);

    root.querySelector<HTMLButtonElement>('[data-slot-filter="all"]')?.click();
    renderArmory(surface, snapshot);
    const state = root.querySelector<HTMLSelectElement>('[data-armory-state="true"]');
    expect([...state!.options].map((option) => option.value)).toEqual([
      "all",
      "unseen",
      "locked",
    ]);
    state!.value = "locked";
    state!.dispatchEvent(new Event("change"));
    renderArmory(surface, snapshot);
    expect(
      [...root.querySelectorAll<HTMLElement>(".armory-grid .equipment-card")].map(
        (card) => card.dataset["dropId"],
      ),
    ).toEqual(["2"]);

    const sort = root.querySelector<HTMLSelectElement>('[data-armory-sort="true"]');
    sort!.value = "name";
    sort!.dispatchEvent(new Event("change"));
    renderArmory(surface, snapshot);
    expect(
      root.querySelector(".armory-grid .equipment-card")?.getAttribute("aria-label"),
    ).toMatch(/Fixture Armor/);

    surface.destroy();
  });

  it("keeps ArmoryFilters fields and filterArmoryDrops honouring weaponClass, tier, and rarity", () => {
    const filters: ArmoryFilters = {
      slot: "weapon",
      weaponClass: "wizard",
      tier: 1,
      rarity: "uncommon",
      assigned: "available",
      locked: false,
      unseen: true,
    };
    expect(Object.keys(filters).sort()).toEqual([
      "assigned",
      "locked",
      "rarity",
      "slot",
      "tier",
      "unseen",
      "weaponClass",
    ]);

    const drops = [
      drop({ dropId: 1, baseId: "fixture-blade", rarity: "uncommon", seen: false }),
      drop({ dropId: 2, baseId: "fixture-focus", rarity: "uncommon", seen: false }),
      drop({ dropId: 3, baseId: "fixture-focus-ii", itemLevel: 3, rarity: "uncommon", seen: false }),
      drop({ dropId: 4, baseId: "fixture-focus", rarity: "rare", seen: false }),
    ];
    expect(
      filterArmoryDrops(drops, { weaponClass: "wizard", tier: 1, rarity: "uncommon" }, fixtureContent).map(
        (entry) => entry.dropId,
      ),
    ).toEqual([2]);
  });

  it("publishes markSeen when the comparison popover opens for an unseen Drop", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", seen: false }),
      drop({
        dropId: 2,
        baseId: "fixture-blade-ii",
        itemLevel: 3,
        awardedAtMs: 200,
        rarity: "rare",
        affixes: [{ id: "flat-physical", value: 3 }],
      }),
    ]);
    const surface = mountWithSelection(root, selected, (command) => commands.push(command));
    renderArmory(surface, snapshot);

    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')!;
    tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    renderArmory(surface, snapshot);
    expect(commands).toContainEqual({ cmd: "markSeen", args: [[1]] });
    expect(root.querySelector('[data-unseen-marker="true"]')).toBeNull();

    surface.destroy();
  });

  it("drags from the collection to the compatible worn slot and publishes equip", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const selected = { current: "wizard" as ClassId };
    const saved = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-armor", awardedAtMs: 100 }),
    ]);
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const commands: unknown[] = [];
    const surface = mountArmorySurface(root, {
      content: fixtureContent,
      getSelectedClassId: () => selected.current,
      selectClassId: (classId) => {
        selected.current = classId;
      },
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "equip") {
          engine.equip(command.args[0], command.args[1], command.args[2]);
        }
      },
    });

    renderArmory(surface, engine.snapshot());

    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')!;
    const armorSlot = root.querySelector<HTMLElement>('[data-worn-slot="armor"]')!;
    dragBetween(tile, armorSlot);
    expect(commands).toContainEqual({ cmd: "equip", args: [1, "wizard", "armor"] });

    surface.destroy();
    root.remove();
  });

  it("swaps into an occupied compatible worn slot without confirmation", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const selected = { current: "knight" as ClassId };
    const saved = armorySnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade-ii",
        itemLevel: 3,
        rarity: "rare",
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
      drop({ dropId: 2, baseId: "fixture-blade", awardedAtMs: 100 }),
    ]);
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const commands: unknown[] = [];
    const surface = mountArmorySurface(root, {
      content: fixtureContent,
      getSelectedClassId: () => selected.current,
      selectClassId: (classId) => {
        selected.current = classId;
      },
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "equip") {
          engine.equip(command.args[0], command.args[1], command.args[2]);
        }
      },
    });

    renderArmory(surface, engine.snapshot());
    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="2"]')!;
    const weaponSlot = root.querySelector<HTMLElement>('[data-worn-slot="weapon"]')!;
    dragBetween(tile, weaponSlot);
    expect(commands).toContainEqual({ cmd: "equip", args: [2, "knight", "weapon"] });
    expect(root.querySelector('[data-cross-equip-confirm="true"]')).toBeNull();
    const snapshot = engine.snapshot();
    expect(snapshot.progression.armory.find((entry) => entry.dropId === 1)?.assignedTo).toBeNull();
    expect(snapshot.progression.armory.find((entry) => entry.dropId === 2)?.assignedTo).toEqual({
      classId: "knight",
      slot: "weapon",
    });

    surface.destroy();
    root.remove();
  });

  it("drags from a filled worn slot to the collection and publishes unequip", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const selected = { current: "knight" as ClassId };
    const saved = armorySnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade",
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
    ]);
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const commands: unknown[] = [];
    const surface = mountArmorySurface(root, {
      content: fixtureContent,
      getSelectedClassId: () => selected.current,
      selectClassId: (classId) => {
        selected.current = classId;
      },
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "unequip") {
          engine.unequip(command.args[0], command.args[1]);
        }
      },
    });

    renderArmory(surface, engine.snapshot());
    const weaponSlot = root.querySelector<HTMLElement>('[data-worn-slot="weapon"]')!;
    const grid = root.querySelector<HTMLElement>('[data-armory-collection="true"]')!;
    dragBetween(weaponSlot, grid);
    expect(commands).toContainEqual({ cmd: "unequip", args: ["knight", "weapon"] });

    surface.destroy();
    root.remove();
  });

  it("ignores invalid collection drops onto incompatible worn slots", () => {
    const root = document.createElement("div");
    const selected = { current: "wizard" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade" }),
    ]);
    const commands: unknown[] = [];
    const surface = mountWithSelection(root, selected, (command) => commands.push(command));
    renderArmory(surface, snapshot);

    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')!;
    const weaponSlot = root.querySelector<HTMLElement>('[data-worn-slot="weapon"]')!;
    dragBetween(tile, weaponSlot);
    expect(commands).toEqual([]);

    surface.destroy();
  });

  it("highlights only the compatible worn slot during a collection drag and clears on drag end", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([drop({ dropId: 1, baseId: "fixture-armor" })]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')!;
    const dataTransfer = new DataTransfer();
    tile.dispatchEvent(
      new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
    );
    expect(root.querySelector('[data-worn-slot="armor"]')?.classList.contains("armory-drop-target--valid")).toBe(
      true,
    );
    expect(root.querySelector('[data-worn-slot="weapon"]')?.classList.contains("armory-drop-target--valid")).toBe(
      false,
    );
    expect(root.querySelector<HTMLElement>('[data-armory-compare-popover="true"]')?.hidden).toBe(true);

    tile.dispatchEvent(
      new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }),
    );
    expect(root.querySelector(".armory-drop-target--valid")).toBeNull();

    surface.destroy();
    root.remove();
  });

  it("does not expose interim equip controls for assigned pieces on another Character", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-armor",
        assignedTo: { classId: "wizard", slot: "armor" },
      }),
    ]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    expect(root.querySelector('[data-equip-button="true"]')).toBeNull();
    expect(root.querySelector('[data-cross-equip-confirm="true"]')).toBeNull();

    surface.destroy();
  });

  it("lists Rare and Epic pieces in bulk discard confirm and excludes equipped or Locked rows", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", rarity: "common" }),
      drop({
        dropId: 2,
        baseId: "fixture-armor",
        rarity: "rare",
        locked: true,
      }),
      drop({
        dropId: 3,
        baseId: "fixture-blade-ii",
        itemLevel: 3,
        rarity: "epic",
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
      drop({ dropId: 4, baseId: "fixture-charm", rarity: "epic" }),
    ]);
    const surface = mountWithSelection(root, selected, (command) => commands.push(command));
    renderArmory(surface, snapshot);

    expect(root.querySelector('[data-discard-select="2"]')).toBeNull();
    expect(root.querySelector('[data-discard-select="3"]')).toBeNull();
    const checkbox = root.querySelector<HTMLInputElement>('[data-discard-select="4"]');
    checkbox!.checked = true;
    checkbox!.dispatchEvent(new Event("change"));
    renderArmory(surface, snapshot);

    root.querySelector<HTMLButtonElement>('[data-bulk-discard="true"]')?.click();
    renderArmory(surface, snapshot);
    expect(root.querySelector('[data-discard-confirm="true"]')?.textContent).toMatch(/Fixture Charm/);
    expect(root.querySelector('[data-discard-confirm="true"]')?.textContent).toMatch(/Epic/i);

    root.querySelector<HTMLButtonElement>(".armory-confirm-yes")?.click();
    expect(commands).toContainEqual({ cmd: "discard", args: [[4]] });

    surface.destroy();
  });

  it("marks unseen equipment seen without mutating the Snapshot", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", seen: false }),
    ]);
    for (const entry of snapshot.progression.armory) {
      Object.freeze(entry);
    }
    Object.freeze(snapshot.progression.armory);

    const surface = mountWithSelection(root, selected, (command) => commands.push(command));
    renderArmory(surface, snapshot);
    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')!;
    tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    renderArmory(surface, snapshot);

    expect(snapshot.progression.armory[0]!.seen).toBe(false);
    expect(root.querySelector('[data-unseen-marker="true"]')).toBeNull();

    surface.destroy();
  });

  it("marks pieces seen from the Dock Armory and dispatches markSeen", () => {
    const dockRoot = document.createElement("main");
    const commands: unknown[] = [];
    const dock = mountManagementDock(dockRoot, {
      content: fixtureContent,
      onCommand: (command) => commands.push(command),
    });

    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", seen: false }),
      drop({ dropId: 2, baseId: "fixture-armor", seen: true }),
    ]);
    renderDock(dock, snapshot);
    dockRoot.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();
    renderDock(dock, snapshot);

    dockRoot
      .querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')
      ?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    renderDock(dock, snapshot);
    expect(commands).toContainEqual({ cmd: "markSeen", args: [[1]] });
    expect(dockRoot.querySelector('[data-unseen-marker="true"]')).toBeNull();

    const cleared = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", seen: true }),
      drop({ dropId: 2, baseId: "fixture-armor", seen: true }),
    ]);
    renderDock(dock, cleared);
    expect(dockRoot.querySelector('[data-unseen-marker="true"]')).toBeNull();

    dock.destroy();
  });

  it("excludes equipped Drops from the collection grid", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade",
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
      drop({ dropId: 2, baseId: "fixture-armor" }),
    ]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);
    expect(
      [...root.querySelectorAll<HTMLElement>(".armory-grid .equipment-card")].map(
        (card) => card.dataset["dropId"],
      ),
    ).toEqual(["2"]);
    surface.destroy();
  });

  it("opens the same comparison popover on hover and keyboard focus without inner scroll", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const commands: unknown[] = [];
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade-ii", itemLevel: 3, rarity: "rare", seen: false }),
    ]);
    const surface = mountWithSelection(root, selected, (command) => commands.push(command));
    renderArmory(surface, snapshot);

    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')!;
    tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

    const popover = root.querySelector<HTMLElement>('[data-armory-compare-popover="true"]');
    expect(popover?.hidden).toBe(false);
    expect(getComputedStyle(popover!).pointerEvents).toBe("none");
    expect(popover?.querySelector(".armory-compare-columns")).toBeNull();
    expect(popover?.querySelector('[data-stat-deltas="true"]')).not.toBeNull();
    expect(popover!.scrollHeight).toBeLessThanOrEqual(popover!.clientHeight + 1);
    expect(tile.getAttribute("aria-describedby")).toMatch(/armory-compare-desc-1/);
    expect(commands).toContainEqual({ cmd: "markSeen", args: [[1]] });

    tile.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    tile.focus();
    expect(root.querySelector<HTMLElement>('[data-armory-compare-popover="true"]')?.hidden).toBe(
      false,
    );

    surface.destroy();
    root.remove();
  });

  it("computes comparison popover Equipment stat deltas for a Character pending into the Party", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const selected = { current: "hunter" as ClassId };
    const snapshot = pendingHunterInSnapshot([
      drop({
        dropId: 1,
        baseId: "bramblesong-bow",
        assignedTo: { classId: "hunter", slot: "weapon" },
      }),
      drop({
        dropId: 2,
        baseId: "nightvine-longbow",
        itemLevel: 3,
        rarity: "rare",
      }),
      drop({
        dropId: 3,
        baseId: "thornquill-blade",
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
    ]);
    expect(snapshot.progression.party[0]).toBe("knight");
    expect(snapshot.progression.reserve).toBe("hunter");
    expect(snapshot.progression.pendingParty).toEqual({
      members: ["hunter", "wizard", "priest"],
      reserve: "knight",
    });
    expect(rosterClassIds(snapshot)).toEqual(["hunter", "wizard", "priest", "knight"]);

    const surface = mountArmorySurface(root, {
      content: fullContent,
      getSelectedClassId: () => selected.current,
      selectClassId: (classId) => {
        selected.current = classId;
      },
    });
    const engine = createEngine(fullContent, snapshot, LOOT_SEED);
    surface.render(snapshot, legalityViewFromEngine(engine));

    expect(
      root.querySelector('[data-worn-slot="weapon"]')?.getAttribute("aria-label"),
    ).toMatch(/Bramblesong Bow/);

    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="2"]')!;
    tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

    const popover = root.querySelector<HTMLElement>('[data-armory-compare-popover="true"]');
    expect(popover?.hidden).toBe(false);
    const rows = [...(popover?.querySelectorAll("tbody tr") ?? [])].map((row) =>
      [...row.querySelectorAll("td")].map((cell) => cell.textContent),
    );
    // Hunter Bramblesong Bow (2) → Nightvine Longbow (5); not Knight's worn blade.
    expect(rows).toContainEqual(["Physical", "2", "5", "+3"]);
    expect(rows.some((row) => row[1] === "0" && row[2] === "5")).toBe(false);

    surface.destroy();
    root.remove();
  });

  it("enables worn-slot equip for a Character pending into the Party when Engine legality allows it", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const selected = { current: "hunter" as ClassId };
    const snapshot = pendingHunterInSnapshot([
      drop({
        dropId: 1,
        baseId: "nightvine-longbow",
        itemLevel: 3,
        rarity: "rare",
      }),
    ]);
    const engine = createEngine(fullContent, snapshot, LOOT_SEED);
    const serialized = serializeEngineLegality(engine, snapshot, fullContent);
    const equipKey = "1:hunter:weapon";
    expect(Object.prototype.hasOwnProperty.call(serialized.equip, equipKey)).toBe(true);
    expect(serialized.equip[equipKey]).toBe(engine.canEquip(1, "hunter", "weapon"));
    expect(serialized.equip[equipKey]).toBe(true);

    const surface = mountArmorySurface(root, {
      content: fullContent,
      getSelectedClassId: () => selected.current,
      selectClassId: (classId) => {
        selected.current = classId;
      },
    });
    surface.render(snapshot, legalityViewFromSerialized(serialized));

    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')!;
    tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(root.querySelector<HTMLElement>('[data-armory-compare-popover="true"]')?.hidden).toBe(
      false,
    );

    const dataTransfer = new DataTransfer();
    tile.dispatchEvent(
      new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
    );
    expect(
      root.querySelector('[data-worn-slot="weapon"]')?.classList.contains("armory-drop-target--valid"),
    ).toBe(true);

    surface.destroy();
    root.remove();
  });

  it("hides bulk discard until at least one tile is selected", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", rarity: "common" }),
    ]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);
    expect(root.querySelector('[data-bulk-discard="true"]')).toBeNull();
    const checkbox = root.querySelector<HTMLInputElement>('[data-discard-select="1"]')!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    renderArmory(surface, snapshot);
    expect(root.querySelector('[data-bulk-discard-strip="true"]')).not.toBeNull();
    surface.destroy();
  });

  it("locks from the tile control and keeps discard selection keyboard-reachable", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const commands: unknown[] = [];
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-charm", rarity: "common" }),
    ]);
    const surface = mountWithSelection(root, selected, (command) => commands.push(command));
    renderArmory(surface, snapshot);

    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]');
    const checkbox = tile?.querySelector<HTMLInputElement>('[data-discard-select="1"]');
    expect(checkbox).not.toBeNull();
    checkbox!.focus();
    expect(document.activeElement).toBe(checkbox);

    const lock = root.querySelector<HTMLButtonElement>('[data-tile-lock="1"]');
    lock?.focus();
    activateFocused();
    expect(commands).toContainEqual({ cmd: "setLocked", args: [1, true] });

    surface.destroy();
    root.remove();
  });
});

describe("Armory surface source boundary", () => {
  it("does not import the Engine", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "armory-surface.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']\.\.\/core\/engine["']/);
  });

  it("does not retain interim detail equip movement markup hooks", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "armory-surface.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/armory-detail|equipButton|crossEquipConfirm|unequipSlot/);
  });

  it("does not inline applied Party and Reserve for the comparison popover Roster", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "armory-surface.ts"),
      "utf8",
    );
    expect(source).not.toMatch(
      /\[\.\.\.snapshot\.progression\.party,\s*snapshot\.progression\.reserve\]/,
    );
    expect(source).toMatch(/const roster = rosterClassIds\(snapshot\);/);
  });
});
