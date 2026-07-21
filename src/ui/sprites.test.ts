// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { buildContent } from "../data";
import manifestJson from "../assets/sprites/manifest.json";
import { fixtureContent } from "../core/testing/fixture-content";
import {
  collectContentSpriteKeys,
  geometryFromManifestEntry,
  isRegisteredSpriteKey,
  resolveSprite,
  spriteBattlefieldRole,
  SPRITE_SOURCES,
} from "./sprites";

describe("sprite registry", () => {
  it("resolves every Content spriteKey including all acquired Class and Boss stills", () => {
    const keys = collectContentSpriteKeys(buildContent());
    expect(keys).toContain("priest");
    expect(keys).toContain("hunter");
    expect(keys).toContain("boss-2");
    expect(keys).toContain("boss-3");

    for (const key of keys) {
      expect(() => resolveSprite(key)).not.toThrow();
      expect(isRegisteredSpriteKey(key)).toBe(true);
    }
  });

  it("resolves manifest-backed geometry for production sprites", () => {
    const priest = resolveSprite("priest");
    const manifest = manifestJson.priest;
    expect(priest.interim).toBeUndefined();
    expect(priest.interimLabel).toBeUndefined();
    expect(priest.frameSize).toEqual(manifest.frame_size);
    expect(priest.visualBounds).toEqual(manifest.visual_bounds);
    expect(priest.footAnchor).toEqual(manifest.foot_anchor);
    expect(priest.url).toContain("priest");
    expect(spriteBattlefieldRole("priest")).toBe("party");
  });

  it("resolves the acquired Hunter still without an interim label", () => {
    const hunter = resolveSprite("hunter");
    const manifest = manifestJson.hunter;
    expect(hunter.interim).toBeUndefined();
    expect(hunter.interimLabel).toBeUndefined();
    expect(hunter.frameSize).toEqual(manifest.frame_size);
    expect(hunter.visualBounds).toEqual(manifest.visual_bounds);
    expect(hunter.footAnchor).toEqual(manifest.foot_anchor);
    expect(hunter.url).toContain("hunter");
    expect(spriteBattlefieldRole("hunter")).toBe("party");
  });

  it("resolves the acquired Boss stills without interim fallbacks", () => {
    for (const key of ["boss-1", "boss-2", "boss-3"] as const) {
      const boss = resolveSprite(key);
      expect(boss.interim).toBeUndefined();
      expect(boss.interimLabel).toBeUndefined();
      expect(boss.frameSize).toEqual([32, 48]);
      expect(spriteBattlefieldRole(key)).toBe("boss");
      expect(boss.url).toContain(key);
    }
    expect(resolveSprite("boss-2").url).not.toBe(resolveSprite("boss-1").url);
    expect(resolveSprite("boss-3").url).not.toBe(resolveSprite("boss-1").url);
  });

  it("rejects missing or malformed manifest geometry", () => {
    expect(() => geometryFromManifestEntry("missing", undefined)).toThrow(/Missing manifest/);
    expect(() =>
      geometryFromManifestEntry("bad", { frame_size: [32], visual_bounds: [0, 0, 1, 1], foot_anchor: [16, 48] }),
    ).toThrow(/frame_size/);
    expect(() =>
      geometryFromManifestEntry("bad", {
        frame_size: [32, 48],
        visual_bounds: [0, 0, 1],
        foot_anchor: [16, 48],
      }),
    ).toThrow(/visual_bounds/);
    expect(() =>
      geometryFromManifestEntry("bad", {
        frame_size: [32, 48],
        visual_bounds: [0, 0, 32, 48],
        foot_anchor: [0, 0],
      }),
    ).toThrow(/foot_anchor/);
  });

  it("keeps SPRITE_SOURCES URL-only without size tiers", () => {
    for (const source of Object.values(SPRITE_SOURCES)) {
      expect(source).toEqual({ url: source.url });
      expect("size" in source).toBe(false);
    }
  });

  it("uses test-only fixture adapters without public size tiers", () => {
    const small = resolveSprite("fixture-small-grunt");
    expect(small.frameSize).toEqual([24, 32]);
    expect(small.footAnchor).toEqual([12, 32]);
    expect(small.url).toContain("pipcap");

    const bossFixture = resolveSprite("fixture-boss");
    const bossOne = resolveSprite("boss-1");
    expect(bossFixture.frameSize).toEqual(bossOne.frameSize);
    expect(bossFixture.url).toBe(bossOne.url);
  });

  it("covers fixture opponent spriteKeys used in Engine tests", () => {
    for (const key of collectContentSpriteKeys(fixtureContent)) {
      expect(isRegisteredSpriteKey(key)).toBe(true);
      expect(() => resolveSprite(key)).not.toThrow();
    }
  });
});
