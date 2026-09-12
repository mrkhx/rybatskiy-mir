import { pickWeighted, type Rng } from "./rng";
import type { BiteContext, SpeciesForBite } from "./types";

export type BiteRoll = {
  delayMs: number;
  chance: number;
  species: SpeciesForBite | null;
  factors: Record<string, number>;
};

export function biteChance(species: SpeciesForBite, ctx: BiteContext): { chance: number; factors: Record<string, number> } {
  const factors: Record<string, number> = {
    abundance: clamp(species.spotWeight, 0.15, 2.2),
    method: species.methods.includes(ctx.method) ? 1 : 0.05,
    bait: baitFactor(species, ctx),
    season: species.activity.seasons.includes(ctx.season) ? 1 : 0.25,
    time: species.activity.times.includes(ctx.timeOfDay) ? 1 : 0.35,
    weather: species.activity.weather.includes(ctx.weather) ? 1 : 0.55,
    depth: depthFactor(species, ctx.depthM),
    temp: tempFactor(species, ctx.temperatureC),
    pressure: pressureFactor(ctx.pressureHpa),
    wind: windFactor(ctx.windKmh),
    clarity: 0.7 + ctx.waterClarity * 0.4,
    events: ctx.eventMultiplier,
    skill: 1 + ctx.skillBonus,
    quality: 0.85 + ctx.baitQuality * 0.3,
    legendary: species.legendary ? 0.08 : 1,
  };

  let chance = 0.22;
  for (const value of Object.values(factors)) chance *= value;
  chance = clamp(chance, 0.005, 0.92);
  return { chance, factors };
}

export function rollBite(rng: Rng, species: SpeciesForBite[], ctx: BiteContext): BiteRoll {
  const scored = species
    .map((s) => {
      const { chance, factors } = biteChance(s, ctx);
      return { species: s, chance, factors, weight: chance };
    })
    .filter((s) => s.chance > 0.01);

  if (scored.length === 0) {
    return { delayMs: 8000 + rng.next() * 6000, chance: 0, species: null, factors: {} };
  }

  const combined = 1 - scored.reduce((acc, s) => acc * (1 - s.chance), 1);
  const delayMs = Math.round(3500 + rng.next() * 14000 * (1.2 - combined));
  if (rng.next() > combined) {
    return { delayMs, chance: combined, species: null, factors: scored[0]!.factors };
  }

  const picked = pickWeighted(rng, scored);
  return { delayMs, chance: combined, species: picked.species, factors: picked.factors };
}

function baitFactor(species: SpeciesForBite, ctx: BiteContext): number {
  if (ctx.method === "SPINNING" || ctx.method === "TROLLING") {
    if (!ctx.lure) return 0.2;
    return species.lures.includes(ctx.lure) ? 1.15 : 0.35;
  }
  if (!ctx.bait) return 0.25;
  return species.baits.includes(ctx.bait) ? 1.2 : 0.4;
}

function depthFactor(species: SpeciesForBite, depthM: number): number {
  const { depthMinM, depthMaxM } = species.activity;
  if (depthM >= depthMinM && depthM <= depthMaxM) return 1.1;
  const dist = depthM < depthMinM ? depthMinM - depthM : depthM - depthMaxM;
  return clamp(1.1 - dist * 0.35, 0.15, 1.1);
}

function tempFactor(species: SpeciesForBite, temp: number): number {
  const { tempMinC, tempMaxC } = species.activity;
  if (temp >= tempMinC && temp <= tempMaxC) return 1;
  return 0.45;
}

function pressureFactor(hpa: number): number {
  if (hpa >= 1005 && hpa <= 1022) return 1;
  if (hpa < 995 || hpa > 1035) return 0.55;
  return 0.8;
}

function windFactor(kmh: number): number {
  if (kmh < 18) return 1;
  if (kmh < 32) return 0.75;
  return 0.45;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
