// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import type { ClassId } from "../core/types";
import { mountTalentsSurface } from "./talents-surface";
import { legalityViewFromEngine } from "./engine-legality";

const LOOT_SEED = 42;

function mountOptions(
  selected: { current: ClassId },
  onCommand?: Parameters<typeof mountTalentsSurface>[1]["onCommand"],
) {
  return onCommand
    ? {
        content: fixtureContent,
        getSelectedClassId: () => selected.current,
        onCommand,
      }
    : {
        content: fixtureContent,
        getSelectedClassId: () => selected.current,
      };
}

function renderTalents(
  surface: ReturnType<typeof mountTalentsSurface>,
  engine: ReturnType<typeof createEngine>,
): void {
  surface.render(engine.snapshot(), legalityViewFromEngine(engine));
}

function activateFocused(): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) {
    throw new Error("expected a focused element");
  }
  active.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}

function knightSection(root: HTMLElement): HTMLElement {
  const section = root.querySelector<HTMLElement>('[data-class-id="knight"]');
  if (!section) {
    throw new Error("missing knight talents section");
  }
  return section;
}

function leveledKnightEngine() {
  const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
  boot.advanceBy(1);
  const saved = boot.snapshot();
  saved.progression.characterXp.knight = 850;
  return createEngine(fixtureContent, saved, LOOT_SEED);
}

describe("Talents surface", () => {
  it("renders exactly one .talents-character for the picker selection", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const sections = root.querySelectorAll(".talents-character");
    expect(sections).toHaveLength(1);
    expect(sections[0]?.getAttribute("data-class-id")).toBe("knight");
    const knight = knightSection(root);
    expect(knight.querySelector('[data-talent-points="true"]')?.textContent).toMatch(
      /6 Talent Points available/,
    );
    expect(knight.querySelectorAll(".talent-stat-row .talent-card")).toHaveLength(2);
    expect(knight.querySelectorAll(".talent-ability-row .talent-card")).toHaveLength(2);

    surface.destroy();
  });

  it("re-renders the newly selected Character without a remount", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    expect(root.querySelector(".talents-character")?.getAttribute("data-class-id")).toBe("knight");

    selected.current = "wizard";
    renderTalents(surface, engine);

    const sections = root.querySelectorAll(".talents-character");
    expect(sections).toHaveLength(1);
    expect(sections[0]?.getAttribute("data-class-id")).toBe("wizard");

    surface.destroy();
  });

  it("pluralizes Talent Points as singular at one and plural at two", () => {
    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const oneSaved = boot.snapshot();
    oneSaved.progression.characterXp.knight = 0;
    const onePoint = createEngine(fixtureContent, oneSaved, LOOT_SEED);
    renderTalents(surface, onePoint);
    expect(knightSection(root).querySelector('[data-talent-points="true"]')?.textContent).toBe(
      "1 Talent Point available",
    );

    const twoSaved = boot.snapshot();
    twoSaved.progression.characterXp.knight = 100;
    const twoPoints = createEngine(fixtureContent, twoSaved, LOOT_SEED);
    renderTalents(surface, twoPoints);
    expect(knightSection(root).querySelector('[data-talent-points="true"]')?.textContent).toBe(
      "2 Talent Points available",
    );

    surface.destroy();
  });

  it("enforces the five-point Stat cap in the UI", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(
      root,
      mountOptions(selected, (command) => {
        if (command.cmd === "allocateTalent") {
          engine.allocateTalent(command.args[0], command.args[1]);
        }
      }),
    );

    for (let rank = 0; rank < 5; rank += 1) {
      renderTalents(surface, engine);
      const talentId = rank % 2 === 0 ? "k-fortitude" : "k-swordcraft";
      const allocate = knightSection(root).querySelector<HTMLButtonElement>(
        `[data-talent-id="${talentId}"][data-talent-action="allocate"]`,
      );
      allocate?.click();
    }

    renderTalents(surface, engine);
    const fortitudeAllocate = knightSection(root).querySelector<HTMLButtonElement>(
      `[data-talent-id="k-fortitude"][data-talent-action="allocate"]`,
    );
    expect(fortitudeAllocate?.disabled).toBe(true);
    expect(() => engine.allocateTalent("knight", "k-fortitude")).toThrow(/stat row/i);

    surface.destroy();
  });

  it("gates the Ability Row until five Stat points are spent", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const saved = engine.snapshot();
    saved.progression.characterXp.knight = 250;
    const midLevel = createEngine(fixtureContent, saved, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, midLevel);
    const pick = knightSection(root).querySelector<HTMLButtonElement>(
      `[data-talent-id="k-hold-line"][data-talent-action="allocate"]`,
    );
    expect(pick?.disabled).toBe(true);
    expect(knightSection(root).textContent).toMatch(/Spend 5 Stat Row points/i);

    surface.destroy();
  });

  it("requires removing the Ability Talent before dropping below five Stat points", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    for (let rank = 0; rank < 5; rank += 1) {
      engine.allocateTalent("knight", rank % 2 === 0 ? "k-fortitude" : "k-swordcraft");
    }
    engine.allocateTalent("knight", "k-hold-line");

    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(
      root,
      mountOptions(selected, (command) => {
        if (command.cmd === "deallocateTalent") {
          engine.deallocateTalent(command.args[0], command.args[1]);
        }
      }),
    );

    renderTalents(surface, engine);
    const removeStat = knightSection(root).querySelector<HTMLButtonElement>(
      `[data-talent-id="k-fortitude"][data-talent-action="deallocate"]`,
    );
    expect(removeStat?.disabled).toBe(true);
    expect(() => engine.deallocateTalent("knight", "k-fortitude")).toThrow(/ability/i);

    surface.destroy();
  });

  it("warns when removing a slotted Ability Talent", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    for (let rank = 0; rank < 5; rank += 1) {
      engine.allocateTalent("knight", rank % 2 === 0 ? "k-fortitude" : "k-swordcraft");
    }
    engine.allocateTalent("knight", "k-hold-line");
    engine.setLoadout("knight", ["k-hold-line", "k-sweep", "k-rally"]);

    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));
    renderTalents(surface, engine);

    expect(
      knightSection(root).querySelector('[data-loadout-warning="true"]')?.textContent,
    ).toMatch(/Slotted in Loadout/i);

    surface.destroy();
  });

  it("queues talent edits with a next-Wave pending marker", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    engine.allocateTalent("knight", "k-fortitude");
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    expect(
      knightSection(root).querySelector('[data-pending-kind="talent"]')?.textContent,
    ).toMatch(/next Wave/i);

    surface.destroy();
  });

  it("completes allocate and deallocate flows using keyboard only", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = leveledKnightEngine();
    const commands: unknown[] = [];
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(
      root,
      mountOptions(selected, (command) => {
        commands.push(command);
        if (command.cmd === "allocateTalent") {
          engine.allocateTalent(command.args[0], command.args[1]);
        }
        if (command.cmd === "deallocateTalent") {
          engine.deallocateTalent(command.args[0], command.args[1]);
        }
      }),
    );

    renderTalents(surface, engine);
    const allocate = knightSection(root).querySelector<HTMLButtonElement>(
      `[data-talent-id="k-fortitude"][data-talent-action="allocate"]`,
    );
    allocate?.focus();
    activateFocused();
    renderTalents(surface, engine);
    expect(commands).toContainEqual({ cmd: "allocateTalent", args: ["knight", "k-fortitude"] });

    const deallocate = knightSection(root).querySelector<HTMLButtonElement>(
      `[data-talent-id="k-fortitude"][data-talent-action="deallocate"]`,
    );
    deallocate?.focus();
    activateFocused();
    renderTalents(surface, engine);
    expect(commands).toContainEqual({
      cmd: "deallocateTalent",
      args: ["knight", "k-fortitude"],
    });

    const focusables = root.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    expect(focusables.length).toBeGreaterThan(0);
    for (const element of focusables) {
      expect(element.classList.contains("focus-ring")).toBe(true);
    }

    surface.destroy();
    root.remove();
  });
});

describe("Talents surface source boundary", () => {
  it("does not import the Engine", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "talents-surface.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']\.\.\/core\/engine["']/);
  });
});
