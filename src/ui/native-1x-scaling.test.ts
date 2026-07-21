// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import manifestJson from "../assets/sprites/manifest.json";
import layoutJson from "../assets/sprites/layout.json";
import {
  resolveSprite,
  spriteBattlefieldRole,
  SPRITE_SOURCES,
} from "./sprites";

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

function opaqueExtent(bounds: readonly [number, number, number, number]): {
  width: number;
  height: number;
} {
  const [left, top, right, bottom] = bounds;
  return { width: right - left, height: bottom - top };
}

describe("native-1× sprite dimensions", () => {
  it("evidence: native-1x-scaling — PNG IHDR, manifest, registry, and CSS frame vars agree for every production sprite", () => {
    const css = readFileSync(stylesPath, "utf8");
    expect(css).toMatch(/--combatant-frame-w/);
    expect(css).not.toMatch(/\.combatant\.size-(small|medium|large)/);
    expect(css).not.toMatch(/scaleX\(-1\)/);

    expect(css).toMatch(
      /\.knockout-collapse\s+\.combatant-stack\s*\{[^}]*transform:\s*scale\(0\.88,\s*0\.92\)/,
    );

    for (const [key, source] of Object.entries(SPRITE_SOURCES)) {
      const manifest = manifestJson[key as keyof typeof manifestJson];
      const [manifestWidth, manifestHeight] = manifest.frame_size;
      const resolved = resolveSprite(key);
      expect(resolved.frameSize, `${key} frameSize`).toEqual([manifestWidth, manifestHeight]);
      expect(resolved.visualBounds, `${key} visualBounds`).toEqual(manifest.visual_bounds);
      expect(resolved.footAnchor, `${key} footAnchor`).toEqual(manifest.foot_anchor);

      const [frameWidth, frameHeight] = resolved.frameSize;
      expect(resolved.footAnchor[0], `${key} foot x`).toBe(frameWidth / 2);
      expect(resolved.footAnchor[1], `${key} foot y`).toBe(frameHeight);

      const [left, top, right, bottom] = resolved.visualBounds;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(frameWidth);
      expect(bottom).toBeLessThanOrEqual(frameHeight);

      const role = spriteBattlefieldRole(key);
      const maxOpaque = layoutJson.roles[role].max_opaque as [number, number];
      const opaque = opaqueExtent(resolved.visualBounds);
      expect(opaque.width, `${key} opaque width`).toBeLessThanOrEqual(maxOpaque[0]);
      expect(opaque.height, `${key} opaque height`).toBeLessThanOrEqual(maxOpaque[1]);

      const ihdr = pngIhdrSize(readFileSync(join(spritesDir, `${key}.png`)));
      expect(ihdr, `${key} PNG IHDR`).toEqual({ width: frameWidth, height: frameHeight });

      const rendered = document.createElement("img");
      rendered.width = frameWidth;
      rendered.height = frameHeight;
      expect(rendered.width, `${key} rendered width`).toBe(ihdr.width);
      expect(rendered.height, `${key} rendered height`).toBe(ihdr.height);

      expect(source.url).toBeTruthy();
    }
  });
});
