import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  EVIDENCE_CITATION_ONLY_SLUGS,
  EVIDENCE_REVIEW_ARTIFACT_ONLY_SLUGS,
  EVIDENCE_SLUG_CATALOG,
  EVIDENCE_SCENARIOS,
  registeredEvidenceScenarios,
  type ScenarioId,
} from "./evidence-scenarios";
import { assertSafeReviewOutputPath } from "./review-scenes";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

const E2E_ROOT = path.join(REPO_ROOT, "e2e");
const ACCEPTANCE_EVIDENCE_DOC = path.join(REPO_ROOT, "docs/agents/acceptance-evidence.md");

const DECLARATION_RE = /declareEvidenceScenario\s*\(\s*"([^"]+)"/g;
const SCREENSHOT_PATH_RE = /\.screenshot\s*\(\s*\{[^}]*\bpath\s*:\s*(["'`])([^"'`]+)\1/g;
const RAW_EVIDENCE_TITLE_RE = /\btest(?:\.(?:only|skip|fixme))?\s*\(\s*(["'`])([^"'`]*\bevidence:\s[^"'`]*)\1/g;
const DOCS_EVIDENCE_SLUG_RE = /`evidence:\s*([^`]+)`/g;

const SCAN_IGNORE = new Set([
  path.join(E2E_ROOT, "helpers/evidence-scenarios.ts"),
  path.join(E2E_ROOT, "helpers/registry-drift.ts"),
  path.join(E2E_ROOT, "scenario-registry.spec.ts"),
]);

function listE2eSources(): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (full.endsWith(".ts") && !SCAN_IGNORE.has(full)) {
        files.push(full);
      }
    }
  };
  walk(E2E_ROOT);
  return files;
}

function readSource(relativeToRepo: string): string {
  return readFileSync(path.join(REPO_ROOT, relativeToRepo), "utf8");
}

function collectDeclarationsBySpec(): Map<string, Map<string, number>> {
  const bySpec = new Map<string, Map<string, number>>();
  for (const file of listE2eSources()) {
    const relative = path.relative(REPO_ROOT, file).replaceAll("\\", "/");
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(DECLARATION_RE)) {
      const scenarioId = match[1]!;
      const counts = bySpec.get(relative) ?? new Map<string, number>();
      counts.set(scenarioId, (counts.get(scenarioId) ?? 0) + 1);
      bySpec.set(relative, counts);
    }
  }
  return bySpec;
}

export function findDeclarationDrift(): string[] {
  const errors: string[] = [];
  const bySpec = collectDeclarationsBySpec();
  for (const scenario of EVIDENCE_SCENARIOS) {
    const specPath = scenario.spec.path;
    if (!existsSync(path.join(REPO_ROOT, specPath))) {
      errors.push(`missing spec source: ${specPath} for scenario ${scenario.id}`);
      continue;
    }
    const declarations = bySpec.get(specPath);
    const count = declarations?.get(scenario.id) ?? 0;
    if (count === 0) {
      errors.push(`missing final declaration: ${scenario.id} in ${specPath}`);
    } else if (count > 1) {
      errors.push(`duplicate declaration: ${scenario.id} in ${specPath} (${count} times)`);
    }
  }
  for (const [specPath, declarations] of bySpec) {
    const specSource = readSource(specPath);
    for (const match of specSource.matchAll(DECLARATION_RE)) {
      const declaredId = match[1]!;
      const owner = EVIDENCE_SCENARIOS.find((row) => row.id === declaredId);
      if (!owner) {
        errors.push(`unknown scenario id in ${specPath}: ${declaredId}`);
        continue;
      }
      if (owner.spec.path !== specPath) {
        errors.push(`declaration ${declaredId} in ${specPath} belongs in ${owner.spec.path}`);
      }
      if ((declarations.get(declaredId) ?? 0) > 1) {
        errors.push(`duplicate declaration: ${declaredId} in ${specPath}`);
      }
    }
  }
  return errors;
}

export function findRawEvidenceTitles(): string[] {
  const errors: string[] = [];
  for (const file of listE2eSources()) {
    const relative = path.relative(REPO_ROOT, file).replaceAll("\\", "/");
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(RAW_EVIDENCE_TITLE_RE)) {
      errors.push(`hand-written evidence title in ${relative}: ${match[2]}`);
    }
  }
  return errors;
}

export function findUnsafeScreenshotPaths(): string[] {
  const errors: string[] = [];
  for (const file of listE2eSources()) {
    const relative = path.relative(REPO_ROOT, file).replaceAll("\\", "/");
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(SCREENSHOT_PATH_RE)) {
      const screenshotPath = match[2]!;
      if (screenshotPath.includes("docs/research/evidence")) {
        errors.push(`direct tracked output in ${relative}: ${screenshotPath}`);
        continue;
      }
      if (!screenshotPath.includes("e2e-screenshots")) {
        continue;
      }
      const normalized = screenshotPath.replace(/\$\{[^}]+\}/g, "segment");
      try {
        assertSafeReviewOutputPath(normalized);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`unsafe review output in ${relative}: ${screenshotPath} (${message})`);
      }
    }
  }
  return errors;
}

function specCapturesScenarioScene(
  specSource: string,
  scenarioId: ScenarioId,
  sceneId: string,
): boolean {
  if (!specSource.includes(`"${sceneId}"`)) {
    return false;
  }
  const blocks = specSource.match(/captureReviewScene\s*\([\s\S]*?\)/g) ?? [];
  return blocks.some(
    (block) => block.includes(`"${scenarioId}"`) && block.includes(`"${sceneId}"`),
  );
}

export function findSceneEmissionDrift(): string[] {
  const errors: string[] = [];
  for (const scenario of registeredEvidenceScenarios()) {
    const specSource = readSource(scenario.spec.path);
    if (!specSource.includes("captureReviewScene") && scenario.reviewScenes.length > 0) {
      errors.push(`scenario ${scenario.id} registers review scenes but never calls captureReviewScene`);
    }
    for (const scene of scenario.reviewScenes) {
      if (!specSource.includes(`"${scene.id}"`)) {
        errors.push(
          `registered review scene ${scenario.id}/${scene.id} has no emission marker in ${scenario.spec.path}`,
        );
      } else if (!specCapturesScenarioScene(specSource, scenario.id, scene.id)) {
        const viaMap =
          specSource.includes("captureReviewScene") &&
          specSource.includes(`"${scenario.id}"`) &&
          specSource.includes(`"${scene.id}"`);
        if (!viaMap) {
          errors.push(
            `registered review scene ${scenario.id}/${scene.id} is not emitted through captureReviewScene in ${scenario.spec.path}`,
          );
        }
      }
      if (scene.durableDestination && !existsSync(path.join(REPO_ROOT, scene.durableDestination))) {
        errors.push(
          `missing final durable source at ${scene.durableDestination} for ${scenario.id}/${scene.id}`,
        );
      }
    }
  }
  return errors;
}

export function findDocsCitationDrift(): string[] {
  const doc = readFileSync(ACCEPTANCE_EVIDENCE_DOC, "utf8");
  const catalog = new Set<string>(EVIDENCE_SLUG_CATALOG);
  const reviewArtifactOnly = new Set<string>(EVIDENCE_REVIEW_ARTIFACT_ONLY_SLUGS);
  const errors: string[] = [];
  for (const match of doc.matchAll(DOCS_EVIDENCE_SLUG_RE)) {
    const slug = match[1]!.trim();
    if (slug === "<slug>") {
      continue;
    }
    if (reviewArtifactOnly.has(slug)) {
      continue;
    }
    if (!catalog.has(slug)) {
      errors.push(`acceptance-guide cites unknown registry slug: evidence: ${slug}`);
    }
  }
  return errors;
}

export function findScenarioSlugCatalogDrift(): string[] {
  const catalogSlugs = new Set<string>(EVIDENCE_SLUG_CATALOG);
  const used = new Set<string>();
  const errors: string[] = [];
  for (const scenario of registeredEvidenceScenarios()) {
    for (const slug of scenario.slugs) {
      if (!catalogSlugs.has(slug)) {
        errors.push(`unknown slug ${slug} on scenario ${scenario.id}`);
      }
      used.add(slug);
    }
  }
  const citationOnly = new Set<string>(EVIDENCE_CITATION_ONLY_SLUGS);
  for (const slug of EVIDENCE_SLUG_CATALOG) {
    if (!used.has(slug) && !citationOnly.has(slug)) {
      errors.push(`orphan catalog slug ${slug}`);
    }
  }
  return errors;
}
