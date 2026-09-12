import { applyXp, catchCoins, catchXp, skillLevelFromXp, xpToNextLevel } from "./xp";

describe("xp and economy", () => {
  it("grants more xp for trophy weight and release", () => {
    const common = catchXp({
      baseXp: 20,
      weightG: 300,
      avgWeightG: 300,
      tier: "COMMON",
      methodBonus: 0,
      released: false,
      premiumBoost: 0,
    });
    const trophy = catchXp({
      baseXp: 20,
      weightG: 900,
      avgWeightG: 300,
      tier: "TROPHY",
      methodBonus: 0,
      released: true,
      premiumBoost: 0.2,
    });
    expect(trophy).toBeGreaterThan(common * 2);
  });

  it("levels up when xp overflows", () => {
    const need = xpToNextLevel(1);
    const result = applyXp(1, need - 2, 10);
    expect(result.level).toBe(2);
    expect(result.leveled).toBe(true);
    expect(result.xp).toBe(8);
  });

  it("premium only boosts coins, never guarantees a catch", () => {
    const base = catchCoins(10, 300, 300, 0);
    const prem = catchCoins(10, 300, 300, 0.1);
    expect(prem).toBe(Math.round(base * 1.1));
  });

  it("maps harvest xp to a gated skill level", () => {
    expect(skillLevelFromXp(0)).toBe(1);
    expect(skillLevelFromXp(39)).toBe(1);
    expect(skillLevelFromXp(40)).toBe(2);
    expect(skillLevelFromXp(400)).toBe(11);
    expect(skillLevelFromXp(9000)).toBe(20);
  });
});
