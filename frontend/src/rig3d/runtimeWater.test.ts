import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { advanceToWater, castVelocity, sampleBallisticCast } from "./runtimeWater";

describe("calibrated water cast", () => {
  it("reaches a world target continuously across different frame rates", () => {
    const start = new Vector3(-.3, .65, 1);
    const target = new Vector3(1.7, -.2, 3);
    for (const frames of [15, 30, 60, 144]) {
      const duration = .52;
      const dt = duration / frames;
      const velocity = castVelocity(start, target, duration, 13.5, new Vector3());
      const position = start.clone();
      for (let i = 0; i < frames; i++) {
        position.addScaledVector(velocity, dt);
        position.y -= .5 * 13.5 * dt * dt;
        velocity.y -= 13.5 * dt;
      }
      expect(position.distanceTo(target)).toBeLessThan(1e-10);
    }
  });
});


describe("CAST to water continuity", () => {
  it("reaches the same target when the final CAST render frame is skipped", () => {
    const start = new Vector3(-.3, .65, 1);
    const target = new Vector3(1.7, .018, 3);
    const duration = .473;
    const gravity = 13.5 * .24;
    const initial = castVelocity(start, target, duration, gravity, new Vector3());
    for (const times of [[0, .016, .17, .46], [0, .05, .1, .35, .4]]) {
      const position = new Vector3(), velocity = new Vector3();
      for (const elapsed of times) sampleBallisticCast(start, initial, elapsed, duration, gravity, position, velocity);
      // FLOAT LANDING consumes the endpoint even if CAST had no final rendered frame.
      sampleBallisticCast(start, initial, duration, duration, gravity, position, velocity);
      expect(position.distanceTo(target)).toBeLessThan(1e-10);
      const contact = position.clone();
      expect(advanceToWater(position, velocity, .05, gravity, target.y)).toBe(true);
      expect(position.distanceTo(contact)).toBe(0);
    }
  });

  it("stops at first contact instead of overshooting on a slow landing frame", () => {
    const position = new Vector3(0, .12, 0), velocity = new Vector3(4, -.2, 2);
    const contactY = .018;
    const gravity = 3.24;
    const oneStepPosition = position.clone(), oneStepVelocity = velocity.clone();
    expect(advanceToWater(oneStepPosition, oneStepVelocity, 1, gravity, contactY)).toBe(true);
    expect(advanceToWater(position, velocity, .02, gravity, contactY)).toBe(false);
    expect(advanceToWater(position, velocity, 1, gravity, contactY)).toBe(true);
    expect(position.y).toBeCloseTo(contactY, 10);
    expect(position.distanceTo(oneStepPosition)).toBeLessThan(1e-10);
    expect(velocity.distanceTo(oneStepVelocity)).toBeLessThan(1e-10);
  });
});
