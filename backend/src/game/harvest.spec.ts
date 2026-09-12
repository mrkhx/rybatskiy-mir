import { HARVEST_PATCHES, harvestOnce, regenerateStock } from "./harvest";
import { mulberry32 } from "./rng";
import type { HarvestClock } from "./harvest";

const lawn = HARVEST_PATCHES.find((p) => p.id === "lawn-trail")!;
const silt = HARVEST_PATCHES.find((p) => p.id === "silt-reeds")!;
const grove = HARVEST_PATCHES.find((p) => p.id === "grove-roots")!;
const meadow = HARVEST_PATCHES.find((p) => p.id === "flood-meadow")!;

const summerMorning: HarvestClock = {
  season: "SUMMER",
  timeOfDay: "MORNING",
  weather: "OVERCAST",
  temperatureC: 18,
};

describe("bait harvesting", () => {
  it("decreases stock and is not infinite", () => {
    let stock = lawn.maxStock;
    const rng = mulberry32(4);
    let empty = false;
    for (let i = 0; i < 40; i += 1) {
      const row = harvestOnce(lawn, stock, summerMorning, 5, "shovel", rng);
      if (!row.ok) {
        expect(row.reason).toMatch(/истощён/);
        empty = true;
        break;
      }
      expect(row.stockAfter).toBeLessThan(stock);
      stock = row.stockAfter;
    }
    expect(empty || stock < 1).toBe(true);
  });

  it("regenerates over time", () => {
    const after = regenerateStock(2, 18, 2.2, 4);
    expect(after).toBeGreaterThan(2);
    expect(after).toBeLessThanOrEqual(18);
  });

  it("rain helps lawn crawlers, drought hurts", () => {
    const rain = harvestOnce(lawn, 18, { ...summerMorning, timeOfDay: "NIGHT", weather: "RAIN" }, 6, "shovel", mulberry32(2));
    const dry = harvestOnce(lawn, 18, { ...summerMorning, weather: "CLEAR" }, 6, "shovel", mulberry32(2));
    expect(rain.ok && dry.ok).toBe(true);
    if (rain.ok && dry.ok) expect(rain.qty).toBeGreaterThanOrEqual(dry.qty);
  });

  it("bloodworm needs silt and a sieve, not a shovel", () => {
    const shovel = harvestOnce(silt, 12, summerMorning, 9, "shovel", mulberry32(1));
    const sieve = harvestOnce(silt, 12, summerMorning, 9, "sieve", mulberry32(1));
    expect(shovel.ok).toBe(false);
    expect(sieve.ok).toBe(true);
    if (sieve.ok) expect(sieve.itemId).toBe("bloodworm");
  });

  it("chafer larva requires grove roots and skill 10", () => {
    const low = harvestOnce(grove, 8, summerMorning, 4, "shovel", mulberry32(8));
    expect(low.ok).toBe(false);
    const hits = Array.from({ length: 16 }, (_, i) => harvestOnce(grove, 8, summerMorning, 12, "shovel", mulberry32(20 + i)));
    expect(hits.some((h) => h.ok && h.itemId === "chafer-larva")).toBe(true);
  });

  it("may beetle is seasonal and evening-only", () => {
    const spring = harvestOnce(grove, 8, { ...summerMorning, season: "SPRING", timeOfDay: "NIGHT" }, 14, "shovel", mulberry32(3));
    const summerDay = harvestOnce(grove, 8, { ...summerMorning, timeOfDay: "DAY" }, 14, "shovel", mulberry32(3));
    const summerEve = Array.from({ length: 24 }, (_, i) =>
      harvestOnce(grove, 8, { ...summerMorning, timeOfDay: "EVENING" }, 14, "shovel", mulberry32(40 + i)),
    );
    expect(spring.ok).toBe(true);
    if (spring.ok) expect(spring.itemId).not.toBe("may-beetle");
    expect(summerDay.ok).toBe(true);
    if (summerDay.ok) expect(summerDay.itemId).not.toBe("may-beetle");
    expect(summerEve.some((h) => h.ok && h.itemId === "may-beetle")).toBe(true);
  });

  it("mole cricket needs floodplain biotope and high skill", () => {
    const wrongPlace = Array.from({ length: 12 }, (_, i) => harvestOnce(lawn, 18, summerMorning, 16, "shovel", mulberry32(5 + i)));
    const lowSkill = harvestOnce(meadow, 6, summerMorning, 6, "shovel", mulberry32(5));
    const ok = Array.from({ length: 12 }, (_, i) =>
      harvestOnce(meadow, 6, { ...summerMorning, weather: "RAIN" }, 15, "shovel", mulberry32(5 + i)),
    );
    expect(wrongPlace.every((h) => !h.ok || h.itemId !== "mole-cricket")).toBe(true);
    expect(lowSkill.ok).toBe(false);
    expect(ok.some((h) => h.ok && h.itemId === "mole-cricket")).toBe(true);
  });

  it("quality depends on skill and conditions", () => {
    const poor = harvestOnce(lawn, 4, { ...summerMorning, weather: "CLEAR" }, 1, "shovel", mulberry32(11));
    const rich = harvestOnce(lawn, 18, { ...summerMorning, weather: "RAIN" }, 14, "shovel", mulberry32(11));
    expect(poor.ok && rich.ok).toBe(true);
    if (poor.ok && rich.ok) {
      expect(rich.quality === "fresh" || rich.qty >= poor.qty).toBe(true);
    }
  });

  it("blocks spam when the patch is empty", () => {
    const empty = harvestOnce(lawn, 0.2, summerMorning, 8, "shovel", mulberry32(1));
    expect(empty.ok).toBe(false);
  });
});
