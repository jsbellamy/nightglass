// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { buildContent } from "../data";
import { createBusEndpoint } from "./bus";
import { mountPartySurface } from "./party-surface";

const LOOT_SEED = 42;
const content = buildContent();

async function flushBus(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function activateFocused(): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) {
    throw new Error("expected a focused element");
  }
  active.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}

describe("Party surface", () => {
  it("shows Formation slots, Reserve, and all four Characters", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const surface = mountPartySurface(root);

    surface.render(engine.snapshot());

    expect(root.querySelector(".party-formation")).not.toBeNull();
    expect(root.querySelectorAll(".formation-slot")).toHaveLength(3);
    expect(root.querySelector(".party-reserve")).not.toBeNull();
    expect(root.querySelector(".reserve-note")?.textContent).toMatch(/50%/);
    expect(root.querySelectorAll(".character-card")).toHaveLength(4);

    surface.destroy();
  });

  it("queues Formation reorder with a next-Wave pending marker distinct from party swap", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const engine = createEngine(content, undefined, LOOT_SEED);
    const surface = mountPartySurface(root, {
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "setFormation") {
          engine.setFormation(command.args[0]);
        }
      },
    });

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
    const engine = createEngine(content, undefined, LOOT_SEED);
    const tileBus = createBusEndpoint({
      command: (message) => {
        if (message.command.cmd === "setParty") {
          engine.setParty(message.command.args[0].members, message.command.args[0].reserve);
        }
        if (message.command.cmd === "selectStage") {
          engine.selectStage(message.command.args[0]);
        }
        tileBus.publish({ type: "snapshot", snapshot: engine.snapshot() });
      },
    });
    const dockBus = createBusEndpoint({
      snapshot: (message) => {
        surface.render(message.snapshot);
      },
    });

    const surface = mountPartySurface(root, {
      onCommand: (command) => {
        dockBus.publish({ type: "command", command });
      },
    });

    surface.render(engine.snapshot());
    const party = engine.snapshot().progression.party;
    const reserve = engine.snapshot().progression.reserve;

    root
      .querySelector<HTMLButtonElement>(`[data-party-swap="${party[0]}"]`)
      ?.click();
    await flushBus();

    expect(engine.snapshot().progression.pendingParty).not.toBeNull();
    expect(root.querySelector('[data-pending-kind="party"]')?.textContent).toMatch(
      /next Attempt/i,
    );
    expect(root.querySelector('[data-pending-kind="formation"]')).toBeNull();

    dockBus.publish({ type: "command", command: { cmd: "selectStage", args: [1] } });
    await flushBus();

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
    const surface = mountPartySurface(root, {
      onCommand: (command) => {
        commands.push(command);
        if (command.cmd === "setFormation") {
          engine.setFormation(command.args[0]);
        }
        if (command.cmd === "setParty") {
          engine.setParty(command.args[0].members, command.args[0].reserve);
        }
      },
    });

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
