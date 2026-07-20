// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { buildContent } from "../data";
import { MONSTER_FRAMES } from "../core/types";
import { fixtureContent } from "../core/testing/fixture-content";
import { collectContentSpriteKeys, isRegisteredSpriteKey, resolveSprite } from "./sprites";

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

  it("resolves the acquired Priest still without an interim label", () => {
    const priest = resolveSprite("priest");
    expect(priest.interim).toBeUndefined();
    expect(priest.interimLabel).toBeUndefined();
    expect(priest.size).toBe("medium");
    expect(priest.width).toBe(MONSTER_FRAMES.medium[0]);
    expect(priest.height).toBe(MONSTER_FRAMES.medium[1]);
    expect(priest.url).toContain("priest");
  });

  it("resolves the acquired Hunter still without an interim label", () => {
    const hunter = resolveSprite("hunter");
    expect(hunter.interim).toBeUndefined();
    expect(hunter.interimLabel).toBeUndefined();
    expect(hunter.size).toBe("medium");
    expect(hunter.width).toBe(MONSTER_FRAMES.medium[0]);
    expect(hunter.height).toBe(MONSTER_FRAMES.medium[1]);
    expect(hunter.url).toContain("hunter");
  });

  it("resolves the acquired Boss stills without interim fallbacks", () => {
    for (const key of ["boss-1", "boss-2", "boss-3"] as const) {
      const boss = resolveSprite(key);
      expect(boss.interim).toBeUndefined();
      expect(boss.interimLabel).toBeUndefined();
      expect(boss.size).toBe("medium");
      expect(boss.width).toBe(MONSTER_FRAMES.medium[0]);
      expect(boss.height).toBe(MONSTER_FRAMES.medium[1]);
      expect(boss.url).toContain(key);
    }
    expect(resolveSprite("boss-2").url).not.toBe(resolveSprite("boss-1").url);
    expect(resolveSprite("boss-3").url).not.toBe(resolveSprite("boss-1").url);
  });

  it("covers fixture opponent spriteKeys used in Engine tests", () => {
    for (const key of collectContentSpriteKeys(fixtureContent)) {
      expect(isRegisteredSpriteKey(key)).toBe(true);
      expect(() => resolveSprite(key)).not.toThrow();
    }
  });
});
