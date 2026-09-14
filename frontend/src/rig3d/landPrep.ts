/**
 * LAND PREP / APPROACH — tired-fish close after approved REEL.
 * t=0 pose matches current REEL/FIGHT. Does not spawn fish or start LAND.
 * Tackle stays RodTip → FloatAttach → float → FloatBottom → leader → FishPullPoint.
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import { sampleFight, type FightSample } from "./fight";
import { applyWaitPose } from "./wait";

export const PREP_DURATION = 3.2;
export const PREP_END_DIST = 1.55;
export const PREP_PITCH = 9 * DEG;
export const PREP_HEAD = 7 * DEG;
export const PREP_CLIP = "LAND_PREP" as const;

export type PrepSample = FightSample & {
  progress: number;
  spin: number;
  dist: number;
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

export function sampleLandPrep(t: number, fightT: number): PrepSample {
  const base = sampleFight(fightT);
  const u = smooth(t / PREP_DURATION);
  const resist = 0.16 * Math.sin(clamp01(t / PREP_DURATION) * Math.PI * 2.15) * (1 - u * 0.65);
  return {
    ...base,
    pitch: base.pitch + PREP_PITCH * u,
    aim: base.aim + 0.025 * u,
    armRX: base.armRX + 2.2 * DEG * u,
    armRFore: base.armRFore + 1.2 * DEG * u,
    headX: base.headX + PREP_HEAD * u,
    bend: lerp(base.bend, 0.062, u),
    tension: lerp(base.tension, 0.7, u),
    pull: lerp(base.pull, 0.2, u) + Math.max(0, resist),
    progress: u,
    spin: 1 - smooth(t / 1.15),
    dist: resist,
  };
}

export function applyLandPrepPose(man: THREE.Object3D, s: PrepSample): void {
  applyWaitPose(man, s);
}

/** Continuity: t=0 copies start. Then close to PREP_END_DIST with two side darts. */
export function prepFishWorld(start: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const u = clamp01(t / PREP_DURATION);
  const k = smooth(u);
  const resist = 0.1 * Math.sin(u * Math.PI * 2.2) * (1 - k);
  const along = clamp01(k - resist);
  const side = 0.32 * Math.sin(u * Math.PI * 1.65) * (1 - k);
  const sx = start.x;
  const sz = start.z;
  const len = Math.hypot(sx, sz) || 1;
  const nx = sx / len;
  const nz = sz / len;
  const dist = lerp(len, PREP_END_DIST, along);
  out.set(nx * dist - nz * side, lerp(start.y, -0.16, k), nz * dist + nx * side);
  return out;
}

export function prepFloatWorld(
  start: THREE.Vector3,
  fish: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const k = smooth(t / PREP_DURATION);
  out.set(lerp(start.x, fish.x, k), 0, lerp(start.z, fish.z, k));
  return out;
}
