import { addCastPressure, decayPressure } from "./pressure";

describe("fishing pressure", () => {
  it("grows with casts and recovers over time", () => {
    let p = 0;
    for (let i = 0; i < 8; i += 1) p = addCastPressure(p);
    expect(p).toBeGreaterThan(0.8);
    const rested = decayPressure(p, 8);
    expect(rested).toBeLessThan(p * 0.2);
  });
});
