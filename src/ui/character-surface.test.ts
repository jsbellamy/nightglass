// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import type { ClassId } from "../core/types";
import { CHARACTER_VIEWS, mountCharacterSurface } from "./character-surface";
import type { DockSurfaceMountOptions } from "./dock";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";
import { mountManagementDock } from "./dock";
import { levelFor } from "./snapshot-view";

const LOOT_SEED = 42;

function mountOptions(
  selected: { current: ClassId },
  extras: {
    onCommand?: (command: { cmd: string; args: unknown }) => void;
  } = {},
): DockSurfaceMountOptions {
  return {
    content: fixtureContent,
    onCommand: (extras.onCommand as DockSurfaceMountOptions["onCommand"]) ?? (() => undefined),
    getSelectedClassId: () => selected.current,
  };
}

function leveledKnightEngine() {
  const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
  boot.advanceBy(1);
  const saved = boot.snapshot();
  saved.progression.characterXp.knight = 850;
  return createEngine(fixtureContent, saved, LOOT_SEED);
}

function visibleCharacterSections(root: HTMLElement): string[] {
  return [...root.querySelectorAll<HTMLElement>("[data-character-section]")]
    .filter((section) => !section.hidden)
    .map((section) => section.dataset["characterSection"]!);
}

function characterViewTabIds(root: HTMLElement): string[] {
  return [...root.querySelectorAll<HTMLElement>("[data-character-sub-tab]")].map(
    (button) => button.dataset["characterSubTab"]!,
  );
}

describe("Character surface", () => {
  it("exposes Build then Stats views with Build selected on a fresh mount", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));

    expect(CHARACTER_VIEWS.map((view) => view.id)).toEqual(["build", "stats"]);
    expect(characterViewTabIds(root)).toEqual(["build", "stats"]);
    expect(
      root.querySelector<HTMLButtonElement>('[data-character-sub-tab="build"]')?.getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
    expect(visibleCharacterSections(root)).toEqual(["loadout", "talents"]);

    surface.destroy();
  });

  it("mounts Loadout, Talents, and Stats sections without Equipment or Party", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);

    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.classList.contains("character-surface")).toBe(true);
    expect(root.querySelector(".character-subtabs[role='tablist']")).not.toBeNull();
    const sections = [...root.querySelectorAll<HTMLElement>("[data-character-section]")];
    expect(sections.map((section) => section.dataset["characterSection"])).toEqual([
      "loadout",
      "talents",
      "stats",
    ]);
    expect(root.querySelector('[data-character-section="equipment"]')).toBeNull();
    expect(root.querySelector(".character-equipment")).toBeNull();
    expect(root.querySelector("[data-browse-slot]")).toBeNull();
    expect(root.querySelector(".party-surface")).toBeNull();
    expect(root.querySelector(".formation-slot")).toBeNull();
    expect(root.querySelector(".party-swap")).toBeNull();
    expect(sections[0]?.classList.contains("loadout-surface")).toBe(true);
    expect(sections[1]?.classList.contains("talents-surface")).toBe(true);
    expect(sections[2]?.classList.contains("stats-surface")).toBe(true);
    expect(visibleCharacterSections(root)).toEqual(["loadout", "talents"]);

    surface.destroy();
  });

  it("shows Loadout and Talents together on Build and Stats alone after one activation", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(visibleCharacterSections(root)).toEqual(["loadout", "talents"]);
    expect(root.querySelector(".loadout-surface")).not.toBeNull();
    expect(root.querySelector(".talents-surface")).not.toBeNull();
    expect(root.querySelector(".stats-surface")).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-character-sub-tab="stats"]')?.click();
    expect(visibleCharacterSections(root)).toEqual(["stats"]);

    root.querySelector<HTMLButtonElement>('[data-character-sub-tab="build"]')?.click();
    expect(visibleCharacterSections(root)).toEqual(["loadout", "talents"]);

    surface.destroy();
  });

  it("operates Build/Stats tabs with keyboard arrows and Home/End", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    const buildTab = root.querySelector<HTMLButtonElement>('[data-character-sub-tab="build"]');
    const statsTab = root.querySelector<HTMLButtonElement>('[data-character-sub-tab="stats"]');
    buildTab?.focus();
    buildTab?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(visibleCharacterSections(root)).toEqual(["stats"]);
    expect(document.activeElement).toBe(statsTab);

    statsTab?.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(visibleCharacterSections(root)).toEqual(["loadout", "talents"]);

    buildTab?.focus();
    buildTab?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(visibleCharacterSections(root)).toEqual(["stats"]);

    root.remove();
    surface.destroy();
  });

  it("reflects the selected Character name, Level, formation position, and Talent Points in the header", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = leveledKnightEngine();
    const snapshot = engine.snapshot();

    surface.render(snapshot, EMPTY_ENGINE_LEGALITY);

    expect(root.querySelector("[data-character-header-name='true']")?.textContent).toBe("Knight");
    expect(root.querySelector("[data-character-header-level='true']")?.textContent).toBe(
      `Level ${levelFor(snapshot, fixtureContent, "knight")}`,
    );
    expect(root.querySelector("[data-character-header-position='true']")?.textContent).toBe("Front");
    expect(root.querySelector("[data-character-header-talent-points='true']")?.textContent).toMatch(
      /Talent Points available/,
    );

    selected.current = "wizard";
    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);
    expect(root.querySelector("[data-character-header-name='true']")?.textContent).toBe("Wizard");
    expect(root.querySelector("[data-character-header-position='true']")?.textContent).toBe(
      "Middle",
    );

    surface.destroy();
  });

  it("keeps the active Character view across Snapshot re-renders", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);

    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);
    root.querySelector<HTMLButtonElement>('[data-character-sub-tab="stats"]')?.click();

    selected.current = "wizard";
    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);
    expect(visibleCharacterSections(root)).toEqual(["stats"]);

    surface.destroy();
  });

  it("keeps the active Character view across top-level Dock tab round trips", () => {
    const root = document.createElement("div");
    const dock = mountManagementDock(root, { content: fixtureContent });
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    dock.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    const characterRoot = root.querySelector(".character-surface");
    expect(characterRoot).not.toBeNull();
    characterRoot
      ?.querySelector<HTMLButtonElement>('[data-character-sub-tab="stats"]')
      ?.click();
    expect(visibleCharacterSections(characterRoot as HTMLElement)).toEqual(["stats"]);

    root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-dock-tab="character"]')?.click();
    expect(visibleCharacterSections(characterRoot as HTMLElement)).toEqual(["stats"]);

    dock.destroy();
  });

  it("retains Talent tree scroll and Character view when switching Build and Stats", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = leveledKnightEngine();
    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    const scroll = root.querySelector<HTMLElement>(".talent-tree-scroll");
    expect(scroll).not.toBeNull();
    scroll!.scrollTop = 48;

    root.querySelector<HTMLButtonElement>('[data-character-sub-tab="stats"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-character-sub-tab="build"]')?.click();

    expect(scroll).toBe(root.querySelector(".talent-tree-scroll"));
    expect(scroll!.scrollTop).toBe(48);

    surface.destroy();
  });

  it("does not persist Character view state in Snapshot serialization", () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const serialized = JSON.stringify(engine.snapshot());
    expect(serialized).not.toMatch(/characterSubTab|CharacterViewId|"buildView"/i);
  });

  it("gates Talent allocate buttons with the legality view", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = leveledKnightEngine();
    const snapshot = engine.snapshot();

    surface.render(snapshot, EMPTY_ENGINE_LEGALITY);
    root
      .querySelector<HTMLElement>('.talent-cell[data-talent-id="k-fortitude"]')
      ?.click();
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
    root
      .querySelector<HTMLElement>('.talent-cell[data-talent-id="k-fortitude"]')
      ?.click();
    expect(
      root.querySelector<HTMLButtonElement>(
        '[data-talent-id="k-fortitude"][data-talent-action="allocate"]',
      )?.disabled,
    ).toBe(false);

    surface.destroy();
  });

  it("destroys composed Loadout, Talents, and Stats surfaces", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.querySelector(".loadout-surface")).not.toBeNull();
    expect(root.querySelector(".talents-surface")).not.toBeNull();
    expect(root.querySelector(".stats-surface")).not.toBeNull();

    surface.destroy();

    expect(root.querySelector(".loadout-surface")).toBeNull();
    expect(root.querySelector(".talents-surface")).toBeNull();
    expect(root.querySelector(".stats-surface")).toBeNull();
    expect(root.querySelector("[data-character-section]")).toBeNull();
    expect(root.classList.contains("character-surface")).toBe(false);
  });

  it("fans render to Loadout, Talents, and Stats", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);

    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.querySelector('[data-character-section="equipment"]')).toBeNull();
    expect(root.querySelector(".loadout-surface .dock-surface-title")?.textContent).toBe("Loadout");
    expect(root.querySelector(".talents-surface .dock-surface-title")?.textContent).toBe("Talents");
    expect(root.querySelector(".stats-surface .dock-surface-title")?.textContent).toBe("Stats");

    surface.destroy();
  });

  it("reserves about 230px for Loadout on the Build board", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../styles.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\.character-build-board\s+\[data-character-section="loadout"\][\s\S]*?flex:\s*0\s+0\s+230px/,
    );
  });
});
