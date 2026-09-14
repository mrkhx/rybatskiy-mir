/**
 * LANDED HOLD — stable catch after LAND. t=0 matches the current LAND frame.
 * Does not open KEEP / RELEASE / result UI.
 * Debug pike proxy stays. Tackle stays
 * RodTip → FloatAttach → float → FloatBottom → leader → Jaw/FishPullPoint.
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import {
  applyLandPose,
  LAND_DURATION,
  sampleLand,
  type LandSample,
} from "./land";
import { PREP_DURATION } from "./landPrep";

export const HOLD_LOOP = 2.6;
export const HOLD_CLIP = "LANDED_HOLD" as const;

export type HoldSample = LandSample;

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

export function isHoldClip(clip: string): boolean {
  return clip === "LANDED_HOLD";
}

export function sampleHold(
  t: number,
  fightT: number,
  prepHold = PREP_DURATION,
  landHold = LAND_DURATION,
): HoldSample {
  const frozen = sampleLand(Math.min(landHold, LAND_DURATION), fightT, prepHold);
  const fade = smooth(clamp01(t / 0.4));
  const u = (t % HOLD_LOOP) / HOLD_LOOP;
  return {
    ...frozen,
    pitch: frozen.pitch + 1.2 * DEG * fade,
    headX: frozen.headX + 0.8 * DEG * fade,
    bend: lerp(frozen.bend, 0.018, fade),
    tension: lerp(frozen.tension, 0.36, fade),
    splash: false,
    twist: lerp(frozen.twist, Math.sin(u * Math.PI * 2) * 0.07, fade),
    tail: lerp(frozen.tail, Math.sin(u * Math.PI * 4) * 0.11, fade),
    nose: lerp(frozen.nose, 0.06, fade),
    progress: 1,
    lift: 1,
  };
}

export function applyHoldPose(man: THREE.Object3D, s: HoldSample): void {
  applyLandPose(man, s);
}

/** t=0 copies the LAND fish point; then a small calm sway. */
export function holdFishWorld(start: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const fade = smooth(clamp01(t / 0.4));
  const u = (t % HOLD_LOOP) / HOLD_LOOP;
  const len = Math.hypot(start.x, start.z) || 1;
  const nx = start.x / len;
  const nz = start.z / len;
  const side = 0.012 * Math.sin(u * Math.PI * 2 + 0.8) * fade;
  out.set(
    start.x - nz * side,
    start.y + 0.01 * Math.sin(u * Math.PI * 2) * fade,
    start.z + nx * side,
  );
  return out;
}

export function holdFloatWorld(
  start: THREE.Vector3,
  fish: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const fade = smooth(clamp01(t / 0.4));
  const u = (t % HOLD_LOOP) / HOLD_LOOP;
  out.set(
    lerp(start.x, fish.x, 0.12 * fade),
    start.y + 0.008 * Math.sin(u * Math.PI * 2) * fade,
    lerp(start.z, fish.z, 0.12 * fade),
  );
  return out;
}
