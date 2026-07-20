// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { cloneSnapshot, type DropInstance, type Snapshot } from "../core/snapshot";
import { fixtureContent } from "../core/testing/fixture-content";
import { mountArmorySurface } from "./armory-surface";
import { mountManagementDock } from "./dock";
import { legalityViewFromEngine } from "./engine-legality";

const LOOT_SEED = 42;

function renderArmory(
  surface: ReturnType<typeof mountArmorySurface>,
  snapshot: Snapshot,
): void {
  const engine = createEngine(fixtureContent, snapshot, LOOT_SEED);
  surface.render(snapshot, legalityViewFromEngine(engine));
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
  it("orders the collection Unseen-first then newest by default", () => {
    const root = document.createElement("div");
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", awardedAtMs: 100, seen: true }),
      drop({ dropId: 2, baseId: "fixture-armor", awardedAtMs: 300, seen: false }),
      drop({ dropId: 3, baseId: "fixture-charm", awardedAtMs: 200, seen: false }),
    ]);
    const surface = mountArmorySurface(root, { content: fixtureContent });
    renderArmory(surface, snapshot);

    const ids = [...root.querySelectorAll<HTMLElement>(".equipment-card")].map(
      (card) => card.dataset["dropId"],
    );
    expect(ids).toEqual(["2", "3", "1"]);

    surface.destroy();
  });

  it("applies each filter, sort, and combinations from the toolbar", () => {
    const root = document.createElement("div");
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
    const surface = mountArmorySurface(root, { content: fixtureContent });
    renderArmory(surface, snapshot);

    root.querySelector<HTMLButtonElement>('[data-filter-key="slot"][data-filter-value="weapon"]')?.click();
    renderArmory(surface, snapshot);
    expect(
      [...root.querySelectorAll<HTMLElement>(".equipment-card")].map((card) => card.dataset["dropId"]),
    ).toEqual(["1", "3"]);

    root.querySelector<HTMLButtonElement>(".armory-filter-clear")?.click();
    renderArmory(surface, snapshot);
    root.querySelector<HTMLButtonElement>('[data-filter-key="assigned"][data-filter-value="assigned"]')?.click();
    renderArmory(surface, snapshot);
    expect(root.querySelector<HTMLElement>(".equipment-card")?.dataset["dropId"]).toBe("2");

    const sort = root.querySelector<HTMLSelectElement>('[data-armory-sort="true"]');
    sort!.value = "name";
    sort!.dispatchEvent(new Event("change"));
    renderArmory(surface, snapshot);
    expect(root.querySelector(".equipment-card")?.textContent).toMatch(/Fixture Armor/);

    surface.destroy();
  });

  it("shows compare deltas, raw Ability changes, the next-Attempt note, and no Power totals", () => {
    const root = document.createElement("div");
    const snapshot = armorySnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade",
        awardedAtMs: 100,
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
      drop({
        dropId: 2,
        baseId: "fixture-blade-ii",
        itemLevel: 3,
        awardedAtMs: 200,
        rarity: "rare",
        affixes: [{ id: "flat-physical", value: 3 }],
      }),
    ]);
    const surface = mountArmorySurface(root, { content: fixtureContent });
    renderArmory(surface, snapshot);

    root.querySelector<HTMLButtonElement>('[data-class-id="knight"][data-compare-slot="weapon"]')?.click();
    renderArmory(surface, snapshot);
    expect(root.querySelector('[data-next-attempt-note="true"]')?.textContent).toMatch(
      /next Stage Attempt/i,
    );

    root.querySelector<HTMLButtonElement>('[data-compare-candidate="2"]')?.click();
    renderArmory(surface, snapshot);
    expect(root.querySelector('[data-stat-deltas="true"]')?.textContent).toMatch(/Physical/);
    expect(root.querySelector('[data-ability-deltas="true"]')).not.toBeNull();
    expect(root.textContent?.toLowerCase()).not.toMatch(/\bpower total\b|\baggregate score\b/);

    surface.destroy();
  });

  it("requires inline confirm before equipping from another Character and leaves that slot empty", () => {
    const root = document.createElement("div");
    document.body.append(root);
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
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "equip") {
          engine.equip(command.args[0], command.args[1], command.args[2]);
        }
      },
    });

    renderArmory(surface, engine.snapshot());

    root.querySelector<HTMLButtonElement>('[data-class-id="knight"][data-compare-slot="armor"]')?.click();
    renderArmory(surface, engine.snapshot());
    root.querySelector<HTMLButtonElement>('[data-compare-candidate="1"]')?.click();
    renderArmory(surface, engine.snapshot());

    const equip = root.querySelector<HTMLButtonElement>('[data-equip-button="true"]');
    equip?.focus();
    activateFocused();
    renderArmory(surface, engine.snapshot());
    expect(root.querySelector('[data-cross-equip-confirm="true"]')).not.toBeNull();

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

  it("lists Rare and Epic pieces in bulk discard confirm and excludes equipped or Locked rows", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
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
    const surface = mountArmorySurface(root, {
      content: fixtureContent,
      onCommand: (command) => commands.push(command),
    });
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
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", seen: false }),
    ]);
    for (const entry of snapshot.progression.armory) {
      Object.freeze(entry);
    }
    Object.freeze(snapshot.progression.armory);

    const surface = mountArmorySurface(root, { content: fixtureContent });
    renderArmory(surface, snapshot);
    root.querySelector<HTMLButtonElement>('[data-open-detail="1"]')?.click();
    renderArmory(surface, snapshot);

    expect(snapshot.progression.armory[0]!.seen).toBe(false);
    expect(root.querySelector('[data-unseen-marker="true"]')).toBeNull();

    surface.destroy();
  });

  it("marks pieces seen from detail and clears the dock badge when none remain", () => {
    const dockRoot = document.createElement("main");
    const commands: unknown[] = [];
    const dock = mountManagementDock(dockRoot, {
      content: fixtureContent,
      onCommand: (command) => commands.push(command),
    });
    dock.setArmoryBadge(true);

    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", seen: false }),
      drop({ dropId: 2, baseId: "fixture-armor", seen: true }),
    ]);
    renderDock(dock, snapshot);
    dockRoot.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();
    renderDock(dock, snapshot);

    dockRoot.querySelector<HTMLButtonElement>('[data-open-detail="1"]')?.click();
    renderDock(dock, snapshot);
    expect(commands).toContainEqual({ cmd: "markSeen", args: [[1]] });
    expect(dockRoot.querySelector('[data-unseen-marker="true"]')).toBeNull();

    const cleared = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", seen: true }),
      drop({ dropId: 2, baseId: "fixture-armor", seen: true }),
    ]);
    renderDock(dock, cleared);
    expect(
      dockRoot.querySelector<HTMLElement>('[data-dock-tab="armory"] .dock-tab-badge')?.hidden,
    ).toBe(true);

    dock.destroy();
  });

  it("renders 34×34 Equipment icons on cards with rarity background tint and 16×16 slot icons", () => {
    const root = document.createElement("div");
    const snapshot = armorySnapshot([
      drop({
        dropId: 1,
        baseId: "fixture-blade",
        rarity: "rare",
        seen: false,
        assignedTo: { classId: "knight", slot: "weapon" },
      }),
      drop({ dropId: 2, baseId: "fixture-armor", rarity: "epic", seen: true }),
    ]);
    const surface = mountArmorySurface(root, { content: fixtureContent });
    renderArmory(surface, snapshot);

    const cardIcon = root.querySelector<HTMLImageElement>(
      ".equipment-card .equipment-icon-img--content",
    );
    expect(cardIcon).not.toBeNull();
    expect(cardIcon?.width).toBe(34);
    expect(cardIcon?.height).toBe(34);
    expect(root.querySelector('[data-rarity-label="true"]')).toBeNull();
    expect(root.querySelector(".equipment-card.rarity-rare")).not.toBeNull();

    const slotIcon = root.querySelector<HTMLImageElement>(
      '[data-class-id="knight"] .equipment-icon-img--chrome',
    );
    expect(slotIcon).not.toBeNull();
    expect(slotIcon?.width).toBe(16);
    expect(slotIcon?.height).toBe(16);
    expect(
      root.querySelector('[data-class-id="knight"] .armory-slot-label')?.textContent,
    ).toBe("Weapon");

    surface.destroy();
  });

  it("completes a keyboard compare-and-equip flow", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const saved = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade-ii", itemLevel: 3, rarity: "rare", seen: false }),
    ]);
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const commands: unknown[] = [];
    const surface = mountArmorySurface(root, {
      content: fixtureContent,
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

    const slot = root.querySelector<HTMLButtonElement>(
      '[data-class-id="knight"][data-compare-slot="weapon"]',
    );
    slot?.focus();
    activateFocused();
    renderArmory(surface, engine.snapshot());

    const candidate = root.querySelector<HTMLButtonElement>('[data-compare-candidate="1"]');
    candidate?.focus();
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
