// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import type { ClassId } from "../core/types";
import type { Snapshot } from "../core/snapshot";
import { mountBattleTile } from "./battle-tile";
import {
  formatAbilityDescription,
  formatAbilityTimings,
} from "./ability-format";
import { characterStatsFor, classKitFor, effectiveTalentState, unlockableAbilityIds } from "./snapshot-view";
import { computeLoadoutAssignment, mountLoadoutSurface } from "./loadout-surface";

const LOOT_SEED = 42;

function mountOptions(
  content: typeof fixtureContent,
  selected: { current: ClassId },
  onCommand?: Parameters<typeof mountLoadoutSurface>[1]["onCommand"],
) {
  return onCommand
    ? {
        content,
        getSelectedClassId: () => selected.current,
        onCommand,
      }
    : {
        content,
        getSelectedClassId: () => selected.current,
      };
}

function knightSection(root: HTMLElement): HTMLElement {
  const section = root.querySelector<HTMLElement>('[data-class-id="knight"]');
  if (!section) {
    throw new Error("missing knight loadout section");
  }
  return section;
}

function poolTile(root: HTMLElement, abilityId: string): HTMLElement {
  const tile = root.querySelector<HTMLElement>(
    `.loadout-pool-tiles [data-ability-id="${abilityId}"]`,
  );
  if (!tile) {
    throw new Error(`missing pool tile ${abilityId}`);
  }
  return tile;
}

function slotTile(root: HTMLElement, slotIndex: number): HTMLElement {
  const tile = root.querySelector<HTMLElement>(
    `[data-loadout-slot-drop][data-slot="${slotIndex}"] [data-loadout-assign-tile]`,
  );
  if (!tile) {
    throw new Error(`missing slot tile ${slotIndex}`);
  }
  return tile;
}

function dragBetween(source: HTMLElement, target: HTMLElement): void {
  const dataTransfer = new DataTransfer();
  source.dispatchEvent(
    new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
  );
  target.dispatchEvent(
    new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer }),
  );
  target.dispatchEvent(
    new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }),
  );
  target.dispatchEvent(
    new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }),
  );
  source.dispatchEvent(
    new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }),
  );
}

function pressEnter(element: HTMLElement): void {
  element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}

describe("Loadout assignment tuple", () => {
  const base: [string, string, string] = ["a", "b", "c"];

  it("replaces a slot when the Ability is not slotted", () => {
    expect(computeLoadoutAssignment(base, "x", 1)).toEqual(["a", "x", "c"]);
  });

  it("swaps when the Ability is already in another slot", () => {
    expect(computeLoadoutAssignment(base, "b", 2)).toEqual(["a", "c", "b"]);
  });

  it("does not change the tuple when assigning an Ability to its current slot", () => {
    expect(computeLoadoutAssignment(base, "b", 1)).toBeNull();
  });
});

describe("Loadout surface", () => {
  it("renders only the picker's selected Character", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));

    surface.render(engine.snapshot());

    const sections = root.querySelectorAll(".loadout-character");
    expect(sections).toHaveLength(1);
    expect(sections[0]?.getAttribute("data-class-id")).toBe("knight");
    expect(knightSection(root).querySelector(".basic-attack")).not.toBeNull();
    expect(knightSection(root).querySelectorAll(".loadout-slot")).toHaveLength(3);
    expect(knightSection(root).querySelector('[data-slot="0"] .slot-label')?.textContent).toMatch(
      /Slot 1/,
    );
    expect(root.querySelector(".loadout-order-note")).not.toBeNull();
    expect(root.querySelector(".loadout-assign")).toBeNull();
    expect(root.querySelector("select")).toBeNull();

    surface.destroy();
  });

  it("re-renders the newly selected Character without a remount", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));

    surface.render(engine.snapshot());
    expect(root.querySelector(".loadout-character")?.getAttribute("data-class-id")).toBe("knight");

    selected.current = "wizard";
    surface.render(engine.snapshot());

    const sections = root.querySelectorAll(".loadout-character");
    expect(sections).toHaveLength(1);
    expect(sections[0]?.getAttribute("data-class-id")).toBe("wizard");

    surface.destroy();
  });

  it("lists every unlocked Ability once in the pool", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));

    surface.render(engine.snapshot());
    const classKit = classKitFor(fixtureContent, "knight");
    const talentState = effectiveTalentState(engine.snapshot(), "knight");
    const expectedPool = unlockableAbilityIds(classKit, talentState).filter(
      (id) => id !== classKit.basicAbilityId,
    );
    const poolIds = [
      ...(root.querySelectorAll<HTMLElement>(".loadout-pool-tiles [data-ability-id]") ?? []),
    ].map((node) => node.dataset["abilityId"]);
    expect(poolIds).toEqual(expectedPool);
    expect(new Set(poolIds).size).toBe(poolIds.length);

    surface.destroy();
  });

  it("excludes Basic Attack from pool drag and assignment", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));

    surface.render(engine.snapshot());
    const basic = root.querySelector<HTMLElement>("[data-loadout-basic]");
    expect(basic?.getAttribute("draggable")).not.toBe("true");
    expect(basic?.querySelector("[data-loadout-assign-tile]")).toBeNull();
    expect(
      root.querySelector(`.loadout-pool-tiles [data-ability-id="${basic?.dataset["abilityId"]}"]`),
    ).toBeNull();

    surface.destroy();
  });

  it("discloses Basic Attack mechanics through the shared popover", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));
    const snapshot = engine.snapshot();
    const basicId = classKitFor(fixtureContent, "knight").basicAbilityId;
    const basicAbility = fixtureContent.abilities.find((entry) => entry.id === basicId)!;

    surface.render(snapshot);
    const basic = root.querySelector<HTMLElement>("[data-loadout-basic]")!;
    basic.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(
      root.querySelector('[data-loadout-ability-popover="true"] [data-ability-description="true"]')
        ?.textContent,
    ).toBe(
      formatAbilityDescription(
        basicAbility,
        characterStatsFor(snapshot, fixtureContent, "knight"),
        fixtureContent.statuses,
      ),
    );

    surface.destroy();
  });

  it("exposes Activation Delay state on slotted tiles at edit time", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        if (command.cmd === "setLoadout") {
          engine.setLoadout(command.args[0], command.args[1]);
        }
      }),
    );

    engine.setLoadout("knight", ["k-pommel", "k-sweep", "k-rally"]);
    surface.render(engine.snapshot());
    expect(slotTile(root, 0).dataset["activationDelay"]).toBe("true");

    surface.destroy();
  });

  it("never renders inline ability descriptions on tiles", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));

    surface.render(engine.snapshot());
    expect(knightSection(root).querySelector(".ability-card .ability-description")).toBeNull();
    expect(knightSection(root).querySelector(".ability-card .ability-timings")).toBeNull();

    surface.destroy();
  });

  it("never renders consolidated Power totals in the DOM", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));

    surface.render(engine.snapshot());
    expect(root.textContent?.toLowerCase()).not.toMatch(/\bpower\b/);

    surface.destroy();
  });

  it("opens the shared popover on hover with exact description and timings", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));
    const snapshot = engine.snapshot();
    const stats = characterStatsFor(snapshot, fixtureContent, "knight");
    const sweep = fixtureContent.abilities.find((entry) => entry.id === "k-sweep")!;

    surface.render(snapshot);
    const tile = poolTile(root, "k-sweep");
    tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));

    const popover = root.querySelector<HTMLElement>('[data-loadout-ability-popover="true"]');
    expect(popover?.hidden).toBe(false);
    expect(popover?.style.pointerEvents).toBe("none");
    expect(popover?.querySelector('[data-ability-description="true"]')?.textContent).toBe(
      formatAbilityDescription(sweep, stats, fixtureContent.statuses),
    );
    expect(popover?.querySelector(".ability-timings")?.textContent).toBe(
      formatAbilityTimings(sweep),
    );
    expect(tile.getAttribute("aria-describedby")).toMatch(/^loadout-ability-desc-/);

    surface.destroy();
  });

  it("keeps the popover open across a Snapshot pump", () => {
    const root = document.createElement("div");
    const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 850;
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        if (command.cmd === "allocateTalent") {
          engine.allocateTalent(command.args[0], command.args[1]);
        }
      }),
    );

    surface.render(engine.snapshot());
    const tile = poolTile(root, "k-sweep");
    tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    const popover = root.querySelector<HTMLElement>('[data-loadout-ability-popover="true"]');
    expect(popover?.hidden).toBe(false);

    engine.allocateTalent("knight", "k-swordcraft");
    surface.render(engine.snapshot());

    expect(popover?.hidden).toBe(false);
    expect(popover?.querySelector('[data-ability-description="true"]')).not.toBeNull();

    surface.destroy();
  });

  it("shows Activation Delay in the popover at edit time for newly inserted slot Abilities", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        if (command.cmd === "setLoadout") {
          engine.setLoadout(command.args[0], command.args[1]);
        }
      }),
    );

    engine.setLoadout("knight", ["k-pommel", "k-sweep", "k-rally"]);
    surface.render(engine.snapshot());

    const pommelSlot = slotTile(root, 0);
    expect(pommelSlot.dataset["activationDelay"]).toBe("true");
    pommelSlot.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(
      root.querySelector('[data-loadout-ability-popover="true"] [data-activation-delay="true"]')
        ?.textContent,
    ).toMatch(/starts on full cooldown/i);
    expect(root.querySelector('[data-cooldown-telemetry="true"]')).toBeNull();

    surface.destroy();
  });

  it("clears Activation Delay markers after the config-applied boundary", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        if (command.cmd === "setLoadout") {
          engine.setLoadout(command.args[0], command.args[1]);
        }
      }),
    );

    engine.setLoadout("knight", ["k-pommel", "k-sweep", "k-rally"]);
    surface.render(engine.snapshot());
    expect(slotTile(root, 0).dataset["activationDelay"]).toBe("true");

    for (let ms = 0; ms < 120_000; ms += 1) {
      const events = engine.advanceBy(1);
      if (events.some((event) => event.type === "config-applied")) {
        surface.render(engine.snapshot());
        expect(slotTile(root, 0).dataset["activationDelay"]).toBeUndefined();
        expect(root.querySelector('[data-cooldown-telemetry="true"]')).toBeNull();
        surface.destroy();
        return;
      }
    }
    throw new Error("config-applied never emitted");
  });

  it("never renders live cooldown or Action Cycle telemetry during a Stage Attempt", () => {
    const loadoutRoot = document.createElement("div");
    const tileRoot = document.createElement("main");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = structuredClone(engine.snapshot()) as Snapshot;
    const attempt = snapshot.attempt;
    if (!attempt) {
      throw new Error("missing attempt");
    }
    const knight = attempt.combatants.find((combatant) => combatant.defId === "knight");
    if (!knight) {
      throw new Error("missing knight combatant");
    }
    knight.cooldownReadyAtMs["k-sweep"] = 10_500;
    knight.action = {
      abilityId: "k-pommel",
      startedAtMs: 100,
      impactAtMs: 400,
      endsAtMs: 1_100,
      targetIds: ["opp:1:0"],
      impactResolved: false,
    };
    snapshot.simNowMs = 300;

    const selected = { current: "knight" as ClassId };
    const loadout = mountLoadoutSurface(loadoutRoot, mountOptions(fixtureContent, selected));
    const tile = mountBattleTile(tileRoot, fixtureContent);
    loadout.render(snapshot);
    tile.render(snapshot);

    expect(loadoutRoot.querySelector('[data-action-cycle-telemetry="true"]')).toBeNull();
    expect(loadoutRoot.querySelector('[data-cooldown-telemetry="true"]')).toBeNull();
    const sweepTile = loadoutRoot.querySelector<HTMLElement>('[data-ability-id="k-sweep"]');
    sweepTile?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(
      loadoutRoot.querySelector('[data-loadout-ability-popover="true"] .ability-timings')
        ?.textContent,
    ).toMatch(/Cooldown/i);
    expect(tileRoot.querySelector('[data-action-cycle-telemetry="true"]')).toBeNull();
    expect(tileRoot.querySelector('[data-cooldown-telemetry="true"]')).toBeNull();

    loadout.destroy();
    tile.destroy();
  });

  it("queues loadout edits with a next-Wave pending marker", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        if (command.cmd === "setLoadout") {
          engine.setLoadout(command.args[0], command.args[1]);
        }
      }),
    );

    engine.setLoadout("knight", ["k-pommel", "k-sweep", "k-rally"]);
    surface.render(engine.snapshot());
    expect(
      knightSection(root).querySelector('[data-pending-kind="loadout"]')?.textContent,
    ).toMatch(/next Wave/i);

    surface.destroy();
  });

  it("publishes setLoadout when dragging from pool to slot", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const commands: unknown[] = [];
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        commands.push(command);
        if (command.cmd === "setLoadout") {
          engine.setLoadout(command.args[0], command.args[1]);
        }
      }),
    );

    surface.render(engine.snapshot());
    const source = poolTile(root, "k-pommel");
    const target = root.querySelector<HTMLElement>('[data-loadout-slot-drop][data-slot="0"]')!;
    dragBetween(source, target);

    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual({
      cmd: "setLoadout",
      args: ["knight", ["k-pommel", "k-rally", "k-sweep"]],
    });
    expect(root.querySelector(".loadout-body--dragging")).toBeNull();

    surface.destroy();
  });

  it("swaps slots when dragging between slotted Abilities", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const commands: unknown[] = [];
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        commands.push(command);
      }),
    );

    surface.render(engine.snapshot());
    dragBetween(
      slotTile(root, 0),
      root.querySelector<HTMLElement>('[data-loadout-slot-drop][data-slot="2"]')!,
    );

    expect(commands).toContainEqual({
      cmd: "setLoadout",
      args: ["knight", ["k-sweep", "k-rally", "k-shield-brace"]],
    });

    surface.destroy();
  });

  it("highlights valid drop targets during drag and clears on drag end", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));

    surface.render(engine.snapshot());
    const source = poolTile(root, "k-pommel");
    const dataTransfer = new DataTransfer();
    source.dispatchEvent(
      new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
    );
    expect(source.classList.contains("loadout-drag-source")).toBe(true);
    expect(root.querySelectorAll(".loadout-drop-target--valid").length).toBe(3);
    source.dispatchEvent(
      new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }),
    );
    expect(root.querySelectorAll(".loadout-drop-target--valid").length).toBe(0);

    surface.destroy();
  });

  it("keeps the dragged tile connected while a Snapshot pump arrives mid-drag", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 850;
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        if (command.cmd === "allocateTalent") {
          engine.allocateTalent(command.args[0], command.args[1]);
        }
      }),
    );

    surface.render(engine.snapshot());
    const source = poolTile(root, "k-pommel");
    const dataTransfer = new DataTransfer();
    source.dispatchEvent(
      new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }),
    );
    expect(source.classList.contains("loadout-drag-source")).toBe(true);

    engine.allocateTalent("knight", "k-swordcraft");
    surface.render(engine.snapshot());
    expect(source.isConnected).toBe(true);
    expect(source.classList.contains("loadout-drag-source")).toBe(true);

    source.dispatchEvent(
      new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }),
    );
    await Promise.resolve();

    surface.destroy();
    root.remove();
  });

  it("assigns with select-then-slot using Enter", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const commands: unknown[] = [];
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        commands.push(command);
        if (command.cmd === "setLoadout") {
          engine.setLoadout(command.args[0], command.args[1]);
        }
      }),
    );

    surface.render(engine.snapshot());
    const source = poolTile(root, "k-pommel");
    source.focus();
    pressEnter(source);
    expect(source.classList.contains("loadout-tile--selected-source")).toBe(true);
    expect(source.getAttribute("aria-pressed")).toBe("true");

    const targetSlot = slotTile(root, 0);
    pressEnter(targetSlot);

    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual({
      cmd: "setLoadout",
      args: ["knight", ["k-pommel", "k-rally", "k-sweep"]],
    });
    expect(source.classList.contains("loadout-tile--selected-source")).toBe(false);

    surface.destroy();
    root.remove();
  });

  it("cancels assignment selection on Escape", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));

    surface.render(engine.snapshot());
    const source = poolTile(root, "k-pommel");
    source.focus();
    pressEnter(source);
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(source.classList.contains("loadout-tile--selected-source")).toBe(false);

    surface.destroy();
    root.remove();
  });

  it("completes loadout slotting using keyboard only", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const commands: unknown[] = [];
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        commands.push(command);
        if (command.cmd === "setLoadout") {
          engine.setLoadout(command.args[0], command.args[1]);
        }
      }),
    );

    surface.render(engine.snapshot());
    const source = poolTile(root, "k-pommel");
    source.focus();
    pressEnter(source);
    const targetSlot = slotTile(root, 0);
    targetSlot.focus();
    pressEnter(targetSlot);
    surface.render(engine.snapshot());

    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual({
      cmd: "setLoadout",
      args: ["knight", ["k-pommel", "k-rally", "k-sweep"]],
    });

    surface.destroy();
    root.remove();
  });

  it("pauses reconcile while a pool tile is focused and flushes on blur", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const outside = document.createElement("button");
    outside.type = "button";
    outside.textContent = "outside";
    document.body.append(outside);
    const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 850;
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        if (command.cmd === "allocateTalent") {
          engine.allocateTalent(command.args[0], command.args[1]);
        }
      }),
    );

    surface.render(engine.snapshot());
    const tile = poolTile(root, "k-sweep");
    tile.focus();
    expect(document.activeElement).toBe(tile);
    const pausedSnapshot = engine.snapshot();
    const pausedDesc = formatAbilityDescription(
      fixtureContent.abilities.find((entry) => entry.id === "k-sweep")!,
      characterStatsFor(pausedSnapshot, fixtureContent, "knight"),
      fixtureContent.statuses,
    );
    expect(
      root.querySelector('[data-loadout-ability-popover="true"] [data-ability-description="true"]')
        ?.textContent,
    ).toBe(pausedDesc);

    engine.allocateTalent("knight", "k-swordcraft");
    engine.allocateTalent("knight", "k-swordcraft");
    surface.render(engine.snapshot());

    expect(document.activeElement).toBe(tile);
    expect(
      root.querySelector('[data-loadout-ability-popover="true"] [data-ability-description="true"]')
        ?.textContent,
    ).toBe(pausedDesc);

    outside.focus();
    tile.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    await Promise.resolve();

    expect(document.activeElement).toBe(outside);
    surface.render(engine.snapshot());
    const flushedDesc = formatAbilityDescription(
      fixtureContent.abilities.find((entry) => entry.id === "k-sweep")!,
      characterStatsFor(engine.snapshot(), fixtureContent, "knight"),
      fixtureContent.statuses,
    );
    tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(
      root.querySelector('[data-loadout-ability-popover="true"] [data-ability-description="true"]')
        ?.textContent,
    ).toBe(flushedDesc);
    expect(flushedDesc).not.toBe(pausedDesc);

    surface.destroy();
    root.remove();
    outside.remove();
  });

  it("recomputes popover text after flush when stats change", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const outside = document.createElement("button");
    outside.type = "button";
    document.body.append(outside);
    const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 850;
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(
      root,
      mountOptions(fixtureContent, selected, (command) => {
        if (command.cmd === "allocateTalent") {
          engine.allocateTalent(command.args[0], command.args[1]);
        }
      }),
    );

    surface.render(engine.snapshot());
    const tile = poolTile(root, "k-sweep");
    tile.focus();
    const before = formatAbilityDescription(
      fixtureContent.abilities.find((entry) => entry.id === "k-sweep")!,
      characterStatsFor(engine.snapshot(), fixtureContent, "knight"),
      fixtureContent.statuses,
    );

    engine.allocateTalent("knight", "k-swordcraft");
    engine.allocateTalent("knight", "k-swordcraft");
    surface.render(engine.snapshot());

    outside.focus();
    tile.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    await Promise.resolve();
    surface.render(engine.snapshot());

    tile.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    const after = formatAbilityDescription(
      fixtureContent.abilities.find((entry) => entry.id === "k-sweep")!,
      characterStatsFor(engine.snapshot(), fixtureContent, "knight"),
      fixtureContent.statuses,
    );
    expect(
      root.querySelector('[data-loadout-ability-popover="true"] [data-ability-description="true"]')
        ?.textContent,
    ).toBe(after);
    expect(before).not.toBe(after);

    surface.destroy();
    root.remove();
    outside.remove();
  });
});

describe("Loadout surface source boundary", () => {
  it("does not import the Engine", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "loadout-surface.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']\.\.\/core\/engine["']/);
  });
});
