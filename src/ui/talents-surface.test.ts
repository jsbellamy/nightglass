// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import type { ClassId } from "../core/types";
import { formatAbilityDescription } from "./ability-format";
import { characterStatsFor } from "./snapshot-view";
import { mountTalentsSurface } from "./talents-surface";
import { legalityViewFromEngine } from "./engine-legality";
import { buildContent } from "../data";

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

function selectTalentCell(root: HTMLElement, talentId: string): void {
  const cell = knightSection(root).querySelector<HTMLElement>(
    `.talent-cell[data-talent-id="${talentId}"]`,
  );
  if (!cell) {
    throw new Error(`missing talent cell ${talentId}`);
  }
  cell.click();
}

function leveledKnightEngine() {
  const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
  boot.advanceBy(1);
  const saved = boot.snapshot();
  saved.progression.characterXp.knight = 850;
  return createEngine(fixtureContent, saved, LOOT_SEED);
}

describe("Talents surface", () => {
  it("renders only the picker's selected Character as a chrome grid with sticky detail", () => {
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
    expect(knight.querySelectorAll(".talent-stat-row .talent-cell")).toHaveLength(2);
    expect(knight.querySelectorAll(".talent-ability-row .talent-cell")).toHaveLength(2);
    expect(knight.querySelector(".talent-card")).toBeNull();
    expect(knight.querySelector('[data-talent-detail="true"]')).not.toBeNull();
    expect(knight.querySelector('[data-talent-detail="true"] .surface-empty')?.textContent).toBe(
      "Select a Talent",
    );

    surface.destroy();
  });

  it("renders a full ability description in Ability Talent detail before actions", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    selectTalentCell(root, "k-hold-line");
    const detail = knightSection(root).querySelector('[data-talent-detail="true"]');
    const description = detail?.querySelector('[data-ability-description="true"]');
    const holdLine = fixtureContent.abilities.find((entry) => entry.id === "k-hold-line")!;
    expect(description?.textContent).toBe(
      formatAbilityDescription(
        holdLine,
        characterStatsFor(engine.snapshot(), fixtureContent, "knight"),
        fixtureContent.statuses,
      ),
    );
    const actions = detail?.querySelector(".talent-detail-actions");
    expect(
      description!.compareDocumentPosition(actions!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    surface.destroy();
  });

  it("evidence: talent-icon-content-tier — renders content-tier icon faces on Stat and Ability cells with overlays", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    for (let rank = 0; rank < 5; rank += 1) {
      engine.allocateTalent("knight", "k-fortitude");
    }
    engine.allocateTalent("knight", "k-hold-line");
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);

    const statCell = knightSection(root).querySelector<HTMLElement>(
      '.talent-cell[data-talent-id="k-fortitude"]',
    );
    const statIcon = statCell?.querySelector<HTMLImageElement>(
      ".equipment-icon-img--content",
    );
    expect(statIcon?.dataset["iconKey"]).toBe("k-fortitude");
    expect(statCell?.querySelector(".talent-rank-badge")?.textContent).toBe("5/5");

    const abilityCell = knightSection(root).querySelector<HTMLElement>(
      '.talent-cell--chosen[data-talent-id="k-hold-line"]',
    );
    const abilityIcon = abilityCell?.querySelector<HTMLImageElement>(
      ".equipment-icon-img--content",
    );
    expect(abilityIcon?.dataset["iconKey"]).toBe("k-hold-line");
    expect(abilityCell?.querySelector(".talent-ability-mark--chosen")).not.toBeNull();

    surface.destroy();
  });

  it("reuses the same talent icon node across renders with a changed Snapshot", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const before = root.querySelector<HTMLImageElement>(".equipment-icon-img--content");
    expect(before).not.toBeNull();

    const next = structuredClone(engine.snapshot());
    next.progression.characterXp.knight += 1;
    surface.render(next, legalityViewFromEngine(engine));

    const after = root.querySelector<HTMLImageElement>(".equipment-icon-img--content");
    expect(after).toBe(before);

    surface.destroy();
  });

  it("shows Stat rank badges without name or pip prose on the cell", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    engine.allocateTalent("knight", "k-fortitude");
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const cell = knightSection(root).querySelector<HTMLElement>(
      '.talent-cell[data-talent-id="k-fortitude"]',
    );
    expect(cell?.querySelector(".talent-rank-badge")?.textContent).toBe("1/5");
    expect(cell?.querySelector(".talent-name")).toBeNull();
    expect(cell?.querySelector(".talent-per-rank")).toBeNull();
    expect(cell?.querySelector(".talent-rank-pips")).toBeNull();
    expect(cell?.getAttribute("aria-label")).toMatch(/Fortitude.*1 of 5/i);

    surface.destroy();
  });

  it("keeps both Ability cells visible with empty vs chosen chrome only", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    for (let rank = 0; rank < 5; rank += 1) {
      engine.allocateTalent("knight", rank % 2 === 0 ? "k-fortitude" : "k-swordcraft");
    }
    engine.allocateTalent("knight", "k-hold-line");
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const cells = knightSection(root).querySelectorAll(".talent-ability-row .talent-cell");
    expect(cells).toHaveLength(2);
    const chosen = knightSection(root).querySelector(
      '.talent-cell[data-talent-id="k-hold-line"]',
    );
    const other = knightSection(root).querySelector(
      '.talent-cell[data-talent-id="k-falling-star"]',
    );
    expect(chosen?.classList.contains("talent-cell--chosen")).toBe(true);
    expect(other?.classList.contains("talent-cell--chosen")).toBe(false);
    expect(chosen?.querySelector(".talent-name")).toBeNull();
    expect(other?.querySelector(".talent-name")).toBeNull();
    expect(chosen?.getAttribute("aria-label")).toMatch(/Hold/i);

    surface.destroy();
  });

  it("keeps the selected Talent cell across a Snapshot pump", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    selectTalentCell(root, "k-fortitude");
    expect(root.querySelector(".talent-cell.selected")?.getAttribute("data-talent-id")).toBe(
      "k-fortitude",
    );
    expect(root.querySelector('[data-talent-detail="true"] .talent-name')?.textContent).toBe(
      "Fortitude",
    );

    engine.allocateTalent("knight", "k-fortitude");
    renderTalents(surface, engine);

    expect(root.querySelector(".talent-cell.selected")?.getAttribute("data-talent-id")).toBe(
      "k-fortitude",
    );
    expect(root.querySelector('[data-talent-detail="true"] .talent-name')?.textContent).toBe(
      "Fortitude",
    );
    expect(
      root.querySelector('.talent-cell[data-talent-id="k-fortitude"] .talent-rank-badge')
        ?.textContent,
    ).toBe("1/5");

    surface.destroy();
  });

  it("does not auto-select on mount or Class switch", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    expect(root.querySelector('[data-talent-detail="true"] .surface-empty')?.textContent).toBe(
      "Select a Talent",
    );

    selectTalentCell(root, "k-fortitude");
    expect(root.querySelector('[data-talent-detail="true"] .talent-name')?.textContent).toBe(
      "Fortitude",
    );

    selected.current = "wizard";
    renderTalents(surface, engine);
    expect(root.querySelector('[data-talent-detail="true"] .surface-empty')?.textContent).toBe(
      "Select a Talent",
    );
    expect(root.querySelector(".talent-cell.selected")).toBeNull();

    surface.destroy();
  });

  it("moves allocate and deallocate actions into the sticky detail panel", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    engine.allocateTalent("knight", "k-fortitude");
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    expect(
      root.querySelector('.talent-cell [data-talent-action="allocate"]'),
    ).toBeNull();

    selectTalentCell(root, "k-fortitude");
    const detail = root.querySelector('[data-talent-detail="true"]');
    expect(detail?.querySelector(".talent-name")?.textContent).toBe("Fortitude");
    expect(detail?.querySelector(".talent-per-rank")?.textContent).toMatch(/per rank/i);
    expect(detail?.querySelector('[data-stat-delta="true"]')?.textContent).toMatch(
      /Max Health|Physical/i,
    );
    expect(
      detail?.querySelector('[data-talent-action="allocate"]')?.textContent,
    ).toBe("Add point");
    expect(
      detail?.querySelector('[data-talent-action="deallocate"]')?.textContent,
    ).toBe("Remove point");

    surface.destroy();
  });

  it("selects a Talent cell on keyboard focus without requiring Enter", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const cell = knightSection(root).querySelector<HTMLElement>(
      '.talent-cell[data-talent-id="k-fortitude"]',
    );
    cell?.focus();
    expect(root.querySelector('[data-talent-detail="true"] .talent-name')?.textContent).toBe(
      "Fortitude",
    );
    expect(document.activeElement?.getAttribute("data-talent-id")).toBe("k-fortitude");

    surface.destroy();
    root.remove();
  });

  it("shows Ability detail with loadout warning and Choose/Remove only in the panel", () => {
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
    expect(root.querySelector('[data-loadout-warning="true"]')).toBeNull();

    selectTalentCell(root, "k-hold-line");
    const detail = root.querySelector('[data-talent-detail="true"]');
    expect(detail?.querySelector(".talent-name")?.textContent).toMatch(/Hold/i);
    expect(detail?.querySelector('[data-loadout-warning="true"]')?.textContent).toMatch(
      /Slotted in Loadout/i,
    );
    expect(detail?.querySelector('[data-talent-action="deallocate"]')?.textContent).toBe(
      "Remove",
    );
    expect(root.querySelector('.talent-cell [data-talent-action]')).toBeNull();

    surface.destroy();
  });

  it("keeps points, row titles, and Ability gate note visible outside the detail", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const knight = knightSection(root);
    const detail = knight.querySelector('[data-talent-detail="true"]');
    expect(knight.querySelector('[data-talent-points="true"]')).not.toBeNull();
    expect(
      [...knight.querySelectorAll(".talent-row-title")].map((node) => node.textContent),
    ).toEqual(["Stat Row", "Ability Row"]);
    expect(knight.querySelector(".talent-gate-note")?.textContent).toMatch(
      /Spend 5 Stat Row points/i,
    );
    expect(detail?.contains(knight.querySelector('[data-talent-points="true"]')!)).toBe(false);
    expect(detail?.contains(knight.querySelector(".talent-gate-note")!)).toBe(false);

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
      selectTalentCell(root, talentId);
      knightSection(root)
        .querySelector<HTMLButtonElement>(
          `[data-talent-id="${talentId}"][data-talent-action="allocate"]`,
        )
        ?.click();
    }

    renderTalents(surface, engine);
    selectTalentCell(root, "k-fortitude");
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
    selectTalentCell(root, "k-hold-line");
    const pick = knightSection(root).querySelector<HTMLButtonElement>(
      `[data-talent-id="k-hold-line"][data-talent-action="allocate"]`,
    );
    expect(pick?.disabled).toBe(true);
    expect(knightSection(root).querySelector(".talent-gate-note")?.textContent).toMatch(
      /Spend 5 Stat Row points/i,
    );

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
    selectTalentCell(root, "k-fortitude");
    const removeStat = knightSection(root).querySelector<HTMLButtonElement>(
      `[data-talent-id="k-fortitude"][data-talent-action="deallocate"]`,
    );
    expect(removeStat?.disabled).toBe(true);
    expect(() => engine.deallocateTalent("knight", "k-fortitude")).toThrow(/ability/i);

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

  it("completes allocate and deallocate flows by selecting a cell then activating detail actions", () => {
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
    const cell = knightSection(root).querySelector<HTMLElement>(
      '.talent-cell[data-talent-id="k-fortitude"]',
    );
    cell?.focus();
    activateFocused();
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

  it("stacks Talent Tier 1 and Tier 2 with tier gate, selection, and Tier-2 ability descriptions", () => {
    const fullContent = buildContent();
    const root = document.createElement("div");
    const boot = createEngine(fullContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 3_000;
    const engine = createEngine(fullContent, saved, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, {
      content: fullContent,
      getSelectedClassId: () => selected.current,
    });

    surface.render(engine.snapshot(), legalityViewFromEngine(engine));
    const knight = knightSection(root);
    const tiers = knight.querySelectorAll("[data-talent-tier]");
    expect(tiers).toHaveLength(2);
    expect(tiers[0]?.getAttribute("data-talent-tier")).toBe("1");
    expect(tiers[1]?.getAttribute("data-talent-tier")).toBe("2");
    expect(knight.querySelectorAll(".talent-stat-row .talent-cell")).toHaveLength(4);
    expect(knight.querySelectorAll(".talent-ability-row .talent-cell")).toHaveLength(4);
    expect(knight.querySelector('[data-talent-tier-gate="true"]')?.textContent).toBe(
      "Spend 6 points in Talent Tier 1 to unlock Talent Tier 2",
    );

    selectTalentCell(root, "iron-discipline");
    const tier2Pick = root.querySelector<HTMLButtonElement>(
      `[data-talent-id="iron-discipline"][data-talent-action="allocate"]`,
    );
    expect(tier2Pick?.disabled).toBe(true);

    for (let rank = 0; rank < 5; rank += 1) {
      engine.allocateTalent("knight", rank % 2 === 0 ? "fortitude" : "swordcraft");
    }
    engine.allocateTalent("knight", "hold-the-line");
    surface.render(engine.snapshot(), legalityViewFromEngine(engine));
    expect(knightSection(root).querySelector('[data-talent-tier-gate="true"]')).toBeNull();

    engine.allocateTalent("knight", "iron-discipline");
    surface.render(engine.snapshot(), legalityViewFromEngine(engine));
    selectTalentCell(root, "vanguard");
    const vanguard = fullContent.abilities.find((entry) => entry.id === "vanguard")!;
    const description = knightSection(root)
      .querySelector('[data-talent-detail="true"]')
      ?.querySelector('[data-ability-description="true"]');
    expect(description?.textContent).toBe(
      formatAbilityDescription(
        vanguard,
        characterStatsFor(engine.snapshot(), fullContent, "knight"),
        fullContent.statuses,
      ),
    );

    surface.destroy();
  });

  it("counts available Talent Points using spend across all tiers", () => {
    const fullContent = buildContent();
    const root = document.createElement("div");
    const boot = createEngine(fullContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 3_000;
    const engine = createEngine(fullContent, saved, LOOT_SEED);
    for (let rank = 0; rank < 5; rank += 1) {
      engine.allocateTalent("knight", rank % 2 === 0 ? "fortitude" : "swordcraft");
    }
    engine.allocateTalent("knight", "hold-the-line");
    engine.allocateTalent("knight", "iron-discipline");
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, {
      content: fullContent,
      getSelectedClassId: () => selected.current,
    });

    surface.render(engine.snapshot(), legalityViewFromEngine(engine));
    expect(knightSection(root).querySelector('[data-talent-points="true"]')?.textContent).toBe(
      "3 Talent Points available",
    );

    surface.destroy();
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
