import { describe, expect, it } from "vitest";
import { createEngine } from "../../core/engine";
import { unlockableAbilityIds } from "../../core/pending-edits";
import { availableAbilityIdsForLoadout } from "../../ui/loadout-surface";
import { classKitFor, effectiveTalentState } from "../../ui/snapshot-view";
import { buildContent } from "../index";
import {
  CHARACTER_LOADOUT_EVIDENCE_ABILITY_IDS,
  CHARACTER_LOADOUT_EVIDENCE_POOL_IDS,
  buildCharacterLoadoutEvidenceContent,
} from "./character-loadout-evidence";

describe("character-loadout-evidence fixture", () => {
  it("keeps evidence-only ability ids out of production buildContent", () => {
    const productionIds = new Set(buildContent().abilities.map((ability) => ability.id));
    for (const id of CHARACTER_LOADOUT_EVIDENCE_ABILITY_IDS) {
      expect(productionIds.has(id)).toBe(false);
    }
  });

  it("ships ten distinct pool iconKeys on evidence-only unlocked Knight Core Abilities", () => {
    const content = buildCharacterLoadoutEvidenceContent();
    const poolAbilities = content.abilities.filter((ability) =>
      CHARACTER_LOADOUT_EVIDENCE_POOL_IDS.includes(
        ability.id as (typeof CHARACTER_LOADOUT_EVIDENCE_POOL_IDS)[number],
      ),
    );
    expect(poolAbilities).toHaveLength(10);
    const iconKeys = poolAbilities.map((ability) => ability.iconKey);
    expect(new Set(iconKeys).size).toBe(10);
    for (const iconKey of iconKeys) {
      expect(iconKey).toBeTruthy();
    }
  });

  it("derives ten unslotted strip choices for the default Knight loadout", () => {
    const content = buildCharacterLoadoutEvidenceContent();
    const engine = createEngine(content, undefined, 42);
    const classKit = classKitFor(content, "knight");
    const talentState = effectiveTalentState(engine.snapshot(), "knight");
    const loadout = engine.snapshot().progression.loadouts.knight;
    const pool = availableAbilityIdsForLoadout(
      unlockableAbilityIds(classKit, talentState),
      classKit.basicAbilityId,
      loadout,
    );
    expect(pool).toHaveLength(10);
  });
});
