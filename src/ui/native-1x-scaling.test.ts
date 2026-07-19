import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SPRITE_SOURCES } from "./sprites";

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

/** Parse the base `.combatant-sprite` rule — not descendant / state overrides. */
function combatantSpriteRuleSize(css: string): { width: number; height: number } {
  const match = css.match(
    /^\.combatant-sprite\s*\{([^}]+)\}/m,
  );
  expect(match, ".combatant-sprite rule").not.toBeNull();
  const body = match![1]!;
  const width = body.match(/width:\s*(\d+)px/);
  const height = body.match(/height:\s*(\d+)px/);
  expect(width, "width").not.toBeNull();
  expect(height, "height").not.toBeNull();
  return { width: Number(width![1]), height: Number(height![1]) };
}

describe("native-1× sprite dimensions", () => {
  it("evidence: native-1x-scaling — SPRITE_SOURCES, PNG IHDR, and .combatant-sprite agree at 32×48 (excluding knockout-collapse transform)", () => {
    const css = readFileSync(stylesPath, "utf8");
    const cssSize = combatantSpriteRuleSize(css);
    expect(cssSize).toEqual({ width: 32, height: 48 });

    // Deliberate knockout scale lives on `.combatant-stack`, not the sprite rule.
    // A knocked-out sprite legitimately measures 28.16×44.16; this assertion
    // excludes that transformed state by only reading the base CSS rule.
    expect(css).toMatch(
      /\.knockout-collapse\s+\.combatant-stack\s*\{[^}]*transform:\s*scale\(0\.88,\s*0\.92\)/,
    );

    for (const [key, source] of Object.entries(SPRITE_SOURCES)) {
      expect(source.width, `${key} declared width`).toBe(32);
      expect(source.height, `${key} declared height`).toBe(48);

      const ihdr = pngIhdrSize(readFileSync(join(spritesDir, `${key}.png`)));
      expect(ihdr).toEqual(cssSize);
      expect(ihdr).toEqual({ width: source.width, height: source.height });
    }
  });
});
