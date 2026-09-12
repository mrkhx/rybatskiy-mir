import { biteChance, rollBite } from "./bite";
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
  spotWeight: 0.4,
  baits: ["livebait"],
  lures: ["spoon", "twister"],
  methods: ["SPINNING"],
  activity: { ...crucian.activity, depthMinM: 1.2, depthMaxM: 4 },
};

const good: BiteContext = {
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

describe("bite formula", () => {
  it("rewards matching bait, method and conditions", () => {
    const goodRoll = biteChance(crucian, good).chance;
    const bad = biteChance(crucian, { ...good, method: "SPINNING", bait: undefined, lure: "spoon", depthM: 8 }).chance;
    expect(goodRoll).toBeGreaterThan(bad * 3);
  });

  it("makes legendary fish much rarer", () => {
    const normal = biteChance(pike, { ...good, method: "SPINNING", lure: "spoon", bait: undefined }).chance;
    const legend = biteChance(
      { ...pike, legendary: true },
      { ...good, method: "SPINNING", lure: "spoon", bait: undefined },
    ).chance;
    expect(legend).toBeLessThan(normal * 0.2);
  });

  it("is deterministic", () => {
    const a = rollBite(mulberry32(3), [crucian, pike], good);
    const b = rollBite(mulberry32(3), [crucian, pike], good);
    expect(a.species?.id).toBe(b.species?.id);
    expect(a.delayMs).toBe(b.delayMs);
  });
});
