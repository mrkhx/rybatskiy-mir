import { SPECIES_DIETS } from "./diets";
import { boilieFactor } from "./boilies";
import type { BiteContext, DietProfile, SpeciesForBite } from "./types";

export const INTEREST_CUTOFF = 0.012;

export type InterestBreakdown = {
  score: number;
  factors: Record<string, number>;
  excluded: boolean;
  weakest: string | null;
};

export function dietFor(species: SpeciesForBite): DietProfile {
  return species.diet ?? SPECIES_DIETS[species.id] ?? SPECIES_DIETS[species.slug] ?? fallbackDiet(species);
}

export function fishInterest(species: SpeciesForBite, ctx: BiteContext): InterestBreakdown {
  const diet = dietFor(species);
  const baitKey = ctx.bait ?? "";
  const lureKey = ctx.lure ?? "";
  const spinning = ctx.method === "SPINNING" || ctx.method === "TROLLING";

  const bait = spinning ? 1 : coeff(diet.baits, baitKey, ctx.bait ? 0.05 : 0.12);
  const lure = spinning ? coeff(diet.lures, lureKey, ctx.lure ? 0.08 : 0.12) : 1;
  const lureSize = spinning ? lureSizeFactor(diet, ctx.lureSizeMm) : 1;
  const retrieve = spinning ? coeff(diet.retrieves, ctx.retrieve ?? "even", 0.35) : 1;
  const boilie = ctx.boilie ? boilieFactor(diet, ctx.boilie, ctx.waterTempC ?? ctx.temperatureC) : 1;

  const factors: Record<string, number> = {
    presence: clamp(species.spotWeight, 0.08, 2.4),
    method: species.methods.includes(ctx.method) ? 1 : 0.04,
    bait,
    lure,
    lureSize,
    retrieve,
    boilie,
    depth: depthFactor(diet, ctx.depthM),
    time: coeff(diet.times, ctx.timeOfDay, 0.22),
    season: coeff(diet.seasons, ctx.season, 0.18),
    weather: coeff(diet.weather, ctx.weather, 0.4),
    temp: tempFactor(species, ctx.temperatureC),
    pressure: pressureFactor(ctx.pressureHpa),
    wind: windFactor(ctx.windKmh),
    clarity: 0.65 + ctx.waterClarity * 0.45,
    groundbait: groundbaitFactor(diet, ctx),
    overfeed: overfeedFactor(ctx.groundbaitSaturation ?? 0),
    pressureSpot: 1 / (1 + (ctx.fishingPressure ?? 0) * 0.45),
    events: ctx.eventMultiplier,
    skill: 1 + ctx.skillBonus,
    quality: 0.82 + ctx.baitQuality * 0.35,
    legendary: species.legendary ? 0.07 : 1,
  };

  let score = 0.28;
  for (const value of Object.values(factors)) score *= value;
  score = clamp(score, 0, 0.94);
  const excluded = score < INTEREST_CUTOFF || (factors.method ?? 1) < 0.1 || (spinning ? lure : bait) < 0.08;
  const weakest = weakestKey(factors);
  return { score: excluded ? 0 : score, factors, excluded, weakest };
}

function fallbackDiet(species: SpeciesForBite): DietProfile {
  const baits: Record<string, number> = {};
  for (const id of species.baits) baits[id] = 1;
  const lures: Record<string, number> = {};
  for (const id of species.lures) lures[id] = 1;
  return {
    baits,
    lures,
    retrieves: { even: 0.6, slow: 0.5, fast: 0.35, stepped: 0.4, twitch: 0.4, pause: 0.45 },
    preferredDepthMin: species.activity.depthMinM,
    preferredDepthMax: species.activity.depthMaxM,
    toleratedDepthMin: Math.max(0.2, species.activity.depthMinM - 0.6),
    toleratedDepthMax: species.activity.depthMaxM + 0.8,
    times: Object.fromEntries(species.activity.times.map((t) => [t, 1])),
    seasons: Object.fromEntries(species.activity.seasons.map((t) => [t, 1])),
    weather: Object.fromEntries(species.activity.weather.map((t) => [t, 1])),
    groundbait: {},
  };
}

function coeff(map: Record<string, number> | Partial<Record<string, number>>, key: string, fallback: number): number {
  if (!key) return fallback;
  const value = map[key];
  return value === undefined ? fallback : value;
}

function depthFactor(diet: DietProfile, depthM: number): number {
  if (depthM >= diet.preferredDepthMin && depthM <= diet.preferredDepthMax) return 1.12;
  if (depthM >= diet.toleratedDepthMin && depthM <= diet.toleratedDepthMax) {
    const prefMid = (diet.preferredDepthMin + diet.preferredDepthMax) / 2;
    const dist = Math.abs(depthM - prefMid);
    return clamp(0.72 - dist * 0.12, 0.28, 0.72);
  }
  return 0.04;
}

function lureSizeFactor(diet: DietProfile, size?: number): number {
  if (!diet.lureSizeMm || size == null) return 1;
  if (size >= diet.lureSizeMm.min && size <= diet.lureSizeMm.max) return 1.08;
  const dist = size < diet.lureSizeMm.min ? diet.lureSizeMm.min - size : size - diet.lureSizeMm.max;
  return clamp(1.08 - dist / 80, 0.25, 1.08);
}

function tempFactor(species: SpeciesForBite, temp: number): number {
  const { tempMinC, tempMaxC } = species.activity;
  if (temp >= tempMinC && temp <= tempMaxC) return 1;
  const dist = temp < tempMinC ? tempMinC - temp : temp - tempMaxC;
  return clamp(1 - dist * 0.08, 0.2, 1);
}

function pressureFactor(hpa: number): number {
  if (hpa >= 1005 && hpa <= 1022) return 1;
  if (hpa < 995 || hpa > 1035) return 0.52;
  return 0.78;
}

function windFactor(kmh: number): number {
  if (kmh < 18) return 1;
  if (kmh < 32) return 0.72;
  return 0.42;
}

function groundbaitFactor(diet: DietProfile, ctx: BiteContext): number {
  const attraction = ctx.groundbaitAttraction ?? 0;
  if (attraction <= 0) return 1;
  const mixFit = ctx.groundbaitMix ? (diet.groundbait[ctx.groundbaitMix] ?? 0.12) : 0.4;
  const fit = ctx.groundbaitFit ?? mixFit;
  return clamp(1 + attraction * fit * 0.55, 0.7, 1.7);
}

function overfeedFactor(saturation: number): number {
  if (saturation < 0.55) return 1;
  if (saturation < 0.8) return 0.7;
  return 0.32;
}

function weakestKey(factors: Record<string, number>): string | null {
  let key: string | null = null;
  let min = 1;
  for (const [k, v] of Object.entries(factors)) {
    if (k === "legendary" || k === "events" || k === "skill" || k === "quality") continue;
    if (v < min) {
      min = v;
      key = k;
    }
  }
  return key;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
