import { biteChance, rollBite } from "./bite";
import { SPECIES_DIETS } from "./diets";
import { fishInterest } from "./interest";
import { mulberry32 } from "./rng";
import type { BiteContext, SpeciesForBite } from "./types";

const crucian: SpeciesForBite = {
  id: "crucian",
  slug: "crucian",
  spotWeight: 1.4,
  baits: ["worm", "bread", "corn"],
  lures: [],
  methods: ["FLOAT", "BOTTOM"],
  legendary: false,
  diet: SPECIES_DIETS.crucian,
  activity: {
    seasons: ["SPRING", "SUMMER", "AUTUMN"],
    times: ["DAWN", "MORNING", "EVENING"],
    weather: ["CLEAR", "PARTLY_CLOUDY", "OVERCAST", "CALM"],
    depthMinM: 0.6,
    depthMaxM: 2.4,
    tempMinC: 10,
    tempMaxC: 26,
  },
};

const pike: SpeciesForBite = {
  ...crucian,
  id: "pike",
  slug: "pike",
  spotWeight: 0.9,
  baits: ["livebait"],
  lures: ["spoon", "twister"],
  methods: ["SPINNING", "FLOAT"],
  diet: SPECIES_DIETS.pike,
  activity: { ...crucian.activity, depthMinM: 1.2, depthMaxM: 4 },
};

const zander: SpeciesForBite = {
  ...pike,
  id: "zander",
  slug: "zander",
  spotWeight: 1.5,
  baits: ["livebait"],
  lures: ["twister", "jig"],
  diet: SPECIES_DIETS.zander,
  activity: {
    seasons: ["SPRING", "AUTUMN", "SUMMER"],
    times: ["DUSK", "NIGHT", "DAWN"],
    weather: ["OVERCAST", "CALM", "FOG"],
    depthMinM: 2.5,
    depthMaxM: 5.5,
    tempMinC: 8,
    tempMaxC: 18,
  },
};

const floatWorm: BiteContext = {
  method: "FLOAT",
  bait: "worm",
  depthM: 1.4,
  season: "SUMMER",
  timeOfDay: "MORNING",
  weather: "CLEAR",
  temperatureC: 18,
  pressureHpa: 1012,
  windKmh: 4,
  waterClarity: 0.7,
  eventMultiplier: 1,
  skillBonus: 0.1,
  baitQuality: 0.8,
};

describe("intelligent bite", () => {
  it("rewards matching bait, method and conditions", () => {
    const goodRoll = biteChance(crucian, floatWorm).chance;
    const bad = biteChance(crucian, { ...floatWorm, method: "SPINNING", bait: undefined, lure: "spoon", depthM: 8 }).chance;
    expect(goodRoll).toBeGreaterThan(bad * 3);
  });

  it("crucian almost ignores pike spoon", () => {
    const worm = fishInterest(crucian, floatWorm).score;
    const spoon = fishInterest(crucian, { ...floatWorm, method: "SPINNING", bait: undefined, lure: "spoon" }).score;
    expect(spoon).toBeLessThan(0.02);
    expect(worm).toBeGreaterThan(spoon * 8);
  });

  it("pike almost ignores corn", () => {
    const live = fishInterest(pike, { ...floatWorm, method: "FLOAT", bait: "livebait", depthM: 2 }).score;
    const corn = fishInterest(pike, { ...floatWorm, method: "FLOAT", bait: "corn", depthM: 2 }).score;
    expect(corn).toBeLessThan(0.02);
    expect(live).toBeGreaterThan(corn * 8);
  });

  it("zander scores high on jig in the hole at dusk with stepped retrieve", () => {
    const good = fishInterest(zander, {
      method: "SPINNING",
      lure: "jig",
      retrieve: "stepped",
      lureSizeMm: 80,
      depthM: 3.6,
      season: "AUTUMN",
      timeOfDay: "DUSK",
      weather: "OVERCAST",
      temperatureC: 12,
      pressureHpa: 1010,
      windKmh: 6,
      waterClarity: 0.55,
      eventMultiplier: 1,
      skillBonus: 0.15,
      baitQuality: 0.7,
    }).score;
    const bad = fishInterest(zander, {
      ...floatWorm,
      method: "SPINNING",
      lure: "jig",
      retrieve: "fast",
      depthM: 0.6,
      timeOfDay: "DAY",
      weather: "CLEAR",
      temperatureC: 26,
    }).score;
    expect(good).toBeGreaterThan(bad * 4);
    expect(good).toBeGreaterThan(0.04);
  });

  it("wrong depth lowers score sharply", () => {
    const ok = fishInterest(crucian, floatWorm).score;
    const deep = fishInterest(crucian, { ...floatWorm, depthM: 5.5 }).score;
    expect(deep).toBeLessThan(ok * 0.3);
  });

  it("matching groundbait helps and overfeed hurts", () => {
    const base = fishInterest(crucian, floatWorm).score;
    const fed = fishInterest(crucian, { ...floatWorm, groundbaitAttraction: 0.8, groundbaitFit: 0.7, groundbaitSaturation: 0.2 }).score;
    const stuffed = fishInterest(crucian, { ...floatWorm, groundbaitAttraction: 0.8, groundbaitFit: 0.7, groundbaitSaturation: 0.95 }).score;
    expect(fed).toBeGreaterThan(base);
    expect(stuffed).toBeLessThan(fed);
  });

  it("wrong groundbait barely helps", () => {
    const fed = fishInterest(crucian, { ...floatWorm, groundbaitAttraction: 0.9, groundbaitFit: 1, groundbaitSaturation: 0.2 }).score;
    const other = fishInterest(crucian, { ...floatWorm, groundbaitAttraction: 0.9, groundbaitFit: 0.1, groundbaitSaturation: 0.2 }).score;
    expect(fed).toBeGreaterThan(other);
  });

  it("good retrieve beats a fast one for zander", () => {
    const ctx = {
      method: "SPINNING" as const,
      lure: "jig",
      lureSizeMm: 70,
      depthM: 3.4,
      season: "AUTUMN" as const,
      timeOfDay: "NIGHT" as const,
      weather: "OVERCAST" as const,
      temperatureC: 11,
      pressureHpa: 1011,
      windKmh: 5,
      waterClarity: 0.5,
      eventMultiplier: 1,
      skillBonus: 0.1,
      baitQuality: 0.7,
    };
    const stepped = fishInterest(zander, { ...ctx, retrieve: "stepped" }).score;
    const fast = fishInterest(zander, { ...ctx, retrieve: "fast" }).score;
    expect(stepped).toBeGreaterThan(fast);
  });

  it("can produce zero candidates in bad conditions", () => {
    const roll = rollBite(mulberry32(9), [crucian, pike], {
      ...floatWorm,
      method: "SPINNING",
      lure: "jig",
      retrieve: "fast",
      depthM: 7,
      season: "WINTER",
      timeOfDay: "DAY",
      weather: "STORM",
      temperatureC: -6,
    });
    expect(roll.species).toBeNull();
    expect(roll.noBite || roll.chance === 0).toBe(true);
  });

  it("makes legendary fish much rarer", () => {
    const normal = biteChance(pike, { ...floatWorm, method: "SPINNING", lure: "spoon", bait: undefined, retrieve: "twitch", depthM: 2 }).chance;
    const legend = biteChance(
      { ...pike, legendary: true },
      { ...floatWorm, method: "SPINNING", lure: "spoon", bait: undefined, retrieve: "twitch", depthM: 2 },
    ).chance;
    expect(legend).toBeLessThan(normal * 0.2);
  });

  it("is deterministic", () => {
    const a = rollBite(mulberry32(3), [crucian, pike], floatWorm);
    const b = rollBite(mulberry32(3), [crucian, pike], floatWorm);
    expect(a.species?.id).toBe(b.species?.id);
    expect(a.delayMs).toBe(b.delayMs);
  });
});
