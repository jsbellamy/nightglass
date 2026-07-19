export function levelFromXp(xp: number, thresholds: number[]): number {
  let level = 1;
  for (let index = thresholds.length - 1; index >= 0; index -= 1) {
    if (xp >= thresholds[index]!) {
      level = index + 1;
      break;
    }
  }
  return Math.min(level, thresholds.length);
}

export function reserveXpAward(opponentAward: number): number {
  return Math.floor(opponentAward / 2);
}

export function awardXp(
  currentXp: number,
  amount: number,
  thresholds: number[],
): { totalXp: number; previousLevel: number; newLevel: number } {
  const previousLevel = levelFromXp(currentXp, thresholds);
  const totalXp = currentXp + amount;
  const newLevel = levelFromXp(totalXp, thresholds);
  return { totalXp, previousLevel, newLevel };
}
