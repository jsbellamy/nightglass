// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { scenario } from "../core/testing/scenario";
import { fixtureContent } from "../core/testing/fixture-content";
import type { ClassId } from "../core/types";
import { legalityViewFromEngine } from "./engine-legality";
import { mountStatsSurface } from "./stats-surface";

const LOOT_SEED = 42;

function mountOptions(selected: { current: ClassId }) {
  return {
    content: fixtureContent,
    getSelectedClassId: () => selected.current,
  };
}

function leveledKnightEngine(xp = 700) {
  const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
  const saved = boot.snapshot();
  saved.progression.characterXp.knight = xp;
  return createEngine(fixtureContent, saved, LOOT_SEED);
}

function renderStats(
  surface: ReturnType<typeof mountStatsSurface>,
  engine: ReturnType<typeof createEngine>,
): void {
  surface.render(engine.snapshot(), legalityViewFromEngine(engine));
}

function knightSection(root: HTMLElement): HTMLElement {
  const section = root.querySelector<HTMLElement>('[data-class-id="knight"]');
  if (!section) {
    throw new Error("missing knight stats section");
  }
  return section;
}

describe("Stats surface", () => {
  it("shows Level and XP progress for the selected Character", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountStatsSurface(root, mountOptions(selected));

    renderStats(surface, engine);
    const knight = knightSection(root);
    const overview = knight.querySelector('[data-stats-overview="true"]');
    expect(overview?.querySelector('[data-stats-level="true"]')?.textContent).toBe("Level 5");
    expect(knight.querySelector('[data-stats-xp="true"]')?.textContent).toMatch(/700/);
    expect(knight.querySelector('[data-stats-talent-points="true"]')?.textContent).toMatch(
      /Talent Point/,
    );

    surface.destroy();
  });

  it("shows Max Level copy at the XP cap", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const snap = engine.snapshot();
    snap.progression.characterXp.knight = 10_000;
    const capped = createEngine(fixtureContent, snap, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountStatsSurface(root, mountOptions(selected));

    renderStats(surface, capped);
    expect(knightSection(root).querySelector('[data-stats-xp="true"]')?.textContent).toBe(
      "Max Level",
    );

    surface.destroy();
  });

  it("renders five stat lines in contract order with totals", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountStatsSurface(root, mountOptions(selected));

    renderStats(surface, engine);
    const keys = [...knightSection(root).querySelectorAll<HTMLElement>("[data-stat-key]")].map(
      (row) => row.dataset["statKey"],
    );
    expect(keys).toEqual([
      "maxHealth",
      "physical",
      "elemental",
      "armor",
      "elementalResistance",
    ]);

    surface.destroy();
  });

  it("formats Base, Equipment, and Talent flat and percent contributions separately", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    engine.allocateTalent("knight", "k-swordcraft");
    engine.allocateTalent("knight", "k-swordcraft");
    const selected = { current: "knight" as ClassId };
    const surface = mountStatsSurface(root, mountOptions(selected));

    renderStats(surface, engine);
    const physical = knightSection(root).querySelector<HTMLElement>(
      '[data-stat-key="physical"]',
    );
    const sources = physical?.querySelector('[data-stat-sources="true"]')?.textContent ?? "";
    expect(sources).toMatch(/Base 14/);
    expect(sources).toMatch(/Talent \+10%/);

    surface.destroy();
  });

  it("follows the Character picker when switching Classes", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountStatsSurface(root, mountOptions(selected));

    renderStats(surface, engine);
    expect(knightSection(root)).not.toBeNull();

    selected.current = "wizard";
    renderStats(surface, engine);
    expect(root.querySelector('[data-class-id="wizard"]')).not.toBeNull();
    expect(root.querySelector('[data-class-id="knight"]')).toBeNull();

    surface.destroy();
  });

  it("shows a Wave marker when Equipment changes mid-Attempt", () => {
    const root = document.createElement("div");
    const saved = scenario(fixtureContent).withDrops(1).build();
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    engine.selectStage(1);
    const dropId = engine.snapshot().progression.armory[0]!.dropId;
    const selected = { current: "knight" as ClassId };
    const surface = mountStatsSurface(root, mountOptions(selected));

    renderStats(surface, engine);
    expect(knightSection(root).querySelector('[data-pending-kind="stats"]')).toBeNull();

    engine.equip(dropId, "knight", "weapon");
    renderStats(surface, engine);
    expect(
      knightSection(root).querySelector('[data-pending-kind="stats"]')?.textContent,
    ).toMatch(/next Wave/i);

    surface.destroy();
  });

  it("shows a Wave marker when mid-Attempt stats differ from committed combat", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine(850);
    const selected = { current: "knight" as ClassId };
    const surface = mountStatsSurface(root, mountOptions(selected));

    renderStats(surface, engine);
    expect(knightSection(root).querySelector('[data-pending-kind="stats"]')).toBeNull();

    engine.allocateTalent("knight", "k-fortitude");
    renderStats(surface, engine);
    expect(
      knightSection(root).querySelector('[data-pending-kind="stats"]')?.textContent,
    ).toMatch(/next Wave/i);

    surface.destroy();
  });

  it("groups canonical stats under Vitals, Offense, and Defense", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountStatsSurface(root, mountOptions(selected));

    renderStats(surface, engine);
    const knight = knightSection(root);
    expect(knight.querySelector('[data-stats-group="vitals"] .stats-group-heading')?.textContent).toBe(
      "Vitals",
    );
    expect(
      knight.querySelector('[data-stats-group="vitals"] [data-stat-key="maxHealth"]'),
    ).not.toBeNull();
    expect(knight.querySelector('[data-stats-group="offense"] .stats-group-heading')?.textContent).toBe(
      "Offense",
    );
    expect(
      knight.querySelectorAll('[data-stats-group="offense"] [data-stat-key]').length,
    ).toBe(2);
    expect(knight.querySelector('[data-stats-group="defense"] .stats-group-heading')?.textContent).toBe(
      "Defense",
    );
    expect(
      knight.querySelectorAll('[data-stats-group="defense"] [data-stat-key]').length,
    ).toBe(2);

    surface.destroy();
  });

  it("exposes no focusable controls inside the grouped stat sheet", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountStatsSurface(root, mountOptions(selected));

    renderStats(surface, engine);
    const sheet = knightSection(root).querySelector('[data-stats-table="true"]');
    expect(sheet).not.toBeNull();
    const focusable = sheet!.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    expect(focusable.length).toBe(0);

    surface.destroy();
  });

  it("omits live combat telemetry such as current Health", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    engine.selectStage(1);
    const selected = { current: "knight" as ClassId };
    const surface = mountStatsSurface(root, mountOptions(selected));

    renderStats(surface, engine);
    const text = knightSection(root).textContent ?? "";
    expect(text).not.toMatch(/current health/i);
    expect(text).not.toMatch(/cooldown/i);
    expect(knightSection(root).querySelector("[data-combat-health]")).toBeNull();

    surface.destroy();
  });
});
