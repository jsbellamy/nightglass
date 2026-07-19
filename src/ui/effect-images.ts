const EFFECT_IMAGE_URLS = import.meta.glob<string>("../assets/effects/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

export function effectImageUrl(relativePath: string): string {
  const url = EFFECT_IMAGE_URLS[`../assets/effects/${relativePath}`];
  if (!url) {
    throw new Error(`Unknown effect image: ${relativePath}`);
  }
  return url;
}

export const STATUS_EFFECT_GLYPH_IDS = [
  "braced",
  "exposed",
  "guarded",
  "inspired",
  "riven",
  "sheltered",
  "stun",
  "warded",
] as const;

export type StatusEffectGlyphId = (typeof STATUS_EFFECT_GLYPH_IDS)[number];

export function statusEffectGlyphUrl(statusId: string): string {
  return effectImageUrl(`status/${statusId}.png`);
}
