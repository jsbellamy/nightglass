export const FRAME_METRICS_WINDOW = 120;

export interface FrameSample {
  /** Wall-clock ms since the previous render started. */
  intervalMs: number;
  /** Wall-clock ms the render callback itself took. */
  durationMs: number;
}

export interface FrameMetricsReport {
  sampleCount: number;
  intervalP50Ms: number;
  intervalP95Ms: number;
  intervalMaxMs: number;
  durationP50Ms: number;
  durationP95Ms: number;
  durationMaxMs: number;
}

export interface FrameMetrics {
  /** Wraps `render`; records interval since last call and the call's duration. */
  measure(render: () => void): void;
  report(): FrameMetricsReport;
  reset(): void;
}

export interface FrameMetricsDeps {
  now?: () => number;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;
  return sorted[Math.min(len - 1, Math.ceil(p * len) - 1)]!;
}

function pushRolling(samples: number[], value: number): void {
  samples.push(value);
  if (samples.length > FRAME_METRICS_WINDOW) {
    samples.shift();
  }
}

export function createFrameMetrics(deps?: FrameMetricsDeps): FrameMetrics {
  const now = deps?.now ?? performance.now.bind(performance);
  const durationSamples: number[] = [];
  const intervalSamples: number[] = [];
  let lastRenderStartMs: number | null = null;

  function measure(render: () => void): void {
    const startMs = now();
    if (lastRenderStartMs !== null) {
      pushRolling(intervalSamples, startMs - lastRenderStartMs);
    }
    lastRenderStartMs = startMs;
    try {
      render();
    } finally {
      pushRolling(durationSamples, now() - startMs);
    }
  }

  function report(): FrameMetricsReport {
    return {
      sampleCount: durationSamples.length,
      intervalP50Ms: percentile(intervalSamples, 0.5),
      intervalP95Ms: percentile(intervalSamples, 0.95),
      intervalMaxMs:
        intervalSamples.length === 0 ? 0 : Math.max(...intervalSamples),
      durationP50Ms: percentile(durationSamples, 0.5),
      durationP95Ms: percentile(durationSamples, 0.95),
      durationMaxMs:
        durationSamples.length === 0 ? 0 : Math.max(...durationSamples),
    };
  }

  function reset(): void {
    durationSamples.length = 0;
    intervalSamples.length = 0;
    lastRenderStartMs = null;
  }

  return { measure, report, reset };
}
