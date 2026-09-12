import { hookSuccess, stepFight, type FightConfig } from "./fight";
import { mulberry32 } from "./rng";
import type { FightSnapshot } from "./types";

const cfg: FightConfig = {
  profile: { pull: 0.6, directionChange: 0.4, coverSeek: 0.2, stamina: 0.8 },
  lineStrength: 1.1,
  rodPower: 0.7,
  dragQuality: 0.7,
  hookQuality: 0.8,
  skill: 0.3,
  cover: 0.2,
  playerStamina: 0.9,
};

const start: FightSnapshot = {
  tension: 0.3,
  fishStamina: 1,
  lineIntegrity: 1,
  progress: 0,
  surge: 0,
};

describe("hook and fight", () => {
  it("late hookset often fails", () => {
    const early = hookSuccess(mulberry32(1), 40, 900, 0.8, 0.2);
    const late = hookSuccess(mulberry32(1), 2000, 900, 0.8, 0.2);
    expect(early).toBe(true);
    expect(late).toBe(false);
  });

  it("steady fight can land the fish", () => {
    const rng = mulberry32(11);
    let snap = start;
    let landed = false;
    for (let i = 0; i < 80; i += 1) {
      const result = stepFight(rng, snap, { reel: 0.55, rodPressure: 0.5, rodDir: 0, drag: 0.45 }, cfg, 0.4);
      snap = result.snap;
      if (result.outcome === "landed") {
        landed = true;
        break;
      }
    }
    expect(landed).toBe(true);
  });

  it("over-reeling with weak line breaks it", () => {
    const rng = mulberry32(5);
    let snap = start;
    let reason: string | null = null;
    const weak = { ...cfg, lineStrength: 0.35 };
    for (let i = 0; i < 40; i += 1) {
      const result = stepFight(rng, snap, { reel: 1, rodPressure: 1, rodDir: 1, drag: 0 }, weak, 0.5);
      snap = result.snap;
      if (result.outcome === "lost") {
        reason = result.reason;
        break;
      }
    }
    expect(reason === "line_broke" || reason === "over_tension").toBe(true);
  });
});
