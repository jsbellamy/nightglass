// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import { mountBattleTile } from "./battle-tile";
import { DOCK_SURFACES, DOCK_TABS, mountManagementDock } from "./dock";
import {
  EMPTY_ENGINE_LEGALITY,
  legalityViewFromEngine,
  type EngineLegalityView,
} from "./engine-legality";

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

  it("places Loadout and Talents sections inside the Character panel without Equipment or Party", () => {
    const root = document.createElement("main");
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    dock.render(engine.snapshot());

    const characterPanel = root.querySelector<HTMLElement>('[data-dock-panel="character"]');
    const sections = [
      ...(characterPanel?.querySelectorAll<HTMLElement>("[data-character-section]") ?? []),
    ];
    expect(sections.map((section) => section.dataset["characterSection"])).toEqual([
      "loadout",
      "talents",
    ]);
    expect(root.querySelector('[data-character-section="equipment"]')).toBeNull();
    expect(root.querySelector(".party-surface")).toBeNull();
    expect(root.querySelector(".character-picker [data-formation-action]")).not.toBeNull();

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

    expect(root.querySelector(".party-surface")).toBeNull();
    expect(root.querySelector(".character-picker")).not.toBeNull();
    expect(root.querySelector(".loadout-surface")).not.toBeNull();
    expect(root.querySelector(".talents-surface")).not.toBeNull();

    dock.destroy();

    expect(root.querySelector(".character-picker")).toBeNull();
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
    expect(root.querySelector(".party-surface")).toBeNull();
    expect(root.querySelector(".character-picker [data-character-chip]")).not.toBeNull();
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

    expect(root.querySelector(".armory-surface .dock-surface-title")).toBeNull();
    expect(root.querySelector(".armory-surface .armory-body")).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-dock-tab="stage"]')?.click();
    expect(root.querySelector(".stage-surface .dock-surface-title")).toBeNull();
    expect(root.querySelector(".stage-surface .attempt-position")).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-dock-tab="character"]')?.click();
    expect(root.querySelector(".party-surface")).toBeNull();
    expect(root.querySelector(".loadout-surface .dock-surface-title")?.textContent).toBe(
      "Loadout",
    );
    expect(root.querySelector(".talents-surface .dock-surface-title")?.textContent).toBe(
      "Talents",
    );

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

  it("does not remount Armory grid or reset scrollTop on an HP-only Snapshot pump", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    const first = structuredClone(engine.snapshot());
    first.progression.armory = [
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
      {
        dropId: 3,
        baseId: "fixture-blade",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 300,
        seen: true,
        locked: false,
        assignedTo: null,
      },
    ];
    const legality = legalityViewFromEngine(createEngine(fixtureContent, first, 3));
    dock.render(first, legality);
    root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();

    const grid = root.querySelector<HTMLElement>(".armory-grid");
    expect(grid).not.toBeNull();
    grid!.scrollTop = 48;
    expect(grid!.scrollTop).toBe(48);

    const hpOnly = structuredClone(first);
    const partyCombatant = hpOnly.attempt?.combatants.find((c) => c.side === "party");
    if (!partyCombatant) {
      throw new Error("missing party combatant");
    }
    partyCombatant.health = Math.max(1, partyCombatant.health - 7);
    hpOnly.simNowMs += 250;

    dock.render(hpOnly, legality);

    const gridAfter = root.querySelector<HTMLElement>(".armory-grid");
    expect(gridAfter).toBe(grid);
    expect(gridAfter!.scrollTop).toBe(48);

    root.remove();
    dock.destroy();
  });

  it("does not remount Character panel or reset scrollTop on an HP-only Snapshot pump", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    const first = structuredClone(engine.snapshot());
    dock.render(first);

    const panel = root.querySelector<HTMLElement>('[data-dock-panel="character"]');
    expect(panel).not.toBeNull();
    panel!.scrollTop = 36;
    expect(panel!.scrollTop).toBe(36);

    const hpOnly = structuredClone(first);
    const partyCombatant = hpOnly.attempt?.combatants.find((c) => c.side === "party");
    if (!partyCombatant) {
      throw new Error("missing party combatant");
    }
    partyCombatant.health = Math.max(1, partyCombatant.health - 5);
    hpOnly.simNowMs += 250;

    dock.render(hpOnly);

    const panelAfter = root.querySelector<HTMLElement>('[data-dock-panel="character"]');
    expect(panelAfter).toBe(panel);
    expect(panelAfter!.scrollTop).toBe(36);

    root.remove();
    dock.destroy();
  });

  it("remounts the active surface when a management-relevant pendingEdits change arrives", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    const first = structuredClone(engine.snapshot());
    dock.render(first);

    expect(root.querySelector(".character-picker")).not.toBeNull();
    expect(root.querySelector('[data-pending-kind="formation"]')).toBeNull();

    const managed = structuredClone(first);
    const order = [...managed.progression.party].reverse() as typeof managed.progression.party;
    managed.pendingEdits = [{ kind: "formation", order }];

    dock.render(managed);

    expect(root.querySelector('[data-pending-kind="formation"]')).not.toBeNull();
    expect(root.querySelector(".character-picker")).not.toBeNull();
    expect(root.querySelector(".party-surface")).toBeNull();

    root.remove();
    dock.destroy();
  });

  it("restores Armory grid scrollTop after a management-relevant remount", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    const first = structuredClone(engine.snapshot());
    first.progression.armory = [
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
      {
        dropId: 3,
        baseId: "fixture-blade",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 300,
        seen: true,
        locked: false,
        assignedTo: null,
      },
    ];
    const legality = legalityViewFromEngine(createEngine(fixtureContent, first, 3));
    dock.render(first, legality);
    root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();

    const grid = root.querySelector<HTMLElement>(".armory-grid");
    expect(grid).not.toBeNull();
    grid!.scrollTop = 48;
    expect(grid!.scrollTop).toBe(48);

    const managed = structuredClone(first);
    managed.progression.armory = [
      ...managed.progression.armory,
      {
        dropId: 4,
        baseId: "fixture-armor",
        itemLevel: 1,
        rarity: "common",
        affixes: [],
        awardedAtMs: 400,
        seen: true,
        locked: false,
        assignedTo: null,
      },
    ];
    dock.render(managed, legality);

    const gridAfter = root.querySelector<HTMLElement>(".armory-grid");
    expect(gridAfter).not.toBe(grid);
    expect(gridAfter!.scrollTop).toBe(48);

    root.remove();
    dock.destroy();
  });

  it("restores picker focus onto the selected chip after a management-relevant remount", () => {
    const root = document.createElement("main");
    document.body.append(root);
    const dock = mountDock(root);
    const engine = createEngine(fixtureContent, undefined, 3);
    const first = structuredClone(engine.snapshot());
    dock.render(first);

    const other = first.progression.party[1]!;
    root.querySelector<HTMLElement>(`[data-character-chip="${other}"]`)?.click();
    root.querySelector<HTMLElement>(`[data-character-chip="${other}"]`)?.focus();
    expect(document.activeElement).toBe(
      root.querySelector(`[data-character-chip="${other}"]`),
    );

    const managed = structuredClone(first);
    managed.pendingEdits = [
      {
        kind: "formation",
        order: [...managed.progression.party].reverse() as typeof managed.progression.party,
      },
    ];
    dock.render(managed);

    expect(document.activeElement).toBe(
      root.querySelector(`[data-character-chip="${other}"]`),
    );

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
    expect(root.querySelector(".character-surface")?.childElementCount).toBeGreaterThan(0);
    expect(root.querySelector(".party-surface")).toBeNull();
    expect(onCommand).not.toHaveBeenCalled();

    const third = snapshot.progression.party[2]!;
    const thirdChip = root.querySelector<HTMLElement>(`[data-character-chip="${third}"]`);
    thirdChip?.focus();
    thirdChip?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(
      root.querySelector(`[data-character-chip="${third}"]`)?.getAttribute("aria-selected"),
    ).toBe("true");
    expect(onCommand).not.toHaveBeenCalled();

    root
      .querySelector<HTMLButtonElement>('[data-formation-action="move-down"][data-slot="0"]')
      ?.click();
    expect(onCommand).toHaveBeenCalledWith({
      cmd: "setFormation",
      args: [[snapshot.progression.party[1], snapshot.progression.party[0], snapshot.progression.party[2]]],
    });

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

describe("Management Dock Armory worn strip", () => {
  it("applies browse-slot filters from the worn strip without leaving Armory", () => {
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
    const live = createEngine(fixtureContent, snapshot, 3);
    dock.render(snapshot, legalityViewFromEngine(live));
    root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();

    root.querySelector<HTMLButtonElement>('[data-worn-slot="armor"]')?.click();

    expect(root.querySelector<HTMLElement>('[data-dock-panel="armory"]')?.hidden).toBe(false);
    expect(root.querySelector('[data-character-section="equipment"]')).toBeNull();
    expect(
      root.querySelector<HTMLButtonElement>('[data-slot-filter="armor"]')?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      [...root.querySelectorAll<HTMLElement>(".armory-grid .equipment-card")].map(
        (card) => card.dataset["dropId"],
      ),
    ).toEqual(["2"]);

    root.remove();
    dock.destroy();
  });

  it("keeps a worn-strip slot filter until the player clears it, including after leaving Armory", () => {
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
    const live = createEngine(fixtureContent, snapshot, 3);
    dock.render(snapshot, legalityViewFromEngine(live));
    root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();

    root.querySelector<HTMLButtonElement>('[data-worn-slot="armor"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-slot-filter="all"]')?.click();
    expect(
      root.querySelector<HTMLButtonElement>('[data-slot-filter="armor"]')?.getAttribute("aria-pressed"),
    ).toBe("false");

    root.querySelector<HTMLButtonElement>('[data-dock-tab="character"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-dock-tab="armory"]')?.click();

    expect(
      root.querySelector<HTMLButtonElement>('[data-slot-filter="armor"]')?.getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      [...root.querySelectorAll<HTMLElement>(".armory-grid .equipment-card")].map(
        (card) => card.dataset["dropId"],
      ),
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
