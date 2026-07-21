import type { Content } from "../core/types";
import boss1Url from "../assets/sprites/boss-1.png";
import boss2Url from "../assets/sprites/boss-2.png";
import boss3Url from "../assets/sprites/boss-3.png";
import knightUrl from "../assets/sprites/knight.png";
import pipcapUrl from "../assets/sprites/pipcap.png";
import hunterUrl from "../assets/sprites/hunter.png";
import priestUrl from "../assets/sprites/priest.png";
import wizardUrl from "../assets/sprites/wizard.png";
import manifestJson from "../assets/sprites/manifest.json";

export interface SpriteGeometry {
  frameSize: readonly [number, number];
  visualBounds: readonly [number, number, number, number];
  footAnchor: readonly [number, number];
}

export interface SpriteDef extends SpriteGeometry {
  url: string;
  /** Stand-in asset pending a named asset slice. */
  interim?: { issue: string; note: string };
  /** Shown under the body when a Class Kit borrows another Character still. */
  interimLabel?: string;
}

interface SpriteSource {
  url: string;
}

type ManifestEntry = {
  frame_size?: unknown;
  visual_bounds?: unknown;
  foot_anchor?: unknown;
};

const SPRITE_MANIFEST = manifestJson as Record<string, ManifestEntry>;

/** URLs only — geometry comes from the sprite manifest. */
export const SPRITE_SOURCES = {
  knight: { url: knightUrl },
  wizard: { url: wizardUrl },
  priest: { url: priestUrl },
  hunter: { url: hunterUrl },
  pipcap: { url: pipcapUrl },
  "boss-1": { url: boss1Url },
  "boss-2": { url: boss2Url },
  "boss-3": { url: boss3Url },
} as const satisfies Record<string, SpriteSource>;

const KNOWN_SPRITE_KEYS = new Set<string>(Object.keys(SPRITE_SOURCES));

const PARTY_SPRITE_KEYS = new Set(["knight", "wizard", "priest", "hunter"]);
const ORDINARY_OPPONENT_SPRITE_KEYS = new Set(["pipcap"]);
const BOSS_SPRITE_KEYS = new Set(["boss-1", "boss-2", "boss-3"]);

/** Test-fixture adapter frame — not a production body profile. */
const FIXTURE_SMALL_FRAME: readonly [number, number] = [24, 32];

function isNumberPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function isBoundsQuad(value: unknown): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((entry) => typeof entry === "number")
  );
}

export function geometryFromManifestEntry(
  spriteKey: string,
  entry: ManifestEntry | undefined,
): SpriteGeometry {
  if (!entry) {
    throw new Error(`Missing manifest entry for sprite key: ${spriteKey}`);
  }
  if (!isNumberPair(entry.frame_size)) {
    throw new Error(`Malformed frame_size for sprite key: ${spriteKey}`);
  }
  if (!isBoundsQuad(entry.visual_bounds)) {
    throw new Error(`Malformed visual_bounds for sprite key: ${spriteKey}`);
  }
  if (!isNumberPair(entry.foot_anchor)) {
    throw new Error(`Malformed foot_anchor for sprite key: ${spriteKey}`);
  }
  const [frameWidth, frameHeight] = entry.frame_size;
  const [left, top, right, bottom] = entry.visual_bounds;
  const [footX, footY] = entry.foot_anchor;
  if (frameWidth <= 0 || frameHeight <= 0) {
    throw new Error(`Invalid frame_size for sprite key: ${spriteKey}`);
  }
  if (left < 0 || top < 0 || right > frameWidth || bottom > frameHeight || right <= left || bottom <= top) {
    throw new Error(`visual_bounds exceed frame_size for sprite key: ${spriteKey}`);
  }
  if (footX !== frameWidth / 2 || footY !== frameHeight) {
    throw new Error(`foot_anchor must be bottom-centre for sprite key: ${spriteKey}`);
  }
  return {
    frameSize: entry.frame_size,
    visualBounds: entry.visual_bounds,
    footAnchor: entry.foot_anchor,
  };
}

function fixtureSpriteGeometry(spriteKey: string): SpriteGeometry {
  if (spriteKey.includes("boss")) {
    return geometryFromManifestEntry("boss-1", SPRITE_MANIFEST["boss-1"]);
  }
  const pipcap = geometryFromManifestEntry("pipcap", SPRITE_MANIFEST["pipcap"]);
  if (!spriteKey.includes("small")) {
    return pipcap;
  }
  const [width, height] = FIXTURE_SMALL_FRAME;
  return {
    frameSize: FIXTURE_SMALL_FRAME,
    visualBounds: [0, 0, width, height],
    footAnchor: [width / 2, height],
  };
}

export function spriteBattlefieldRole(spriteKey: string): "party" | "ordinary_opponent" | "boss" {
  if (PARTY_SPRITE_KEYS.has(spriteKey)) {
    return "party";
  }
  if (BOSS_SPRITE_KEYS.has(spriteKey)) {
    return "boss";
  }
  if (ORDINARY_OPPONENT_SPRITE_KEYS.has(spriteKey)) {
    return "ordinary_opponent";
  }
  throw new Error(`No battlefield role for sprite key: ${spriteKey}`);
}

export function resolveSprite(spriteKey: string): SpriteDef {
  if (spriteKey.startsWith("fixture-")) {
    const geometry = fixtureSpriteGeometry(spriteKey);
    const url = spriteKey.includes("boss")
      ? SPRITE_SOURCES["boss-1"].url
      : SPRITE_SOURCES.pipcap.url;
    return { url, ...geometry };
  }
  const source = SPRITE_SOURCES[spriteKey as keyof typeof SPRITE_SOURCES];
  if (!source) {
    throw new Error(`Unknown sprite key: ${spriteKey}`);
  }
  const geometry = geometryFromManifestEntry(spriteKey, SPRITE_MANIFEST[spriteKey]);
  return { url: source.url, ...geometry };
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
