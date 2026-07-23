import { describe, expect, it } from "vitest";
import effectManifest from "../assets/effects/manifest.json";
import { buildClassKitSlice } from "../data";
import {
  STATUS_EFFECT_GLYPH_IDS,
  effectImageUrl,
  statusEffectGlyphUrl,
} from "./effect-images";

interface ManifestFrame {
  file: string;
}

interface ManifestEntry {
  frames: ManifestFrame[];
}

function manifestFramePaths(): string[] {
  const paths = new Set<string>();
  for (const entry of Object.values(effectManifest as Record<string, ManifestEntry>)) {
    for (const frame of entry.frames) {
      paths.add(frame.file);
    }
  }
  return [...paths].sort();
}

describe("effect image registry", () => {
  it("resolves every manifest frame path to a non-empty bundled URL", () => {
    const paths = manifestFramePaths();
    expect(paths.length).toBeGreaterThan(0);
    for (const relativePath of paths) {
      const url = effectImageUrl(relativePath);
      expect(url, relativePath).toBeTruthy();
      expect(url.length, relativePath).toBeGreaterThan(0);
    }
  });

  it("glyph coverage equals assembled Status Effect ids and every URL resolves", () => {
    const assembledIds = buildClassKitSlice()
      .statuses.map((status) => status.id)
      .sort();
    expect([...STATUS_EFFECT_GLYPH_IDS].sort()).toEqual(assembledIds);
    for (const statusId of STATUS_EFFECT_GLYPH_IDS) {
      const url = statusEffectGlyphUrl(statusId);
      expect(url, statusId).toBeTruthy();
      expect(url.length, statusId).toBeGreaterThan(0);
      expect(url).toBe(effectImageUrl(`status/${statusId}.png`));
    }
  });

  it("throws for an unknown relative path", () => {
    expect(() => effectImageUrl("missing/not-a-real-frame.png")).toThrow(
      /Unknown effect image: missing\/not-a-real-frame\.png/,
    );
  });
});
