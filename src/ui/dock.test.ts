// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import { mountBattleTile } from "./battle-tile";
import { DOCK_SURFACES, DOCK_TABS, mountManagementDock } from "./dock";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";

function mountDock(root: HTMLElement, options: Parameters<typeof mountManagementDock>[1] = {}) {
  return mountManagementDock(root, { content: fixtureContent, ...options });
}

describe("Management Dock shell", () => {
  it("registers Character, Armory, and Stage in DOCK_TABS and DOCK_SURFACES one-for-one", () => {
    expect(DOCK_TABS).toEqual([
      { id: "character", label: "Character" },
      { id: "armory", label: "Armory" },
      { id: "stage", label: "Stage" },
    ]);
    const tabIds = DOCK_TABS.map((tab) => tab.id);
    const surfaceIds = DOCK_SURFACES.map((entry) => entry.id);
    expect(surfaceIds).toEqual(tabIds);
    expect(new Set(surfaceIds).size).toBe(surfaceIds.length);
  });

  it("renders tabs in Character, Armory, Stage order", () => {
    const root = document.createElement("main");
    mountDock(root);
    const labels = [...root.querySelectorAll<HTMLButtonElement>(".dock-tab")].map(
      (button) => button.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(labels).toEqual(["Character", "Armory", "Stage"]);
  });

  it("shows one surface at a time across the three tabs", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    dock.render(engine.snapshot());

    const panels = () => [...root.querySelectorAll<HTMLElement>("[data-dock-panel]")];
    expect(panels()).toHaveLength(3);
    expect(panels().filter((panel) => !panel.hidden)).toHaveLength(1);
    expect(root.querySelectorAll(".dock-tab")).toHaveLength(3);
    expect(root.querySelector<HTMLElement>('[data-dock-panel="character"]')?.hidden).toBe(false);

    root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();
    dock.render(engine.snapshot());
    expect(root.querySelector<HTMLElement>('[data-dock-panel="character"]')?.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('[data-dock-panel="armory"]')?.hidden).toBe(false);

    dock.destroy();
  });

  it("places Party, Equipment, Loadout, and Talents sections inside the Character panel", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    dock.render(engine.snapshot());

    const characterPanel = root.querySelector<HTMLElement>('[data-dock-panel="character"]');
    const sections = [
      ...(characterPanel?.querySelectorAll<HTMLElement>("[data-character-section]") ?? []),
    ];
    expect(sections.map((section) => section.dataset["characterSection"])).toEqual([
      "party",
      "equipment",
      "loadout",
      "talents",
    ]);

    dock.destroy();
  });

  it("passes legality into Character so Talent allocate buttons reflect the view", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const boot = createEngine(fixtureContent, undefined, 42);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 850;
    const engine = createEngine(fixtureContent, saved, 42);
    const snapshot = engine.snapshot();

    dock.render(snapshot, EMPTY_ENGINE_LEGALITY);
    expect(
      root.querySelector<HTMLButtonElement>(
        '[data-talent-id="k-fortitude"][data-talent-action="allocate"]',
      )?.disabled,
    ).toBe(true);

    const permitting: EngineLegalityView = {
      canAllocateTalent: () => true,
      canDeallocateTalent: () => false,
      canEquip: () => false,
    };
    dock.render(snapshot, permitting);
    expect(
      root.querySelector<HTMLButtonElement>(
        '[data-talent-id="k-fortitude"][data-talent-action="allocate"]',
      )?.disabled,
    ).toBe(false);

    dock.destroy();
  });

  it("closes when the active tab is pressed again or the close button is used", () => {
    const root = document.createElement("main");
    const onClose = vi.fn();
    const dock = mountDock(root, { onClose });

    root.querySelector<HTMLButtonElement>('[data-dock-tab="character"]')?.click();
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    root.querySelector<HTMLButtonElement>(".dock-close")?.click();
    expect(onClose).toHaveBeenCalledTimes(1);

    dock.destroy();
  });

  it("cycles Character → Armory → Stage with ArrowRight and wraps; Home/End reach ends", () => {
    const root = document.createElement("main");
    const onClose = vi.fn();
    mountDock(root, { onClose });

    const characterTab = root.querySelector<HTMLButtonElement>('[data-dock-tab="character"]');
    characterTab?.focus();
    characterTab?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(root.querySelector<HTMLElement>('[data-dock-panel="armory"]')?.hidden).toBe(false);

    const armoryTab = root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]');
    armoryTab?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(root.querySelector<HTMLElement>('[data-dock-panel="stage"]')?.hidden).toBe(false);

    const stageTab = root.querySelector<HTMLButtonElement>('[data-dock-tab="stage"]');
    stageTab?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(root.querySelector<HTMLElement>('[data-dock-panel="character"]')?.hidden).toBe(false);

    armoryTab?.click();
    expect(root.querySelector<HTMLElement>('[data-dock-panel="armory"]')?.hidden).toBe(false);
    armoryTab?.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(root.querySelector<HTMLElement>('[data-dock-panel="character"]')?.hidden).toBe(false);

    characterTab?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(root.querySelector<HTMLElement>('[data-dock-panel="stage"]')?.hidden).toBe(false);

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

  it("destroys Character sub-surfaces when the dock is destroyed", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    dock.render(engine.snapshot());

    expect(root.querySelector(".party-surface")).not.toBeNull();
    expect(root.querySelector(".loadout-surface")).not.toBeNull();
    expect(root.querySelector(".talents-surface")).not.toBeNull();

    dock.destroy();

    expect(root.querySelector(".party-surface")).toBeNull();
    expect(root.querySelector(".loadout-surface")).toBeNull();
    expect(root.querySelector(".talents-surface")).toBeNull();
    expect(root.querySelector(".character-surface")).toBeNull();
  });
});

describe("Management Dock active-surface rendering", () => {
  it("renders only the active surface on pump-driven updates", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);

    dock.render(engine.snapshot());

    expect(root.querySelector(".character-surface")?.childElementCount).toBeGreaterThan(0);
    expect(root.querySelector(".party-surface")?.childElementCount).toBeGreaterThan(0);
    expect(root.querySelector(".loadout-surface")?.childElementCount).toBeGreaterThan(0);
    expect(root.querySelector(".talents-surface")?.childElementCount).toBeGreaterThan(0);
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

    expect(root.querySelector(".armory-surface .dock-surface-title")).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();

    expect(root.querySelector(".armory-surface .dock-surface-title")).not.toBeNull();

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

    root.querySelector<HTMLButtonElement>('[data-dock-tab="character"]')?.click();
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

    const focusTarget = root.querySelector<HTMLElement>('[data-dock-tab="character"]');
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

    root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-dock-tab="character"]')?.click();

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

describe("Management Dock Character → Armory jump", () => {
  it("switches to Armory and applies the browse-slot filter when Choose is activated", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = structuredClone(engine.snapshot());
    snapshot.progression.armory = [
      {
        dropId: 1,
        baseId: "fixture-blade",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 100,
        seen: true,
        locked: false,
        assignedTo: null,
      },
      {
        dropId: 2,
        baseId: "fixture-armor",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 200,
        seen: true,
        locked: false,
        assignedTo: null,
      },
    ];
    dock.render(snapshot);

    root.querySelector<HTMLButtonElement>('[data-browse-slot="armor"]')?.click();

    expect(root.querySelector<HTMLElement>('[data-dock-panel="armory"]')?.hidden).toBe(false);
    expect(
      root
        .querySelector<HTMLButtonElement>(
          '[data-filter-key="slot"][data-filter-value="armor"]',
        )
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      [...root.querySelectorAll<HTMLElement>(".equipment-card")].map((card) => card.dataset["dropId"]),
    ).toEqual(["2"]);

    root.remove();
    dock.destroy();
  });

  it("consumes the browse-slot intent once so a later manual Armory visit does not re-apply it", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    const snapshot = structuredClone(engine.snapshot());
    snapshot.progression.armory = [
      {
        dropId: 1,
        baseId: "fixture-blade",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 100,
        seen: true,
        locked: false,
        assignedTo: null,
      },
      {
        dropId: 2,
        baseId: "fixture-armor",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 200,
        seen: true,
        locked: false,
        assignedTo: null,
      },
    ];
    dock.render(snapshot);

    root.querySelector<HTMLButtonElement>('[data-browse-slot="armor"]')?.click();
    root.querySelector<HTMLButtonElement>(".armory-filter-clear")?.click();
    expect(
      root
        .querySelector<HTMLButtonElement>(
          '[data-filter-key="slot"][data-filter-value="armor"]',
        )
        ?.getAttribute("aria-pressed"),
    ).toBe("false");

    root.querySelector<HTMLButtonElement>('[data-dock-tab="character"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();

    expect(
      root
        .querySelector<HTMLButtonElement>(
          '[data-filter-key="slot"][data-filter-value="armor"]',
        )
        ?.getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      [...root.querySelectorAll<HTMLElement>(".equipment-card")].map((card) => card.dataset["dropId"]),
    ).toEqual(["2", "1"]);

    root.remove();
    dock.destroy();
  });
});

describe("Management Dock source boundary", () => {
  it("does not import the Engine", () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "dock.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["']\.\.\/core\/engine["']/);
  });
});
