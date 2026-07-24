/**
 * Per-Ability effect derivation recipes for the presentation slice (#43).
 * Asset manifests live under src/assets/effects/; this file is data only.
 */

export type EffectAnchor = "strike_target" | "lane_travel" | "band";

export interface EffectRecipe {
  stillKey: string;
  /** Derivation ref — key in src/assets/effects/manifest.json */
  frames: string;
  anchor: EffectAnchor;
  anchorDx?: number;
  /** Total derived sequence length in integer ms */
  durationMs: number;
  cuesMs: {
    impact_expected?: number;
    release_projectile?: number;
  };
}

export const effectRecipes: Record<string, EffectRecipe> = {
  // Knight
  "steel-cut": {
    stillKey: "arc-slash",
    frames: "arc-slash",
    anchor: "strike_target",
    anchorDx: -15,
    durationMs: 250,
    cuesMs: { impact_expected: 350 },
  },
  "sweeping-arc": {
    stillKey: "arc-slash",
    frames: "arc-slash-wide",
    anchor: "strike_target",
    anchorDx: -15,
    durationMs: 290,
    cuesMs: { impact_expected: 500 },
  },
  "shield-brace": {
    stillKey: "buff-halo",
    frames: "buff-halo",
    anchor: "strike_target",
    durationMs: 300,
    cuesMs: { impact_expected: 100 },
  },
  "rallying-guard": {
    stillKey: "buff-halo",
    frames: "buff-halo",
    anchor: "strike_target",
    durationMs: 300,
    cuesMs: { impact_expected: 300 },
  },
  "pommel-break": {
    stillKey: "arc-slash",
    frames: "arc-slash",
    anchor: "strike_target",
    anchorDx: -15,
    durationMs: 250,
    cuesMs: { impact_expected: 250 },
  },
  "hold-the-line": {
    stillKey: "buff-halo",
    frames: "buff-halo",
    anchor: "strike_target",
    durationMs: 300,
    cuesMs: { impact_expected: 200 },
  },
  "falling-star": {
    stillKey: "arc-slash",
    frames: "arc-slash-heavy",
    anchor: "strike_target",
    anchorDx: -15,
    durationMs: 330,
    cuesMs: { impact_expected: 700 },
  },
  vanguard: {
    stillKey: "buff-halo",
    frames: "buff-halo",
    anchor: "strike_target",
    durationMs: 300,
    cuesMs: { impact_expected: 400 },
  },
  "sundering-charge": {
    stillKey: "arc-slash",
    frames: "arc-slash-heavy",
    anchor: "strike_target",
    anchorDx: -15,
    durationMs: 330,
    cuesMs: { impact_expected: 700 },
  },
  "aegis-wall": {
    stillKey: "buff-halo",
    frames: "buff-halo",
    anchor: "strike_target",
    durationMs: 300,
    cuesMs: { impact_expected: 400 },
  },
  "titans-cleave": {
    stillKey: "arc-slash",
    frames: "arc-slash-heavy",
    anchor: "strike_target",
    anchorDx: -15,
    durationMs: 330,
    cuesMs: { impact_expected: 800 },
  },

  // Hunter
  "quickshot": {
    stillKey: "arrow-bolt",
    frames: "arrow-bolt",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 300 },
  },
  "pinpoint-shot": {
    stillKey: "arrow-bolt",
    frames: "arrow-bolt",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 650 },
  },
  "barbed-arrow": {
    stillKey: "arrow-bolt",
    frames: "arrow-bolt",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 400 },
  },
  "split-volley": {
    stillKey: "arrow-bolt",
    frames: "arrow-bolt",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 550 },
  },
  "snareburst": {
    stillKey: "arrow-bolt",
    frames: "arrow-bolt",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 450 },
  },
  "heartseeker": {
    stillKey: "arrow-bolt",
    frames: "arrow-bolt",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 850 },
  },
  "moonwire-trap": {
    stillKey: "arrow-bolt",
    frames: "arrow-bolt",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 650 },
  },
  "piercing-rain": {
    stillKey: "arrow-bolt",
    frames: "arrow-bolt",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 650 },
  },
  "twin-fang": {
    stillKey: "arrow-bolt",
    frames: "arrow-bolt",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 800 },
  },
  "death-rain": {
    stillKey: "arrow-bolt",
    frames: "arrow-bolt",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 700 },
  },
  killshot: {
    stillKey: "arrow-bolt",
    frames: "arrow-bolt",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 900 },
  },

  // Wizard
  "arc-spark": {
    stillKey: "spell-bolt",
    frames: "spell-bolt-lightning",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 450 },
  },
  "cinder-bloom": {
    stillKey: "spell-bloom",
    frames: "spell-bloom-fire",
    anchor: "strike_target",
    durationMs: 220,
    cuesMs: { impact_expected: 600 },
  },
  "frost-lance": {
    stillKey: "spell-bolt",
    frames: "spell-bolt-frost",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 800 },
  },
  "prism-ward": {
    stillKey: "buff-halo",
    frames: "buff-halo",
    anchor: "strike_target",
    durationMs: 300,
    cuesMs: { impact_expected: 300 },
  },
  "thunder-ring": {
    stillKey: "spell-bloom",
    frames: "spell-bloom-lightning",
    anchor: "strike_target",
    durationMs: 220,
    cuesMs: { impact_expected: 500 },
  },
  "starfall": {
    stillKey: "spell-bloom",
    frames: "spell-bloom-scaled-fire",
    anchor: "strike_target",
    durationMs: 260,
    cuesMs: { impact_expected: 900 },
  },
  "prismatic-shelter": {
    stillKey: "buff-halo",
    frames: "buff-halo",
    anchor: "strike_target",
    durationMs: 300,
    cuesMs: { impact_expected: 400 },
  },
  "wildfire-sigil": {
    stillKey: "spell-bloom",
    frames: "spell-bloom-scaled-fire",
    anchor: "strike_target",
    durationMs: 260,
    cuesMs: { impact_expected: 700 },
  },
  "absolute-zero": {
    stillKey: "spell-bloom",
    frames: "spell-bloom-scaled-frost",
    anchor: "strike_target",
    durationMs: 260,
    cuesMs: { impact_expected: 650 },
  },
  "comet-fall": {
    stillKey: "spell-bloom",
    frames: "spell-bloom-scaled-fire",
    anchor: "strike_target",
    durationMs: 260,
    cuesMs: { impact_expected: 900 },
  },
  "glacial-prison": {
    stillKey: "spell-bloom",
    frames: "spell-bloom-scaled-frost",
    anchor: "strike_target",
    durationMs: 260,
    cuesMs: { impact_expected: 700 },
  },

  // Priest
  "sun-mote": {
    stillKey: "spell-bolt",
    frames: "spell-bolt-light",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 500 },
  },
  "mending-light": {
    stillKey: "heal-rise",
    frames: "heal-rise",
    anchor: "band",
    durationMs: 390,
    cuesMs: { impact_expected: 450 },
  },
  "dawn-recall": {
    stillKey: "revive-burst",
    frames: "revive-burst",
    anchor: "strike_target",
    durationMs: 360,
    cuesMs: { impact_expected: 1200 },
  },
  "war-hymn": {
    stillKey: "buff-halo",
    frames: "buff-halo",
    anchor: "strike_target",
    durationMs: 300,
    cuesMs: { impact_expected: 400 },
  },
  "judgment": {
    stillKey: "spell-bolt",
    frames: "spell-bolt-light",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 700 },
  },
  "moonwell": {
    stillKey: "heal-rise",
    frames: "heal-rise",
    anchor: "band",
    durationMs: 390,
    cuesMs: { impact_expected: 800 },
  },
  "sunlance": {
    stillKey: "spell-bolt",
    frames: "spell-bolt-light",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 800 },
  },
  benediction: {
    stillKey: "heal-rise",
    frames: "heal-rise",
    anchor: "band",
    durationMs: 390,
    cuesMs: { impact_expected: 700 },
  },
  "dawn-ascendant": {
    stillKey: "revive-burst",
    frames: "revive-burst",
    anchor: "strike_target",
    durationMs: 360,
    cuesMs: { impact_expected: 1200 },
  },
  "radiant-bulwark": {
    stillKey: "heal-rise",
    frames: "heal-rise",
    anchor: "band",
    durationMs: 390,
    cuesMs: { impact_expected: 700 },
  },
  "solar-verdict": {
    stillKey: "spell-bolt",
    frames: "spell-bolt-light",
    anchor: "lane_travel",
    durationMs: 100,
    cuesMs: { release_projectile: 850 },
  },
};

export const CLASS_KIT_ABILITY_IDS = Object.keys(effectRecipes);
