import type { Content } from "../core/types";
import berrybrightCharmUrl from "../assets/icons/berrybright-charm.png";
import bramblesongBowUrl from "../assets/icons/bramblesong-bow.png";
import dewlightFocusUrl from "../assets/icons/dewlight-focus.png";
import duskthornEdgeUrl from "../assets/icons/duskthorn-edge.png";
import gloamberryLocketUrl from "../assets/icons/gloamberry-locket.png";
import halcyonLanternUrl from "../assets/icons/halcyon-lantern.png";
import leafmailVestUrl from "../assets/icons/leafmail-vest.png";
import moonpetalRelicUrl from "../assets/icons/moonpetal-relic.png";
import nightvineLongbowUrl from "../assets/icons/nightvine-longbow.png";
import plumweaveAegisUrl from "../assets/icons/plumweave-aegis.png";
import starfruitPrismUrl from "../assets/icons/starfruit-prism.png";
import thornquillBladeUrl from "../assets/icons/thornquill-blade.png";

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

/** Declared native-1× dimensions for every committed Equipment Base icon. */
export const ICON_SOURCES = {
  "berrybright-charm": { url: berrybrightCharmUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "bramblesong-bow": { url: bramblesongBowUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "dewlight-focus": { url: dewlightFocusUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "duskthorn-edge": { url: duskthornEdgeUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "gloamberry-locket": { url: gloamberryLocketUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "halcyon-lantern": { url: halcyonLanternUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "leafmail-vest": { url: leafmailVestUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "moonpetal-relic": { url: moonpetalRelicUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "nightvine-longbow": { url: nightvineLongbowUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "plumweave-aegis": { url: plumweaveAegisUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "starfruit-prism": { url: starfruitPrismUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
  "thornquill-blade": { url: thornquillBladeUrl, width: CONTENT_ICON_SIZE, height: CONTENT_ICON_SIZE },
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
