// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import { mountBattleTile } from "./battle-tile";
import { DOCK_SURFACES, DOCK_TABS, mountManagementDock } from "./dock";

function mountDock(root: HTMLElement, options: Parameters<typeof mountManagementDock>[1] = {}) {
  return mountManagementDock(root, { content: fixtureContent, ...options });
}

describe("Management Dock shell", () => {
  it("registers every dock tab in DOCK_SURFACES and no extras", () => {
    const tabIds = DOCK_TABS.map((tab) => tab.id);
    const surfaceIds = DOCK_SURFACES.map((entry) => entry.id);
    expect(surfaceIds).toEqual(tabIds);
    expect(new Set(surfaceIds).size).toBe(surfaceIds.length);
  });

  it("renders tabs in Party, Loadout, Talents, Armory, Stage order", () => {
    const root = document.createElement("main");
    mountDock(root);
    const labels = [...root.querySelectorAll<HTMLButtonElement>(".dock-tab")].map(
      (button) => button.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(labels).toEqual(["Party", "Loadout", "Talents", "Armory", "Stage"]);
  });

  it("shows one surface at a time across the five tabs", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    dock.render(engine.snapshot());

    const panels = () => [...root.querySelectorAll<HTMLElement>("[data-dock-panel]")];
    expect(panels()).toHaveLength(5);
    expect(panels().filter((panel) => !panel.hidden)).toHaveLength(1);
    expect(root.querySelector<HTMLElement>('[data-dock-panel="party"]')?.hidden).toBe(false);

    root.querySelector<HTMLButtonElement>('[data-dock-tab="loadout"]')?.click();
    dock.render(engine.snapshot());
    expect(root.querySelector<HTMLElement>('[data-dock-panel="party"]')?.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('[data-dock-panel="loadout"]')?.hidden).toBe(false);

    dock.destroy();
  });

  it("closes when the active tab is pressed again or the close button is used", () => {
    const root = document.createElement("main");
    const onClose = vi.fn();
    const dock = mountDock(root, { onClose });

    root.querySelector<HTMLButtonElement>('[data-dock-tab="party"]')?.click();
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    root.querySelector<HTMLButtonElement>(".dock-close")?.click();
    expect(onClose).toHaveBeenCalledTimes(1);

    dock.destroy();
  });

  it("cycles tabs with keyboard arrows and closes on Escape", () => {
    const root = document.createElement("main");
    const onClose = vi.fn();
    mountDock(root, { onClose });

    const partyTab = root.querySelector<HTMLButtonElement>('[data-dock-tab="party"]');
    partyTab?.focus();
    partyTab?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(root.querySelector<HTMLElement>('[data-dock-panel="loadout"]')?.hidden).toBe(false);

    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders each management surface without interim placeholders when its tab is active", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    dock.render(engine.snapshot());

    for (const tab of DOCK_TABS) {
      root.querySelector<HTMLButtonElement>(`[data-dock-tab="${tab.id}"]`)?.click();
      const panel = root.querySelector<HTMLElement>(`[data-dock-panel="${tab.id}"]`);
      expect(panel?.querySelector(".dock-placeholder-copy")).toBeNull();
    }

    dock.destroy();
  });

  it("labels encounter 3 as Boss consistently with the Battle Tile and Stage surface", () => {
    const dockRoot = document.createElement("main");
    const battleRoot = document.createElement("main");
    const dock = mountDock(dockRoot);
    const battleTile = mountBattleTile(battleRoot, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = structuredClone(engine.snapshot());
    if (!snapshot.attempt) {
      throw new Error("missing Attempt");
    }
    snapshot.attempt.encounter = 3;
    snapshot.progression.unlockedStage = 3;

    dock.render(snapshot);
    battleTile.render(snapshot);
    dockRoot.querySelector<HTMLButtonElement>('[data-dock-tab="stage"]')?.click();

    const dockLabel = dockRoot.dataset["stageLabel"] ?? "";
    const battleLabel = battleRoot.querySelector(".stage-wave-text")?.textContent ?? "";
    const stagePosition =
      dockRoot.querySelector(".stage-surface .attempt-position")?.textContent ?? "";

    expect(dockLabel).toContain("Boss");
    expect(dockLabel).not.toContain("Wave 3");
    expect(battleLabel).toContain("Boss");
    expect(battleLabel).not.toContain("Wave 3");
    expect(stagePosition).toContain("Boss");
    expect(stagePosition).not.toContain("Wave 3");

    dock.destroy();
    battleTile.destroy();
  });

  it("renders the Armory tab without a badge element", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);

    const armoryTab = root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]');
    expect(armoryTab?.childElementCount).toBe(0);

    dock.destroy();
  });
});

describe("Management Dock active-surface rendering", () => {
  it("renders only the active surface on pump-driven updates", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);

    dock.render(engine.snapshot());

    expect(root.querySelector(".party-surface")?.childElementCount).toBeGreaterThan(0);
    expect(root.querySelector(".loadout-surface")?.childElementCount).toBe(0);
    expect(root.querySelector(".talents-surface")?.childElementCount).toBe(0);
    expect(root.querySelector(".armory-surface")?.childElementCount).toBe(0);
    expect(root.querySelector(".stage-surface")?.childElementCount).toBe(0);

    dock.destroy();
  });

  it("renders a never-before-seen tab from held state on first activation", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = structuredClone(engine.snapshot());
    dock.render(snapshot);

    expect(root.querySelector(".loadout-surface .dock-surface-title")).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-dock-tab="loadout"]')?.click();

    expect(root.querySelector(".loadout-surface .dock-surface-title")).not.toBeNull();

    root.remove();
    dock.destroy();
  });

  it("shows the latest pump state when returning to a previously rendered tab", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    const first = structuredClone(engine.snapshot());
    if (!first.attempt) {
      throw new Error("missing Attempt");
    }
    first.attempt.encounter = 1;
    dock.render(first);

    root.querySelector<HTMLButtonElement>('[data-dock-tab="stage"]')?.click();
    expect(root.querySelector(".stage-surface .attempt-position")?.textContent).toContain("Wave 1");

    const second = structuredClone(first);
    second.attempt!.encounter = 2;
    dock.render(second);

    root.querySelector<HTMLButtonElement>('[data-dock-tab="party"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-dock-tab="stage"]')?.click();

    expect(root.querySelector(".stage-surface .attempt-position")?.textContent).toContain("Wave 2");

    root.remove();
    dock.destroy();
  });

  it("keeps focus inside the active surface across coalesced pump renders", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    dock.render(engine.snapshot());

    const focusTarget = root.querySelector<HTMLElement>('[data-dock-tab="party"]');
    focusTarget?.focus();
    expect(document.activeElement).toBe(focusTarget);

    dock.render(engine.snapshot());

    expect(document.activeElement).toBe(focusTarget);

    root.remove();
    dock.destroy();
  });
});

describe("Management Dock Character picker", () => {
  it("renders the picker as a sibling of .dock-surface on every tab", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    dock.render(engine.snapshot());

    const picker = root.querySelector(".character-picker");
    const surface = root.querySelector(".dock-surface");
    expect(picker).not.toBeNull();
    expect(surface).not.toBeNull();
    expect(picker?.parentElement).toBe(root.querySelector(".dock-body"));
    expect(surface?.parentElement).toBe(picker?.parentElement);
    expect(root.querySelector(".dock-panel .character-picker")).toBeNull();

    for (const tab of DOCK_TABS) {
      root.querySelector<HTMLButtonElement>(`[data-dock-tab="${tab.id}"]`)?.click();
      expect(root.querySelector(".character-picker")).toBe(picker);
    }

    dock.destroy();
  });

  it("selects progression.party[0] on the first Snapshot and updates aria-selected on chip activation", () => {
    const root = document.createElement("main");
    const onCommand = vi.fn();
    const dock = mountDock(root, { onCommand });
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = engine.snapshot();
    const partyFront = snapshot.progression.party[0]!;
    const other = snapshot.progression.party[1]!;

    dock.render(snapshot);

    const chips = [...root.querySelectorAll<HTMLElement>("[data-character-chip]")];
    expect(
      chips.find((chip) => chip.dataset["characterChip"] === partyFront)?.getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
    expect(
      chips
        .filter((chip) => chip.dataset["characterChip"] !== partyFront)
        .every((chip) => chip.getAttribute("aria-selected") === "false"),
    ).toBe(true);

    root.querySelector<HTMLElement>(`[data-character-chip="${other}"]`)?.click();
    expect(
      root
        .querySelector(`[data-character-chip="${other}"]`)
        ?.getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      root
        .querySelector(`[data-character-chip="${partyFront}"]`)
        ?.getAttribute("aria-selected"),
    ).toBe("false");
    expect(root.querySelector(".party-surface")?.childElementCount).toBeGreaterThan(0);
    expect(onCommand).not.toHaveBeenCalled();

    const third = snapshot.progression.party[2]!;
    const thirdChip = root.querySelector<HTMLElement>(`[data-character-chip="${third}"]`);
    thirdChip?.focus();
    thirdChip?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(
      root.querySelector(`[data-character-chip="${third}"]`)?.getAttribute("aria-selected"),
    ).toBe("true");
    expect(onCommand).not.toHaveBeenCalled();

    dock.destroy();
  });

  it("keeps picker selection across tab switches without remounting", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = engine.snapshot();
    const target = snapshot.progression.party[1]!;

    dock.render(snapshot);
    const picker = root.querySelector(".character-picker");
    root.querySelector<HTMLElement>(`[data-character-chip="${target}"]`)?.click();

    root.querySelector<HTMLButtonElement>('[data-dock-tab="loadout"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-dock-tab="party"]')?.click();

    expect(root.querySelector(".character-picker")).toBe(picker);
    expect(
      root
        .querySelector(`[data-character-chip="${target}"]`)
        ?.getAttribute("aria-selected"),
    ).toBe("true");

    dock.destroy();
  });

  it("destroys the picker with the dock and does not persist selection across remount", () => {
    const root = document.createElement("main");
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = engine.snapshot();
    const partyFront = snapshot.progression.party[0]!;
    const other = snapshot.progression.party[1]!;

    const first = mountDock(root);
    first.render(snapshot);
    root.querySelector<HTMLElement>(`[data-character-chip="${other}"]`)?.click();
    first.destroy();
    expect(root.querySelector(".character-picker")).toBeNull();

    const second = mountDock(root);
    second.render(snapshot);
    expect(
      root
        .querySelector(`[data-character-chip="${partyFront}"]`)
        ?.getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      root
        .querySelector(`[data-character-chip="${other}"]`)
        ?.getAttribute("aria-selected"),
    ).toBe("false");

    second.destroy();
  });
});

describe("Management Dock source boundary", () => {
  it("does not import the Engine", () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "dock.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["']\.\.\/core\/engine["']/);
  });
});
