// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import type { ClassId } from "../core/types";
import { mountCharacterSurface } from "./character-surface";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";

const LOOT_SEED = 42;

function mountOptions(selected: { current: ClassId }) {
  return {
    content: fixtureContent,
    onCommand: () => undefined,
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
  it("mounts Party, Loadout, and Talents sections in that order", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);

    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.classList.contains("character-surface")).toBe(true);
    const sections = [...root.querySelectorAll<HTMLElement>("[data-character-section]")];
    expect(sections.map((section) => section.dataset["characterSection"])).toEqual([
      "party",
      "loadout",
      "talents",
    ]);
    expect(sections[0]?.classList.contains("party-surface")).toBe(true);
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

  it("destroys all three composed sub-surfaces", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.querySelector(".party-surface")).not.toBeNull();
    expect(root.querySelector(".loadout-surface")).not.toBeNull();
    expect(root.querySelector(".talents-surface")).not.toBeNull();

    surface.destroy();

    expect(root.querySelector(".party-surface")).toBeNull();
    expect(root.querySelector(".loadout-surface")).toBeNull();
    expect(root.querySelector(".talents-surface")).toBeNull();
    expect(root.querySelector("[data-character-section]")).toBeNull();
    expect(root.classList.contains("character-surface")).toBe(false);
  });

  it("fans render to every composed surface", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountCharacterSurface(root, mountOptions(selected));
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);

    surface.render(engine.snapshot(), EMPTY_ENGINE_LEGALITY);

    expect(root.querySelector(".party-surface .dock-surface-title")?.textContent).toBe("Party");
    expect(root.querySelector(".loadout-surface .dock-surface-title")?.textContent).toBe("Loadout");
    expect(root.querySelector(".talents-surface .dock-surface-title")?.textContent).toBe("Talents");

    surface.destroy();
  });
});
