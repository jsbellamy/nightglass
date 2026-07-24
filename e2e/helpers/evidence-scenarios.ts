import { test } from "@playwright/test";

type EvidenceTestBody = NonNullable<Parameters<typeof test>[1]>;

/** Review-artifact-only citations: valid in the acceptance guide, not Playwright titles. */
export const EVIDENCE_REVIEW_ARTIFACT_ONLY_SLUGS = ["knockout-readability"] as const;

/** Slugs owned by non-Playwright seams but still machine-catalogued for citations. */
export const EVIDENCE_CITATION_ONLY_SLUGS = ["talent-icon-content-tier"] as const;

export const EVIDENCE_SLUG_CATALOG = [
  "tile-geometry",
  "native-1x-scaling",
  "aa-contrast",
  "effect-image-loading",
  "cross-webview-delivery",
  "dock-surfaces",
  "dock-navigation-ownership",
  "armory-collection-unequipped",
  "armory-comparison-popover",
  "armory-drag-equip-unequip",
  "armory-density-no-outer-scroll",
  "equipment-icon-content-tier",
  "equipment-icon-chrome-legibility",
  "character-loadout-no-scroll",
  "character-loadout-assignment",
  "character-information-popovers",
  "character-stats-breakdown",
  "character-talents-tree-scroll",
  "talent-direct-actions",
  "five-actor-pools",
  "reduced-motion",
  ...EVIDENCE_CITATION_ONLY_SLUGS,
] as const;

export type EvidenceSlug = (typeof EVIDENCE_SLUG_CATALOG)[number];

export type ScenarioId =
  | "tile-baseline-combat"
  | "hold-the-line-status-glyph"
  | "tile-five-opponents-drop-clearance"
  | "dock-cross-webview-surfaces"
  | "dock-navigation-ownership"
  | "armory-collection-compare"
  | "armory-drag-density"
  | "equipment-icon-tiers"
  | "character-loadout"
  | "character-information-popovers"
  | "character-stats-breakdown"
  | "character-talents-actions"
  | "five-actor-pools"
  | "reduced-motion"
  | "keyboard-floor"
  | "contrast-aa-dock-surfaces"
  | "colour-independence";

export type EvidenceSpecId =
  | "rendered-evidence:tile-baseline-combat"
  | "rendered-evidence:hold-the-line-status-glyph"
  | "rendered-evidence:tile-five-opponents-drop-clearance"
  | "rendered-evidence:dock-cross-webview-surfaces"
  | "rendered-evidence:dock-navigation-ownership"
  | "rendered-evidence:armory-collection-compare"
  | "rendered-evidence:armory-drag-density"
  | "rendered-evidence:equipment-icon-tiers"
  | "rendered-evidence:character-loadout"
  | "rendered-evidence:character-information-popovers"
  | "rendered-evidence:character-stats-breakdown"
  | "rendered-evidence:character-talents-actions"
  | "stress:five-actor-pools"
  | "reduced-motion:reduced-motion"
  | "keyboard:keyboard-floor"
  | "contrast:contrast-aa-dock-surfaces"
  | "contrast:colour-independence";

export type EvidenceFixtureId =
  | "live-tile"
  | "live-tile-and-dock"
  | "character-loadout-evidence"
  | "isolated-dock"
  | "live-tile-seeded-snapshot"
  | "reduced-motion-live-tile";

export type ReviewSceneId =
  | "tile-combat"
  | "armory-worn-strip"
  | "stage-stress-five-pools"
  | "dock-initial"
  | "dock-tab-armory"
  | "dock-tab-character"
  | "dock-tab-stage"
  | "character-sub-build"
  | "character-sub-stats"
  | "character-stats-breakdown"
  | "talent-direct-actions"
  | "dock-navigation-ownership-stage";

export type ReviewScene = {
  id: ReviewSceneId;
  durableDestination?: string;
};

export type EvidenceScenario = {
  id: ScenarioId;
  slugs: readonly EvidenceSlug[];
  spec: {
    id: EvidenceSpecId;
    path: string;
  };
  fixture: EvidenceFixtureId;
  reviewScenes: readonly ReviewScene[];
  summary: string;
};

const runtimeEvidenceScenarios: EvidenceScenario[] = [];

function assertEvidenceScenarioIdAvailable(id: ScenarioId): void {
  if (runtimeEvidenceScenarios.some((row) => row.id === id)) {
    throw new Error(`duplicate evidence scenario id: ${id}`);
  }
}

export function registeredEvidenceScenarios(): readonly EvidenceScenario[] {
  return runtimeEvidenceScenarios;
}

export function evidenceScenarioTitle(scenario: EvidenceScenario): string {
  if (scenario.slugs.length === 0) {
    if (scenario.id === "keyboard-floor") {
      return `keyboard — ${scenario.summary}`;
    }
    if (scenario.id === "colour-independence") {
      return `colour independence — ${scenario.summary}`;
    }
    return scenario.summary;
  }
  const prefix = scenario.slugs.map((slug) => `evidence: ${slug}`).join(" / ");
  return `${prefix} — ${scenario.summary}`;
}

export function defineEvidenceScenario(scenario: EvidenceScenario, body: EvidenceTestBody): void {
  assertEvidenceScenarioIdAvailable(scenario.id);
  runtimeEvidenceScenarios.push(scenario);
  test(evidenceScenarioTitle(scenario), body);
}
