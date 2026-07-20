import type { Content } from "../core/types";
import { MONSTER_FRAMES, type MonsterSize } from "../core/types";
import boss1Url from "../assets/sprites/boss-1.png";
import boss2Url from "../assets/sprites/boss-2.png";
import boss3Url from "../assets/sprites/boss-3.png";
import knightUrl from "../assets/sprites/knight.png";
import pipcapUrl from "../assets/sprites/pipcap.png";
import hunterUrl from "../assets/sprites/hunter.png";
import priestUrl from "../assets/sprites/priest.png";
import wizardUrl from "../assets/sprites/wizard.png";

interface SpriteSource {
  url: string;
  size: MonsterSize;
}

export interface SpriteDef {
  url: string;
  width: number;
  height: number;
  size: MonsterSize;
  /** Stand-in asset pending a named asset slice. */
  interim?: { issue: string; note: string };
  /** Shown under the body when a Class Kit borrows another Character still. */
  interimLabel?: string;
}

/** Declared size tier for every committed still. Dimensions derive from MONSTER_FRAMES. */
export const SPRITE_SOURCES = {
  knight: { url: knightUrl, size: "medium" },
  wizard: { url: wizardUrl, size: "medium" },
  priest: { url: priestUrl, size: "medium" },
  hunter: { url: hunterUrl, size: "medium" },
  pipcap: { url: pipcapUrl, size: "medium" },
  // INTERIM: bosses stay "medium" until their 48x72 art is regenerated.
  "boss-1": { url: boss1Url, size: "medium" },
  "boss-2": { url: boss2Url, size: "medium" },
  "boss-3": { url: boss3Url, size: "medium" },
} as const satisfies Record<string, SpriteSource>;

const KNOWN_SPRITE_KEYS = new Set<string>(Object.keys(SPRITE_SOURCES));

export function resolveSprite(spriteKey: string): SpriteDef {
  if (spriteKey.startsWith("fixture-")) {
    if (spriteKey.includes("boss")) {
      return resolveSprite("boss-1");
    }
    const size: MonsterSize = spriteKey.includes("small") ? "small" : "medium";
    const base = resolveSprite("pipcap");
    if (size === base.size) {
      return base;
    }
    const [width, height] = MONSTER_FRAMES[size];
    return { url: base.url, width, height, size };
  }
  const source = SPRITE_SOURCES[spriteKey as keyof typeof SPRITE_SOURCES];
  if (!source) {
    throw new Error(`Unknown sprite key: ${spriteKey}`);
  }
  const [width, height] = MONSTER_FRAMES[source.size];
  return { url: source.url, width, height, size: source.size };
}

export function collectContentSpriteKeys(content: Content): string[] {
  const keys = new Set<string>();
  for (const classKit of content.classes) {
    keys.add(classKit.id);
  }
  for (const opponent of content.opponents) {
    keys.add(opponent.spriteKey);
  }
  return [...keys].sort();
}

export function isRegisteredSpriteKey(spriteKey: string): boolean {
  if (KNOWN_SPRITE_KEYS.has(spriteKey)) {
    return true;
  }
  if (spriteKey.startsWith("fixture-")) {
    return true;
  }
  return false;
}
