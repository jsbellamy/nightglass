import { expect, test } from "@playwright/test";
import {
  defineEvidenceScenario,
  EVIDENCE_SCENARIOS,
  evidenceScenarioTitle,
  registeredEvidenceScenarios,
} from "./helpers/evidence-scenarios";
import {
  findDeclarationDrift,
  findDocsCitationDrift,
  findRawEvidenceTitles,
  findSceneEmissionDrift,
  findScenarioSlugCatalogDrift,
  findUnsafeScreenshotPaths,
} from "./helpers/registry-drift";
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
  test("registeredEvidenceScenarios unions static catalogue with self-registered rows", () => {
    expect(registeredEvidenceScenarios()).toHaveLength(17);
    for (const row of EVIDENCE_SCENARIOS) {
      expect(registeredEvidenceScenarios().find((scenario) => scenario.id === row.id)).toEqual(row);
    }
  });

  test("defineEvidenceScenario throws when scenario id is already registered", () => {
    const row = registeredEvidenceScenarios().find((scenario) => scenario.id === "five-actor-pools")!;
    expect(() => defineEvidenceScenario(row, async () => {})).toThrow(
      /duplicate evidence scenario id: five-actor-pools/,
    );
  });

  test("assigns unique scenario IDs", () => {
    const byId = collect(registeredEvidenceScenarios(), (s) => s.id);
    const duplicates = [...byId.entries()].filter(([, rows]) => rows.length > 1);
    expect(duplicates, "duplicate scenario IDs").toEqual([]);
  });

  test("keeps slugs unique within each scenario", () => {
    for (const scenario of registeredEvidenceScenarios()) {
      const slugSet = new Set(scenario.slugs);
      expect(slugSet.size, `${scenario.id} duplicate slugs`).toBe(scenario.slugs.length);
    }
  });

  test("registers the evidence slug catalog and browser-floor empty slug lists", () => {
    expect(findScenarioSlugCatalogDrift(), "slug catalog drift").toEqual([]);
    const keyboard = registeredEvidenceScenarios().find((s) => s.id === "keyboard-floor");
    const colour = registeredEvidenceScenarios().find((s) => s.id === "colour-independence");
    expect(keyboard?.slugs).toEqual([]);
    expect(colour?.slugs).toEqual([]);
  });

  test("assigns unique review-scene IDs within each scenario", () => {
    for (const scenario of registeredEvidenceScenarios()) {
      const ids = scenario.reviewScenes.map((scene) => scene.id);
      expect(new Set(ids).size, `${scenario.id} review scene IDs`).toBe(ids.length);
    }
  });

  test("assigns unique spec IDs", () => {
    const bySpec = collect(registeredEvidenceScenarios(), (s) => s.spec.id);
    const duplicates = [...bySpec.entries()].filter(([, rows]) => rows.length > 1);
    expect(duplicates, "duplicate spec IDs").toEqual([]);
  });

  test("assigns unique generated review output paths", () => {
    const paths: string[] = [];
    for (const scenario of registeredEvidenceScenarios()) {
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

  test("has no scenarios on the retired rendered-evidence monolith", () => {
    const monolith = registeredEvidenceScenarios().filter(
      (s) => s.spec.path === "e2e/rendered-evidence.spec.ts",
    );
    expect(monolith).toHaveLength(0);
  });

  test("catalogues seventeen supplemental scenarios on dedicated spec files", () => {
    const supplementalPaths = [
      "e2e/contrast.spec.ts",
      "e2e/keyboard.spec.ts",
      "e2e/reduced-motion.spec.ts",
      "e2e/stress.spec.ts",
      "e2e/scenarios/tile.spec.ts",
      "e2e/scenarios/dock.spec.ts",
      "e2e/scenarios/armory.spec.ts",
      "e2e/scenarios/character-loadout.spec.ts",
      "e2e/scenarios/character-progression.spec.ts",
    ];
    const supplemental = registeredEvidenceScenarios().filter((s) => supplementalPaths.includes(s.spec.path));
    expect(supplemental).toHaveLength(17);
    const tileScenarios = registeredEvidenceScenarios().filter((s) => s.spec.path === "e2e/scenarios/tile.spec.ts");
    expect(tileScenarios).toHaveLength(3);
    const dockScenarios = registeredEvidenceScenarios().filter((s) => s.spec.path === "e2e/scenarios/dock.spec.ts");
    expect(dockScenarios).toHaveLength(2);
    const armoryScenarios = registeredEvidenceScenarios().filter((s) => s.spec.path === "e2e/scenarios/armory.spec.ts");
    expect(armoryScenarios).toHaveLength(3);
    const characterLoadoutScenarios = registeredEvidenceScenarios().filter(
      (s) => s.spec.path === "e2e/scenarios/character-loadout.spec.ts",
    );
    expect(characterLoadoutScenarios).toHaveLength(2);
    const characterLoadout = characterLoadoutScenarios.find((s) => s.id === "character-loadout");
    expect(characterLoadout?.fixture).toBe("character-loadout-evidence");
    expect(characterLoadout?.reviewScenes.map((scene) => scene.id)).toEqual([
      "character-sub-build",
      "character-sub-stats",
    ]);
    const characterProgressionScenarios = registeredEvidenceScenarios().filter(
      (s) => s.spec.path === "e2e/scenarios/character-progression.spec.ts",
    );
    expect(characterProgressionScenarios).toHaveLength(2);
    for (const scenario of [
      ...tileScenarios,
      ...armoryScenarios,
      ...characterLoadoutScenarios,
      ...characterProgressionScenarios,
    ]) {
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

  test("enforces final declarations and spec sources", () => {
    expect(findDeclarationDrift(), "declaration drift").toEqual([]);
  });

  test("rejects hand-written evidence titles and unsafe tracked outputs", () => {
    expect(findRawEvidenceTitles(), "raw evidence titles").toEqual([]);
    expect(findUnsafeScreenshotPaths(), "unsafe screenshot paths").toEqual([]);
  });

  test("requires registered review scenes to be emitted", () => {
    expect(findSceneEmissionDrift(), "scene emission drift").toEqual([]);
  });

  test("keeps acceptance-guide evidence citations on the registry", () => {
    expect(findDocsCitationDrift(), "docs citation drift").toEqual([]);
  });
});
