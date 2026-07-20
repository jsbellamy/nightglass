import type { Content } from "../core/types";
import boss1Url from "../assets/sprites/boss-1.png";
import knightUrl from "../assets/sprites/knight.png";
import pipcapUrl from "../assets/sprites/pipcap.png";
import hunterUrl from "../assets/sprites/hunter.png";
import priestUrl from "../assets/sprites/priest.png";
import wizardUrl from "../assets/sprites/wizard.png";

export interface SpriteDef {
  url: string;
  width: number;
  height: number;
  /** Stand-in asset pending a named asset slice. */
  interim?: { issue: string; note: string };
  /** Shown under the body when a Class Kit borrows another Character still. */
  interimLabel?: string;
}

interface SpriteSource {
  url: string;
  width: number;
  height: number;
}

/** Declared native-1× dimensions for every committed Character still. */
export const SPRITE_SOURCES = {
  knight: { url: knightUrl, width: 32, height: 48 },
  wizard: { url: wizardUrl, width: 32, height: 48 },
  priest: { url: priestUrl, width: 32, height: 48 },
  hunter: { url: hunterUrl, width: 32, height: 48 },
  pipcap: { url: pipcapUrl, width: 32, height: 48 },
  "boss-1": { url: boss1Url, width: 32, height: 48 },
} as const satisfies Record<string, SpriteSource>;

const KNOWN_SPRITE_KEYS = new Set<string>(Object.keys(SPRITE_SOURCES));

/** Interim #57: later Boss silhouettes reuse boss-1 until acquired. */
function interimBossSprite(spriteKey: "boss-2" | "boss-3"): SpriteDef {
  const source = SPRITE_SOURCES["boss-1"];
  return {
    ...source,
    interim: { issue: "#57", note: `${spriteKey} borrows boss-1.png until Boss asset slice lands` },
  };
}

export function resolveSprite(spriteKey: string): SpriteDef {
  if (spriteKey === "boss-2" || spriteKey === "boss-3") {
    return interimBossSprite(spriteKey);
  }
  if (spriteKey.startsWith("fixture-")) {
    return resolveSprite(spriteKey.includes("boss") ? "boss-1" : "pipcap");
  }
  const source = SPRITE_SOURCES[spriteKey as keyof typeof SPRITE_SOURCES];
  if (!source) {
    throw new Error(`Unknown sprite key: ${spriteKey}`);
  }
  return source;
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
  if (spriteKey === "boss-2" || spriteKey === "boss-3") {
    return true;
  }
  if (spriteKey.startsWith("fixture-")) {
    return true;
  }
  return false;
}
