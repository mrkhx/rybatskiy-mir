import { createContext } from "react";
import { Vector3, type Object3D } from "three";

/** Photo calibration is supplied by the embedding scene; the standalone lab keeps its defaults. */
export type RuntimeWater = { castTargetWorld: Vector3; waterlineWorldY: number; motionFrame: Object3D };
export const RuntimeWaterContext = createContext<RuntimeWater | null>(null);

/** Initial velocity for a continuous ballistic cast to a calibrated water target. */
export function castVelocity(start: Vector3, target: Vector3, seconds: number, gravity: number, out: Vector3) {
  const duration = Math.max(.05, seconds);
  out.copy(target).sub(start).divideScalar(duration);
  out.y += gravity * duration / 2;
  return out;
}

/** Exact position/velocity at a cast timestamp; independent of render frame partitioning. */
export function sampleBallisticCast(start: Vector3, initialVelocity: Vector3, elapsed: number,
  duration: number, gravity: number, position: Vector3, velocity: Vector3) {
  const t = Math.max(0, Math.min(duration, elapsed));
  position.copy(start).addScaledVector(initialVelocity, t);
  position.y -= .5 * gravity * t * t;
  velocity.copy(initialVelocity);
  velocity.y -= gravity * t;
}

/** Integrate only up to first keel contact, so a slow frame cannot overshoot the landing point. */
export function advanceToWater(position: Vector3, velocity: Vector3, dt: number, gravity: number, contactY: number) {
  const height = position.y - contactY;
  if (height <= 1e-7) return true;
  const contactTime = (velocity.y + Math.sqrt(velocity.y * velocity.y + 2 * gravity * height)) / gravity;
  const step = Math.min(dt, contactTime);
  position.addScaledVector(velocity, step);
  position.y -= .5 * gravity * step * step;
  velocity.y -= gravity * step;
  return contactTime <= dt;
}
