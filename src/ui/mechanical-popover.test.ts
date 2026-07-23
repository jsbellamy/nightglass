// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { mountMechanicalPopoverController } from "./mechanical-popover";

function mockRect(
  element: HTMLElement,
  rect: Pick<DOMRect, "top" | "left" | "right" | "bottom" | "width" | "height">,
): void {
  element.getBoundingClientRect = () =>
    ({
      x: rect.left,
      y: rect.top,
      ...rect,
      toJSON: () => ({}),
    }) as DOMRect;
}

function layoutPopoverSize(popover: HTMLElement, width: number, height: number): void {
  Object.defineProperty(popover, "offsetWidth", { configurable: true, value: width });
  Object.defineProperty(popover, "offsetHeight", { configurable: true, value: height });
}

describe("mountMechanicalPopoverController", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("prefers the anchor right side when it fits inside the Dock bounds", () => {
    const bounds = document.createElement("div");
    bounds.className = "management-dock";
    const anchor = document.createElement("button");
    const popover = document.createElement("div");
    document.body.append(bounds);
    bounds.append(anchor, popover);

    mockRect(bounds, { top: 0, left: 0, right: 400, bottom: 300, width: 400, height: 300 });
    mockRect(anchor, { top: 100, left: 50, right: 120, bottom: 140, width: 70, height: 40 });
    layoutPopoverSize(popover, 100, 60);

    const controller = mountMechanicalPopoverController({ popover, bounds, gap: 6 });
    controller.show(anchor);

    expect(popover.hidden).toBe(false);
    expect(popover.style.left).toBe("126px");
    expect(popover.dataset["mechanicalPopoverSide"]).toBe("right");

    controller.destroy();
  });

  it("falls back to the left when the right side does not fit", () => {
    const bounds = document.createElement("div");
    const anchor = document.createElement("button");
    const popover = document.createElement("div");
    document.body.append(bounds);
    bounds.append(anchor, popover);

    mockRect(bounds, { top: 0, left: 0, right: 200, bottom: 200, width: 200, height: 200 });
    mockRect(anchor, { top: 80, left: 150, right: 190, bottom: 110, width: 40, height: 30 });
    layoutPopoverSize(popover, 80, 50);

    const controller = mountMechanicalPopoverController({ popover, bounds });
    controller.show(anchor);

    expect(popover.dataset["mechanicalPopoverSide"]).toBe("left");
    expect(Number.parseFloat(popover.style.left)).toBeLessThan(150);

    controller.destroy();
  });

  it("clamps vertically within the Dock and centers on the anchor", () => {
    const bounds = document.createElement("div");
    const anchor = document.createElement("button");
    const popover = document.createElement("div");
    document.body.append(bounds);
    bounds.append(anchor, popover);

    mockRect(bounds, { top: 0, left: 0, right: 300, bottom: 100, width: 300, height: 100 });
    mockRect(anchor, { top: 10, left: 20, right: 60, bottom: 30, width: 40, height: 20 });
    layoutPopoverSize(popover, 60, 80);

    const controller = mountMechanicalPopoverController({ popover, bounds, gap: 6 });
    controller.show(anchor);

    expect(Number.parseFloat(popover.style.top)).toBe(6);
    expect(Number.parseFloat(popover.style.top) + 80).toBeLessThanOrEqual(100 - 6);

    controller.destroy();
  });

  it("locks the horizontal side across reposition for the same anchor session", () => {
    const bounds = document.createElement("div");
    const anchor = document.createElement("button");
    const popover = document.createElement("div");
    document.body.append(bounds);
    bounds.append(anchor, popover);

    mockRect(bounds, { top: 0, left: 0, right: 400, bottom: 300, width: 400, height: 300 });
    mockRect(anchor, { top: 100, left: 50, right: 120, bottom: 140, width: 70, height: 40 });
    layoutPopoverSize(popover, 100, 60);

    const controller = mountMechanicalPopoverController({ popover, bounds });
    controller.show(anchor);
    const firstLeft = popover.style.left;
    expect(popover.dataset["mechanicalPopoverSide"]).toBe("right");

    mockRect(bounds, { top: 0, left: 0, right: 130, bottom: 300, width: 130, height: 300 });
    controller.reposition();

    expect(popover.dataset["mechanicalPopoverSide"]).toBe("right");
    expect(popover.style.left).not.toBe(firstLeft);
    expect(Number.parseFloat(popover.style.left)).toBeLessThanOrEqual(130 - 6 - 100);

    controller.destroy();
  });

  it("hide clears the session so a new anchor may choose a different side", () => {
    const bounds = document.createElement("div");
    const anchorA = document.createElement("button");
    const anchorB = document.createElement("button");
    const popover = document.createElement("div");
    document.body.append(bounds);
    bounds.append(anchorA, anchorB, popover);

    mockRect(bounds, { top: 0, left: 0, right: 400, bottom: 300, width: 400, height: 300 });
    mockRect(anchorA, { top: 100, left: 50, right: 120, bottom: 140, width: 70, height: 40 });
    layoutPopoverSize(popover, 100, 60);

    const controller = mountMechanicalPopoverController({ popover, bounds });
    controller.show(anchorA);
    expect(popover.dataset["mechanicalPopoverSide"]).toBe("right");
    controller.hide();
    expect(popover.hidden).toBe(true);
    expect(popover.dataset["mechanicalPopoverSide"]).toBeUndefined();

    mockRect(anchorB, { top: 100, left: 320, right: 380, bottom: 140, width: 60, height: 40 });
    mockRect(bounds, { top: 0, left: 0, right: 400, bottom: 300, width: 400, height: 300 });
    controller.show(anchorB);
    expect(popover.dataset["mechanicalPopoverSide"]).toBe("left");

    controller.destroy();
  });

  it("destroy hides the popover and drops pending reposition listeners", () => {
    const bounds = document.createElement("div");
    const anchor = document.createElement("button");
    const popover = document.createElement("div");
    document.body.append(bounds);
    bounds.append(anchor, popover);

    mockRect(bounds, { top: 0, left: 0, right: 200, bottom: 200, width: 200, height: 200 });
    mockRect(anchor, { top: 40, left: 40, right: 80, bottom: 70, width: 40, height: 30 });
    layoutPopoverSize(popover, 50, 40);

    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const controller = mountMechanicalPopoverController({ popover, bounds });
    controller.show(anchor);
    const added = addSpy.mock.calls.filter(([type]) => type === "resize").length;
    controller.destroy();
    const removed = removeSpy.mock.calls.filter(([type]) => type === "resize").length;
    expect(removed).toBeGreaterThanOrEqual(added);
    expect(popover.hidden).toBe(true);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
