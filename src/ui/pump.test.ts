// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineEvent } from "../core/events";
import { createFrameMetrics } from "./frame-metrics";
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

  it("renders once per delivered animation frame with no wall-clock gate", () => {
    let clock = 0;
    const render = vi.fn();
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
      const callbacks = rafCallbacks.splice(0);
      for (const callback of callbacks) {
        callback(at);
      }
    }

    const frameTimesMs: number[] = [];
    for (let frame = 1; frame <= 12; frame++) {
      frameTimesMs.push(Math.round(frame * 16.7));
    }
    for (const at of frameTimesMs) {
      runRafAt(at);
    }

    expect(render.mock.calls.length).toBe(frameTimesMs.length);

    pump.stop();
  });

  it("renders on consecutive rAF ticks even when they arrive 5ms apart", () => {
    let clock = 0;
    const render = vi.fn();
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
      const callbacks = rafCallbacks.splice(0);
      for (const callback of callbacks) {
        callback(at);
      }
    }

    runRafAt(10);
    runRafAt(15);

    expect(render).toHaveBeenCalledTimes(2);

    pump.stop();
  });

  it("cancels the pending rAF and performs no further renders after stop()", () => {
    const render = vi.fn();
    const rafCallbacks: FrameRequestCallback[] = [];
    const cancelAnimationFrame = vi.fn();
    const doc = {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;

    const pump = startPump({
      advanceBy: vi.fn(() => [] as EngineEvent[]),
      onAdvance: vi.fn(),
      render,
      requestAnimationFrame: (callback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      },
      cancelAnimationFrame,
      setInterval: vi.fn(),
      clearInterval: vi.fn(),
      document: doc,
    });

    expect(rafCallbacks.length).toBe(1);
    pump.stop();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    render.mockClear();

    for (const callback of rafCallbacks.splice(0)) {
      callback(0);
    }
    expect(render).not.toHaveBeenCalled();

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

    for (let at = 17; at <= 100; at += 17) {
      runRafAt(at);
    }

    const report = pump.frameMetrics();
    expect(report).not.toBeNull();
    expect(report!.sampleCount).toBe(render.mock.calls.length);
    expect(render.mock.calls.length).toBeGreaterThanOrEqual(2);

    pump.stop();
  });
});
