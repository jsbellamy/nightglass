// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { fixtureContent } from "../core/testing/fixture-content";
import type { ClassId, Content } from "../core/types";
import { buildContent } from "../data";
import { applyTileCommand } from "../main";
import { createBusEndpoint } from "./bus";
import { serializeEngineLegality } from "./engine-legality";
import { mountPartySurface } from "./party-surface";
import { levelFor } from "./snapshot-view";

const LOOT_SEED = 42;
const content = buildContent();

function mountOptions(
  contentArg: Content,
  selected: { current: ClassId },
  onCommand?: Parameters<typeof mountPartySurface>[1]["onCommand"],
) {
  return onCommand
    ? {
        content: contentArg,
        getSelectedClassId: () => selected.current,
        onCommand,
      }
    : {
        content: contentArg,
        getSelectedClassId: () => selected.current,
      };
}

/** Drain BroadcastChannel delivery across hops until `predicate` holds. */
async function flushBus(predicate?: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    if (!predicate || predicate()) {
      return;
    }
  }
  throw new Error("BroadcastChannel flush timed out");
}

function activateFocused(): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) {
    throw new Error("expected a focused element");
  }
  active.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}

describe("Party surface", () => {
  it("renders three Formation slots and marks the selected Character's slot", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const party = engine.snapshot().progression.party;
    const selected = { current: party[1] as ClassId };
    const surface = mountPartySurface(root, mountOptions(content, selected));

    surface.render(engine.snapshot());

    expect(root.querySelector(".party-formation")).not.toBeNull();
    expect(root.querySelectorAll(".formation-slot")).toHaveLength(3);
    expect(root.querySelectorAll('[data-formation-selected="true"]')).toHaveLength(1);
    expect(
      root.querySelector(`.formation-slot[data-slot="1"]`)?.getAttribute("data-formation-selected"),
    ).toBe("true");
    expect(
      root.querySelector(`.formation-slot[data-slot="0"]`)?.hasAttribute("data-formation-selected"),
    ).toBe(false);
    expect(root.querySelector(".party-reserve")).not.toBeNull();

    surface.destroy();
  });

  it("never renders live Health text on Formation cards during a Stage Attempt", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const selected = { current: snapshot.progression.party[0] as ClassId };
    const surface = mountPartySurface(root, mountOptions(content, selected));

    surface.render(snapshot);

    expect(root.querySelector(".character-health")).toBeNull();
    expect(root.textContent ?? "").not.toMatch(/Health\s+\d+\/\d+/);

    surface.destroy();
  });

  it("re-renders selection marker and swap branch without a remount", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const { party, reserve } = engine.snapshot().progression;
    const selected = { current: party[0] as ClassId };
    const surface = mountPartySurface(root, mountOptions(content, selected));

    surface.render(engine.snapshot());
    expect(root.querySelectorAll(".party-swap")).toHaveLength(1);
    expect(root.querySelector(`[data-party-swap="${party[0]}"]`)).not.toBeNull();
    expect(root.querySelector(".reserve-note")).toBeNull();

    selected.current = reserve;
    surface.render(engine.snapshot());

    expect(root.querySelectorAll(".party-swap")).toHaveLength(3);
    expect(root.querySelector('[data-party-swap-slot="0"]')).not.toBeNull();
    expect(root.querySelector('[data-party-swap-slot="1"]')).not.toBeNull();
    expect(root.querySelector('[data-party-swap-slot="2"]')).not.toBeNull();
    expect(root.querySelector(".reserve-note")?.textContent).toMatch(/50%/);
    expect(root.querySelectorAll('[data-formation-selected="true"]')).toHaveLength(0);

    surface.destroy();
  });

  it("shows one Swap with Reserve button for a Party Member and publishes setParty", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const engine = createEngine(content, undefined, LOOT_SEED);
    const { party, reserve } = engine.snapshot().progression;
    const selected = { current: party[0] as ClassId };
    const surface = mountPartySurface(
      root,
      mountOptions(content, selected, (command) => {
        commands.push(command);
      }),
    );

    surface.render(engine.snapshot());
    expect(root.querySelectorAll(".party-swap")).toHaveLength(1);
    root.querySelector<HTMLButtonElement>(`[data-party-swap="${party[0]}"]`)?.click();

    expect(commands).toEqual([
      {
        cmd: "setParty",
        args: [[reserve, party[1], party[2]], party[0]],
      },
    ]);

    surface.destroy();
  });

  it("shows three Swap into slot buttons for the Reserve and publishes setParty", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const engine = createEngine(content, undefined, LOOT_SEED);
    const { party, reserve } = engine.snapshot().progression;
    const selected = { current: reserve };
    const surface = mountPartySurface(
      root,
      mountOptions(content, selected, (command) => {
        commands.push(command);
      }),
    );

    surface.render(engine.snapshot());
    expect(root.querySelectorAll(".party-swap")).toHaveLength(3);
    root.querySelector<HTMLButtonElement>('[data-party-swap-slot="1"]')?.click();

    expect(commands).toEqual([
      {
        cmd: "setParty",
        args: [[party[0], reserve, party[2]], party[1]],
      },
    ]);

    surface.destroy();
  });

  it("composes consecutive swaps against pendingParty", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const engine = createEngine(content, undefined, LOOT_SEED);
    const { party, reserve } = engine.snapshot().progression;
    const selected = { current: party[0] as ClassId };
    const surface = mountPartySurface(
      root,
      mountOptions(content, selected, (command) => {
        commands.push(command);
        if (command.cmd === "setParty") {
          engine.setParty(command.args[0], command.args[1]);
        }
      }),
    );

    surface.render(engine.snapshot());
    root.querySelector<HTMLButtonElement>(`[data-party-swap="${party[0]}"]`)?.click();
    surface.render(engine.snapshot());

    // After first swap: pending [reserve, party1, party2], reserve=party0.
    // Select party[1] (still a Party Member in the pending Party) and swap again.
    selected.current = party[1];
    surface.render(engine.snapshot());
    root.querySelector<HTMLButtonElement>(`[data-party-swap="${party[1]}"]`)?.click();

    expect(commands).toEqual([
      { cmd: "setParty", args: [[reserve, party[1], party[2]], party[0]] },
      { cmd: "setParty", args: [[reserve, party[0], party[2]], party[1]] },
    ]);

    surface.destroy();
  });

  it("queues Formation reorder with a next-Wave pending marker distinct from party swap", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const engine = createEngine(content, undefined, LOOT_SEED);
    const selected = { current: engine.snapshot().progression.party[0] as ClassId };
    const surface = mountPartySurface(
      root,
      mountOptions(content, selected, (command) => {
        commands.push(command);
        if (command.cmd === "setFormation") {
          engine.setFormation(command.args[0]);
        }
      }),
    );

    surface.render(engine.snapshot());
    const initialParty = [...engine.snapshot().progression.party] as const;
    const reordered: [typeof initialParty[0], typeof initialParty[1], typeof initialParty[2]] = [
      initialParty[1],
      initialParty[0],
      initialParty[2],
    ];

    root
      .querySelector<HTMLButtonElement>('[data-formation-action="move-down"][data-slot="0"]')
      ?.click();
    surface.render(engine.snapshot());

    expect(commands).toEqual([{ cmd: "setFormation", args: [reordered] }]);
    const formationMarker = root.querySelector('[data-pending-kind="formation"]');
    expect(formationMarker?.textContent).toMatch(/next Wave/i);
    expect(root.querySelector('[data-pending-kind="party"]')).toBeNull();
    expect(
      root.querySelector('[data-formation-action="move-down"][data-slot="0"]'),
    ).not.toBeNull();

    engine.advanceBy(1);
    for (let ms = 0; ms < 120_000; ms += 1) {
      const events = engine.advanceBy(1);
      if (events.some((event) => event.type === "config-applied")) {
        surface.render(engine.snapshot());
        expect(root.querySelector('[data-pending-kind="formation"]')).toBeNull();
        return;
      }
    }
    throw new Error("config-applied never emitted");
  });

  it("queues party swap with a next-Attempt pending marker and applies on a fresh Attempt", async () => {
    const root = document.createElement("div");
    const busChannel = `nightglass-test-${crypto.randomUUID()}`;
    const engine = createEngine(content, undefined, LOOT_SEED);
    const tileBus = createBusEndpoint(
      {
        command: (message) => {
          applyTileCommand(engine, message.command);
          const snapshot = engine.snapshot();
          tileBus.publish({
            type: "snapshot",
            snapshot,
            legality: serializeEngineLegality(engine, snapshot, content),
          });
        },
      },
      busChannel,
    );
    const dockBus = createBusEndpoint(
      {
        snapshot: (message) => {
          surface.render(message.snapshot);
        },
      },
      busChannel,
    );

    const party = engine.snapshot().progression.party;
    const reserve = engine.snapshot().progression.reserve;
    const selected = { current: party[0] as ClassId };
    const surface = mountPartySurface(
      root,
      mountOptions(content, selected, (command) => {
        dockBus.publish({ type: "command", command });
      }),
    );

    surface.render(engine.snapshot());

    const swapButton = root.querySelector<HTMLButtonElement>(
      `[data-party-swap="${party[0]}"]`,
    );
    expect(swapButton).not.toBeNull();
    swapButton!.click();
    await flushBus(() => root.querySelector('[data-pending-kind="party"]') !== null);

    expect(engine.snapshot().progression.pendingParty).not.toBeNull();
    expect(root.querySelector('[data-pending-kind="party"]')?.textContent).toMatch(
      /next Attempt/i,
    );
    expect(root.querySelector('[data-pending-kind="formation"]')).toBeNull();

    dockBus.publish({ type: "command", command: { cmd: "selectStage", args: [1] } });
    await flushBus(() => root.querySelector('[data-pending-kind="party"]') === null);

    expect(engine.snapshot().progression.party).toEqual([reserve, party[1], party[2]]);
    expect(engine.snapshot().progression.reserve).toBe(party[0]);
    expect(root.querySelector('[data-pending-kind="party"]')).toBeNull();

    tileBus.close();
    dockBus.close();
    surface.destroy();
  });

  it("completes Formation reorder and party swap using keyboard only", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = createEngine(content, undefined, LOOT_SEED);
    const commands: unknown[] = [];
    const selected = { current: engine.snapshot().progression.party[0] as ClassId };
    const surface = mountPartySurface(
      root,
      mountOptions(content, selected, (command) => {
        commands.push(command);
        if (command.cmd === "setFormation") {
          engine.setFormation(command.args[0]);
        }
        if (command.cmd === "setParty") {
          engine.setParty(command.args[0], command.args[1]);
        }
      }),
    );

    surface.render(engine.snapshot());
    const moveDown = root.querySelector<HTMLButtonElement>(
      '[data-formation-action="move-down"][data-slot="0"]',
    );
    moveDown?.focus();
    activateFocused();
    surface.render(engine.snapshot());
    expect(commands.some((command) => (command as { cmd: string }).cmd === "setFormation")).toBe(
      true,
    );

    const swapButton = root.querySelector<HTMLButtonElement>("[data-party-swap]");
    swapButton?.focus();
    activateFocused();
    surface.render(engine.snapshot());
    expect(commands.some((command) => (command as { cmd: string }).cmd === "setParty")).toBe(true);

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

  it("renders Character Level from Content xpThresholds, not hardcoded production values", () => {
    const customThresholds: Content["xpThresholds"] = [0, 10, 30, 60];
    const testContent: Content = {
      ...fixtureContent,
      xpThresholds: customThresholds,
    };
    const engine = createEngine(testContent, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    snapshot.progression.characterXp.knight = 25;

    const root = document.createElement("div");
    const selected = { current: "knight" as ClassId };
    const surface = mountPartySurface(root, mountOptions(testContent, selected));
    surface.render(snapshot);

    const expectedLevel = levelFor(snapshot, testContent, "knight");
    const knightLevelLine = root.querySelector(
      '.formation-slot[data-slot="0"] .character-level',
    );
    expect(knightLevelLine?.textContent).toBe(`Level ${expectedLevel}`);
    expect(expectedLevel).toBe(2);

    surface.destroy();
  });
});

describe("Party surface source boundary", () => {
  it("does not import the Engine", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "party-surface.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']\.\.\/core\/engine["']/);
  });
});
