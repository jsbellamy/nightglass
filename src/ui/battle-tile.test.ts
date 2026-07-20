// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../core/engine";
import { opponentEntityId } from "../core/entity-id";
import type { Snapshot } from "../core/snapshot";
import { fixtureContent } from "../core/testing/fixture-content";
import { buildContent } from "../data";
import * as presentationModule from "./presentation";
import * as sfxModule from "./sfx";
import { CUE_IDS, type PlayableAudio } from "./sfx";
import {
  BATTLEFIELD_HEIGHT,
  STATUS_LINE_HEIGHT,
  TILE_HEIGHT,
  TILE_WIDTH,
  mountBattleTile,
} from "./battle-tile";

const LOOT_SEED = 42;

async function capturePresentationRenderNowMs(
  run: (tile: ReturnType<typeof mountBattleTile>) => void,
): Promise<number[]> {
  const renderNowMs: number[] = [];
  const { createPresentation: realCreate } =
    await vi.importActual<typeof presentationModule>("./presentation");
  const createSpy = vi.spyOn(presentationModule, "createPresentation").mockImplementation((opts) => {
    const pres = realCreate(opts);
    const originalRender = pres.render.bind(pres);
    pres.render = (nowMs, snapshot) => {
      renderNowMs.push(nowMs);
      return originalRender(nowMs, snapshot);
    };
    return pres;
  });

  const root = document.createElement("main");
  const tile = mountBattleTile(root, fixtureContent);
  run(tile);
  createSpy.mockRestore();
  return renderNowMs;
}

function trackBackgroundImageWrites(element: HTMLElement): () => number {
  let count = 0;
  const style = element.style;
  vi.spyOn(element, "style", "get").mockReturnValue(
    new Proxy(style, {
      set(target, prop, value) {
        if (prop === "backgroundImage") {
          count += 1;
        }
        Reflect.set(target, prop, value);
        return true;
      },
    }),
  );
  return () => count;
}

function snapshotWithFiveOpponents(base: Snapshot): Snapshot {
  const attempt = base.attempt;
  if (!attempt) {
    throw new Error("fixture snapshot must include an Attempt");
  }
  const grunt = fixtureContent.opponents.find((opponent) => opponent.id === "fixture-grunt");
  if (!grunt) {
    throw new Error("missing fixture grunt");
  }
  const opponents = Array.from({ length: 5 }, (_, index) => ({
    entityId: opponentEntityId(String(attempt.encounter), index),
    side: "opponent" as const,
    defId: grunt.id,
    health: grunt.base.maxHealth,
    maxHealth: grunt.base.maxHealth,
    knockedOut: false,
    action: null,
    cooldownReadyAtMs: {},
    statuses: [],
  }));
  return {
    ...structuredClone(base),
    attempt: {
      ...attempt,
      combatants: [...attempt.combatants.filter((entry) => entry.side === "party"), ...opponents],
    },
  };
}

describe("Battle Tile renderer", () => {
  it("mounts a 480×112 tile with a 24px status line and ~86px battlefield", () => {
    const root = document.createElement("main");
    mountBattleTile(root, buildContent());

    expect(root.classList.contains("battle-tile")).toBe(true);
    expect(TILE_WIDTH).toBe(480);
    expect(TILE_HEIGHT).toBe(112);
    expect(STATUS_LINE_HEIGHT).toBe(24);
    expect(BATTLEFIELD_HEIGHT).toBe(86);
    expect(root.querySelector(".status-line")).not.toBeNull();
    expect(root.querySelector(".battlefield")).not.toBeNull();
  });

  it("renders Party formation slots facing right and opponents facing left", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    tile.render(engine.snapshot());

    const party = [...root.querySelectorAll<HTMLElement>(".combatant.party")];
    expect(party.map((element) => element.classList.contains("facing-right"))).toEqual([
      true,
      true,
      true,
    ]);
    expect(party.some((element) => element.classList.contains("formation-front"))).toBe(true);
    expect(party.some((element) => element.classList.contains("formation-middle"))).toBe(true);
    expect(party.some((element) => element.classList.contains("formation-back"))).toBe(true);

    const opponents = [...root.querySelectorAll<HTMLElement>(".combatant.opponent")];
    expect(opponents.every((element) => element.classList.contains("facing-left"))).toBe(true);
  });

  it("fits five ordinary opponents at 1× without overlap classes", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    tile.render(snapshotWithFiveOpponents(engine.snapshot()));

    expect(root.querySelector(".battlefield")?.classList.contains("opponent-stress-layout")).toBe(
      true,
    );
    const slots = [...root.querySelectorAll<HTMLElement>(".combatant.opponent")].map((element) =>
      [...element.classList].find((className) => className.startsWith("opponent-slot-")),
    );
    expect(slots).toEqual([
      "opponent-slot-0",
      "opponent-slot-1",
      "opponent-slot-2",
      "opponent-slot-3",
      "opponent-slot-4",
    ]);
  });

  it("uses pixelated sprites and exposes mark/body/effect layers with only body populated", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    tile.render(engine.snapshot());

    const stack = root.querySelector(".combatant-stack");
    expect(stack?.querySelector(".layer-mark")).not.toBeNull();
    expect(stack?.querySelector(".layer-body .combatant-sprite")).not.toBeNull();
    expect(stack?.querySelector(".layer-effect")).not.toBeNull();
    expect(stack?.querySelector(".layer-mark")?.childElementCount).toBe(0);
    expect(stack?.querySelector(".layer-effect")?.childElementCount).toBe(0);

    const sprite = root.querySelector<HTMLImageElement>(".combatant-sprite");
    expect(sprite?.style.imageRendering).toBe("pixelated");
  });

  it("updates health bar width after an impact event", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const opponent = snapshot.attempt?.combatants.find((combatant) => combatant.side === "opponent");
    if (!opponent) {
      throw new Error("expected opponent combatant");
    }
    tile.render(snapshot);

    const impact = {
      seq: 99,
      atMs: 1_000,
      type: "impact" as const,
      entityId: "party:knight:front",
      abilityId: "knight-basic",
      results: [
        {
          targetId: opponent.entityId,
          kind: "damage" as const,
          channel: "physical" as const,
          amount: 8,
          healthAfter: opponent.health - 8,
        },
      ],
    };
    opponent.health = impact.results[0]!.healthAfter;
    tile.applyEvents([impact]);
    tile.render(snapshot);

    const fill = root.querySelector<HTMLElement>(
      `[data-entity-id="${opponent.entityId}"] .health-fill`,
    );
    const expectedPercent = Math.round((opponent.health / opponent.maxHealth) * 100);
    expect(fill?.dataset["healthPercent"]).toBe(String(expectedPercent));
    expect(Number(fill?.dataset["healthPercent"])).toBeLessThan(100);
  });

  it("shows the Boss wide top-edge health bar and hides the per-combatant bar", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = structuredClone(engine.snapshot());
    const attempt = snapshot.attempt;
    if (!attempt) {
      throw new Error("missing attempt");
    }
    attempt.encounter = 3;
    attempt.combatants = [
      ...attempt.combatants.filter((entry) => entry.side === "party"),
      {
        entityId: "opp:3:0",
        side: "opponent",
        defId: "fixture-boss",
        health: 180,
        maxHealth: 200,
        knockedOut: false,
        action: null,
        cooldownReadyAtMs: {},
        statuses: [],
      },
    ];
    tile.render(snapshot);

    const bossBar = root.querySelector<HTMLElement>(".boss-health-bar");
    expect(bossBar?.hidden).toBe(false);
    expect(root.querySelector(".boss-combatant .health-bar")).toBeNull();
    expect(root.querySelector<HTMLElement>(".boss-health-fill")?.dataset["healthPercent"]).toBe(
      "90",
    );
  });

  it("shows the current Stage and Wave on the status line", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    tile.render(engine.snapshot());

    const text = root.querySelector(".stage-wave-text")?.textContent ?? "";
    expect(text).toContain("Orchard Understory");
    expect(text).toContain("Wave 1");
  });

  it("writes backdrop image once across repeated renders on the same stage", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const backdrop = root.querySelector<HTMLElement>(".battlefield-backdrop");
    if (!backdrop) {
      throw new Error("missing backdrop");
    }
    const backgroundImageWrites = trackBackgroundImageWrites(backdrop);

    tile.render(snapshot);
    tile.render(structuredClone(snapshot));
    tile.render(structuredClone(snapshot));

    expect(backgroundImageWrites()).toBe(1);
  });

  it("rewrites backdrop image once when the stage backdropKey changes", () => {
    const root = document.createElement("main");
    const content = buildContent();
    const tile = mountBattleTile(root, content);
    const engine = createEngine(content, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const backdrop = root.querySelector<HTMLElement>(".battlefield-backdrop");
    if (!backdrop) {
      throw new Error("missing backdrop");
    }
    const backgroundImageWrites = trackBackgroundImageWrites(backdrop);

    tile.render(snapshot);
    expect(backgroundImageWrites()).toBe(1);

    const stage2 = structuredClone(snapshot);
    if (!stage2.attempt) {
      throw new Error("missing attempt");
    }
    stage2.attempt.stage = 2;
    tile.render(stage2);
    expect(backgroundImageWrites()).toBe(2);
  });

  it("keeps dataset backdropKey correct on every render without rewriting it", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const battlefield = root.querySelector<HTMLElement>(".battlefield");
    if (!battlefield) {
      throw new Error("missing battlefield");
    }
    let datasetWrites = 0;
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "dataset",
    );
    if (!originalDescriptor?.get) {
      throw new Error("expected dataset getter");
    }
    vi.spyOn(battlefield, "dataset", "get").mockImplementation(function (this: HTMLElement) {
      const real = originalDescriptor.get!.call(this) as DOMStringMap;
      return new Proxy(real, {
        set(target, prop, value) {
          if (prop === "backdropKey") {
            datasetWrites += 1;
          }
          Reflect.set(target, prop, value);
          return true;
        },
      });
    });

    tile.render(snapshot);
    expect(battlefield.dataset["backdropKey"]).toBe("backdrop-1");
    expect(datasetWrites).toBe(1);

    tile.render(structuredClone(snapshot));
    expect(battlefield.dataset["backdropKey"]).toBe("backdrop-1");
    expect(datasetWrites).toBe(1);
  });

  it("does not set static backdrop layout as inline styles", () => {
    const root = document.createElement("main");
    const tile = mountBattleTile(root, buildContent());
    const engine = createEngine(buildContent(), undefined, LOOT_SEED);
    tile.render(engine.snapshot());

    const backdrop = root.querySelector<HTMLElement>(".battlefield-backdrop");
    expect(backdrop?.style.backgroundSize).toBe("");
    expect(backdrop?.style.backgroundRepeat).toBe("");
    expect(backdrop?.style.backgroundPosition).toBe("");
  });

  it("reapplies backdrop after a no-attempt render and a new attempt", () => {
    const root = document.createElement("main");
    const content = buildContent();
    const tile = mountBattleTile(root, content);
    const engine = createEngine(content, undefined, LOOT_SEED);
    const withAttempt = engine.snapshot();
    tile.render(withAttempt);

    const idle = structuredClone(withAttempt);
    idle.attempt = null;
    tile.render(idle);

    const resumed = structuredClone(withAttempt);
    if (!resumed.attempt) {
      throw new Error("missing attempt");
    }
    resumed.attempt.stage = 2;
    tile.render(resumed);

    const battlefield = root.querySelector<HTMLElement>(".battlefield");
    const backdrop = root.querySelector<HTMLElement>(".battlefield-backdrop");
    expect(battlefield?.dataset["backdropKey"]).toBe("backdrop-2");
    expect(backdrop?.style.backgroundImage).toMatch(/backdrop-2/);
  });

  it("keys the battlefield backdrop image per Stage and keeps audio mute controls", () => {
    const root = document.createElement("main");
    const content = buildContent();
    const tile = mountBattleTile(root, content);
    const engine = createEngine(content, undefined, LOOT_SEED);
    tile.render(engine.snapshot());

    const battlefield = root.querySelector<HTMLElement>(".battlefield");
    const backdrop = root.querySelector<HTMLElement>(".battlefield-backdrop");
    expect(battlefield?.dataset["backdropKey"]).toBe("backdrop-1");
    expect(backdrop?.style.backgroundImage).toMatch(/backdrop-1/);
    expect(backdrop?.style.backgroundImage).not.toMatch(/linear-gradient/);
    expect(root.querySelector(".audio-mute-toggle")).not.toBeNull();
    expect(root.querySelector(".audio-volume-toggle")).not.toBeNull();

    const stage2 = structuredClone(engine.snapshot());
    if (!stage2.attempt) {
      throw new Error("missing attempt");
    }
    stage2.attempt.stage = 2;
    tile.render(stage2);
    expect(battlefield?.dataset["backdropKey"]).toBe("backdrop-2");
    expect(backdrop?.style.backgroundImage).toMatch(/backdrop-2/);

    stage2.attempt.stage = 3;
    tile.render(stage2);
    expect(battlefield?.dataset["backdropKey"]).toBe("backdrop-3");
    expect(backdrop?.style.backgroundImage).toMatch(/backdrop-3/);
  });

  it("forwards an explicit nowMs to presentation.render", async () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const renderNowMs = await capturePresentationRenderNowMs((tile) => {
      tile.render(snapshot, 4_321);
    });

    expect(renderNowMs[renderNowMs.length - 1]).toBe(4_321);
  });

  it("defaults nowMs to snapshot.simNowMs when render omits it", async () => {
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const renderNowMs = await capturePresentationRenderNowMs((tile) => {
      tile.render(snapshot);
    });

    expect(renderNowMs[renderNowMs.length - 1]).toBe(snapshot.simNowMs);
  });

  it("queues SFX on applyEvents but plays on render with the presentation clock", async () => {
    const instances: PlayableAudio[] = [];
    const createAudio = vi.fn((src: string): PlayableAudio => {
      const audio: PlayableAudio = {
        src,
        volume: 1,
        loop: false,
        currentTime: 0,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
      };
      instances.push(audio);
      return audio;
    });
    const { createSfx: realCreateSfx } = await vi.importActual<typeof sfxModule>("./sfx");
    const createSfxSpy = vi.spyOn(sfxModule, "createSfx").mockImplementation((deps) =>
      realCreateSfx({ ...deps, createAudio }),
    );

    const root = document.createElement("main");
    const tile = mountBattleTile(root, fixtureContent);
    const engine = createEngine(fixtureContent, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const opponent = snapshot.attempt?.combatants.find((combatant) => combatant.side === "opponent");
    if (!opponent) {
      throw new Error("expected opponent");
    }

    const sfxInstance = createSfxSpy.mock.results[0]?.value as ReturnType<typeof realCreateSfx>;
    sfxInstance.setMuted(false);

    const impact = {
      seq: 99,
      atMs: 4_500,
      type: "impact" as const,
      entityId: "party:knight:front",
      abilityId: "knight-basic",
      results: [
        {
          targetId: opponent.entityId,
          kind: "damage" as const,
          channel: "physical" as const,
          amount: 1,
          healthAfter: opponent.health - 1,
        },
      ],
    };

    tile.applyEvents([impact], snapshot);
    const impactPlaysAfterApply = instances.filter(
      (audio) =>
        audio.src.includes(CUE_IDS["impact-physical"]) &&
        vi.mocked(audio.play).mock.calls.length > 0,
    );
    expect(impactPlaysAfterApply).toHaveLength(0);

    tile.render(snapshot, 4_500);
    expect(
      instances.some(
        (audio) =>
          audio.src.includes(CUE_IDS["impact-physical"]) &&
          vi.mocked(audio.play).mock.calls.length > 0,
      ),
    ).toBe(true);

    createSfxSpy.mockRestore();
  });
});
