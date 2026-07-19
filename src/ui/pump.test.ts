// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineEvent } from "../core/events";
import { HIDDEN_HEARTBEAT_MS, PUMP_INTERVAL_MS, startPump } from "./pump";

describe("live pump loop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("pumps the Engine every 250ms while visible", () => {
    const advanceBy = vi.fn(() => [] as EngineEvent[]);
    const render = vi.fn();
    const doc = document;
    Object.defineProperty(doc, "hidden", { configurable: true, value: false });

    const pump = startPump({
      advanceBy,
      onAdvance: vi.fn(),
      render,
      document: doc,
    });

    vi.advanceTimersByTime(PUMP_INTERVAL_MS);
    expect(advanceBy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PUMP_INTERVAL_MS * 3);
    expect(advanceBy).toHaveBeenCalledTimes(4);

    pump.stop();
  });

  it("stops rendering and drops pumping to a 5s heartbeat when hidden", () => {
    const advanceBy = vi.fn(() => [] as EngineEvent[]);
    const render = vi.fn();
    const doc = document;
    Object.defineProperty(doc, "hidden", { configurable: true, value: false });

    const pump = startPump({
      advanceBy,
      onAdvance: vi.fn(),
      render,
      document: doc,
    });

    vi.advanceTimersByTime(PUMP_INTERVAL_MS);
    expect(advanceBy).toHaveBeenCalledTimes(1);

    Object.defineProperty(doc, "hidden", { configurable: true, value: true });
    doc.dispatchEvent(new Event("visibilitychange"));
    render.mockClear();
    advanceBy.mockClear();

    vi.advanceTimersByTime(PUMP_INTERVAL_MS * 4);
    expect(render).not.toHaveBeenCalled();
    expect(advanceBy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(HIDDEN_HEARTBEAT_MS);
    expect(advanceBy).toHaveBeenCalledTimes(1);

    Object.defineProperty(doc, "hidden", { configurable: true, value: false });
    doc.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(PUMP_INTERVAL_MS);
    expect(advanceBy.mock.calls.length).toBeGreaterThanOrEqual(2);

    pump.stop();
  });
});
