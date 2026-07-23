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
import { formatAbilityChoiceLabel, formatAbilityDescription } from "./ability-format";
import { characterStatsFor } from "./snapshot-view";
import { mountLoadoutSurface } from "./loadout-surface";

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

function sweepDescriptionText(root: HTMLElement): string | undefined {
  return knightSection(root)
    .querySelector<HTMLElement>('[data-ability-id="k-sweep"] [data-ability-description="true"]')
    ?.textContent ?? undefined;
}

function expectedSweepDescription(snapshot: Snapshot): string {
  return formatAbilityDescription(
    fixtureContent.abilities.find((entry) => entry.id === "k-sweep")!,
    characterStatsFor(snapshot, fixtureContent, "knight"),
    fixtureContent.statuses,
  );
}

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

  it("recomputes ability descriptions when a Stat Talent rank changes", () => {
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
    expect(sweepDescriptionText(root)).toBe(expectedSweepDescription(engine.snapshot()));

    engine.allocateTalent("knight", "k-swordcraft");
    engine.allocateTalent("knight", "k-swordcraft");
    surface.render(engine.snapshot());
    expect(sweepDescriptionText(root)).toBe(expectedSweepDescription(engine.snapshot()));

    surface.destroy();
  });

  it("renders compact mechanical summaries on loadout assignment options", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));
    const snapshot = engine.snapshot();
    const stats = characterStatsFor(snapshot, fixtureContent, "knight");

    surface.render(snapshot);
    const select = knightSection(root).querySelector<HTMLSelectElement>(
      '[data-loadout-assign="0"]',
    );
    const shieldBrace = fixtureContent.abilities.find((entry) => entry.id === "k-shield-brace")!;
    const selectedOption = select?.selectedOptions[0];
    expect(selectedOption?.textContent).toBe(
      formatAbilityChoiceLabel(shieldBrace, stats, fixtureContent.statuses),
    );

    surface.destroy();
  });

  it("exposes full ability descriptions as accessible DOM text on every card", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));

    surface.render(engine.snapshot());
    const descriptions = knightSection(root).querySelectorAll('[data-ability-description="true"]');
    expect(descriptions.length).toBeGreaterThanOrEqual(4);

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

  it("prevents duplicate Ability assignment in the slot picker", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const selected = { current: "knight" as ClassId };
    const surface = mountLoadoutSurface(root, mountOptions(fixtureContent, selected));

    surface.render(engine.snapshot());
    const slotTwoSelect = knightSection(root).querySelector<HTMLSelectElement>(
      '[data-loadout-assign="1"]',
    );
    const sweepOption = [...(slotTwoSelect?.options ?? [])].find(
      (option) => option.value === "k-sweep",
    );
    expect(sweepOption?.disabled).toBe(true);

    surface.destroy();
  });

  it("shows Activation Delay at edit time and keeps authored timing without live cooldown telemetry", () => {
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

    const pommelCardBefore = knightSection(root).querySelector('[data-ability-id="k-pommel"]');
    expect(pommelCardBefore?.querySelector('[data-activation-delay="true"]')?.textContent).toMatch(
      /starts on full cooldown/i,
    );
    expect(pommelCardBefore?.querySelector('[data-cooldown-telemetry="true"]')).toBeNull();
    expect(pommelCardBefore?.querySelector(".ability-timings")?.textContent).toMatch(/Cooldown/i);

    for (let ms = 0; ms < 120_000; ms += 1) {
      const events = engine.advanceBy(1);
      if (events.some((event) => event.type === "config-applied")) {
        surface.render(engine.snapshot());
        const pommelCard = knightSection(root).querySelector('[data-ability-id="k-pommel"]');
        expect(pommelCard?.querySelector('[data-cooldown-telemetry="true"]')).toBeNull();
        expect(pommelCard?.querySelector('[data-activation-delay="true"]')).toBeNull();
        expect(pommelCard?.querySelector(".ability-timings")?.textContent).toMatch(/Cooldown/i);
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
    expect(loadoutRoot.querySelector(".ability-timings")?.textContent).toMatch(/Cooldown/i);
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
    const select = knightSection(root).querySelector<HTMLSelectElement>(
      '[data-loadout-assign="0"]',
    );
    select?.focus();
    if (!select) {
      throw new Error("missing loadout select");
    }
    select.value = "k-pommel";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    surface.render(engine.snapshot());

    expect(commands).toContainEqual({
      cmd: "setLoadout",
      args: ["knight", ["k-pommel", "k-rally", "k-sweep"]],
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

  it("keeps the focused Ability picker select across a changed Snapshot render", () => {
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
    const select = root.querySelector<HTMLSelectElement>(".loadout-assign");
    if (!select) {
      throw new Error("missing loadout select");
    }
    select.focus();
    expect(document.activeElement).toBe(select);
    const pausedSnapshot = engine.snapshot();
    expect(sweepDescriptionText(root)).toBe(expectedSweepDescription(pausedSnapshot));

    engine.allocateTalent("knight", "k-swordcraft");
    engine.allocateTalent("knight", "k-swordcraft");
    surface.render(engine.snapshot());

    expect(root.querySelector(".loadout-assign")).toBe(select);
    expect(document.activeElement).toBe(select);
    expect(sweepDescriptionText(root)).toBe(expectedSweepDescription(pausedSnapshot));

    surface.destroy();
    root.remove();
  });

  it("flushes the paused Snapshot after the Ability picker blurs", async () => {
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
    const select = root.querySelector<HTMLSelectElement>(".loadout-assign");
    if (!select) {
      throw new Error("missing loadout select");
    }
    select.focus();
    const pausedSnapshot = engine.snapshot();
    expect(sweepDescriptionText(root)).toBe(expectedSweepDescription(pausedSnapshot));

    engine.allocateTalent("knight", "k-swordcraft");
    engine.allocateTalent("knight", "k-swordcraft");
    surface.render(engine.snapshot());
    expect(sweepDescriptionText(root)).toBe(expectedSweepDescription(pausedSnapshot));

    outside.focus();
    select.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    await Promise.resolve();

    expect(sweepDescriptionText(root)).toBe(expectedSweepDescription(engine.snapshot()));
    expect(document.activeElement).toBe(outside);

    surface.destroy();
    root.remove();
    outside.remove();
  });

  it("dispatches setLoadout from a change on the Ability picker", async () => {
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
          surface.render(engine.snapshot());
        }
      }),
    );

    surface.render(engine.snapshot());
    const select = root.querySelector<HTMLSelectElement>(".loadout-assign");
    if (!select) {
      throw new Error("missing loadout select");
    }
    select.focus();
    select.value = "k-pommel";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect(commands).toContainEqual({
      cmd: "setLoadout",
      args: ["knight", ["k-pommel", "k-rally", "k-sweep"]],
    });
    expect(
      knightSection(root).querySelector('[data-pending-kind="loadout"]')?.textContent,
    ).toMatch(/next Wave/i);
    expect(document.activeElement).not.toBe(select);

    surface.destroy();
    root.remove();
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
