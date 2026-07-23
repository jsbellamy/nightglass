// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { buildClassKitSlice, buildContent } from "../data";
import { fixtureContent } from "../core/testing/fixture-content";
import { assertRegisteredContentIcons } from "./content-icons";
import {
  CHROME_ICON_SIZE,
  CONTENT_ICON_SIZE,
  collectContentEquipmentIconKeys,
  collectContentTalentIconKeys,
  createEquipmentIconElement,
  isRegisteredIconKey,
  registeredIconKeys,
  resolveIcon,
} from "./icons";

describe("equipment icon registry", () => {
  it("resolves every production Equipment Base and Talent iconKey with no missing or orphan entries", () => {
    const content = buildContent();
    expect(() => assertRegisteredContentIcons(content)).not.toThrow();

    const equipmentKeys = collectContentEquipmentIconKeys(content);
    const talentKeys = collectContentTalentIconKeys(content);
    expect(equipmentKeys).toHaveLength(24);
    expect(talentKeys).toHaveLength(52);
    expect(registeredIconKeys()).toHaveLength(76);

    for (const key of [...equipmentKeys, ...talentKeys]) {
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
    expect(content.className).toContain("equipment-icon-img--content");
    expect(content.width).toBe(CONTENT_ICON_SIZE);
    expect(content.height).toBe(CONTENT_ICON_SIZE);

    const chrome = createEquipmentIconElement("thornquill-blade", "chrome");
    expect(chrome.className).toContain("equipment-icon-img--chrome");
    expect(chrome.width).toBe(CHROME_ICON_SIZE);
    expect(chrome.height).toBe(CHROME_ICON_SIZE);
  });

  it("resolves every Basic and Core Ability iconKey through production PNGs", () => {
    const classKit = buildClassKitSlice();
    const basicCoreIds = classKit.abilities
      .filter((ability) => ability.slot === "basic" || ability.slot === "core")
      .map((ability) => ability.id)
      .sort();
    expect(basicCoreIds).toHaveLength(20);
    for (const abilityId of basicCoreIds) {
      const ability = classKit.abilities.find((entry) => entry.id === abilityId)!;
      expect(ability.iconKey).toBe(abilityId);
      expect(() => resolveIcon(abilityId)).not.toThrow();
      expect(resolveIcon(abilityId).url).toMatch(/\.png$/);
    }
  });

  it("tags each Equipment icon with a tier-scoped pool identity", () => {
    const content = createEquipmentIconElement("thornquill-blade", "content");
    expect(content.dataset["iconPoolKey"]).toBe("thornquill-blade:content");
    expect(content.dataset["iconKey"]).toBe("thornquill-blade");

    const chrome = createEquipmentIconElement("thornquill-blade", "chrome");
    expect(chrome.dataset["iconPoolKey"]).toBe("thornquill-blade:chrome");
  });
});
