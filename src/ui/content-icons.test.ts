// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { buildContent } from "../data";
import { fixtureContent } from "../core/testing/fixture-content";
import { assertRegisteredContentIcons } from "./content-icons";
import {
  collectContentEquipmentIconKeys,
  collectContentTalentIconKeys,
  isRegisteredIconKey,
} from "./icons";

describe("assertRegisteredContentIcons", () => {
  it("accepts production Content with equipment and talent icon keys", () => {
    expect(() => assertRegisteredContentIcons(buildContent())).not.toThrow();
  });

  it("accepts fixture talent icon keys that resolve through aliases", () => {
    for (const key of collectContentTalentIconKeys(fixtureContent)) {
      expect(isRegisteredIconKey(key)).toBe(true);
    }
    for (const key of collectContentEquipmentIconKeys(fixtureContent)) {
      expect(isRegisteredIconKey(key)).toBe(true);
    }
  });

  it("reports missing registry entries for talent icon keys", () => {
    const content = buildContent();
    const broken = {
      ...content,
      classes: content.classes.map((classKit, index) =>
        index === 0
          ? {
              ...classKit,
              talents: {
                ...classKit.talents,
                statRow: [
                  { ...classKit.talents.statRow[0], iconKey: "missing-talent-icon" },
                  classKit.talents.statRow[1],
                ] as typeof classKit.talents.statRow,
              },
            }
          : classKit,
      ),
    };
    expect(() => assertRegisteredContentIcons(broken)).toThrow(
      /missing-talent-icon/,
    );
  });

  it("does not treat talent-only registry keys as equipment orphans", () => {
    const content = buildContent();
    expect(() => assertRegisteredContentIcons(content)).not.toThrow();
    expect(content.equipmentBases.every((base) => base.iconKey !== "fortitude")).toBe(true);
  });
});
