/**
 * LAND — lift the fish out of the water after approved LAND PREP.
 * t=0 matches the LAND PREP hold. Does not start KEEP / RELEASE / result.
 * Production pike.glb is not ready; LAND uses the labeled debug pike proxy.
 * Tackle stays RodTip → FloatAttach → float → FloatBottom → leader → FishPullPoint.
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import { WATERLINE_Y } from "./floatLanding";
import { applyLandPrepPose, PREP_DURATION, sampleLandPrep, type PrepSample } from "./landPrep";

export const LAND_DURATION = 1.5;
export const LAND_SURFACE_T = 0.3;
export const LAND_BREAK_T = 0.55;
export const LAND_HANG_T = 1.1;
export const LAND_END_DIST = 0.78;
export const LAND_END_Y = 0.5;
/** Debug pike proxy is oversized; keep a readable catch-size during LAND. */
export const LAND_FISH_SCALE = 0.32;
export const LAND_CLIP = "LAND" as const;

export type LandSample = PrepSample & {
  splash: boolean;
  twist: number;
  tail: number;
  nose: number;
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

export function isLandClip(clip: string): boolean {
  return clip === "LAND";
}

export function sampleLand(t: number, fightT: number, prepHold = PREP_DURATION): LandSample {
  const base = sampleLandPrep(prepHold, fightT);
  const u = smooth(t / LAND_DURATION);
  const live = t > LAND_BREAK_T ? smooth(clamp01((t - LAND_BREAK_T) / 0.35)) : 0;
  return {
    ...base,
    pitch: base.pitch + 5 * DEG * u,
    headX: base.headX + 5 * DEG * u,
    armRX: base.armRX + 1.5 * DEG * u,
    bend: lerp(base.bend, 0.04, u),
    tension: lerp(base.tension, 0.55, u),
    progress: u,
    lift: 1,
    splash: t >= LAND_SURFACE_T && t < LAND_BREAK_T + 0.18,
    twist: Math.sin(t * 8.5) * 0.16 * live,
    tail: Math.sin(t * 13) * 0.22 * live,
    nose: 0.18 * (1 - u) + 0.08 * u,
  };
}

export function applyLandPose(man: THREE.Object3D, s: LandSample): void {
  applyLandPrepPose(man, s);
}

/** t=0 copies start (approved LAND PREP FishPullPoint). Arc up and in, not a crane lift. */
export function landFishWorld(start: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const u = clamp01(t / LAND_DURATION);
  const k = smooth(u);
  const sx = start.x;
  const sz = start.z;
  const len = Math.hypot(sx, sz) || 1;
  const nx = sx / len;
  const nz = sz / len;
  const inU = smooth(clamp01((t - 0.22) / (LAND_DURATION - 0.22)));
  const dist = lerp(len, LAND_END_DIST, inU);
  const side = 0.07 * Math.sin(u * Math.PI) * (1 - k);
  let y: number;
  if (t < LAND_SURFACE_T) y = lerp(start.y, WATERLINE_Y + 0.02, smooth(t / LAND_SURFACE_T));
  else if (t < LAND_HANG_T) y = lerp(WATERLINE_Y + 0.02, LAND_END_Y, smooth((t - LAND_SURFACE_T) / (LAND_HANG_T - LAND_SURFACE_T)));
  else y = LAND_END_Y;
  out.set(nx * dist - nz * side, y, nz * dist + nx * side);
  return out;
}

export function landFloatWorld(
  start: THREE.Vector3,
  fish: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const k = smooth(t / LAND_DURATION);
  const targetY = Math.max(start.y, fish.y + 0.26);
  out.set(lerp(start.x, fish.x, k * 0.85), lerp(start.y, targetY, k), lerp(start.z, fish.z, k * 0.85));
  return out;
}
