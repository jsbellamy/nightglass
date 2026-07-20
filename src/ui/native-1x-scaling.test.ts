import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MONSTER_FRAMES, type MonsterSize } from "../core/types";
import { resolveSprite, SPRITE_SOURCES } from "./sprites";

const here = dirname(fileURLToPath(import.meta.url));
const spritesDir = join(here, "../assets/sprites");
const stylesPath = join(here, "../styles.css");

/** PNG IHDR width/height at byte offsets 16 and 20 (big-endian). */
function pngIhdrSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  expect(bytes.toString("ascii", 12, 16)).toBe("IHDR");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

/** Parse one specific `.combatant-sprite` rule — not descendant / state overrides. */
function combatantSpriteRuleSize(
  css: string,
  selector: string,
): { width: number; height: number } {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`^${escaped}\\s*\\{([^}]+)\\}`, "m"));
  expect(match, `${selector} rule`).not.toBeNull();
  const body = match![1]!;
  const width = body.match(/width:\s*(\d+)px/);
  const height = body.match(/height:\s*(\d+)px/);
  expect(width, "width").not.toBeNull();
  expect(height, "height").not.toBeNull();
  return { width: Number(width![1]), height: Number(height![1]) };
}

const TIER_SPRITE_SELECTORS: Record<MonsterSize, string> = {
  medium: ".combatant-sprite",
  small: ".combatant.size-small .combatant-sprite",
  large: ".combatant.size-large .combatant-sprite",
};

describe("native-1× sprite dimensions", () => {
  it("evidence: native-1x-scaling — MONSTER_FRAMES, resolveSprite, PNG IHDR, and per-tier .combatant-sprite rules agree (excluding knockout-collapse transform)", () => {
    const css = readFileSync(stylesPath, "utf8");

    for (const tier of Object.keys(MONSTER_FRAMES) as MonsterSize[]) {
      const [frameWidth, frameHeight] = MONSTER_FRAMES[tier];
      const cssSize = combatantSpriteRuleSize(css, TIER_SPRITE_SELECTORS[tier]);
      expect(cssSize, `CSS for tier ${tier}`).toEqual({ width: frameWidth, height: frameHeight });
    }

    // Deliberate knockout scale lives on `.combatant-stack`, not the sprite rule.
    // A knocked-out sprite legitimately measures 28.16×44.16; this assertion
    // excludes that transformed state by only reading the base CSS rule.
    expect(css).toMatch(
      /\.knockout-collapse\s+\.combatant-stack\s*\{[^}]*transform:\s*scale\(0\.88,\s*0\.92\)/,
    );

    for (const [key, source] of Object.entries(SPRITE_SOURCES)) {
      const [frameWidth, frameHeight] = MONSTER_FRAMES[source.size];
      const resolved = resolveSprite(key);
      expect(resolved.size, `${key} size`).toBe(source.size);
      expect(resolved.width, `${key} resolved width`).toBe(frameWidth);
      expect(resolved.height, `${key} resolved height`).toBe(frameHeight);

      const tierCss = combatantSpriteRuleSize(css, TIER_SPRITE_SELECTORS[source.size]);
      expect(tierCss).toEqual({ width: frameWidth, height: frameHeight });

      const ihdr = pngIhdrSize(readFileSync(join(spritesDir, `${key}.png`)));
      expect(ihdr, `${key} PNG IHDR`).toEqual({ width: frameWidth, height: frameHeight });
    }
  });
});
