import { describe, expect, it } from "vitest";
import {
  createFrameMetrics,
  FRAME_METRICS_WINDOW,
} from "./frame-metrics";

function percentileNearestRank(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;
  return sorted[Math.min(len - 1, Math.ceil(p * len) - 1)]!;
}

describe("createFrameMetrics", () => {
  it("reports intervalP50Ms from a hand-driven sequence of known frame gaps", () => {
    let clock = 0;
    const metrics = createFrameMetrics({ now: () => clock });
    const renderDurationMs = 2;
    const gapsBeforeRender = [16, 20, 16, 33, 16];
    const intervals: number[] = [];
    let previousStart: number | null = null;

    for (const gap of gapsBeforeRender) {
      clock += gap;
      const start = clock;
      if (previousStart !== null) {
        intervals.push(start - previousStart);
      }
      metrics.measure(() => {
        clock += renderDurationMs;
      });
      previousStart = start;
    }

    const durations = gapsBeforeRender.map(() => renderDurationMs);
    const report = metrics.report();

    expect(report.intervalP50Ms).toBe(percentileNearestRank(intervals, 0.5));
    expect(report.sampleCount).toBe(gapsBeforeRender.length);
    expect(report.intervalP95Ms).toBe(percentileNearestRank(intervals, 0.95));
    expect(report.intervalMaxMs).toBe(Math.max(...intervals));
    expect(report.durationP50Ms).toBe(percentileNearestRank(durations, 0.5));
  });

  it("records duration on the first measure but no interval; one frame yields intervalP50Ms 0", () => {
    let clock = 100;
    const metrics = createFrameMetrics({ now: () => clock });

    metrics.measure(() => {
      clock += 5;
    });

    const report = metrics.report();
    expect(report.sampleCount).toBe(1);
    expect(report.intervalP50Ms).toBe(0);
    expect(report.intervalP95Ms).toBe(0);
    expect(report.intervalMaxMs).toBe(0);
    expect(report.durationP50Ms).toBe(5);
  });

  it("never keeps more than FRAME_METRICS_WINDOW samples after many measured frames", () => {
    let clock = 0;
    const metrics = createFrameMetrics({ now: () => clock });

    const totalFrames = FRAME_METRICS_WINDOW + 50;
    for (let i = 0; i < totalFrames; i++) {
      clock += 16;
      metrics.measure(() => {
        clock += 1;
      });
    }

    expect(metrics.report().sampleCount).toBe(FRAME_METRICS_WINDOW);
  });

  it("propagates render errors and still records that frame duration", () => {
    let clock = 0;
    const metrics = createFrameMetrics({ now: () => clock });

    clock += 16;
    expect(() =>
      metrics.measure(() => {
        clock += 7;
        throw new Error("render failed");
      }),
    ).toThrow("render failed");

    const report = metrics.report();
    expect(report.sampleCount).toBe(1);
    expect(report.durationMaxMs).toBe(7);
  });

  it("clears interval baseline after reset so the next measure has no interval", () => {
    let clock = 0;
    const metrics = createFrameMetrics({ now: () => clock });

    clock += 16;
    metrics.measure(() => {
      clock += 1;
    });
    clock += 20;
    metrics.measure(() => {
      clock += 1;
    });

    metrics.reset();

    clock += 99;
    metrics.measure(() => {
      clock += 3;
    });

    expect(metrics.report().sampleCount).toBe(1);
    expect(metrics.report().intervalP50Ms).toBe(0);
    expect(metrics.report().durationP50Ms).toBe(3);
  });
});
