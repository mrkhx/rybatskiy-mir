import type { Season, TimeOfDay, WeatherKind } from "./types";
import type { Rng } from "./rng";

export type HarvestClock = {
  season: Season;
  timeOfDay: TimeOfDay;
  weather: WeatherKind;
  temperatureC: number;
};

export type HarvestPatchSeed = {
  id: string;
  waterbodyId: string;
  slug: string;
  name: string;
  kind: string;
  description: string;
  soilType: string;
  biotope: string;
  maxStock: number;
  regenerationPerHour: number;
  qualityPotential: number;
  requiredSkill: number;
  tools: string[];
  seasons: Season[];
  yields: Array<{ itemId: string; weight: number; minSkill: number; qty: [number, number] }>;
  weatherBonus: Partial<Record<WeatherKind, number>>;
};

export const HARVEST_PATCHES: HarvestPatchSeed[] = [
  {
    id: "lawn-trail",
    waterbodyId: "forest-lake",
    slug: "lawn-trail",
    name: "Влажная тропа",
    kind: "lawn",
    description: "Трава у тропы к мостику. После дождя выползки.",
    soilType: "loam",
    biotope: "lawn",
    maxStock: 18,
    regenerationPerHour: 2.2,
    qualityPotential: 0.7,
    requiredSkill: 1,
    tools: ["shovel"],
    seasons: ["SPRING", "SUMMER", "AUTUMN"],
    yields: [
      { itemId: "worm", weight: 1, minSkill: 1, qty: [2, 5] },
      { itemId: "crawler", weight: 0.35, minSkill: 4, qty: [1, 2] },
    ],
    weatherBonus: { RAIN: 1.5, DOWNPOUR: 1.7, CLEAR: 0.7 },
  },
  {
    id: "silt-reeds",
    waterbodyId: "forest-lake",
    slug: "silt-reeds",
    name: "Ил у камыша",
    kind: "silt",
    description: "Мягкое дно. Мотыль — ситом, не лопатой.",
    soilType: "silt",
    biotope: "silt",
    maxStock: 12,
    regenerationPerHour: 1.1,
    qualityPotential: 0.85,
    requiredSkill: 7,
    tools: ["sieve"],
    seasons: ["SPRING", "SUMMER", "AUTUMN"],
    yields: [{ itemId: "bloodworm", weight: 1, minSkill: 7, qty: [3, 8] }],
    weatherBonus: { CALM: 1.15, OVERCAST: 1.1, STORM: 0.6 },
  },
  {
    id: "grove-roots",
    waterbodyId: "forest-lake",
    slug: "grove-roots",
    name: "Корни у сосен",
    kind: "roots",
    description: "Корневая зона. Личинка майского жука — не на каждом шагу.",
    soilType: "forest",
    biotope: "trees",
    maxStock: 8,
    regenerationPerHour: 0.45,
    qualityPotential: 0.9,
    requiredSkill: 10,
    tools: ["shovel"],
    seasons: ["SPRING", "SUMMER"],
    yields: [
      { itemId: "worm", weight: 0.4, minSkill: 1, qty: [1, 3] },
      { itemId: "chafer-larva", weight: 0.7, minSkill: 10, qty: [1, 2] },
      { itemId: "may-beetle", weight: 0.5, minSkill: 13, qty: [1, 2] },
    ],
    weatherBonus: { CLEAR: 0.8, CALM: 1, OVERCAST: 1.1 },
  },
  {
    id: "flood-meadow",
    waterbodyId: "forest-lake",
    slug: "flood-meadow",
    name: "Пойменный луг",
    kind: "floodplain",
    description: "Рыхлая влажная земля. Медведка — редкий трофей землекопа.",
    soilType: "flood",
    biotope: "floodplain",
    maxStock: 6,
    regenerationPerHour: 0.28,
    qualityPotential: 0.95,
    requiredSkill: 13,
    tools: ["shovel"],
    seasons: ["SPRING", "SUMMER"],
    yields: [
      { itemId: "worm", weight: 0.3, minSkill: 1, qty: [1, 2] },
      { itemId: "mole-cricket", weight: 1, minSkill: 13, qty: [1, 1] },
    ],
    weatherBonus: { RAIN: 1.35, DOWNPOUR: 1.2, CLEAR: 0.55 },
  },
];

export function regenerateStock(stock: number, max: number, perHour: number, elapsedHours: number): number {
  if (elapsedHours <= 0) return stock;
  return Math.min(max, stock + perHour * elapsedHours);
}

export function harvestOnce(
  patch: HarvestPatchSeed,
  stock: number,
  clock: HarvestClock,
  skill: number,
  toolId: string,
  rng: Rng,
): { ok: false; reason: string } | { ok: true; itemId: string; qty: number; quality: string; stockAfter: number } {
  if (!patch.tools.includes(toolId)) {
    return { ok: false, reason: toolId === "sieve" ? "Нужно сито" : "Нужна лопата" };
  }
  if (!patch.seasons.includes(clock.season)) {
    return { ok: false, reason: "В этом сезоне участок пуст" };
  }
  if (skill < patch.requiredSkill) {
    return { ok: false, reason: "Навык добычи пока слабоват для этого места" };
  }
  if (stock < 1) {
    return { ok: false, reason: "Участок почти истощён — дайте ему восстановиться" };
  }

  if (patch.id === "grove-roots" && clock.timeOfDay !== "EVENING" && clock.timeOfDay !== "DUSK" && clock.timeOfDay !== "NIGHT") {
    const larvaOnly = patch.yields.filter((y) => y.itemId !== "may-beetle");
    return rollYield({ ...patch, yields: larvaOnly }, stock, clock, skill, rng);
  }

  return rollYield(patch, stock, clock, skill, rng);
}

function rollYield(
  patch: HarvestPatchSeed,
  stock: number,
  clock: HarvestClock,
  skill: number,
  rng: Rng,
): { ok: true; itemId: string; qty: number; quality: string; stockAfter: number } {
  const weatherMul = patch.weatherBonus[clock.weather] ?? 1;
  const nightCrawler =
    clock.timeOfDay === "NIGHT" && (clock.weather === "RAIN" || clock.weather === "DOWNPOUR") ? 1.6 : 1;
  const eligible = patch.yields.filter((y) => skill >= y.minSkill);
  const pool = eligible.map((y) => ({
    ...y,
    weight: y.weight * (y.itemId === "crawler" ? nightCrawler : 1) * (y.itemId === "may-beetle" && clock.season === "SUMMER" ? 1.4 : 1),
  }));
  const total = pool.reduce((s, y) => s + y.weight, 0);
  let pick = rng.next() * total;
  let chosen = pool[0]!;
  for (const y of pool) {
    pick -= y.weight;
    if (pick <= 0) {
      chosen = y;
      break;
    }
  }

  if (chosen.itemId === "may-beetle" && clock.season !== "SUMMER") {
    chosen = pool.find((y) => y.itemId === "chafer-larva") ?? pool.find((y) => y.itemId === "worm") ?? chosen;
  }

  const depletion = stock / patch.maxStock;
  const skillMul = 0.7 + Math.min(skill, 20) * 0.025;
  const raw = chosen.qty[0] + rng.next() * (chosen.qty[1] - chosen.qty[0] + 0.01);
  const qty = Math.max(1, Math.round(raw * weatherMul * skillMul * Math.max(0.35, depletion)));
  const take = Math.min(stock, 1 + qty * 0.35);
  const quality = skill >= 12 && weatherMul >= 1.2 && rng.next() > 0.55 ? "fresh" : "normal";
  return { ok: true, itemId: chosen.itemId, qty, quality, stockAfter: Math.max(0, stock - take) };
}
