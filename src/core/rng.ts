/** mulberry32 step: pure (state) => [nextUniform, nextState]. */
export function mulberry32Step(state: number): [number, number] {
  let value = state >>> 0;
  value += 0x6d2b79f5;
  let t = value;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const next = (t ^ (t >>> 14)) >>> 0;
  return [next / 4294967296, next];
}

export function initialLootRngState(seed?: number): number {
  return (seed ?? 0x5090) >>> 0;
}
