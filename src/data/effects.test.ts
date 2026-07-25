import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildClassKitSlice } from "./index";
import {
  CLASS_KIT_ABILITY_IDS,
  effectRecipes,
  type EffectAnchor,
  type EffectRecipe,
} from "./effects";

const classKit = buildClassKitSlice();
const manifest = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../assets/effects/manifest.json"),
    "utf8",
  ),
) as Record<string, { total_ms: number; anchor: string }>;

const LEGAL_ANCHORS = new Set<EffectAnchor>(["strike_target", "lane_travel", "band"]);

function abilityWindUpMs(id: string): number {
  const ability = classKit.abilities.find((entry) => entry.id === id);
  if (!ability) {
    throw new Error(`missing ability ${id}`);
  }
  return ability.windUpMs;
}

describe("effect recipes", () => {
  it("covers every Class Kit ability id exactly once", () => {
    const kitIds = classKit.abilities.map((a) => a.id).sort();
    expect(CLASS_KIT_ABILITY_IDS.sort()).toEqual(kitIds);
    expect(Object.keys(effectRecipes)).toHaveLength(44);
  });

  it("uses only legal anchor kinds and never strike_self", () => {
    for (const [id, recipe] of Object.entries(effectRecipes)) {
      expect(LEGAL_ANCHORS.has(recipe.anchor), `${id} anchor`).toBe(true);
      expect(JSON.stringify(recipe)).not.toContain("strike_self");
    }
  });

  it("keeps cues at integer ms aligned to each ability windUpMs", () => {
    for (const [id, recipe] of Object.entries(effectRecipes)) {
      const windUp = abilityWindUpMs(id);
      if (recipe.anchor === "lane_travel") {
        expect(recipe.cuesMs.release_projectile, id).toBe(windUp);
        expect(recipe.cuesMs.impact_expected).toBeUndefined();
      } else {
        expect(recipe.cuesMs.impact_expected, id).toBe(windUp);
        expect(recipe.cuesMs.release_projectile).toBeUndefined();
      }
      for (const value of Object.values(recipe.cuesMs)) {
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });

  it("points frames at a manifest derivation with matching durationMs", () => {
    for (const [id, recipe] of Object.entries(effectRecipes)) {
      const frameFamilies = [recipe.frames];
      if (recipe.framesByElement) {
        frameFamilies.push(...Object.values(recipe.framesByElement));
      }
      for (const frames of frameFamilies) {
        const entry = manifest[frames] as { total_ms: number } | undefined;
        expect(entry, `${id} frames ref ${frames}`).toBeDefined();
        expect(recipe.durationMs).toBe(entry!.total_ms);
      }
    }
  });

  it("keeps Class Basic Attack effect durations in the 350–500 ms band", () => {
    const basicAttacks = ["steel-cut", "quickshot", "arc-spark", "sun-mote"] as const;
    for (const id of basicAttacks) {
      const recipe = effectRecipes[id]!;
      expect(recipe.durationMs).toBeGreaterThanOrEqual(350);
      expect(recipe.durationMs).toBeLessThanOrEqual(500);
      const entry = manifest[recipe.frames] as { total_ms: number };
      expect(entry.total_ms).toBe(recipe.durationMs);
    }
  });

  it("maps Talent Tier 2 abilities to the exact effect derivation families", () => {
    const tier2Frames: Record<string, string> = {
      vanguard: "buff-halo",
      "sundering-charge": "arc-slash-heavy",
      "wildfire-sigil": "spell-bloom-scaled-fire",
      "absolute-zero": "spell-bloom-scaled-frost",
      benediction: "heal-rise",
      "dawn-ascendant": "revive-burst",
      "piercing-rain": "arrow-bolt",
      "twin-fang": "arrow-bolt",
    };
    for (const [id, frames] of Object.entries(tier2Frames)) {
      expect(effectRecipes[id]?.frames, id).toBe(frames);
    }
  });

  it("maps Knight Talent Tier 3 abilities to the exact effect derivation families", () => {
    expect(effectRecipes["aegis-wall"]?.frames).toBe("aegis-wall");
    expect(effectRecipes["titans-cleave"]?.frames).toBe("titans-cleave");
  });

  it("maps Priest Talent Tier 3 abilities to the exact effect derivation families", () => {
    expect(effectRecipes["radiant-bulwark"]?.frames).toBe("radiant-bulwark");
    expect(effectRecipes["solar-verdict"]?.frames).toBe("solar-verdict");
  });

  it("maps Hunter Talent Tier 3 abilities to the exact effect derivation families", () => {
    expect(effectRecipes["death-rain"]?.frames).toBe("death-rain");
    expect(effectRecipes["killshot"]?.frames).toBe("killshot");
  });

  it("maps Wizard Talent Tier 3 abilities to the exact effect derivation families", () => {
    expect(effectRecipes["comet-fall"]?.frames).toBe("comet-fall");
    expect(effectRecipes["glacial-prison"]?.frames).toBe("glacial-prison");
  });

  it("presents Twin Fang as one arrow-bolt while gameplay applies two damage effects", () => {
    const twinFang = classKit.abilities.find((entry) => entry.id === "twin-fang");
    expect(twinFang).toBeDefined();
    const damageEffects = twinFang!.effects.filter((effect) => effect.kind === "damage");
    expect(damageEffects).toHaveLength(2);
    expect(effectRecipes["twin-fang"]).toMatchObject({
      stillKey: "arrow-bolt",
      frames: "arrow-bolt",
      anchor: "lane_travel",
    });
  });

  it("references an existing stillKey source family for every recipe", () => {
    const stillKeys = new Set(
      Object.values(effectRecipes).map((recipe: EffectRecipe) => recipe.stillKey),
    );
    expect(stillKeys).toEqual(
      new Set([
        "aegis-wall",
        "arc-slash",
        "arrow-bolt",
        "basic-arrow",
        "basic-cut",
        "basic-mote",
        "basic-spark",
        "buff-halo",
        "comet-fall",
        "death-rain",
        "glacial-prison",
        "heal-rise",
        "killshot",
        "radiant-bulwark",
        "revive-burst",
        "solar-verdict",
        "spell-bolt",
        "spell-bloom",
        "titans-cleave",
      ]),
    );
  });
});

describe("status glyphs", () => {
  const statusDir = join(dirname(fileURLToPath(import.meta.url)), "../assets/effects/status");

  it("ships sixteen shape-distinct 7×7 glyphs", () => {
    const expected = [
      "braced",
      "corroded",
      "exposed",
      "guarded",
      "hold-the-line",
      "inspired",
      "overdrive",
      "riven",
      "scalded",
      "scorched",
      "shaken",
      "sheltered",
      "stun",
      "timeslip",
      "tolling",
      "warded",
    ];
    expect(readdirSync(statusDir).filter((f) => f.endsWith(".png")).sort()).toEqual(
      expected.map((id) => `${id}.png`),
    );

    const shapes = expected.map((id) => {
      const bytes = readFileSync(join(statusDir, `${id}.png`));
      // PNG IHDR: width/height at bytes 16-23 for standard PNG layout
      expect(bytes.subarray(16, 24)).toEqual(
        Buffer.from([0, 0, 0, 7, 0, 0, 0, 7]),
      );
      return bytes.toString("base64");
    });
    expect(new Set(shapes).size).toBe(expected.length);
  });
});
