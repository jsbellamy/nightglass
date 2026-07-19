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
    expect(Object.keys(effectRecipes)).toHaveLength(28);
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
      const entry = manifest[recipe.frames] as { total_ms: number } | undefined;
      expect(entry, `${id} frames ref ${recipe.frames}`).toBeDefined();
      expect(recipe.durationMs).toBe(entry!.total_ms);
    }
  });

  it("references an existing stillKey source family for every recipe", () => {
    const stillKeys = new Set(
      Object.values(effectRecipes).map((recipe: EffectRecipe) => recipe.stillKey),
    );
    expect(stillKeys).toEqual(
      new Set([
        "arc-slash",
        "arrow-bolt",
        "buff-halo",
        "heal-rise",
        "revive-burst",
        "spell-bolt",
        "spell-bloom",
      ]),
    );
  });
});

describe("status glyphs", () => {
  const statusDir = join(dirname(fileURLToPath(import.meta.url)), "../assets/effects/status");

  it("ships eight shape-distinct 7×7 glyphs", () => {
    const expected = [
      "braced",
      "exposed",
      "guarded",
      "inspired",
      "riven",
      "sheltered",
      "stun",
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
