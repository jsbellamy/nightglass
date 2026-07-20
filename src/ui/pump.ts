import type { EngineEvent } from "../core/events";
import type { FrameMetrics, FrameMetricsReport } from "./frame-metrics";

export const PUMP_INTERVAL_MS = 250;
export const HIDDEN_HEARTBEAT_MS = 5000;

export interface PumpController {
  stop(): void;
  frameMetrics(): FrameMetricsReport | null;
}

export interface PumpDeps {
  advanceBy: (ms: number) => EngineEvent[];
  onAdvance: (events: EngineEvent[]) => void;
  render: () => void;
  frameMetrics?: FrameMetrics;
  now?: () => number;
  setInterval?: typeof setInterval;
  clearInterval?: typeof clearInterval;
  requestAnimationFrame?: typeof requestAnimationFrame;
  cancelAnimationFrame?: typeof cancelAnimationFrame;
  document?: Document;
}

export function startPump(deps: PumpDeps): PumpController {
  const now = deps.now ?? (() => Date.now());
  const setIntervalFn = deps.setInterval ?? setInterval;
  const clearIntervalFn = deps.clearInterval ?? clearInterval;
  const requestFrame = deps.requestAnimationFrame ?? requestAnimationFrame.bind(window);
  const cancelFrame = deps.cancelAnimationFrame ?? cancelAnimationFrame.bind(window);
  const doc = deps.document ?? document;

  let pumpTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let rafId: number | null = null;
  let lastPumpAtMs = now();
  let lastHiddenPumpAtMs = now();
  let stopped = false;

  function isHidden(): boolean {
    return doc.hidden;
  }

  function pump(elapsedMs: number): void {
    const events = deps.advanceBy(elapsedMs);
    if (events.length > 0) {
      deps.onAdvance(events);
    }
    scheduleRender();
  }

  function maybeRender(): void {
    if (stopped || isHidden()) {
      return;
    }
    if (deps.frameMetrics) {
      deps.frameMetrics.measure(deps.render);
    } else {
      deps.render();
    }
  }

  function scheduleRender(): void {
    if (stopped || isHidden() || rafId !== null) {
      return;
    }
    rafId = requestFrame(() => {
      rafId = null;
      maybeRender();
      if (!stopped && !isHidden()) {
        scheduleRender();
      }
    });
  }

  function stopRendering(): void {
    if (rafId !== null) {
      cancelFrame(rafId);
      rafId = null;
    }
  }

  function startLivePump(): void {
    if (pumpTimer !== null) {
      return;
    }
    lastPumpAtMs = now();
    pumpTimer = setIntervalFn(() => {
      if (stopped || isHidden()) {
        return;
      }
      const at = now();
      const elapsed = Math.max(PUMP_INTERVAL_MS, at - lastPumpAtMs);
      lastPumpAtMs = at;
      pump(elapsed);
    }, PUMP_INTERVAL_MS);
  }

  function stopLivePump(): void {
    if (pumpTimer !== null) {
      clearIntervalFn(pumpTimer);
      pumpTimer = null;
    }
  }

  function startHeartbeat(): void {
    if (heartbeatTimer !== null) {
      return;
    }
    lastHiddenPumpAtMs = now();
    heartbeatTimer = setIntervalFn(() => {
      if (stopped || !isHidden()) {
        return;
      }
      const at = now();
      const elapsed = Math.max(HIDDEN_HEARTBEAT_MS, at - lastHiddenPumpAtMs);
      lastHiddenPumpAtMs = at;
      pump(elapsed);
    }, HIDDEN_HEARTBEAT_MS);
  }

  function stopHeartbeat(): void {
    if (heartbeatTimer !== null) {
      clearIntervalFn(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function onVisibilityChange(): void {
    if (stopped) {
      return;
    }
    if (isHidden()) {
      stopRendering();
      stopLivePump();
      startHeartbeat();
      return;
    }

    stopHeartbeat();
    const at = now();
    const catchUpMs = Math.max(0, at - lastPumpAtMs);
    if (catchUpMs > 0) {
      pump(catchUpMs);
      lastPumpAtMs = at;
    }
    startLivePump();
    scheduleRender();
  }

  doc.addEventListener("visibilitychange", onVisibilityChange);

  if (isHidden()) {
    startHeartbeat();
  } else {
    startLivePump();
    scheduleRender();
  }

  const frameMetricsRecorder = deps.frameMetrics ?? null;

  return {
    stop() {
      stopped = true;
      stopRendering();
      stopLivePump();
      stopHeartbeat();
      doc.removeEventListener("visibilitychange", onVisibilityChange);
    },
    frameMetrics() {
      return frameMetricsRecorder ? frameMetricsRecorder.report() : null;
    },
  };
}
