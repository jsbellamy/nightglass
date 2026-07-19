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

const LOOT_SEED = 42;

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
    surface.render(snapshot);

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
    surface.render(snapshot);

    root.querySelector<HTMLButtonElement>('[data-filter-key="slot"][data-filter-value="weapon"]')?.click();
    surface.render(snapshot);
    expect(
      [...root.querySelectorAll<HTMLElement>(".equipment-card")].map((card) => card.dataset["dropId"]),
    ).toEqual(["1", "3"]);

    root.querySelector<HTMLButtonElement>(".armory-filter-clear")?.click();
    surface.render(snapshot);
    root.querySelector<HTMLButtonElement>('[data-filter-key="assigned"][data-filter-value="assigned"]')?.click();
    surface.render(snapshot);
    expect(root.querySelector<HTMLElement>(".equipment-card")?.dataset["dropId"]).toBe("2");

    const sort = root.querySelector<HTMLSelectElement>('[data-armory-sort="true"]');
    sort!.value = "name";
    sort!.dispatchEvent(new Event("change"));
    surface.render(snapshot);
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
    surface.render(snapshot);

    root.querySelector<HTMLButtonElement>('[data-class-id="knight"][data-compare-slot="weapon"]')?.click();
    surface.render(snapshot);
    expect(root.querySelector('[data-next-attempt-note="true"]')?.textContent).toMatch(
      /next Stage Attempt/i,
    );

    root.querySelector<HTMLButtonElement>('[data-compare-candidate="2"]')?.click();
    surface.render(snapshot);
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

    surface.render(engine.snapshot());

    root.querySelector<HTMLButtonElement>('[data-class-id="knight"][data-compare-slot="armor"]')?.click();
    surface.render(engine.snapshot());
    root.querySelector<HTMLButtonElement>('[data-compare-candidate="1"]')?.click();
    surface.render(engine.snapshot());

    const equip = root.querySelector<HTMLButtonElement>('[data-equip-button="true"]');
    equip?.focus();
    activateFocused();
    surface.render(engine.snapshot());
    expect(root.querySelector('[data-cross-equip-confirm="true"]')).not.toBeNull();

    const confirm = root.querySelector<HTMLButtonElement>(".armory-confirm-yes");
    confirm?.focus();
    activateFocused();
    const snapshot = engine.snapshot();
    surface.render(snapshot);

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
    surface.render(snapshot);

    expect(root.querySelector('[data-discard-select="2"]')).toBeNull();
    expect(root.querySelector('[data-discard-select="3"]')).toBeNull();
    const checkbox = root.querySelector<HTMLInputElement>('[data-discard-select="4"]');
    checkbox!.checked = true;
    checkbox!.dispatchEvent(new Event("change"));
    surface.render(snapshot);

    root.querySelector<HTMLButtonElement>('[data-bulk-discard="true"]')?.click();
    surface.render(snapshot);
    expect(root.querySelector('[data-discard-confirm="true"]')?.textContent).toMatch(/Fixture Charm/);
    expect(root.querySelector('[data-discard-confirm="true"]')?.textContent).toMatch(/Epic/i);

    root.querySelector<HTMLButtonElement>(".armory-confirm-yes")?.click();
    expect(commands).toContainEqual({ cmd: "discard", args: [[4]] });

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
    dock.render(snapshot);
    dockRoot.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();
    dock.render(snapshot);

    dockRoot.querySelector<HTMLButtonElement>('[data-open-detail="1"]')?.click();
    dock.render(snapshot);
    expect(commands).toContainEqual({ cmd: "markSeen", args: [[1]] });
    expect(dockRoot.querySelector('[data-unseen-marker="true"]')).toBeNull();

    const cleared = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", seen: true }),
      drop({ dropId: 2, baseId: "fixture-armor", seen: true }),
    ]);
    dock.render(cleared);
    expect(
      dockRoot.querySelector<HTMLElement>('[data-dock-tab="armory"] .dock-tab-badge')?.hidden,
    ).toBe(true);

    dock.destroy();
  });

  it("labels interim text-chip icons for slice #58 and exposes Rarity text labels", () => {
    const root = document.createElement("div");
    const snapshot = armorySnapshot([
      drop({ dropId: 1, baseId: "fixture-blade", rarity: "rare", seen: false }),
    ]);
    const surface = mountArmorySurface(root, { content: fixtureContent });
    surface.render(snapshot);

    expect(root.querySelector('[data-interim-icon-note="issue-58"]')).not.toBeNull();
    expect(root.querySelector('[data-interim-icon="issue-58"]')?.textContent).toBe("FB");
    expect(root.querySelector('[data-rarity-label="true"]')?.textContent).toBe("Rare");

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

    surface.render(engine.snapshot());

    const slot = root.querySelector<HTMLButtonElement>(
      '[data-class-id="knight"][data-compare-slot="weapon"]',
    );
    slot?.focus();
    activateFocused();
    surface.render(engine.snapshot());

    const candidate = root.querySelector<HTMLButtonElement>('[data-compare-candidate="1"]');
    candidate?.focus();
    activateFocused();
    surface.render(engine.snapshot());
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
