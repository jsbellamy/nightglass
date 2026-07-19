// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { buildContent } from "../data";
import { fixtureContent } from "../core/testing/fixture-content";
import { collectContentSpriteKeys, isRegisteredSpriteKey, resolveSprite } from "./sprites";

describe("sprite registry", () => {
  it("resolves every Content spriteKey including interim Class and Boss fallbacks", () => {
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
    expect(priest.width).toBe(32);
    expect(priest.height).toBe(48);
    expect(priest.url).toContain("priest");
  });

  it("labels hunter interim fallback for asset slice #56", () => {
    const hunter = resolveSprite("hunter");
    expect(hunter.interimLabel).toBe("hunter");
    expect(hunter.interim?.issue).toBe("#56");
  });

  it("maps boss-2 and boss-3 to boss-1 interim fallbacks for asset slice #57", () => {
    const boss2 = resolveSprite("boss-2");
    expect(boss2.interim?.issue).toBe("#57");
    expect(boss2.url).toBe(resolveSprite("boss-1").url);
  });

  it("covers fixture opponent spriteKeys used in Engine tests", () => {
    for (const key of collectContentSpriteKeys(fixtureContent)) {
      expect(isRegisteredSpriteKey(key)).toBe(true);
      expect(() => resolveSprite(key)).not.toThrow();
    }
  });
});
