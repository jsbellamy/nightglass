import { expect, test } from "@playwright/test";
import {
  EVIDENCE_SCENARIOS,
  EVIDENCE_SLUG_CATALOG,
  evidenceScenarioTitle,
  type EvidenceScenario,
} from "./helpers/evidence-scenarios";
import { assertSafeReviewOutputPath, reviewSceneOutputPath, reviewSceneRoot } from "./helpers/review-scenes";

function collect<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k) ?? [];
    bucket.push(item);
    map.set(k, bucket);
  }
  return map;
}

test.describe("evidence scenario registry", () => {
  test("assigns unique scenario IDs", () => {
    const byId = collect(EVIDENCE_SCENARIOS, (s) => s.id);
    const duplicates = [...byId.entries()].filter(([, rows]) => rows.length > 1);
    expect(duplicates, "duplicate scenario IDs").toEqual([]);
  });

  test("keeps slugs unique within each scenario", () => {
    for (const scenario of EVIDENCE_SCENARIOS) {
      const slugSet = new Set(scenario.slugs);
      expect(slugSet.size, `${scenario.id} duplicate slugs`).toBe(scenario.slugs.length);
    }
  });

  test("registers the evidence slug catalog and browser-floor empty slug lists", () => {
    const catalogSlugs = new Set(EVIDENCE_SLUG_CATALOG);
    const used = new Set<string>();
    for (const scenario of EVIDENCE_SCENARIOS) {
      for (const slug of scenario.slugs) {
        expect(catalogSlugs.has(slug), `unknown slug ${slug}`).toBe(true);
        used.add(slug);
      }
    }
    for (const slug of EVIDENCE_SLUG_CATALOG) {
      expect(used.has(slug), `orphan catalog slug ${slug}`).toBe(true);
    }
    const keyboard = EVIDENCE_SCENARIOS.find((s) => s.id === "keyboard-floor");
    const colour = EVIDENCE_SCENARIOS.find((s) => s.id === "colour-independence");
    expect(keyboard?.slugs).toEqual([]);
    expect(colour?.slugs).toEqual([]);
  });

  test("assigns unique review-scene IDs within each scenario", () => {
    for (const scenario of EVIDENCE_SCENARIOS) {
      const ids = scenario.reviewScenes.map((scene) => scene.id);
      expect(new Set(ids).size, `${scenario.id} review scene IDs`).toBe(ids.length);
    }
  });

  test("assigns unique spec IDs", () => {
    const bySpec = collect(EVIDENCE_SCENARIOS, (s) => s.spec.id);
    const duplicates = [...bySpec.entries()].filter(([, rows]) => rows.length > 1);
    expect(duplicates, "duplicate spec IDs").toEqual([]);
  });

  test("assigns unique generated review output paths", () => {
    const paths: string[] = [];
    for (const scenario of EVIDENCE_SCENARIOS) {
      for (const scene of scenario.reviewScenes) {
        paths.push(reviewSceneOutputPath(scenario.id, scene.id));
      }
    }
    expect(new Set(paths).size, "duplicate review output paths").toBe(paths.length);
    for (const path of paths) {
      expect(() => assertSafeReviewOutputPath(path)).not.toThrow();
      expect(path.startsWith(`${reviewSceneRoot}/`)).toBe(true);
    }
  });

  test("lists four monolith scenarios on rendered-evidence with generated titles", () => {
    const monolith: EvidenceScenario[] = EVIDENCE_SCENARIOS.filter(
      (s) => s.spec.path === "e2e/rendered-evidence.spec.ts",
    );
    expect(monolith).toHaveLength(4);
    for (const scenario of monolith) {
      const title = evidenceScenarioTitle(scenario);
      for (const slug of scenario.slugs) {
        expect(title).toContain(`evidence: ${slug}`);
      }
      expect(title).toContain(" — ");
    }
  });

  test("catalogues thirteen supplemental scenarios on dedicated spec files", () => {
    const supplementalPaths = [
      "e2e/contrast.spec.ts",
      "e2e/keyboard.spec.ts",
      "e2e/reduced-motion.spec.ts",
      "e2e/stress.spec.ts",
      "e2e/scenarios/tile.spec.ts",
      "e2e/scenarios/dock.spec.ts",
      "e2e/scenarios/armory.spec.ts",
    ];
    const supplemental = EVIDENCE_SCENARIOS.filter((s) => supplementalPaths.includes(s.spec.path));
    expect(supplemental).toHaveLength(13);
    const tileScenarios = EVIDENCE_SCENARIOS.filter((s) => s.spec.path === "e2e/scenarios/tile.spec.ts");
    expect(tileScenarios).toHaveLength(3);
    const dockScenarios = EVIDENCE_SCENARIOS.filter((s) => s.spec.path === "e2e/scenarios/dock.spec.ts");
    expect(dockScenarios).toHaveLength(2);
    const armoryScenarios = EVIDENCE_SCENARIOS.filter((s) => s.spec.path === "e2e/scenarios/armory.spec.ts");
    expect(armoryScenarios).toHaveLength(3);
    for (const scenario of [...tileScenarios, ...armoryScenarios]) {
      const title = evidenceScenarioTitle(scenario);
      for (const slug of scenario.slugs) {
        expect(title).toContain(`evidence: ${slug}`);
      }
      expect(title).toContain(" — ");
    }
  });

  test("rejects unsafe review output paths", () => {
    expect(() => assertSafeReviewOutputPath("/tmp/evil.png")).toThrow();
    expect(() => assertSafeReviewOutputPath("e2e-screenshots/../secrets.png")).toThrow();
    expect(() => assertSafeReviewOutputPath("docs/research/evidence/knockout-readability/tile-combat.png")).toThrow();
  });
});
