import type { EngineEvent } from "../core/events";

export const PUMP_INTERVAL_MS = 250;
export const RENDER_FRAME_MS = 33;
export const HIDDEN_HEARTBEAT_MS = 5000;

export interface PumpController {
  stop(): void;
}

export interface PumpDeps {
  advanceBy: (ms: number) => EngineEvent[];
  onAdvance: (events: EngineEvent[]) => void;
  render: () => void;
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
  let renderAccumulatorMs = 0;
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

  function scheduleRender(): void {
    if (stopped || isHidden() || rafId !== null) {
      return;
    }
    rafId = requestFrame(() => {
      rafId = null;
      if (stopped || isHidden()) {
        return;
      }
      renderAccumulatorMs += RENDER_FRAME_MS;
      if (renderAccumulatorMs >= RENDER_FRAME_MS) {
        renderAccumulatorMs = 0;
        deps.render();
      }
      scheduleRender();
    });
  }

  function stopRendering(): void {
    if (rafId !== null) {
      cancelFrame(rafId);
      rafId = null;
    }
    renderAccumulatorMs = 0;
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

  return {
    stop() {
      stopped = true;
      stopRendering();
      stopLivePump();
      stopHeartbeat();
      doc.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
