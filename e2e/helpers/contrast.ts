/** Relative-luminance contrast helpers for AA checks over computed styles. */

export function parseRGB(s: string): [number, number, number] | null {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m?.[1]) return null;
  const [r, g, b] = m[1].split(",").map((n) => parseFloat(n));
  if (r === undefined || g === undefined || b === undefined) return null;
  return [r, g, b];
}

function relLum([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(
  fg: [number, number, number],
  bg: [number, number, number],
): number {
  const a = relLum(fg);
  const b = relLum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
