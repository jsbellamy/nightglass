// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import type { Snapshot } from "../core/snapshot";
import { mountBattleTile } from "./battle-tile";
import { mountLoadoutSurface } from "./loadout-surface";

const LOOT_SEED = 42;

function knightSection(root: HTMLElement): HTMLElement {
  const section = root.querySelector<HTMLElement>('[data-class-id="knight"]');
  if (!section) {
    throw new Error("missing knight loadout section");
  }
  return section;
}

function sweepRawText(root: HTMLElement): string | undefined {
  return knightSection(root)
    .querySelector<HTMLElement>('[data-ability-id="k-sweep"] .ability-raw')
    ?.textContent ?? undefined;
}

describe("Loadout surface", () => {
  it("shows the basic attack fallback and three ordered loadout slots per Character", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const surface = mountLoadoutSurface(root, { content: fixtureContent });

    surface.render(engine.snapshot());

    expect(root.querySelectorAll(".loadout-character")).toHaveLength(4);
    const knight = knightSection(root);
    expect(knight.querySelector(".basic-attack")).not.toBeNull();
    expect(knight.querySelectorAll(".loadout-slot")).toHaveLength(3);
    expect(knight.querySelector('[data-slot="0"] .slot-label')?.textContent).toMatch(/Slot 1/);

    surface.destroy();
  });

  it("recomputes raw damage when a Stat Talent rank changes", () => {
    const root = document.createElement("div");
    const boot = createEngine(fixtureContent, undefined, LOOT_SEED);
    boot.advanceBy(1);
    const saved = boot.snapshot();
    saved.progression.characterXp.knight = 850;
    const engine = createEngine(fixtureContent, saved, LOOT_SEED);
    const surface = mountLoadoutSurface(root, {
      content: fixtureContent,
      onCommand: (command) => {
        if (command.cmd === "allocateTalent") {
          engine.allocateTalent(command.args[0], command.args[1]);
        }
      },
    });

    surface.render(engine.snapshot());
    expect(sweepRawText(root)).toBe("9 damage");

    engine.allocateTalent("knight", "k-swordcraft");
    engine.allocateTalent("knight", "k-swordcraft");
    surface.render(engine.snapshot());
    expect(sweepRawText(root)).toBe("10 damage");

    surface.destroy();
  });

  it("never renders consolidated Power totals in the DOM", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const surface = mountLoadoutSurface(root, { content: fixtureContent });

    surface.render(engine.snapshot());
    expect(root.textContent?.toLowerCase()).not.toMatch(/\bpower\b/);

    surface.destroy();
  });

  it("prevents duplicate Ability assignment in the slot picker", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const surface = mountLoadoutSurface(root, { content: fixtureContent });

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

  it("shows Activation Delay at queue time and live cooldown after the Wave boundary", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const surface = mountLoadoutSurface(root, {
      content: fixtureContent,
      onCommand: (command) => {
        if (command.cmd === "setLoadout") {
          engine.setLoadout(command.args[0], command.args[1]);
        }
      },
    });

    engine.setLoadout("knight", ["k-pommel", "k-sweep", "k-rally"]);
    surface.render(engine.snapshot());

    const pommelCardBefore = knightSection(root).querySelector('[data-ability-id="k-pommel"]');
    expect(pommelCardBefore?.querySelector('[data-activation-delay="true"]')?.textContent).toMatch(
      /starts on full cooldown/i,
    );
    expect(pommelCardBefore?.querySelector('[data-cooldown-telemetry="true"]')).toBeNull();

    for (let ms = 0; ms < 120_000; ms += 1) {
      const events = engine.advanceBy(1);
      if (events.some((event) => event.type === "config-applied")) {
        surface.render(engine.snapshot());
        const pommelCard = knightSection(root).querySelector('[data-ability-id="k-pommel"]');
        const cooldown = pommelCard?.querySelector<HTMLElement>(
          '[data-cooldown-telemetry="true"]',
        );
        expect(cooldown?.textContent).toMatch(/remaining|ready/i);
        expect(pommelCard?.querySelector('[data-activation-delay="true"]')).toBeNull();
        expect(Number(cooldown?.dataset["remainingMs"])).toBeGreaterThan(0);
        surface.destroy();
        return;
      }
    }
    throw new Error("config-applied never emitted");
  });

  it("interpolates cooldown remaining ms from cooldownReadyAtMs vs simNowMs", () => {
    const root = document.createElement("div");
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
    snapshot.simNowMs = 10_000;

    const surface = mountLoadoutSurface(root, { content: fixtureContent });
    surface.render(snapshot);

    const cooldown = knightSection(root).querySelector<HTMLElement>(
      '[data-ability-id="k-sweep"] [data-cooldown-telemetry="true"]',
    );
    expect(cooldown?.dataset["remainingMs"]).toBe("500");
    expect(cooldown?.textContent).toBe("500ms remaining");

    surface.destroy();
  });

  it("shows Action Cycle telemetry only in the Loadout surface, not the Battle Tile", () => {
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
    knight.action = {
      abilityId: "k-pommel",
      startedAtMs: 100,
      impactAtMs: 400,
      endsAtMs: 1_100,
      targetIds: ["opp:1:0"],
      impactResolved: false,
    };
    snapshot.simNowMs = 300;

    const loadout = mountLoadoutSurface(loadoutRoot, { content: fixtureContent });
    const tile = mountBattleTile(tileRoot, fixtureContent);
    loadout.render(snapshot);
    tile.render(snapshot);

    expect(loadoutRoot.querySelector('[data-action-cycle-telemetry="true"]')).not.toBeNull();
    expect(loadoutRoot.querySelector('[data-cooldown-telemetry="true"]')).not.toBeNull();
    expect(tileRoot.querySelector('[data-action-cycle-telemetry="true"]')).toBeNull();
    expect(tileRoot.querySelector('[data-cooldown-telemetry="true"]')).toBeNull();

    loadout.destroy();
    tile.destroy();
  });

  it("queues loadout edits with a next-Wave pending marker", () => {
    const root = document.createElement("div");
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    engine.advanceBy(1);
    const surface = mountLoadoutSurface(root, {
      content: fixtureContent,
      onCommand: (command) => {
        if (command.cmd === "setLoadout") {
          engine.setLoadout(command.args[0], command.args[1]);
        }
      },
    });

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
    const surface = mountLoadoutSurface(root, {
      content: fixtureContent,
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "setLoadout") {
          engine.setLoadout(command.args[0], command.args[1]);
        }
      },
    });

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
