// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { createEngine } from "../core/engine";
import { buildContent } from "../data";
import { mountStageSurface } from "./stage-surface";
import { el, mountSurfaceShell, pendingMarker, bindScrollOverflowAffordance } from "./surface-shell";

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
});
