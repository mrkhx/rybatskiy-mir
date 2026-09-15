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
