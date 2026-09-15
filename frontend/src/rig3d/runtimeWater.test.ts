import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { castVelocity } from "./runtimeWater";

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
