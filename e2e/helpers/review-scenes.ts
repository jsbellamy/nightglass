import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Page, Locator } from "@playwright/test";
import type { ReviewSceneId, ScenarioId } from "./evidence-scenarios";

export const reviewSceneRoot = "e2e-screenshots";

export function reviewSceneOutputPath(scenarioId: ScenarioId, sceneId: ReviewSceneId): string {
  const relative = `${reviewSceneRoot}/${scenarioId}/${sceneId}.png`;
  assertSafeReviewOutputPath(relative);
  return relative;
}

export function assertSafeReviewOutputPath(relativePath: string): void {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`review output must be a relative path: ${relativePath}`);
  }
  const normalized = path.posix.normalize(relativePath.replaceAll("\\", "/"));
  if (normalized.startsWith("../") || normalized.includes("/../") || normalized === "..") {
    throw new Error(`review output escapes output root: ${relativePath}`);
  }
  if (!normalized.startsWith(`${reviewSceneRoot}/`)) {
    throw new Error(`review output must stay under ${reviewSceneRoot}/: ${relativePath}`);
  }
  if (normalized.includes("docs/research/evidence")) {
    throw new Error(`review output must not target docs/research/evidence: ${relativePath}`);
  }
}

export async function captureReviewScene(
  target: Page | Locator,
  scenarioId: ScenarioId,
  sceneId: ReviewSceneId,
): Promise<string> {
  const outputPath = reviewSceneOutputPath(scenarioId, sceneId);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  await target.screenshot({ path: outputPath });
  return outputPath;
}
