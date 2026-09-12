import type { Rng } from "./rng";
import type { FishTier, Specimen } from "./types";

export type WeightSpecies = {
  id: string;
  minWeightG: number;
  avgWeightG: number;
  maxWeightG: number;
  minLengthCm: number;
  maxLengthCm: number;
  trophyWeightG: number;
  recordWeightG: number;
  legendary: boolean;
};

/**
 * Weight is log-normal around average. Most fish sit near typical size;
 * trophy/record tails are thin. Not uniform(min, max).
 */
export function rollSpecimen(rng: Rng, species: WeightSpecies, trophyBias = 1): Specimen {
  if (species.legendary) {
    const weightG = Math.round(species.recordWeightG + rng.next() * (species.maxWeightG - species.recordWeightG));
    return {
      speciesId: species.id,
      weightG,
      lengthCm: lengthFromWeight(species, weightG),
      tier: "LEGENDARY",
    };
  }

  const sigma = 0.28 / Math.sqrt(trophyBias);
  const mu = Math.log(species.avgWeightG);
  let weightG = Math.round(Math.exp(mu + sigma * gaussian(rng)));
  weightG = clamp(weightG, species.minWeightG, species.maxWeightG);

  const roll = rng.next() / trophyBias;
  if (roll > 0.997 && weightG < species.recordWeightG) {
    weightG = clamp(
      Math.round(species.recordWeightG + rng.next() * (species.maxWeightG - species.recordWeightG) * 0.4),
      species.minWeightG,
      species.maxWeightG,
    );
  } else if (roll > 0.97 && weightG < species.trophyWeightG) {
    weightG = clamp(
      Math.round(species.trophyWeightG + rng.next() * (species.recordWeightG - species.trophyWeightG) * 0.5),
      species.minWeightG,
      species.maxWeightG,
    );
  }

  return {
    speciesId: species.id,
    weightG,
    lengthCm: lengthFromWeight(species, weightG),
    tier: classifyTier(species, weightG),
  };
}

export function classifyTier(species: WeightSpecies, weightG: number): FishTier {
  if (species.legendary) return "LEGENDARY";
  if (weightG >= species.recordWeightG) return "RECORD";
  if (weightG >= species.trophyWeightG) return "TROPHY";
  if (weightG >= species.avgWeightG * 1.35) return "LARGE";
  return "COMMON";
}

export function lengthFromWeight(species: WeightSpecies, weightG: number): number {
  const t =
    (weightG - species.minWeightG) / Math.max(1, species.maxWeightG - species.minWeightG);
  return Math.round(species.minLengthCm + t * (species.maxLengthCm - species.minLengthCm));
}

function gaussian(rng: Rng): number {
  const u = Math.max(rng.next(), 1e-9);
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
