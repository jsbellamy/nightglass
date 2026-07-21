// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { cloneSnapshot, type DropInstance, type Snapshot } from "../core/snapshot";
import type { ClassId } from "../core/types";
import { fixtureContent } from "../core/testing/fixture-content";
import { mountArmorySurface } from "./armory-surface";
import { mountManagementDock } from "./dock";
import { legalityViewFromEngine } from "./engine-legality";
import {
  filterArmoryDrops,
  type ArmoryFilters,
} from "./equipment-format";

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
  const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
  const snapshot = cloneSnapshot(engine.snapshot());
  snapshot.progression.armory = armory;
  return snapshot;
}

describe("Armory surface", () => {
  it("does not render a slot strip; grid and detail are siblings", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, armorySnapshot([drop({ dropId: 1, baseId: "fixture-blade" })]));

    expect(root.querySelector(".armory-slot-strip")).toBeNull();
    const panes = root.querySelector(".armory-panes");
    expect(panes?.querySelector(".armory-grid")).not.toBeNull();
    expect(panes?.querySelector(".armory-detail")).not.toBeNull();
    expect(root.querySelector('[data-armory-collection="true"]')).not.toBeNull();
    expect(root.querySelector('[data-armory-detail="true"]')).not.toBeNull();

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

  it("renders tiles with a content icon, name, markers, data-drop-id, and rarity class", () => {
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
    ]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]');
    expect(tile?.classList.contains("rarity-rare")).toBe(true);
    const icon = tile?.querySelector<HTMLImageElement>(".equipment-icon-img--content");
    expect(icon?.width).toBe(34);
    expect(icon?.height).toBe(34);
    expect(tile?.querySelector(".equipment-name")?.textContent).toMatch(/Fixture Blade/);
    expect(tile?.querySelector('[data-unseen-marker="true"]')).not.toBeNull();
    expect(tile?.querySelector(".locked-marker")).not.toBeNull();
    expect(tile?.querySelector(".assigned-marker")).not.toBeNull();
    expect(root.querySelector(".armory-filter")).toBeNull();

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
        assignedTo: { classId: "knight", slot: "armor" },
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
    state!.value = "assigned";
    state!.dispatchEvent(new Event("change"));
    renderArmory(surface, snapshot);
    expect(root.querySelector<HTMLElement>(".armory-grid .equipment-card")?.dataset["dropId"]).toBe(
      "2",
    );

    const sort = root.querySelector<HTMLSelectElement>('[data-armory-sort="true"]');
    sort!.value = "name";
    sort!.dispatchEvent(new Event("change"));
    renderArmory(surface, snapshot);
    expect(root.querySelector(".armory-grid .equipment-card")?.textContent).toMatch(/Fixture Armor/);

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

  it("selecting a tile fills the detail panel and publishes markSeen for an unseen Drop", () => {
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

    root.querySelector<HTMLElement>('.equipment-card[data-drop-id="2"]')?.click();
    renderArmory(surface, snapshot);

    expect(root.querySelector('[data-armory-detail="true"] .equipment-name')?.textContent).toMatch(
      /Fixture Blade/,
    );
    expect(root.querySelector(".armory-compare-columns")).not.toBeNull();
    expect(
      [...root.querySelectorAll(".armory-compare-column h4")].map((node) => node.textContent),
    ).toEqual(["Equipped", "Selected"]);
    expect(root.querySelector('[data-stat-deltas="true"]')).not.toBeNull();
    expect(root.querySelector('[data-ability-deltas="true"]')).not.toBeNull();
    expect(root.querySelector('[data-next-attempt-note="true"]')?.textContent).toMatch(
      /next Stage Attempt/i,
    );
    expect(root.querySelector("[data-drop-detail]")).toBeNull();
    expect(root.textContent?.toLowerCase()).not.toMatch(/\bpower total\b|\baggregate score\b/);

    root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')?.click();
    renderArmory(surface, snapshot);
    expect(commands).toContainEqual({ cmd: "markSeen", args: [[1]] });
    expect(root.querySelector('[data-unseen-marker="true"]')).toBeNull();

    surface.destroy();
  });

  it("equips to the picker-selected Character at the Drop's own Base slot", () => {
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
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "equip") {
          engine.equip(command.args[0], command.args[1], command.args[2]);
        }
      },
    });

    renderArmory(surface, engine.snapshot());
    root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')?.click();
    renderArmory(surface, engine.snapshot());

    const equip = root.querySelector<HTMLButtonElement>('[data-equip-button="true"]');
    equip?.focus();
    activateFocused();
    expect(commands).toContainEqual({ cmd: "equip", args: [1, "wizard", "armor"] });

    surface.destroy();
    root.remove();
  });

  it("does not offer equip for a Class-restricted Weapon on another Class", () => {
    const root = document.createElement("div");
    const selected = { current: "wizard" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade" }),
    ]);
    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);

    root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')?.click();
    renderArmory(surface, snapshot);

    expect(root.querySelector('[data-equip-button="true"]')).toBeNull();

    surface.destroy();
  });

  it("requires inline confirm before equipping from another Character and leaves that slot empty", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const selected = { current: "knight" as ClassId };
    const saved = armorySnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-armor",
        assignedTo: { classId: "wizard", slot: "armor" },
      }),
      drop({ dropId: 2, baseId: "fixture-armor-ii", itemLevel: 3, rarity: "rare" }),
    ]);
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const commands: unknown[] = [];
    const surface = mountArmorySurface(root, {
      content: fixtureContent,
      getSelectedClassId: () => selected.current,
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "equip") {
          engine.equip(command.args[0], command.args[1], command.args[2]);
        }
      },
    });

    renderArmory(surface, engine.snapshot());
    root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')?.click();
    renderArmory(surface, engine.snapshot());

    const equip = root.querySelector<HTMLButtonElement>('[data-equip-button="true"]');
    equip?.focus();
    activateFocused();
    renderArmory(surface, engine.snapshot());
    expect(root.querySelector('[data-cross-equip-confirm="true"]')).not.toBeNull();
    expect(root.querySelector('[data-cross-equip-confirm="true"]')?.textContent).toMatch(/Wizard/);

    const confirm = root.querySelector<HTMLButtonElement>(".armory-confirm-yes");
    confirm?.focus();
    activateFocused();
    const snapshot = engine.snapshot();
    renderArmory(surface, snapshot);

    expect(commands).toContainEqual({ cmd: "equip", args: [1, "knight", "armor"] });
    expect(
      snapshot.progression.armory.find(
        (entry) => entry.assignedTo?.classId === "wizard" && entry.assignedTo.slot === "armor",
      ),
    ).toBeUndefined();
    expect(snapshot.progression.armory.find((entry) => entry.dropId === 1)?.assignedTo).toEqual({
      classId: "knight",
      slot: "armor",
    });

    surface.destroy();
    root.remove();
  });

  it("browse-slot intent filters to pieces compatible with that Character and slot", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade" }),
      drop({ dropId: 2, baseId: "fixture-focus" }),
      drop({ dropId: 3, baseId: "fixture-armor" }),
    ]);
    const engine = createEngine(fixtureContent, snapshot, LOOT_SEED);
    const surface = mountWithSelection(root, selected);
    surface.render(snapshot, legalityViewFromEngine(engine), {
      kind: "browse-slot",
      classId: "knight",
      slot: "weapon",
    });

    expect(
      root
        .querySelector<HTMLButtonElement>('[data-slot-filter="weapon"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      [...root.querySelectorAll<HTMLElement>(".armory-grid .equipment-card")].map(
        (card) => card.dataset["dropId"],
      ),
    ).toEqual(["1"]);

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
    const selected = { current: "knight" as ClassId };
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", seen: false }),
    ]);
    for (const entry of snapshot.progression.armory) {
      Object.freeze(entry);
    }
    Object.freeze(snapshot.progression.armory);

    const surface = mountWithSelection(root, selected);
    renderArmory(surface, snapshot);
    root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')?.click();
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

    dockRoot.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]')?.click();
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

  it("locks from the detail panel and keeps discard selection keyboard-reachable on the tile", () => {
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

    tile?.click();
    renderArmory(surface, snapshot);
    const lock = root.querySelector<HTMLButtonElement>('[data-lock-toggle="1"]');
    lock?.focus();
    activateFocused();
    expect(commands).toContainEqual({ cmd: "setLocked", args: [1, true] });

    surface.destroy();
    root.remove();
  });

  it("completes a keyboard select-and-equip flow against the picker selection", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const selected = { current: "knight" as ClassId };
    const saved = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade-ii", itemLevel: 3, rarity: "rare", seen: false }),
    ]);
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const commands: unknown[] = [];
    const surface = mountArmorySurface(root, {
      content: fixtureContent,
      getSelectedClassId: () => selected.current,
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "equip") {
          engine.equip(command.args[0], command.args[1], command.args[2]);
        }
        if (command.cmd === "markSeen") {
          engine.markSeen(command.args[0]);
        }
      },
    });

    renderArmory(surface, engine.snapshot());

    const tile = root.querySelector<HTMLElement>('.equipment-card[data-drop-id="1"]');
    tile?.focus();
    activateFocused();
    renderArmory(surface, engine.snapshot());
    expect(commands).toContainEqual({ cmd: "markSeen", args: [[1]] });

    const equip = root.querySelector<HTMLButtonElement>('[data-equip-button="true"]');
    equip?.focus();
    activateFocused();
    expect(commands).toContainEqual({ cmd: "equip", args: [1, "knight", "weapon"] });

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
});
