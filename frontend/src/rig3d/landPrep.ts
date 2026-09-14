/**
 * LAND PREP / APPROACH — tired-fish close after approved REEL.
 * t=0 pose matches current REEL/FIGHT. Does not spawn fish or start LAND.
 * Late phase lifts the float out of the water; FishPullPoint stays at the surface.
 * Tackle stays RodTip → FloatAttach → float → FloatBottom → leader → FishPullPoint.
 *
 * LOCKED: approvedLandPrep.ts — LAND PREP at abf5d891dc2ed70c9c237d27203b0a4fc97654eb
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import { WATERLINE_Y } from "./floatLanding";
import { sampleFight, type FightSample } from "./fight";
import { applyWaitPose } from "./wait";

export {
  APPROVED_LAND_PREP_COMMIT,
  APPROVED_LAND_PREP_CHAIN,
  APPROVED_LAND_PREP_TOPOLOGY,
  APPROVED_LAND_PREP_FINALS,
} from "./approvedLandPrep";

export const PREP_DURATION = 3.4;
export const PREP_END_DIST = 1.55;
export const PREP_LIFT_DIST = 1.08;
export const PREP_LIFT_START = 0.58;
/** Fish stays at/under the waterline — LAND will lift it later. */
export const PREP_FISH_WET_Y = WATERLINE_Y - 0.12;
/** Same air height as the previous lift; not tied to FishPullPoint Y. */
export const PREP_FLOAT_AIR_Y = 0.72;
export const PREP_PITCH = 9 * DEG;
export const PREP_LIFT_PITCH = 8 * DEG;
export const PREP_HEAD = 7 * DEG;
export const PREP_CLIP = "LAND_PREP" as const;

export type PrepSample = FightSample & {
  progress: number;
  spin: number;
  dist: number;
  lift: number;
};

function clamp01(u: number) {
  return Math.max(0, Math.min(1, u));
}
function lerp(a: number, b: number, u: number) {
  return a + (b - a) * u;
}
function smooth(u: number) {
  const t = clamp01(u);
  return t * t * (3 - 2 * t);
}

export function isPrepClip(clip: string): boolean {
  return clip === "LAND_PREP";
}

export function prepLift(t: number): number {
  const u = clamp01(t / PREP_DURATION);
  return smooth(clamp01((u - PREP_LIFT_START) / (1 - PREP_LIFT_START)));
}

export function sampleLandPrep(t: number, fightT: number): PrepSample {
  const base = sampleFight(fightT);
  const u = smooth(t / PREP_DURATION);
  const lift = prepLift(t);
  const resist = 0.16 * Math.sin(clamp01(t / PREP_DURATION) * Math.PI * 2.15) * (1 - u * 0.65) * (1 - lift);
  return {
    ...base,
    pitch: base.pitch + PREP_PITCH * u + PREP_LIFT_PITCH * lift,
    aim: base.aim + 0.025 * u,
    armRX: base.armRX + 2.2 * DEG * u + 2 * DEG * lift,
    armRFore: base.armRFore + 1.2 * DEG * u,
    headX: base.headX + PREP_HEAD * u + 3 * DEG * lift,
    bend: lerp(base.bend, lerp(0.062, 0.048, lift), u),
    tension: lerp(base.tension, lerp(0.7, 0.62, lift), u),
    pull: lerp(base.pull, 0.2, u) + Math.max(0, resist),
    progress: u,
    spin: 1 - smooth(t / 1.15),
    dist: resist,
    lift,
  };
}

export function applyLandPrepPose(man: THREE.Object3D, s: PrepSample): void {
  applyWaitPose(man, s);
}

/** Continuity: t=0 copies start. Close on the surface, then lift out of the water. */
export function prepFishWorld(start: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const u = clamp01(t / PREP_DURATION);
  const k = smooth(u);
  const lift = prepLift(t);
  const resist = 0.1 * Math.sin(u * Math.PI * 2.2) * (1 - k) * (1 - lift);
  const along = clamp01(k - resist);
  const side = 0.32 * Math.sin(u * Math.PI * 1.65) * (1 - k) * (1 - lift);
  const sx = start.x;
  const sz = start.z;
  const len = Math.hypot(sx, sz) || 1;
  const nx = sx / len;
  const nz = sz / len;
  const endDist = lerp(PREP_END_DIST, PREP_LIFT_DIST, lift);
  const dist = lerp(len, endDist, along);
  const wetY = lerp(start.y, -0.16, k);
  out.set(nx * dist - nz * side, lerp(wetY, PREP_FISH_WET_Y, lift), nz * dist + nx * side);
  return out;
}

export function prepFloatWorld(
  start: THREE.Vector3,
  fish: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const k = smooth(t / PREP_DURATION);
  const lift = prepLift(t);
  out.set(
    lerp(start.x, fish.x, k),
    lerp(WATERLINE_Y, PREP_FLOAT_AIR_Y, lift),
    lerp(start.z, fish.z, k),
  );
  return out;
}
