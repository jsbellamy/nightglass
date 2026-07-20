// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineEvent } from "../core/events";
import { createFrameMetrics } from "./frame-metrics";
import { HIDDEN_HEARTBEAT_MS, PUMP_INTERVAL_MS, RENDER_FRAME_MS, startPump } from "./pump";

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

  it("caps render cadence at 30fps via wall-clock gating between rAF ticks", () => {
    let clock = 0;
    const renderTimes: number[] = [];
    const render = vi.fn(() => {
      renderTimes.push(clock);
    });
    const rafCallbacks: FrameRequestCallback[] = [];
    const doc = {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;

    const pump = startPump({
      advanceBy: vi.fn(() => [] as EngineEvent[]),
      onAdvance: vi.fn(),
      render,
      now: () => clock,
      requestAnimationFrame: (callback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      },
      cancelAnimationFrame: vi.fn(),
      setInterval: vi.fn(),
      clearInterval: vi.fn(),
      document: doc,
    });

    function runRafAt(at: number): void {
      clock = at;
      let guard = 0;
      while (rafCallbacks.length > 0 && guard < 20) {
        const callbacks = rafCallbacks.splice(0);
        for (const callback of callbacks) {
          callback(at);
        }
        guard += 1;
      }
    }

    for (let at = 0; at <= 100; at += 8) {
      runRafAt(at);
    }

    const maxRendersInWindow = Math.floor(100 / RENDER_FRAME_MS) + 1;
    expect(renderTimes.length).toBeLessThanOrEqual(maxRendersInWindow);
    expect(renderTimes.length).toBeGreaterThanOrEqual(2);

    for (let index = 1; index < renderTimes.length; index++) {
      expect(renderTimes[index]! - renderTimes[index - 1]!).toBeGreaterThanOrEqual(RENDER_FRAME_MS);
    }

    pump.stop();
  });
});

describe("frame metrics wiring", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null from frameMetrics when no recorder was supplied", () => {
    const doc = document;
    Object.defineProperty(doc, "hidden", { configurable: true, value: false });

    const pump = startPump({
      advanceBy: vi.fn(() => [] as EngineEvent[]),
      onAdvance: vi.fn(),
      render: vi.fn(),
      document: doc,
    });

    expect(pump.frameMetrics()).toBeNull();
    pump.stop();
  });

  it("records one sample per render the pump performs when a recorder is supplied", () => {
    let clock = 0;
    const render = vi.fn();
    const rafCallbacks: FrameRequestCallback[] = [];
    const doc = {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;
    const frameMetrics = createFrameMetrics({ now: () => clock });

    const pump = startPump({
      advanceBy: vi.fn(() => [] as EngineEvent[]),
      onAdvance: vi.fn(),
      render,
      frameMetrics,
      now: () => clock,
      requestAnimationFrame: (callback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      },
      cancelAnimationFrame: vi.fn(),
      setInterval: vi.fn(),
      clearInterval: vi.fn(),
      document: doc,
    });

    function runRafAt(at: number): void {
      clock = at;
      const callbacks = rafCallbacks.splice(0);
      for (const callback of callbacks) {
        callback(at);
      }
    }

    for (let at = 0; at <= 100; at += RENDER_FRAME_MS) {
      runRafAt(at);
    }

    const report = pump.frameMetrics();
    expect(report).not.toBeNull();
    expect(report!.sampleCount).toBe(render.mock.calls.length);
    expect(render.mock.calls.length).toBeGreaterThanOrEqual(2);

    pump.stop();
  });
});
