// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { buildContent } from "../data";
import { EMPTY_ENGINE_LEGALITY, type EngineLegalityView } from "./engine-legality";
import { mountStageSurface } from "./stage-surface";
import {
  el,
  mountSurfaceShell,
  pendingMarker,
  bindScrollOverflowAffordance,
} from "./surface-shell";

const LOOT_SEED = 42;
const content = buildContent();

describe("Management surface shell element helper", () => {
  it("builds elements with class, text, data, aria, and props", () => {
    const node = el("p", { class: "surface-empty", text: "No Snapshot yet." });
    expect(node.className).toBe("surface-empty");
    expect(node.textContent).toBe("No Snapshot yet.");

    const button = el("button", {
      class: "stage-row focus-ring",
      data: { stageId: "1" },
      aria: { disabled: "false", label: "Stage 1" },
      props: { type: "button", hidden: true },
    });
    expect(button.dataset["stageId"]).toBe("1");
    expect(button.getAttribute("aria-disabled")).toBe("false");
    expect(button.getAttribute("aria-label")).toBe("Stage 1");
    expect(button.type).toBe("button");
    expect(button.hidden).toBe(true);
  });

  it("nests child elements and string nodes while skipping falsy children", () => {
    const node = el("div", { class: "wrap" }, [
      el("span", { text: "kept" }),
      null,
      undefined,
      false,
      "literal",
    ]);
    expect(node.childNodes).toHaveLength(2);
    expect(node.querySelector("span")?.textContent).toBe("kept");
    expect(node.lastChild?.textContent).toBe("literal");
  });

  it("treats text as literal content with no HTML parsing", () => {
    const node = el("p", { text: "<strong>not bold</strong>" });
    expect(node.innerHTML).toBe("&lt;strong&gt;not bold&lt;/strong&gt;");
    expect(node.querySelector("strong")).toBeNull();
  });
});

describe("Management surface shell pending Wave marker", () => {
  it('renders the "Applies at next Wave" pending-edit marker', () => {
    const marker = pendingMarker();
    expect(marker.tagName).toBe("P");
    expect(marker.className).toBe("pending-marker pending-wave");
    expect(marker.textContent).toBe("Applies at next Wave");
  });
});

describe("Management surface shell identity-preserving render", () => {
  it("preserves scroll offset on a scrollable region across a render with a changed Snapshot", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = createEngine(content, undefined, LOOT_SEED);
    const first = engine.snapshot();
    const surface = mountSurfaceShell(root, "armory-surface", {
      title: "Armory",
      showTitle: false,
      body() {
        return [el("div", { class: "armory-grid" }, [el("p", { text: "grid" })])];
      },
    });

    surface.render(first);
    const grid = root.querySelector<HTMLElement>(".armory-grid");
    expect(grid).not.toBeNull();
    grid!.scrollTop = 64;
    expect(grid!.scrollTop).toBe(64);

    const changed = structuredClone(first);
    changed.progression.unlockedStage = 2;
    surface.render(changed);

    const gridAfter = root.querySelector<HTMLElement>(".armory-grid");
    expect(gridAfter).not.toBe(grid);
    expect(gridAfter!.scrollTop).toBe(64);

    surface.destroy();
    root.remove();
  });

  it("preserves keyboard focus on a keyed control across a render", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const engine = createEngine(content, undefined, LOOT_SEED);
    const first = engine.snapshot();
    const surface = mountSurfaceShell(root, "stage-surface", {
      title: "Stage",
      showTitle: false,
      body() {
        return [
          el("button", {
            class: "stage-row focus-ring",
            data: { stageId: "1" },
            props: { type: "button" },
            text: "Stage 1",
          }),
        ];
      },
    });

    surface.render(first);
    const before = root.querySelector<HTMLButtonElement>('[data-stage-id="1"]');
    before?.focus();
    expect(document.activeElement).toBe(before);

    const changed = structuredClone(first);
    changed.progression.unlockedStage = 2;
    surface.render(changed);

    const after = root.querySelector<HTMLButtonElement>('[data-stage-id="1"]');
    expect(after).not.toBe(before);
    expect(document.activeElement).toBe(after);

    surface.destroy();
    root.remove();
  });

  it("does not throw or steal focus when the focused control disappears after a render", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const outside = document.createElement("button");
    outside.type = "button";
    outside.textContent = "outside";
    document.body.append(outside);
    const engine = createEngine(content, undefined, LOOT_SEED);
    const first = engine.snapshot();
    let showProbe = true;
    const surface = mountSurfaceShell(root, "stage-surface", {
      title: "Stage",
      showTitle: false,
      body() {
        return showProbe
          ? [
              el("button", {
                class: "probe focus-ring",
                data: { probeId: "gone" },
                props: { type: "button" },
                text: "probe",
              }),
            ]
          : [el("p", { class: "attempt-position", text: "empty" })];
      },
    });

    surface.render(first);
    root.querySelector<HTMLButtonElement>('[data-probe-id="gone"]')?.focus();
    expect(document.activeElement?.getAttribute("data-probe-id")).toBe("gone");

    showProbe = false;
    outside.focus();
    expect(document.activeElement).toBe(outside);
    expect(() => surface.render(first)).not.toThrow();
    expect(document.activeElement).toBe(outside);

    surface.destroy();
    root.remove();
    outside.remove();
  });

  it("keeps a selection key set before a render still selected after it", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const first = engine.snapshot();
    let shell!: ReturnType<typeof mountSurfaceShell>;
    shell = mountSurfaceShell(root, "talents-surface", {
      title: "Talents",
      selection: true,
      body() {
        const selected = shell.getSelection();
        return [
          el("button", {
            class: selected === "k-fortitude" ? "talent-cell selected" : "talent-cell",
            data: { talentId: "k-fortitude" },
            props: { type: "button" },
            text: "Fortitude",
          }),
        ];
      },
    });

    shell.render(first);
    shell.setSelection("k-fortitude");
    expect(root.querySelector(".talent-cell.selected")).not.toBeNull();

    const changed = structuredClone(first);
    changed.progression.unlockedStage = 2;
    shell.render(changed);

    expect(shell.getSelection()).toBe("k-fortitude");
    expect(root.querySelector(".talent-cell.selected")).not.toBeNull();

    shell.destroy();
  });

  it("re-appends a retained node across a render instead of tearing it down", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const first = engine.snapshot();
    const retained = el("div", {
      class: "stage-confirm",
      data: { surfaceRetain: "true", pendingStage: "1" },
      text: "confirm",
    });
    const surface = mountSurfaceShell(root, "stage-surface", {
      title: "Stage",
      showTitle: false,
      body() {
        return [el("p", { class: "attempt-position", text: "body" })];
      },
    });

    surface.render(first);
    root.append(retained);
    expect(root.contains(retained)).toBe(true);

    const changed = structuredClone(first);
    changed.progression.unlockedStage = 2;
    surface.render(changed);

    expect(root.contains(retained)).toBe(true);
    expect(root.querySelector(".stage-confirm")).toBe(retained);
    expect(root.querySelector(".attempt-position")?.textContent).toBe("body");

    surface.destroy();
  });
});

describe("Scroll overflow affordance binding", () => {
  it('sets data-overflow to "false" when content fits and "true" when it overflows', async () => {
    const region = document.createElement("div");
    Object.defineProperty(region, "clientHeight", { configurable: true, get: () => 100 });
    Object.defineProperty(region, "scrollHeight", {
      configurable: true,
      get: () => (region.dataset["probeTall"] === "1" ? 240 : 80),
    });
    document.body.append(region);

    const unbind = bindScrollOverflowAffordance(region);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    expect(region.dataset["overflow"]).toBe("false");

    region.dataset["probeTall"] = "1";
    region.append(document.createElement("div"));
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    expect(region.dataset["overflow"]).toBe("true");

    unbind();
    expect(region.dataset["overflow"]).toBeUndefined();
    region.remove();
  });
});

describe("Management surface shell mount", () => {
  it('shows "No Snapshot yet." when the Snapshot is null', () => {
    const root = document.createElement("div");
    const surface = mountSurfaceShell(root, "party-surface", {
      title: "Party",
      body: () => [],
    });

    surface.render(null);

    expect(root.querySelector(".surface-empty")?.textContent).toBe("No Snapshot yet.");
    expect(root.querySelector(".dock-surface-title")).toBeNull();
    surface.destroy();
  });

  it("renders the dock title and body when a Snapshot is present", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const surface = mountSurfaceShell(root, "stage-surface", {
      title: "Stage",
      body: () => [el("p", { class: "attempt-position", text: "probe body" })],
    });

    surface.render(snapshot);

    expect(root.querySelector(".dock-surface-title")?.textContent).toBe("Stage");
    expect(root.querySelector(".attempt-position")?.textContent).toBe("probe body");
    surface.destroy();
  });

  it("omits the dock title when showTitle is false", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const surface = mountSurfaceShell(root, "stage-surface", {
      title: "Stage",
      showTitle: false,
      body: () => [el("p", { class: "attempt-position", text: "probe body" })],
    });

    surface.render(snapshot);

    expect(root.querySelector(".dock-surface-title")).toBeNull();
    expect(root.querySelector(".attempt-position")?.textContent).toBe("probe body");
    surface.destroy();
  });

  it("destroy clears the root and removes the surface class", () => {
    const root = document.createElement("div");
    const surface = mountSurfaceShell(root, "talents-surface", {
      title: "Talents",
      body: () => [],
    });

    surface.render(null);
    expect(root.classList.contains("talents-surface")).toBe(true);
    expect(root.childNodes.length).toBeGreaterThan(0);

    surface.destroy();
    expect(root.childNodes).toHaveLength(0);
    expect(root.classList.contains("talents-surface")).toBe(false);
  });

  it("null Snapshot outerHTML matches the Stage surface empty state", () => {
    const stageRoot = document.createElement("div");
    const shellRoot = document.createElement("div");
    const stage = mountStageSurface(stageRoot, { content });
    const shell = mountSurfaceShell(shellRoot, "stage-surface", {
      title: "Stage",
      body: () => [],
    });

    stage.render(null);
    shell.render(null);

    expect(shellRoot.outerHTML).toBe(stageRoot.outerHTML);

    stage.destroy();
    shell.destroy();
  });

  it("passes EMPTY_ENGINE_LEGALITY to body when render omits the legality argument", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    let received: EngineLegalityView | undefined;
    const surface = mountSurfaceShell(root, "party-surface", {
      title: "Party",
      body(_snapshot, legality) {
        received = legality;
        return [];
      },
    });

    surface.render(snapshot);

    expect(received).toBe(EMPTY_ENGINE_LEGALITY);
    surface.destroy();
  });

  it("passes the exact legality view argument through to body", () => {
    const root = document.createElement("div");
    const engine = createEngine(content, undefined, LOOT_SEED);
    const snapshot = engine.snapshot();
    const legality: EngineLegalityView = {
      canAllocateTalent: () => true,
      canDeallocateTalent: () => true,
      canEquip: () => true,
    };
    let received: EngineLegalityView | undefined;
    const surface = mountSurfaceShell(root, "party-surface", {
      title: "Party",
      body(_snapshot, legalityArg) {
        received = legalityArg;
        return [];
      },
    });

    surface.render(snapshot, legality);

    expect(received).toBe(legality);
    surface.destroy();
  });
});
