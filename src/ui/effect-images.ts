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
  "hold-the-line",
  "inspired",
  "overdrive",
  "riven",
  "scalded",
  "scorched",
  "shaken",
  "sheltered",
  "stun",
  "warded",
] as const;

export function statusEffectGlyphUrl(statusId: string): string {
  return effectImageUrl(`status/${statusId}.png`);
}
