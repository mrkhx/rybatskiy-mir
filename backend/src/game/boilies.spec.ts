import { boilieFactor, snowmanBonus } from "./boilies";
import { SPECIES_DIETS } from "./diets";
import { fishInterest } from "./interest";
import type { BiteContext, SpeciesForBite } from "./types";

const carpDiet = SPECIES_DIETS.carp!;
const carp: SpeciesForBite = {
  id: "carp",
  slug: "carp",
  spotWeight: 1,
  baits: ["boilies", "corn"],
  lures: [],
  methods: ["FLOAT", "CARP"],
  legendary: false,
  diet: carpDiet,
  activity: {
    seasons: ["SUMMER"],
    times: ["NIGHT", "DAWN"],
    weather: ["CALM"],
    depthMinM: 1.8,
    depthMaxM: 3.8,
    tempMinC: 14,
    tempMaxC: 26,
  },
};

const night: BiteContext = {
  method: "FLOAT",
  bait: "boilies",
  depthM: 2.4,
  season: "SUMMER",
  timeOfDay: "NIGHT",
  weather: "CALM",
  temperatureC: 20,
  pressureHpa: 1012,
  windKmh: 3,
  waterClarity: 0.6,
  eventMultiplier: 1,
  skillBonus: 0.1,
  baitQuality: 0.8,
  waterTempC: 18,
};

describe("boilies", () => {
  it("size changes the contact profile", () => {
    const small = boilieFactor(carpDiet, { sizeMm: 12, buoyancy: "sinking", aroma: "sweet" }, 18);
    const large = boilieFactor(carpDiet, { sizeMm: 24, buoyancy: "sinking", aroma: "sweet" }, 18);
    expect(small).toBeGreaterThan(large);
  });

  it("pop-up differs from sinking", () => {
    const sink = boilieFactor(carpDiet, { sizeMm: 14, buoyancy: "sinking", aroma: "sweet" }, 20);
    const pop = boilieFactor(carpDiet, { sizeMm: 14, buoyancy: "popup", aroma: "sweet" }, 20);
    expect(pop).not.toBe(sink);
  });

  it("snowman is a distinct presentation", () => {
    expect(
      snowmanBonus({ sizeMm: 18, buoyancy: "sinking", aroma: "fish" }, { sizeMm: 12, buoyancy: "popup", aroma: "fruit" }),
    ).toBeGreaterThan(1);
    expect(
      snowmanBonus({ sizeMm: 14, buoyancy: "popup", aroma: "sweet" }, { sizeMm: 12, buoyancy: "popup", aroma: "fruit" }),
    ).toBe(1);
  });

  it("composition and temperature change aroma response", () => {
    const coldFish = boilieFactor(carpDiet, { sizeMm: 16, buoyancy: "sinking", aroma: "fish" }, 11);
    const warmFish = boilieFactor(carpDiet, { sizeMm: 16, buoyancy: "sinking", aroma: "fish" }, 22);
    const warmSweet = boilieFactor(carpDiet, { sizeMm: 16, buoyancy: "sinking", aroma: "sweet" }, 22);
    expect(coldFish).toBeGreaterThan(warmFish);
    expect(warmSweet).toBeGreaterThan(warmFish);
  });

  it("a bad recipe does not become magically best", () => {
    const good = fishInterest(carp, {
      ...night,
      boilie: { sizeMm: 16, buoyancy: "wafter", aroma: "sweet" },
    }).score;
    const junk = fishInterest(carp, {
      ...night,
      bait: "livebait",
      boilie: { sizeMm: 30, buoyancy: "soluble", aroma: "fish" },
    }).score;
    expect(good).toBeGreaterThan(junk);
  });

  it("overfeed still works with carp baits", () => {
    const fed = fishInterest(carp, {
      ...night,
      boilie: { sizeMm: 16, buoyancy: "sinking", aroma: "sweet" },
      groundbaitMix: "groundbait-carp",
      groundbaitAttraction: 0.8,
      groundbaitSaturation: 0.2,
    }).score;
    const stuffed = fishInterest(carp, {
      ...night,
      boilie: { sizeMm: 16, buoyancy: "sinking", aroma: "sweet" },
      groundbaitMix: "groundbait-carp",
      groundbaitAttraction: 0.8,
      groundbaitSaturation: 0.95,
    }).score;
    expect(fed).toBeGreaterThan(stuffed);
  });
});
