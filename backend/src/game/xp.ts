import type { FishTier } from "./types";

const TIER_XP: Record<FishTier, number> = {
  COMMON: 1,
  LARGE: 1.25,
  TROPHY: 1.8,
  RECORD: 2.4,
  LEGENDARY: 4,
};

export function catchXp(input: {
  baseXp: number;
  weightG: number;
  avgWeightG: number;
  tier: FishTier;
  methodBonus: number;
  released: boolean;
  premiumBoost: number;
}): number {
  const size = clamp(input.weightG / Math.max(1, input.avgWeightG), 0.4, 2.6);
  const release = input.released ? 1.15 : 1;
  const raw =
    input.baseXp * size * TIER_XP[input.tier] * (1 + input.methodBonus) * release * (1 + input.premiumBoost);
  return Math.max(1, Math.round(raw));
}

export function xpToNextLevel(level: number): number {
  return Math.round(80 * Math.pow(level, 1.35) + 40);
}

export function applyXp(level: number, xp: number, gained: number): { level: number; xp: number; leveled: boolean } {
  let nextLevel = level;
  let nextXp = xp + gained;
  let leveled = false;
  while (nextXp >= xpToNextLevel(nextLevel)) {
    nextXp -= xpToNextLevel(nextLevel);
    nextLevel += 1;
    leveled = true;
  }
  return { level: nextLevel, xp: nextXp, leveled };
}

export function catchCoins(baseValue: number, weightG: number, avgWeightG: number, premiumBoost: number): number {
  const size = clamp(weightG / Math.max(1, avgWeightG), 0.5, 2.2);
  return Math.max(1, Math.round(baseValue * size * (1 + premiumBoost)));
}

export function skillXpForCatch(tier: FishTier, kept: boolean): number {
  const base = { COMMON: 8, LARGE: 12, TROPHY: 22, RECORD: 36, LEGENDARY: 60 }[tier];
  return kept ? base : Math.round(base * 1.1);
}

export function skillLevelFromXp(xp: number): number {
  return Math.min(20, 1 + Math.floor(Math.max(0, xp) / 40));
}

export function harvestSkillXp(itemId: string): number {
  const map: Record<string, number> = {
    worm: 6,
    maggot: 7,
    crawler: 10,
    bloodworm: 12,
    "chafer-larva": 16,
    "may-beetle": 20,
    "mole-cricket": 22,
  };
  return map[itemId] ?? 8;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
