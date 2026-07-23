import { cloneSnapshot, type Snapshot } from "../../core/snapshot";
import type { AbilityDef, ClassKitDef, Content } from "../../core/types";
import { createEngine } from "../../core/engine";
import { buildContent } from "../index";

/** Session-storage key set by the evidence harness before navigation. */
export const CHARACTER_LOADOUT_EVIDENCE_SESSION_KEY = "nightglass-evidence-fixture";

/** Registered evidence preset id — must match `EvidenceFixtureId` in evidence-session. */
export const CHARACTER_LOADOUT_EVIDENCE_FIXTURE_ID = "character-loadout-evidence" as const;

/** Evidence-only Core Ability ids; production `buildContent()` must never ship them. */
export const CHARACTER_LOADOUT_EVIDENCE_ABILITY_IDS = [
  "evidence-knight-pool-01",
  "evidence-knight-pool-02",
  "evidence-knight-pool-03",
  "evidence-knight-pool-04",
  "evidence-knight-pool-05",
  "evidence-knight-pool-06",
  "evidence-knight-pool-07",
  "evidence-knight-pool-08",
  "evidence-knight-pool-09",
  "evidence-knight-pool-10",
  "evidence-knight-pool-11",
  "evidence-knight-pool-12",
  "evidence-knight-pool-13",
] as const;

const EVIDENCE_SLOTTED_IDS = [
  "evidence-knight-pool-01",
  "evidence-knight-pool-02",
  "evidence-knight-pool-03",
] as const;

const EVIDENCE_POOL_IDS = [
  "evidence-knight-pool-04",
  "evidence-knight-pool-05",
  "evidence-knight-pool-06",
  "evidence-knight-pool-07",
  "evidence-knight-pool-08",
  "evidence-knight-pool-09",
  "evidence-knight-pool-10",
  "evidence-knight-pool-11",
  "evidence-knight-pool-12",
  "evidence-knight-pool-13",
] as const;

const EVIDENCE_ICON_KEYS = [
  "cinder-bloom",
  "frost-lance",
  "prism-ward",
  "thunder-ring",
  "arc-spark",
  "barbed-arrow",
  "pinpoint-shot",
  "split-volley",
  "snareburst",
  "quickshot",
  "judgment",
  "mending-light",
  "war-hymn",
] as const;

function evidenceCoreAbilities(): AbilityDef[] {
  return CHARACTER_LOADOUT_EVIDENCE_ABILITY_IDS.map((id, index) => ({
    id,
    name: `Evidence Pool ${index + 1}`,
    classId: "knight",
    slot: "core",
    iconKey: EVIDENCE_ICON_KEYS[index]!,
    targeting: { kind: "closest-opponent" },
    effects: [{ kind: "damage", channel: "physical", coefficient: 0.5 }],
    windUpMs: 200,
    recoveryMs: 300,
    cooldownMs: 1000,
  }));
}

/** Ten-choice Character Loadout evidence Content: production slice plus Knight pool stress. */
export function buildCharacterLoadoutEvidenceContent(): Content {
  const production = buildContent();
  const evidenceAbilities = evidenceCoreAbilities();
  return {
    ...production,
    abilities: [...production.abilities, ...evidenceAbilities],
    classes: production.classes.map((classKit) =>
      classKit.id === "knight"
        ? {
            ...classKit,
            coreAbilityIds: [
              ...CHARACTER_LOADOUT_EVIDENCE_ABILITY_IDS,
            ] as unknown as ClassKitDef["coreAbilityIds"],
            defaultLoadout: [...EVIDENCE_SLOTTED_IDS],
          }
        : classKit,
    ),
  };
}

export function readActiveEvidenceFixtureId(): string | null {
  if (import.meta.env.MODE !== "evidence") {
    return null;
  }
  try {
    return sessionStorage.getItem(CHARACTER_LOADOUT_EVIDENCE_SESSION_KEY);
  } catch {
    return null;
  }
}

/** Boot save for the Character Loadout evidence fixture at talents-ready XP. */
export function characterLoadoutEvidenceBootSnapshot(): Snapshot {
  const content = buildCharacterLoadoutEvidenceContent();
  const engine = createEngine(content, undefined, 42);
  engine.advanceBy(1);
  const snapshot = cloneSnapshot(engine.snapshot());
  snapshot.progression.characterXp.knight = 850;
  snapshot.progression.loadouts.knight = [...EVIDENCE_SLOTTED_IDS];
  return snapshot;
}

export const CHARACTER_LOADOUT_EVIDENCE_POOL_IDS = EVIDENCE_POOL_IDS;
export const CHARACTER_LOADOUT_EVIDENCE_ASSIGNMENT_ID = "evidence-knight-pool-04";
