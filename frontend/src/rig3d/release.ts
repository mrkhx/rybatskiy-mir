/**
 * RELEASE — return the fish to the water after RELEASE_SELECTED.
 * t=0 matches the current LANDED HOLD frame. Does not return to READY.
 * Debug pike proxy stays. Leader stays on Jaw until underwater detach,
 * then hangs from RigEnd under the float.
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import { WATERLINE_Y } from "./floatLanding";
import { LAND_DURATION } from "./land";
import { applyHoldPose, sampleHold, type HoldSample } from "./landedHold";
import { PREP_DURATION } from "./landPrep";

export const RELEASE_DURATION = 2.2;
export const RELEASE_ENTER = 1.05;
export const RELEASE_DETACH = 1.4;
export const RELEASE_CLIP = "RELEASE" as const;

export type ReleaseSample = HoldSample & {
  detached: boolean;
  done: boolean;
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

export function isReleaseClip(clip: string): boolean {
  return clip === "RELEASE";
}

export function sampleRelease(
  t: number,
  fightT: number,
  prepHold = PREP_DURATION,
  landHold = LAND_DURATION,
  holdClock = 0,
): ReleaseSample {
  const frozen = sampleHold(holdClock, fightT, prepHold, landHold);
  const u = smooth(t / RELEASE_DURATION);
  const lower = smooth(clamp01(t / 0.9));
  const live = t < RELEASE_DETACH ? 1 : lerp(1, 0.35, smooth(clamp01((t - RELEASE_DETACH) / 0.4)));
  return {
    ...frozen,
    pitch: frozen.pitch - 10 * DEG * lower,
    headX: frozen.headX + 3 * DEG * lower,
    bend: lerp(frozen.bend, 0.008, u),
    tension: lerp(frozen.tension, 0.1, u),
    splash: t >= RELEASE_ENTER && t < RELEASE_ENTER + 0.22,
    twist: lerp(frozen.twist, Math.sin(t * 9) * 0.12 * live, lower),
    tail: lerp(frozen.tail, Math.sin(t * 14) * 0.22 * live, lower),
    nose: lerp(frozen.nose, 0.2 * (1 - u), lower),
    progress: u,
    lift: 1 - lower,
    detached: t >= RELEASE_DETACH,
    done: t >= RELEASE_DURATION,
  };
}

export function applyReleasePose(man: THREE.Object3D, s: ReleaseSample): void {
  applyHoldPose(man, s);
}

/** t=0 copies HOLD fish. Dip to water, then swim away after detach. */
export function releaseFishWorld(start: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const len = Math.hypot(start.x, start.z) || 1;
  const nx = start.x / len;
  const nz = start.z / len;
  const dip = smooth(clamp01(t / RELEASE_ENTER));
  const swim = t > RELEASE_DETACH ? smooth(clamp01((t - RELEASE_DETACH) / (RELEASE_DURATION - RELEASE_DETACH))) : 0;
  const dist = lerp(len, len + 0.1, dip) + 0.58 * swim;
  const y = lerp(start.y, WATERLINE_Y - 0.08, dip) - 0.24 * swim;
  const side = 0.07 * swim;
  out.set(nx * dist - nz * side, y, nz * dist + nx * side);
  return out;
}

export function releaseFloatWorld(
  start: THREE.Vector3,
  fish: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const u = smooth(clamp01(t / 1.55));
  out.set(
    lerp(start.x, fish.x * 0.9, u * 0.35),
    lerp(start.y, WATERLINE_Y, u),
    lerp(start.z, fish.z * 0.9, u * 0.35),
  );
  return out;
}

/** Leader follows the jaw until detach, then hangs under the float. */
export function releaseLeaderWorld(
  fish: THREE.Vector3,
  floatPos: THREE.Vector3,
  detachAt: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  if (t < RELEASE_DETACH) {
    out.copy(fish);
    return out;
  }
  const k = smooth(clamp01((t - RELEASE_DETACH) / 0.28));
  out.set(
    lerp(detachAt.x, floatPos.x, k),
    lerp(detachAt.y, floatPos.y - 0.16, k),
    lerp(detachAt.z, floatPos.z, k),
  );
  return out;
}
