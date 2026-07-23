import { test } from "@playwright/test";

type EvidenceTestBody = NonNullable<Parameters<typeof test>[1]>;

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
  | "character-sub-loadout"
  | "character-sub-talents"
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

export const EVIDENCE_SCENARIOS: readonly EvidenceScenario[] = [
  {
    id: "tile-baseline-combat",
    slugs: ["tile-geometry", "native-1x-scaling", "aa-contrast", "effect-image-loading"],
    spec: {
      id: "rendered-evidence:tile-baseline-combat",
      path: "e2e/scenarios/tile.spec.ts",
    },
    fixture: "live-tile",
    reviewScenes: [
      {
        id: "tile-combat",
        durableDestination: "docs/research/evidence/knockout-readability/tile-combat.png",
      },
    ],
    summary:
      "Battle Tile geometry, sprites, contrast, effect frames, status glyphs, and combat feedback at native 1×",
  },
  {
    id: "hold-the-line-status-glyph",
    slugs: ["effect-image-loading"],
    spec: {
      id: "rendered-evidence:hold-the-line-status-glyph",
      path: "e2e/scenarios/tile.spec.ts",
    },
    fixture: "live-tile-seeded-snapshot",
    reviewScenes: [],
    summary: "Hold the Line status glyph loads from a seeded Snapshot without page error",
  },
  {
    id: "tile-five-opponents-drop-clearance",
    slugs: ["tile-geometry"],
    spec: {
      id: "rendered-evidence:tile-five-opponents-drop-clearance",
      path: "e2e/scenarios/tile.spec.ts",
    },
    fixture: "live-tile",
    reviewScenes: [],
    summary: "five Opponents fit the Battle Tile at 1× on a Stage 2 Wave without overlap",
  },
  {
    id: "dock-cross-webview-surfaces",
    slugs: ["cross-webview-delivery", "dock-surfaces"],
    spec: {
      id: "rendered-evidence:dock-cross-webview-surfaces",
      path: "e2e/scenarios/dock.spec.ts",
    },
    fixture: "live-tile-and-dock",
    reviewScenes: [
      { id: "dock-initial" },
      { id: "dock-tab-armory" },
      { id: "dock-tab-character" },
      { id: "dock-tab-stage" },
      { id: "character-sub-loadout" },
      { id: "character-sub-talents" },
      { id: "character-sub-stats" },
    ],
    summary:
      "Management Dock populates from the Battle Tile over a shared bus and cycles Armory, Character, and Stage with Character sub-tab scenes",
  },
  {
    id: "dock-navigation-ownership",
    slugs: ["dock-navigation-ownership"],
    spec: {
      id: "rendered-evidence:dock-navigation-ownership",
      path: "e2e/scenarios/dock.spec.ts",
    },
    fixture: "live-tile-and-dock",
    reviewScenes: [{ id: "dock-navigation-ownership-stage" }],
    summary:
      "Armory and Character share one left rail; Stage has zero rail width; no compact Armory selector",
  },
  {
    id: "armory-collection-compare",
    slugs: ["armory-collection-unequipped", "armory-comparison-popover"],
    spec: {
      id: "rendered-evidence:armory-collection-compare",
      path: "e2e/scenarios/armory.spec.ts",
    },
    fixture: "isolated-dock",
    reviewScenes: [],
    summary:
      "unequipped collection grid and transient comparison popover at dock size",
  },
  {
    id: "armory-drag-density",
    slugs: ["armory-drag-equip-unequip", "armory-density-no-outer-scroll"],
    spec: {
      id: "rendered-evidence:armory-drag-density",
      path: "e2e/scenarios/armory.spec.ts",
    },
    fixture: "isolated-dock",
    reviewScenes: [],
    summary:
      "pointer drag equip and unequip with 800×480 layout without outer-panel scroll",
  },
  {
    id: "equipment-icon-tiers",
    slugs: ["equipment-icon-content-tier", "equipment-icon-chrome-legibility"],
    spec: {
      id: "rendered-evidence:equipment-icon-tiers",
      path: "e2e/scenarios/armory.spec.ts",
    },
    fixture: "isolated-dock",
    reviewScenes: [
      {
        id: "armory-worn-strip",
        durableDestination:
          "docs/research/evidence/124-equipment-icon-consumers/armory-worn-strip.png",
      },
    ],
    summary:
      "Armory grid content-tier geometry and density; worn strip carries the chrome-legibility slug (content tier, explicit change)",
  },
  {
    id: "character-loadout",
    slugs: ["character-loadout-no-scroll", "character-loadout-assignment"],
    spec: {
      id: "rendered-evidence:character-loadout",
      path: "e2e/scenarios/character-loadout.spec.ts",
    },
    fixture: "live-tile-and-dock",
    reviewScenes: [],
    summary:
      "unlocked pool and three slots fit; drag shows valid targets and replace/swap",
  },
  {
    id: "character-information-popovers",
    slugs: ["character-information-popovers"],
    spec: {
      id: "rendered-evidence:character-information-popovers",
      path: "e2e/scenarios/character-loadout.spec.ts",
    },
    fixture: "live-tile-and-dock",
    reviewScenes: [],
    summary:
      "Ability and Talent popovers share hover/focus text, stay in Dock bounds, and stay non-interactive",
  },
  {
    id: "character-stats-breakdown",
    slugs: ["character-stats-breakdown"],
    spec: {
      id: "rendered-evidence:character-stats-breakdown",
      path: "e2e/scenarios/character-progression.spec.ts",
    },
    fixture: "live-tile-and-dock",
    reviewScenes: [{ id: "character-stats-breakdown" }],
    summary:
      "Stats sub-tab order, five totals/source rows, and pending marker fit at 800×480",
  },
  {
    id: "character-talents-actions",
    slugs: ["character-talents-tree-scroll", "talent-direct-actions"],
    spec: {
      id: "rendered-evidence:character-talents-actions",
      path: "e2e/scenarios/character-progression.spec.ts",
    },
    fixture: "live-tile-and-dock",
    reviewScenes: [{ id: "talent-direct-actions" }],
    summary:
      "tile +/−, chosen/rank/gate states, Ability Talent replace, and tree scroll retention",
  },
  {
    id: "five-actor-pools",
    slugs: ["five-actor-pools"],
    spec: { id: "stress:five-actor-pools", path: "e2e/stress.spec.ts" },
    fixture: "live-tile-seeded-snapshot",
    reviewScenes: [{ id: "stage-stress-five-pools" }],
    summary:
      "Stage 3 five-opponent wave renders five actor pools without pool overlap beyond tolerance",
  },
  {
    id: "reduced-motion",
    slugs: ["reduced-motion"],
    spec: { id: "reduced-motion:reduced-motion", path: "e2e/reduced-motion.spec.ts" },
    fixture: "reduced-motion-live-tile",
    reviewScenes: [],
    summary:
      "actor pool stays visible during Action Cycles while lunge/recoil offsets stay disabled",
  },
  {
    id: "keyboard-floor",
    slugs: [],
    spec: { id: "keyboard:keyboard-floor", path: "e2e/keyboard.spec.ts" },
    fixture: "live-tile-and-dock",
    reviewScenes: [],
    summary:
      "Armory → Character → Stage journeys with Loadout assign/swap, Talent +/−, and popover disclosure without pointer",
  },
  {
    id: "contrast-aa-dock-surfaces",
    slugs: ["aa-contrast", "dock-surfaces"],
    spec: {
      id: "contrast:contrast-aa-dock-surfaces",
      path: "e2e/contrast.spec.ts",
    },
    fixture: "live-tile-and-dock",
    reviewScenes: [],
    summary:
      "status line and Dock surfaces meet WCAG AA; scroll affordance appears only when a panel overflows",
  },
  {
    id: "colour-independence",
    slugs: [],
    spec: { id: "contrast:colour-independence", path: "e2e/contrast.spec.ts" },
    fixture: "live-tile",
    reviewScenes: [],
    summary:
      "knockout, rarity, and locked-stage states expose non-colour signals",
  },
] as const;

const scenarioById = new Map(EVIDENCE_SCENARIOS.map((scenario) => [scenario.id, scenario]));

export function evidenceScenarioById(id: ScenarioId): EvidenceScenario {
  const scenario = scenarioById.get(id);
  if (!scenario) {
    throw new Error(`unknown evidence scenario: ${id}`);
  }
  return scenario;
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

export function declareEvidenceScenario(id: ScenarioId, body: EvidenceTestBody): void {
  const scenario = evidenceScenarioById(id);
  test(evidenceScenarioTitle(scenario), body);
}
