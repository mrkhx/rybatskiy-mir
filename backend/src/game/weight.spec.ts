import { mulberry32 } from "./rng";
import { classifyTier, rollSpecimen, type WeightSpecies } from "./weight";

const perch: WeightSpecies = {
  id: "perch",
  minWeightG: 80,
  avgWeightG: 350,
  maxWeightG: 2800,
  minLengthCm: 12,
  maxLengthCm: 48,
  trophyWeightG: 900,
  recordWeightG: 1600,
  legendary: false,
};

describe("weight generation", () => {
  it("clusters around average rather than uniform min/max", () => {
    const rng = mulberry32(42);
    const samples = Array.from({ length: 400 }, () => rollSpecimen(rng, perch).weightG);
    const nearAvg = samples.filter((w) => w > 150 && w < 700).length;
    const nearMax = samples.filter((w) => w > 2000).length;
    expect(nearAvg).toBeGreaterThan(200);
    expect(nearMax).toBeLessThan(40);
  });

  it("never leaves species bounds", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 200; i += 1) {
      const s = rollSpecimen(rng, perch);
      expect(s.weightG).toBeGreaterThanOrEqual(perch.minWeightG);
      expect(s.weightG).toBeLessThanOrEqual(perch.maxWeightG);
    }
  });

  it("classifies trophy and record thresholds", () => {
    expect(classifyTier(perch, 350)).toBe("COMMON");
    expect(classifyTier(perch, 500)).toBe("LARGE");
    expect(classifyTier(perch, 900)).toBe("TROPHY");
    expect(classifyTier(perch, 1600)).toBe("RECORD");
  });

  it("is deterministic for a seed", () => {
    const a = rollSpecimen(mulberry32(99), perch);
    const b = rollSpecimen(mulberry32(99), perch);
    expect(a).toEqual(b);
  });
});
