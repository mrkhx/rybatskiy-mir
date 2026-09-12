import type { BoilieStats, DietProfile } from "./types";

export function boilieFactor(diet: DietProfile, boilie: BoilieStats, waterTempC: number): number {
  const baitFit = diet.baits.boilies ?? 0.05;
  if (baitFit < 0.2) return 0.08;

  let size = 1;
  if (boilie.sizeMm <= 12) size = 1.12;
  else if (boilie.sizeMm <= 16) size = 1;
  else if (boilie.sizeMm <= 20) size = 0.82;
  else size = 0.62;

  let buoyancy = 1;
  if (boilie.buoyancy === "popup") buoyancy = waterTempC > 18 ? 1.08 : 0.9;
  if (boilie.buoyancy === "wafter") buoyancy = 1.05;
  if (boilie.buoyancy === "soluble") buoyancy = 0.95 + Math.min(0.15, (waterTempC - 10) * 0.02);

  let aroma = 1;
  if (boilie.aroma === "fish" || boilie.aroma === "spicy") aroma = waterTempC < 14 ? 1.12 : 0.9;
  if (boilie.aroma === "sweet" || boilie.aroma === "fruit") aroma = waterTempC >= 16 ? 1.1 : 0.85;

  return clamp(baitFit * size * buoyancy * aroma, 0.05, 1.35);
}

export function snowmanBonus(bottom: BoilieStats, popup: BoilieStats): number {
  if (bottom.buoyancy === "sinking" && popup.buoyancy === "popup") return 1.08;
  return 1;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
