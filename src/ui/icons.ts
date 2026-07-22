import type { Content } from "../core/types";
import absoluteZeroUrl from "../assets/icons/absolute-zero.png";
import augerwireLongbowUrl from "../assets/icons/augerwire-longbow.png";
import battleLiturgyUrl from "../assets/icons/battle-liturgy.png";
import benedictionUrl from "../assets/icons/benediction.png";
import berrybrightCharmUrl from "../assets/icons/berrybright-charm.png";
import blackOilLocketUrl from "../assets/icons/black-oil-locket.png";
import bramblesongBowUrl from "../assets/icons/bramblesong-bow.png";
import combineplateHarnessUrl from "../assets/icons/combineplate-harness.png";
import dawnAscendantUrl from "../assets/icons/dawn-ascendant.png";
import devotionUrl from "../assets/icons/devotion.png";
import dewlightFocusUrl from "../assets/icons/dewlight-focus.png";
import drawWeightUrl from "../assets/icons/draw-weight.png";
import duskthornEdgeUrl from "../assets/icons/duskthorn-edge.png";
import elementalPracticeUrl from "../assets/icons/elemental-practice.png";
import fallingStarUrl from "../assets/icons/falling-star.png";
import feedSackBrigandineUrl from "../assets/icons/feed-sack-brigandine.png";
import fieldcraftUrl from "../assets/icons/fieldcraft.png";
import fletchersEyeUrl from "../assets/icons/fletchers-eye.png";
import fortitudeUrl from "../assets/icons/fortitude.png";
import fryerplateCleaverUrl from "../assets/icons/fryerplate-cleaver.png";
import glassweaveUrl from "../assets/icons/glassweave.png";
import gloamberryLocketUrl from "../assets/icons/gloamberry-locket.png";
import halcyonLanternUrl from "../assets/icons/halcyon-lantern.png";
import harvestWarningLanternUrl from "../assets/icons/harvest-warning-lantern.png";
import heartseekerUrl from "../assets/icons/heartseeker.png";
import holdTheLineUrl from "../assets/icons/hold-the-line.png";
import huskstringRecurveUrl from "../assets/icons/huskstring-recurve.png";
import ironDisciplineUrl from "../assets/icons/iron-discipline.png";
import leafmailVestUrl from "../assets/icons/leafmail-vest.png";
import leylineAttunementUrl from "../assets/icons/leyline-attunement.png";
import moonpetalRelicUrl from "../assets/icons/moonpetal-relic.png";
import moonwellUrl from "../assets/icons/moonwell.png";
import moonwireTrapUrl from "../assets/icons/moonwire-trap.png";
import mustardSkyDynamoUrl from "../assets/icons/mustard-sky-dynamo.png";
import neonstormCoilUrl from "../assets/icons/neonstorm-coil.png";
import nightvineLongbowUrl from "../assets/icons/nightvine-longbow.png";
import piercingRainUrl from "../assets/icons/piercing-rain.png";
import plumweaveAegisUrl from "../assets/icons/plumweave-aegis.png";
import prismaticShelterUrl from "../assets/icons/prismatic-shelter.png";
import radiantStudyUrl from "../assets/icons/radiant-study.png";
import redBeaconTokenUrl from "../assets/icons/red-beacon-token.png";
import roadsideReliquaryUrl from "../assets/icons/roadside-reliquary.png";
import starfallUrl from "../assets/icons/starfall.png";
import starfruitPrismUrl from "../assets/icons/starfruit-prism.png";
import sunderingChargeUrl from "../assets/icons/sundering-charge.png";
import sunlanceUrl from "../assets/icons/sunlance.png";
import sunwardingUrl from "../assets/icons/sunwarding.png";
import swordcraftUrl from "../assets/icons/swordcraft.png";
import thornquillBladeUrl from "../assets/icons/thornquill-blade.png";
import threshertoothBladeUrl from "../assets/icons/threshertooth-blade.png";
import twinFangUrl from "../assets/icons/twin-fang.png";
import vanguardUrl from "../assets/icons/vanguard.png";
import veteransEdgeUrl from "../assets/icons/veterans-edge.png";
import wardingLoreUrl from "../assets/icons/warding-lore.png";
import wayfarersWardUrl from "../assets/icons/wayfarers-ward.png";
import wildfireSigilUrl from "../assets/icons/wildfire-sigil.png";

export const CONTENT_ICON_SIZE = 34;
export const CHROME_ICON_SIZE = 16;

export interface IconDef {
  url: string;
  width: number;
  height: number;
}

interface IconSource {
  url: string;
  width: number;
  height: number;
}

/** Declared native-1× dimensions for every committed Equipment Base and Talent icon. */
export const ICON_SOURCES = {
  "absolute-zero": { url: absoluteZeroUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "augerwire-longbow": { url: augerwireLongbowUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "battle-liturgy": { url: battleLiturgyUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  benediction: { url: benedictionUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "berrybright-charm": { url: berrybrightCharmUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "black-oil-locket": { url: blackOilLocketUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "bramblesong-bow": { url: bramblesongBowUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "combineplate-harness": { url: combineplateHarnessUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "dawn-ascendant": { url: dawnAscendantUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  devotion: { url: devotionUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "dewlight-focus": { url: dewlightFocusUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "draw-weight": { url: drawWeightUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "duskthorn-edge": { url: duskthornEdgeUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "elemental-practice": { url: elementalPracticeUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "falling-star": { url: fallingStarUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "feed-sack-brigandine": { url: feedSackBrigandineUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  fieldcraft: { url: fieldcraftUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "fletchers-eye": { url: fletchersEyeUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  fortitude: { url: fortitudeUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "fryerplate-cleaver": { url: fryerplateCleaverUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  glassweave: { url: glassweaveUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "gloamberry-locket": { url: gloamberryLocketUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "halcyon-lantern": { url: halcyonLanternUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "harvest-warning-lantern": { url: harvestWarningLanternUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  heartseeker: { url: heartseekerUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "hold-the-line": { url: holdTheLineUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "huskstring-recurve": { url: huskstringRecurveUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "iron-discipline": { url: ironDisciplineUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "leafmail-vest": { url: leafmailVestUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "leyline-attunement": { url: leylineAttunementUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "moonpetal-relic": { url: moonpetalRelicUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  moonwell: { url: moonwellUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "moonwire-trap": { url: moonwireTrapUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "mustard-sky-dynamo": { url: mustardSkyDynamoUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "neonstorm-coil": { url: neonstormCoilUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "nightvine-longbow": { url: nightvineLongbowUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "piercing-rain": { url: piercingRainUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "plumweave-aegis": { url: plumweaveAegisUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "prismatic-shelter": { url: prismaticShelterUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "radiant-study": { url: radiantStudyUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "red-beacon-token": { url: redBeaconTokenUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "roadside-reliquary": { url: roadsideReliquaryUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  starfall: { url: starfallUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "starfruit-prism": { url: starfruitPrismUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "sundering-charge": { url: sunderingChargeUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  sunlance: { url: sunlanceUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  sunwarding: { url: sunwardingUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  swordcraft: { url: swordcraftUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "thornquill-blade": { url: thornquillBladeUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "threshertooth-blade": { url: threshertoothBladeUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "twin-fang": { url: twinFangUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  vanguard: { url: vanguardUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "veterans-edge": { url: veteransEdgeUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "warding-lore": { url: wardingLoreUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "wayfarers-ward": { url: wayfarersWardUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "wildfire-sigil": { url: wildfireSigilUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
} as const satisfies Record<string, IconSource>;

const FIXTURE_ICON_ALIASES: Record<string, keyof typeof ICON_SOURCES> = {
  "fixture-blade": "thornquill-blade",
  "fixture-focus": "dewlight-focus",
  "fixture-relic": "moonpetal-relic",
  "fixture-bow": "bramblesong-bow",
  "fixture-armor": "leafmail-vest",
  "fixture-charm": "berrybright-charm",
  "fixture-blade-ii": "duskthorn-edge",
  "fixture-focus-ii": "starfruit-prism",
  "fixture-relic-ii": "halcyon-lantern",
  "fixture-bow-ii": "nightvine-longbow",
  "fixture-armor-ii": "plumweave-aegis",
  "fixture-charm-ii": "gloamberry-locket",
  "k-fortitude": "fortitude",
  "k-swordcraft": "swordcraft",
  "k-hold-line": "hold-the-line",
  "k-falling-star": "falling-star",
  "w-elemental-practice": "elemental-practice",
  "w-warding-lore": "warding-lore",
  "w-starfall": "starfall",
  "w-shelter": "prismatic-shelter",
  "p-devotion": "devotion",
  "p-blessing": "radiant-study",
  "p-halo": "moonwell",
  "p-benediction": "sunlance",
  "h-fleetness": "draw-weight",
  "h-keen-eye": "fieldcraft",
  "h-trap": "heartseeker",
  "h-rain": "moonwire-trap",
};

function canonicalIconKey(iconKey: string): keyof typeof ICON_SOURCES {
  if (iconKey in ICON_SOURCES) {
    return iconKey as keyof typeof ICON_SOURCES;
  }
  const alias = FIXTURE_ICON_ALIASES[iconKey];
  if (alias) {
    return alias;
  }
  throw new Error(`Unknown equipment icon key: ${iconKey}`);
}

export function registeredIconKeys(): string[] {
  return Object.keys(ICON_SOURCES).sort();
}

export function isRegisteredIconKey(iconKey: string): boolean {
  if (iconKey in ICON_SOURCES) {
    return true;
  }
  return iconKey in FIXTURE_ICON_ALIASES;
}

export function canonicalEquipmentIconKey(iconKey: string): string | null {
  if (iconKey in ICON_SOURCES) {
    return iconKey;
  }
  const alias = FIXTURE_ICON_ALIASES[iconKey];
  return alias ?? null;
}

export function resolveIcon(iconKey: string): IconDef {
  const key = canonicalIconKey(iconKey);
  return ICON_SOURCES[key];
}

export function collectContentEquipmentIconKeys(content: Content): string[] {
  const keys = new Set<string>();
  for (const base of content.equipmentBases) {
    keys.add(base.iconKey);
  }
  return [...keys].sort();
}

export function collectContentTalentIconKeys(content: Content): string[] {
  const keys = new Set<string>();
  for (const classKit of content.classes) {
    for (const tier of [
      classKit.talents,
      ...(classKit.talentTiers ?? []),
    ]) {
      for (const statTalent of tier.statRow) {
        keys.add(statTalent.iconKey);
      }
    }
  }
  for (const ability of content.abilities) {
    if (ability.slot === "talent" && ability.iconKey) {
      keys.add(ability.iconKey);
    }
  }
  return [...keys].sort();
}

export type EquipmentIconTier = "content" | "chrome";

export function createEquipmentIconElement(
  iconKey: string,
  tier: EquipmentIconTier,
  options?: { ariaLabel?: string; extraClass?: string },
): HTMLImageElement {
  const source = resolveIcon(iconKey);
  const size = tier === "content" ? CONTENT_ICON_SIZE : CHROME_ICON_SIZE;
  const tierClass =
    tier === "content" ? "equipment-icon-img--content" : "equipment-icon-img--chrome";
  const img = document.createElement("img");
  img.className = [ "equipment-icon-img", tierClass, options?.extraClass ].filter(Boolean).join(" ");
  img.src = source.url;
  img.alt = "";
  img.width = size;
  img.height = size;
  img.decoding = "async";
  img.dataset["iconKey"] = iconKey;
  if (options?.ariaLabel) {
    img.setAttribute("aria-label", options.ariaLabel);
  }
  return img;
}

export { assertRegisteredContentIcons as assertRegisteredEquipmentIcons } from "./content-icons";
