// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import { DOCK_TABS, mountManagementDock } from "./dock";

function mountDock(root: HTMLElement, options: Parameters<typeof mountManagementDock>[1] = {}) {
  return mountManagementDock(root, { content: fixtureContent, ...options });
}

describe("Management Dock shell", () => {
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

  it("renders all management surfaces without interim placeholders", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    dock.render(engine.snapshot());

    for (const tab of DOCK_TABS) {
      const panel = root.querySelector<HTMLElement>(`[data-dock-panel="${tab.id}"]`);
      expect(panel?.querySelector(".dock-placeholder-copy")).toBeNull();
    }

    expect(root.querySelector(".loadout-surface")).not.toBeNull();
    expect(root.querySelector(".talents-surface")).not.toBeNull();
    expect(root.querySelector(".armory-surface")).not.toBeNull();

    dock.destroy();
  });

  it("shows the Armory tab badge when the drop-toast hook fires", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);

    expect(root.querySelector<HTMLElement>('[data-dock-tab="armory"] .dock-tab-badge')?.hidden).toBe(true);
    dock.setArmoryBadge(true);
    expect(root.querySelector<HTMLElement>('[data-dock-tab="armory"] .dock-tab-badge')?.hidden).toBe(false);

    dock.destroy();
  });
});

describe("Management Dock source boundary", () => {
  it("does not import the Engine", () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "dock.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["']\.\.\/core\/engine["']/);
  });
});
