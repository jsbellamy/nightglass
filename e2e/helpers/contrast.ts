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

export type ContrastSample = {
  selector: string;
  color: string;
  bg: string;
  fontSize: string;
  fontWeight: string;
};

/** Sample foreground text and a glass pixel immediately beneath the text box. */
export async function readTextContrastSample(
  page: import("@playwright/test").Page,
  selector: string,
): Promise<ContrastSample | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) {
      return null;
    }
    const textStyle = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const probeX = rect.left + Math.min(rect.width / 2, Math.max(rect.width - 1, 1));
    const probeY = Math.min(rect.bottom + 1, window.innerHeight - 1);
    const under = document.elementFromPoint(probeX, probeY);
    let bg = under ? getComputedStyle(under).backgroundColor : "rgba(0, 0, 0, 0)";
    if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
      let node: Element | null = el;
      while (node) {
        const candidate = getComputedStyle(node).backgroundColor;
        if (candidate && candidate !== "rgba(0, 0, 0, 0)" && candidate !== "transparent") {
          bg = candidate;
          break;
        }
        node = node.parentElement;
      }
    }
    return {
      selector: sel,
      color: textStyle.color,
      bg,
      fontSize: textStyle.fontSize,
      fontWeight: textStyle.fontWeight,
    };
  }, selector);
}

export function aaFloorForSample(sample: ContrastSample): number {
  const px = Number.parseFloat(sample.fontSize);
  const large = px >= 24 || (px >= 18.66 && Number.parseInt(sample.fontWeight, 10) >= 700);
  return large ? 3 : 4.5;
}

export function assertAaContrast(sample: ContrastSample): number {
  const fg = parseRGB(sample.color);
  const bg = parseRGB(sample.bg);
  if (!fg || !bg) {
    throw new Error(`Could not parse colours for ${sample.selector}`);
  }
  const ratio = contrastRatio(fg, bg);
  const floor = aaFloorForSample(sample);
  if (ratio < floor) {
    throw new Error(`AA contrast ${ratio.toFixed(2)} < ${floor} for ${sample.selector}`);
  }
  return ratio;
}
