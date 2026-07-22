// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import type { ClassId } from "../core/types";
import { mountCharacterSurface } from "./character-surface";
import type { DockSurfaceMountOptions } from "./dock";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";

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

describe("Character surface", () => {
  it("mounts Loadout and Talents sections without Equipment or Party", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);

    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.classList.contains("character-surface")).toBe(true);
    const sections = [...root.querySelectorAll<HTMLElement>("[data-character-section]")];
    expect(sections.map((section) => section.dataset["characterSection"])).toEqual([
      "loadout",
      "talents",
    ]);
    expect(root.querySelector('[data-character-section="equipment"]')).toBeNull();
    expect(root.querySelector(".character-equipment")).toBeNull();
    expect(root.querySelector("[data-browse-slot]")).toBeNull();
    expect(root.querySelector(".party-surface")).toBeNull();
    expect(root.querySelector(".formation-slot")).toBeNull();
    expect(root.querySelector(".party-swap")).toBeNull();
    expect(sections[0]?.classList.contains("loadout-surface")).toBe(true);
    expect(sections[1]?.classList.contains("talents-surface")).toBe(true);

    surface.destroy();
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

  it("destroys composed Loadout and Talents surfaces", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.querySelector(".loadout-surface")).not.toBeNull();
    expect(root.querySelector(".talents-surface")).not.toBeNull();

    surface.destroy();

    expect(root.querySelector(".loadout-surface")).toBeNull();
    expect(root.querySelector(".talents-surface")).toBeNull();
    expect(root.querySelector("[data-character-section]")).toBeNull();
    expect(root.classList.contains("character-surface")).toBe(false);
  });

  it("fans render to Loadout and Talents only", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);

    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.querySelector('[data-character-section="equipment"]')).toBeNull();
    expect(root.querySelector(".loadout-surface .dock-surface-title")?.textContent).toBe("Loadout");
    expect(root.querySelector(".talents-surface .dock-surface-title")?.textContent).toBe("Talents");

    surface.destroy();
  });
});
