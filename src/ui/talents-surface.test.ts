// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import type { ClassId } from "../core/types";
import { formatAbilityDescription } from "./ability-format";
import { characterStatsFor, classKitFor, formatStatModifierPerRank, talentTierDefs } from "./snapshot-view";
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

function talentGroup(root: HTMLElement, talentId: string): HTMLElement {
  const group = knightSection(root).querySelector<HTMLElement>(
    `[data-talent-group="true"][data-talent-id="${talentId}"]`,
  );
  if (!group) {
    throw new Error(`missing talent group ${talentId}`);
  }
  return group;
}

function openTalentPopover(root: HTMLElement, talentId: string): void {
  talentGroup(root, talentId).dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
}

function selectTalentCell(root: HTMLElement, talentId: string): void {
  const cell = talentGroup(root, talentId).querySelector<HTMLElement>(".talent-cell");
  if (!cell) {
    throw new Error(`missing talent cell ${talentId}`);
  }
  cell.focus();
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
    expect(knight.querySelector('[data-talent-detail="true"]')).toBeNull();
    expect(knight.querySelector(".talent-tree-scroll")).not.toBeNull();
    expect(
      knight.querySelector('[data-talent-id="k-fortitude"][data-talent-action="allocate"]'),
    ).not.toBeNull();

    surface.destroy();
  });

  it("renders a full ability description in the shared popover without tile actions inside", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    openTalentPopover(root, "k-hold-line");
    const popover = root.querySelector('[data-talent-popover="true"]');
    const description = popover?.querySelector('[data-ability-description="true"]');
    const holdLine = fixtureContent.abilities.find((entry) => entry.id === "k-hold-line")!;
    expect(description?.textContent).toBe(
      formatAbilityDescription(
        holdLine,
        characterStatsFor(engine.snapshot(), fixtureContent, "knight"),
        fixtureContent.statuses,
      ),
    );
    expect(popover?.querySelector('[data-talent-action]')).toBeNull();

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
    expect(
      talentGroup(root, "k-fortitude").querySelector(".talent-rank-stepper-value")?.textContent,
    ).toBe("5/5");

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

  it("keeps talent-tree scroll position across an unrelated Snapshot pump", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const scroll = knightSection(root).querySelector<HTMLElement>(".talent-tree-scroll");
    if (!scroll) {
      throw new Error("missing talent tree scroll");
    }
    scroll.scrollTop = 48;

    const next = structuredClone(engine.snapshot());
    next.simNowMs += 1;
    surface.render(next, legalityViewFromEngine(engine));

    expect(scroll.scrollTop).toBe(48);

    surface.destroy();
    root.remove();
  });

  it("preserves fortitude icon metadata across renders with a changed Snapshot", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    openTalentPopover(root, "k-fortitude");
    const fortitudeIcon = () =>
      talentGroup(root, "k-fortitude").querySelector<HTMLImageElement>(
        ".equipment-icon-img--content",
      );
    const before = fortitudeIcon();
    expect(before).not.toBeNull();

    const next = structuredClone(engine.snapshot());
    next.progression.characterXp.knight += 1;
    surface.render(next, legalityViewFromEngine(engine));

    const after = fortitudeIcon();
    expect(after?.dataset["iconKey"]).toBe(before?.dataset["iconKey"]);
    expect(after?.src).toBe(before?.src);

    surface.destroy();
    root.remove();
  });

  it("shows Stat rank in the attached stepper without per-rank prose on the face", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    engine.allocateTalent("knight", "k-fortitude");
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const group = talentGroup(root, "k-fortitude");
    const cell = group.querySelector<HTMLElement>('.talent-cell[data-talent-id="k-fortitude"]');
    expect(group.querySelector(".talent-rank-stepper-value")?.textContent).toBe("1/5");
    expect(group.querySelector(".talent-name")?.textContent).toMatch(/Fortitude/i);
    expect(group.querySelector(".talent-stat-per-rank-summary")?.textContent).toMatch(/Max Health/i);
    expect(cell?.querySelector(".talent-rank-badge")).toBeNull();
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
    expect(
      talentGroup(root, "k-hold-line").querySelector(".talent-name")?.textContent,
    ).toMatch(/Hold/i);
    expect(chosen?.getAttribute("aria-label")).toMatch(/Hold/i);

    surface.destroy();
  });

  it("keeps focus and popover content across a Snapshot pump", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    selectTalentCell(root, "k-fortitude");
    openTalentPopover(root, "k-fortitude");
    expect(
      root.querySelector('[data-talent-popover="true"] .talent-popover-name')?.textContent,
    ).toBe("Fortitude");

    engine.allocateTalent("knight", "k-fortitude");
    renderTalents(surface, engine);

    expect(document.activeElement?.getAttribute("data-talent-id")).toBe("k-fortitude");
    expect(
      root.querySelector('[data-talent-popover="true"] .talent-popover-name')?.textContent,
    ).toBe("Fortitude");
    expect(
      talentGroup(root, "k-fortitude").querySelector(".talent-rank-stepper-value")?.textContent,
    ).toBe("1/5");

    surface.destroy();
    root.remove();
  });

  it("does not dispatch synthetic mouseenter when refreshing an open popover on pump", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    openTalentPopover(root, "k-fortitude");
    const mouseenterSpy = vi.spyOn(EventTarget.prototype, "dispatchEvent");

    engine.allocateTalent("knight", "k-fortitude");
    renderTalents(surface, engine);

    const syntheticMouseenters = mouseenterSpy.mock.calls.filter(
      ([event]) => event instanceof Event && event.type === "mouseenter",
    );
    expect(syntheticMouseenters).toHaveLength(0);

    mouseenterSpy.mockRestore();
    surface.destroy();
    root.remove();
  });

  it("does not open a popover on mount and clears it on Class switch", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    expect(root.querySelector<HTMLElement>('[data-talent-popover="true"]')?.hidden).toBe(true);

    openTalentPopover(root, "k-fortitude");
    expect(root.querySelector<HTMLElement>('[data-talent-popover="true"]')?.hidden).toBe(false);

    selected.current = "wizard";
    renderTalents(surface, engine);
    expect(root.querySelector<HTMLElement>('[data-talent-popover="true"]')?.hidden).toBe(true);

    surface.destroy();
  });

  it("exposes labeled +/− tile actions with stat detail only in the popover", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    engine.allocateTalent("knight", "k-fortitude");
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const allocate = knightSection(root).querySelector<HTMLButtonElement>(
      `[data-talent-id="k-fortitude"][data-talent-action="allocate"]`,
    );
    const deallocate = knightSection(root).querySelector<HTMLButtonElement>(
      `[data-talent-id="k-fortitude"][data-talent-action="deallocate"]`,
    );
    expect(allocate?.textContent).toBe("+");
    expect(deallocate?.textContent).toBe("−");
    expect(allocate?.getAttribute("aria-label")).toMatch(/Add one rank to Fortitude/i);
    openTalentPopover(root, "k-fortitude");
    expect(
      root.querySelector('[data-talent-popover="true"] .talent-per-rank')?.textContent,
    ).toMatch(/per rank/i);

    surface.destroy();
  });

  it("opens the shared popover on keyboard focus without requiring Enter", () => {
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
    expect(
      root.querySelector('[data-talent-popover="true"] .talent-popover-name')?.textContent,
    ).toBe("Fortitude");
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

    openTalentPopover(root, "k-hold-line");
    expect(
      root.querySelector('[data-talent-popover="true"] [data-loadout-warning="true"]')?.textContent,
    ).toMatch(/Slotted in Loadout/i);
    expect(
      talentGroup(root, "k-hold-line").querySelector('[data-talent-action="deallocate"]')
        ?.textContent,
    ).toBe("−");
    expect(
      talentGroup(root, "k-hold-line").querySelector('[data-talent-action="allocate"]'),
    ).toBeNull();

    surface.destroy();
  });

  it("keeps points, row titles, and Ability gate note visible outside the detail", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const knight = knightSection(root);
    expect(knight.querySelector('[data-talent-points="true"]')).not.toBeNull();
    expect(
      [...knight.querySelectorAll(".talent-row-title")].map((node) => node.textContent),
    ).toEqual(["Stat Row", "Ability Row"]);
    expect(knight.querySelector(".talent-gate-note")?.textContent).toMatch(
      /Spend 5 Stat Row points/i,
    );

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

  it("stacks Talent Tier 1–3 with tier gate, selection, and Tier-2 ability descriptions", () => {
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
    expect(tiers).toHaveLength(3);
    expect(tiers[0]?.getAttribute("data-talent-tier")).toBe("1");
    expect(tiers[1]?.getAttribute("data-talent-tier")).toBe("2");
    expect(tiers[2]?.getAttribute("data-talent-tier")).toBe("3");
    expect(knight.querySelectorAll(".talent-stat-row .talent-cell")).toHaveLength(6);
    expect(knight.querySelectorAll(".talent-ability-row .talent-cell")).toHaveLength(6);
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
    const unlocked = knightSection(root);
    expect(unlocked.querySelector('[data-talent-tier="2"] [data-talent-tier-gate="true"]')).toBeNull();
    expect(
      unlocked.querySelector('[data-talent-tier="3"] [data-talent-tier-gate="true"]'),
    ).not.toBeNull();

    engine.allocateTalent("knight", "iron-discipline");
    surface.render(engine.snapshot(), legalityViewFromEngine(engine));
    selectTalentCell(root, "vanguard");
    openTalentPopover(root, "vanguard");
    const vanguard = fullContent.abilities.find((entry) => entry.id === "vanguard")!;
    const description = knightSection(root)
      .querySelector('[data-talent-popover="true"]')
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

  it("orders Stat talent face before minus then plus inside each compact row", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    engine.allocateTalent("knight", "k-fortitude");
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const group = talentGroup(root, "k-fortitude");
    const focusables = [...group.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    )];
    expect(focusables.map((node) => node.getAttribute("data-talent-action") ?? "face")).toEqual([
      "face",
      "deallocate",
      "allocate",
    ]);
    expect(group.querySelector("[data-talent-rank-stepper='true']")).not.toBeNull();

    surface.destroy();
  });

  it("shows cascade-blocked feedback with data-talent-cascade-blocked on Stat rows", () => {
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
    const fortitudeGroup = root.querySelector<HTMLElement>(
      '[data-talent-group="true"][data-talent-id="fortitude"]',
    );
    const warning = fortitudeGroup?.querySelector<HTMLElement>("[data-talent-cascade-blocked]");
    expect(warning?.textContent).toMatch(/Talent Tier 2/i);

    surface.destroy();
  });

  it("evidence: talent-direct-actions — uses compact Build column row CSS beside 230px Loadout", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../styles.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\.character-build-board\s+\[data-character-section="talents"\]\s+\.talent-stat-compact-row/,
    );
    expect(css).toMatch(
      /\.character-build-board\s+\[data-character-section="loadout"\][\s\S]*?flex:\s*0\s+0\s+230px/,
    );
  });

  it("renders exact per-rank Stat summary text from content definitions", () => {
    const root = document.createElement("div");
    const engine = leveledKnightEngine();
    const selected = { current: "knight" as ClassId };
    const surface = mountTalentsSurface(root, mountOptions(selected));

    renderTalents(surface, engine);
    const kit = classKitFor(fixtureContent, "knight");
    const fortitude = talentTierDefs(kit)[0]!.statRow.find((entry) => entry.id === "k-fortitude");
    expect(fortitude).toBeDefined();
    const summary = talentGroup(root, "k-fortitude").querySelector(".talent-stat-per-rank-summary");
    expect(summary?.textContent).toBe(formatStatModifierPerRank(fortitude!.perRank));

    surface.destroy();
  });

  it("renders stacked Talent Tiers for every shipped Class", () => {
    const fullContent = buildContent();
    const boot = createEngine(fullContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const engine = createEngine(fullContent, boot.snapshot(), LOOT_SEED);

    for (const classId of ["knight", "wizard", "hunter", "priest"] as const) {
      const root = document.createElement("div");
      const selected = { current: classId };
      const surface = mountTalentsSurface(root, {
        content: fullContent,
        getSelectedClassId: () => selected.current,
      });
      surface.render(engine.snapshot(), legalityViewFromEngine(engine));
      const section = root.querySelector<HTMLElement>(`[data-class-id="${classId}"]`);
      const expectedTiers = classId === "knight" ? 3 : 2;
      expect(section?.querySelectorAll("[data-talent-tier]")).toHaveLength(expectedTiers);
      expect(section?.querySelectorAll(".talent-stat-row .talent-cell")).toHaveLength(
        expectedTiers * 2,
      );
      expect(section?.querySelectorAll(".talent-ability-row .talent-cell")).toHaveLength(
        expectedTiers * 2,
      );
      surface.destroy();
    }
  });

  it("gates each Tier 2 Ability Row until five Stat Row points are spent in that tier", () => {
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
    const tierTwo = knightSection(root).querySelector('[data-talent-tier="2"]');
    expect(tierTwo?.querySelector(".talent-gate-note")?.textContent).toMatch(
      /Spend 5 Stat Row points/i,
    );
    selectTalentCell(root, "vanguard");
    const pick = root.querySelector<HTMLButtonElement>(
      `[data-talent-id="vanguard"][data-talent-action="allocate"]`,
    );
    expect(pick?.disabled).toBe(true);

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
