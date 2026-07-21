// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { cloneSnapshot, type DropInstance } from "../core/snapshot";
import { fixtureContent } from "../core/testing/fixture-content";
import { buildContent } from "../data";
import { createBusEndpoint } from "./bus";
import { serializeEngineLegality } from "./engine-legality";
import { mountStageSurface } from "./stage-surface";

const LOOT_SEED = 42;
const content = buildContent();

/** Drain BroadcastChannel delivery (command hop + snapshot hop). */
async function flushBus(): Promise<void> {
  for (let i = 0; i < 2; i += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}

function activateFocused(): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) {
    throw new Error("expected a focused element");
  }
  active.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}

const customStageNamesContent: typeof fixtureContent = {
  ...fixtureContent,
  stages: [
    { ...fixtureContent.stages[0]!, id: 1 as const, name: "Renamed Stage Alpha" },
    { ...fixtureContent.stages[0]!, id: 2 as const, name: "Renamed Stage Beta" },
    { ...fixtureContent.stages[0]!, id: 3 as const, name: "Renamed Stage Gamma" },
  ],
};

describe("Stage surface", () => {
  it("renders Stage names from Content, not hardcoded labels", () => {
    const root = document.createElement("div");
    const engine = createEngine(customStageNamesContent, undefined, LOOT_SEED);
    const surface = mountStageSurface(root, { content: customStageNamesContent });

    surface.render(engine.snapshot());

    expect(root.querySelector('[data-stage-id="1"] .stage-name')?.textContent).toBe(
      "Renamed Stage Alpha",
    );
    expect(root.querySelector('[data-stage-id="2"] .stage-name')?.textContent).toBe(
      "Renamed Stage Beta",
    );
    expect(root.querySelector('[data-stage-id="3"] .stage-name')?.textContent).toBe(
      "Renamed Stage Gamma",
    );
    expect(root.textContent).not.toMatch(/Orchard/);

    surface.destroy();
  });

  it("lists Stages with unlock state and the live Attempt position", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const surface = mountStageSurface(root, { content });

    surface.render(engine.snapshot());

    expect(root.querySelector(".dock-surface-title")).toBeNull();
    expect(root.querySelectorAll(".stage-row")).toHaveLength(3);
    expect(root.querySelector('[data-stage-id="1"]')?.textContent).toMatch(/Orchard Understory/);
    expect(root.querySelector('[data-stage-id="2"]')?.getAttribute("aria-disabled")).toBe("true");
    expect(root.querySelector('[data-stage-id="2"]')?.hasAttribute("disabled")).toBe(true);
    expect(root.querySelector('[data-stage-id="2"] .stage-lock-glyph')).not.toBeNull();
    expect(root.querySelector('[data-stage-id="2"] .stage-name')?.textContent?.length).toBeGreaterThan(
      0,
    );
    expect(root.querySelector(".attempt-position")?.textContent).toMatch(/Stage 1/);

    surface.destroy();
  });

  it("rejects locked Stage activation and confirms unlocked selection across the bus", async () => {
    const root = document.createElement("div");
    const busChannel = `nightglass-test-${crypto.randomUUID()}`;
    const engine = createEngine(content, undefined, LOOT_SEED);
    const tileBus = createBusEndpoint(
      {
        command: (message) => {
          if (message.command.cmd === "selectStage") {
            engine.selectStage(message.command.args[0]);
          }
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

    const surface = mountStageSurface(root, {
      content,
      onCommand: (command) => {
        dockBus.publish({ type: "command", command });
      },
    });

    surface.render(engine.snapshot());
    const locked = root.querySelector<HTMLButtonElement>('[data-stage-id="2"]');
    expect(locked?.disabled).toBe(true);
    locked?.click();
    expect(root.querySelector(".stage-confirm")).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-stage-id="1"]')?.click();
    expect(root.querySelector(".stage-confirm")?.textContent).toMatch(/abandons the current Attempt/i);
    root.querySelector<HTMLButtonElement>('[data-stage-confirm="yes"]')?.click();
    await flushBus();

    expect(engine.snapshot().attempt?.stage).toBe(1);
    expect(engine.snapshot().attempt?.encounter).toBe(1);

    tileBus.close();
    dockBus.close();
    surface.destroy();
  });

  it("keeps earned XP and Drops when abandoning via Stage select", async () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    engine.advanceBy(1);

    let xpBefore = 0;
    let awardedDrop: DropInstance | null = null;
    for (let ms = 0; ms < 300_000; ms += 1) {
      const events = engine.advanceBy(1);
      const xpAwarded = events.find((event) => event.type === "xp-awarded");
      if (xpAwarded) {
        xpBefore = engine.snapshot().progression.characterXp[xpAwarded.classId] ?? 0;
      }
      const dropAwarded = events.find((event) => event.type === "drop-awarded");
      if (dropAwarded) {
        awardedDrop = structuredClone(
          engine.snapshot().progression.armory.find((drop) => drop.dropId === dropAwarded.dropId) ??
            null,
        );
        break;
      }
    }
    expect(xpBefore).toBeGreaterThan(0);
    expect(awardedDrop).not.toBeNull();

    const surface = mountStageSurface(root, {
      content,
      onCommand: (command) => {
        if (command.cmd === "selectStage") {
          engine.selectStage(command.args[0]);
        }
        surface.render(engine.snapshot());
      },
    });

    surface.render(engine.snapshot());
    root.querySelector<HTMLButtonElement>('[data-stage-id="1"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-stage-confirm="yes"]')?.click();

    const snap = engine.snapshot();
    expect(snap.progression.characterXp.knight).toBeGreaterThanOrEqual(xpBefore);
    expect(snap.progression.armory).toHaveLength(1);
    expect(snap.progression.armory[0]).toEqual(awardedDrop);
    expect(snap.attempt?.encounter).toBe(1);

    surface.destroy();
  });

  it("keeps Stage confirm open with keyboard focus across snapshot pumps while pending Stage is unchanged", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = createEngine(content, undefined, LOOT_SEED);
    const surface = mountStageSurface(root, { content });

    surface.render(engine.snapshot());
    root.querySelector<HTMLButtonElement>('[data-stage-id="1"]')?.click();

    const yesBefore = root.querySelector<HTMLButtonElement>('[data-stage-confirm="yes"]');
    expect(yesBefore).not.toBeNull();
    yesBefore?.focus();
    expect(document.activeElement).toBe(yesBefore);

    engine.advanceBy(1);
    surface.render(engine.snapshot());

    const yesAfter = root.querySelector<HTMLButtonElement>('[data-stage-confirm="yes"]');
    expect(yesAfter).toBe(yesBefore);
    expect(document.activeElement).toBe(yesBefore);

    surface.destroy();
    root.remove();
  });

  it("updates Stage confirm when the player selects a different unlocked Stage", () => {
    const root = document.createElement("div");
    const saved = cloneSnapshot(createEngine(content, undefined, LOOT_SEED).snapshot());
    saved.progression.unlockedStage = 2;
    const engine = createEngine(content, saved, LOOT_SEED);
    const surface = mountStageSurface(root, { content });

    surface.render(engine.snapshot());
    root.querySelector<HTMLButtonElement>('[data-stage-id="1"]')?.click();
    const yesStage1 = root.querySelector('[data-stage-confirm="yes"]');

    root.querySelector<HTMLButtonElement>('[data-stage-id="2"]')?.click();
    const yesStage2 = root.querySelector('[data-stage-confirm="yes"]');
    expect(yesStage2).not.toBeNull();
    expect(yesStage2).not.toBe(yesStage1);
    expect(root.querySelector(".stage-confirm")?.getAttribute("data-pending-stage")).toBe("2");

    surface.destroy();
  });

  it("still confirms Stage selection after a snapshot pump while confirm is open", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const engine = createEngine(content, undefined, LOOT_SEED);
    const surface = mountStageSurface(root, {
      content,
      onCommand: (command) => {
        commands.push(command);
      },
    });

    surface.render(engine.snapshot());
    root.querySelector<HTMLButtonElement>('[data-stage-id="1"]')?.click();
    engine.advanceBy(1);
    surface.render(engine.snapshot());
    root.querySelector<HTMLButtonElement>('[data-stage-confirm="yes"]')?.click();

    expect(commands).toEqual([{ cmd: "selectStage", args: [1] }]);
    expect(root.querySelector(".stage-confirm")).toBeNull();

    surface.destroy();
  });

  it("clears confirm on Cancel without firing selectStage", () => {
    const root = document.createElement("div");
    const commands: unknown[] = [];
    const engine = createEngine(content, undefined, LOOT_SEED);
    const surface = mountStageSurface(root, {
      content,
      onCommand: (command) => {
        commands.push(command);
      },
    });

    surface.render(engine.snapshot());
    root.querySelector<HTMLButtonElement>('[data-stage-id="1"]')?.click();
    expect(root.querySelector(".stage-confirm")).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-stage-confirm="no"]')?.click();
    expect(root.querySelector(".stage-confirm")).toBeNull();
    expect(commands).toEqual([]);

    surface.destroy();
  });

  it("shows the Failure Policy and completes Stage select with keyboard only", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const saved = cloneSnapshot(createEngine(content, undefined, LOOT_SEED).snapshot());
    if (!saved.attempt) {
      throw new Error("missing Attempt");
    }
    saved.attempt.phase = "defeat-hold";
    saved.progression.unlockedStage = 2;
    const engine = createEngine(content, saved, LOOT_SEED);
    const commands: unknown[] = [];
    const surface = mountStageSurface(root, {
      content,
      onCommand: (command) => {
        commands.push(command);
      },
    });

    surface.render(engine.snapshot());
    expect(root.querySelector(".failure-policy")?.textContent).toMatch(/Retry/i);
    expect(root.querySelector(".failure-policy")?.textContent).toMatch(/Retreat/i);

    const stageButton = root.querySelector<HTMLButtonElement>('[data-stage-id="1"]');
    stageButton?.focus();
    activateFocused();
    const confirm = root.querySelector<HTMLButtonElement>('[data-stage-confirm="yes"]');
    confirm?.focus();
    activateFocused();
    expect(commands).toEqual([{ cmd: "selectStage", args: [1] }]);

    const focusables = root.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    for (const element of focusables) {
      expect(element.classList.contains("focus-ring")).toBe(true);
    }

    surface.destroy();
    root.remove();
  });
});

describe("Stage surface source boundary", () => {
  it("does not import the Engine", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "stage-surface.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']\.\.\/core\/engine["']/);
    expect(source).not.toMatch(/STAGE_LABELS/);
    expect(source).not.toMatch(/Orchard/);
  });
});
