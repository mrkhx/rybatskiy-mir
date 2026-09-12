import { applyFeed, MIXES, overfeedPenalty, sampleFeeding } from "./groundbait";

const lake = MIXES.groundbait!;
const carp = MIXES["groundbait-carp"]!;

describe("groundbait feeding", () => {
  it("attracts matching species after a delay envelope", () => {
    const fed = applyFeed(null, lake, 1, 0.05, 0);
    const atPeak = sampleFeeding(fed, fed.peakAt, "roach", lake.targetSpecies);
    const start = sampleFeeding(fed, fed.createdAt, "roach", lake.targetSpecies);
    expect(atPeak.attraction).toBeGreaterThan(start.attraction);
    expect(atPeak.fit).toBe(1);
  });

  it("hardly helps a species the mix is not for", () => {
    const fed = applyFeed(null, carp, 1, 0.05, 0);
    const carpRow = sampleFeeding(fed, fed.peakAt, "carp", carp.targetSpecies);
    const pike = sampleFeeding(fed, fed.peakAt, "pike", carp.targetSpecies);
    expect(carpRow.fit).toBeGreaterThan(pike.fit * 2);
  });

  it("overfeed lowers the bite tempo", () => {
    let state = applyFeed(null, carp, 2, 0.05, 0);
    state = applyFeed(state, carp, 3, 0.05, 1000);
    expect(state.saturation).toBeGreaterThan(0.55);
    expect(overfeedPenalty(state.saturation)).toBeLessThan(1);
  });

  it("current spreads the cloud and weakens local attraction", () => {
    const still = applyFeed(null, lake, 1, 0, 0);
    const river = applyFeed(null, lake, 1, 0.6, 0);
    const a = sampleFeeding(still, still.peakAt, "bream", lake.targetSpecies).attraction;
    const b = sampleFeeding(river, river.peakAt, "bream", lake.targetSpecies).attraction;
    expect(a).toBeGreaterThan(b);
  });
});
