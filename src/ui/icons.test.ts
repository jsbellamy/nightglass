// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { buildContent } from "../data";
import { fixtureContent } from "../core/testing/fixture-content";
import { assertRegisteredContentIcons } from "./content-icons";
import {
  CHROME_ICON_SIZE,
  CONTENT_ICON_SIZE,
  collectContentEquipmentIconKeys,
  createEquipmentIconElement,
  isRegisteredIconKey,
  registeredIconKeys,
  resolveIcon,
} from "./icons";

describe("equipment icon registry", () => {
  it("resolves every production Equipment Base iconKey with no missing or orphan entries", () => {
    const content = buildContent();
    expect(() => assertRegisteredContentIcons(content)).not.toThrow();

    const contentKeys = collectContentEquipmentIconKeys(content);
    expect(contentKeys).toHaveLength(12);
    expect(new Set(registeredIconKeys())).toEqual(new Set(contentKeys));

    for (const key of contentKeys) {
      expect(() => resolveIcon(key)).not.toThrow();
      expect(isRegisteredIconKey(key)).toBe(true);
      expect(resolveIcon(key).width).toBe(CONTENT_ICON_SIZE);
      expect(resolveIcon(key).height).toBe(CONTENT_ICON_SIZE);
    }
  });

  it("maps fixture equipment iconKeys used in Engine and UI tests", () => {
    for (const key of collectContentEquipmentIconKeys(fixtureContent)) {
      expect(isRegisteredIconKey(key)).toBe(true);
      expect(() => resolveIcon(key)).not.toThrow();
    }
  });

  it("creates content-tier and chrome-tier icon elements at integer logical sizes", () => {
    const content = createEquipmentIconElement("thornquill-blade", "content");
    expect(content.className).toContain("equipment-icon--content");
    expect(content.width).toBe(CONTENT_ICON_SIZE);
    expect(content.height).toBe(CONTENT_ICON_SIZE);

    const chrome = createEquipmentIconElement("thornquill-blade", "chrome");
    expect(chrome.className).toContain("equipment-icon--chrome");
    expect(chrome.width).toBe(CHROME_ICON_SIZE);
    expect(chrome.height).toBe(CHROME_ICON_SIZE);
  });
});
