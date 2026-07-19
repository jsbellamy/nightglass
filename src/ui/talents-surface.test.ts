// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import { mountTalentsSurface } from "./talents-surface";

const LOOT_SEED = 42;

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
  it("shows available Talent Points and Stat/Ability rows per Character", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const surface = mountTalentsSurface(root, { content: fixtureContent });

    surface.render(engine.snapshot());
    const knight = knightSection(root);
    expect(knight.querySelector('[data-talent-points="true"]')?.textContent).toMatch(
      /6 Talent Points available/,
    );
    expect(knight.querySelectorAll(".talent-stat-row .talent-card")).toHaveLength(2);
    expect(knight.querySelectorAll(".talent-ability-row .talent-card")).toHaveLength(2);

    surface.destroy();
  });

  it("enforces the five-point Stat cap in the UI", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const surface = mountTalentsSurface(root, {
      content: fixtureContent,
      onCommand: (command) => {
        if (command.cmd === "allocateTalent") {
          engine.allocateTalent(command.args[0], command.args[1]);
        }
      },
    });

    for (let rank = 0; rank < 5; rank += 1) {
      surface.render(engine.snapshot());
      const talentId = rank % 2 === 0 ? "k-fortitude" : "k-swordcraft";
      const allocate = knightSection(root).querySelector<HTMLButtonElement>(
        `[data-talent-id="${talentId}"][data-talent-action="allocate"]`,
      );
      allocate?.click();
    }

    surface.render(engine.snapshot());
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
    const surface = mountTalentsSurface(root, { content: fixtureContent });

    surface.render(midLevel.snapshot());
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

    const surface = mountTalentsSurface(root, {
      content: fixtureContent,
      onCommand: (command) => {
        if (command.cmd === "deallocateTalent") {
          engine.deallocateTalent(command.args[0], command.args[1]);
        }
      },
    });

    surface.render(engine.snapshot());
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

    const surface = mountTalentsSurface(root, { content: fixtureContent });
    surface.render(engine.snapshot());

    expect(
      knightSection(root).querySelector('[data-loadout-warning="true"]')?.textContent,
    ).toMatch(/Slotted in Loadout/i);

    surface.destroy();
  });

  it("queues talent edits with a next-Wave pending marker", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    engine.allocateTalent("knight", "k-fortitude");
    const surface = mountTalentsSurface(root, { content: fixtureContent });

    surface.render(engine.snapshot());
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
    const surface = mountTalentsSurface(root, {
      content: fixtureContent,
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "allocateTalent") {
          engine.allocateTalent(command.args[0], command.args[1]);
        }
        if (command.cmd === "deallocateTalent") {
          engine.deallocateTalent(command.args[0], command.args[1]);
        }
      },
    });

    surface.render(engine.snapshot());
    const allocate = knightSection(root).querySelector<HTMLButtonElement>(
      `[data-talent-id="k-fortitude"][data-talent-action="allocate"]`,
    );
    allocate?.focus();
    activateFocused();
    surface.render(engine.snapshot());
    expect(commands).toContainEqual({ cmd: "allocateTalent", args: ["knight", "k-fortitude"] });

    const deallocate = knightSection(root).querySelector<HTMLButtonElement>(
      `[data-talent-id="k-fortitude"][data-talent-action="deallocate"]`,
    );
    deallocate?.focus();
    activateFocused();
    surface.render(engine.snapshot());
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
