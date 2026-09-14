/**
 * RETURN TO READY — after KEEP_COMPLETE or RELEASE_COMPLETE.
 * t=0 matches the current keep/release hold. t=end is approved READY.
 * Leader stays on RigEnd. No new CAST, no fish.
 */
import * as THREE from "three";
import { READY_PITCH } from "./approvedReady";
import { KEEP_DURATION, sampleKeep, type KeepSample } from "./keep";
import { LAND_DURATION } from "./land";
import { PREP_DURATION } from "./landPrep";
import { RELEASE_DURATION, sampleRelease } from "./release";
import { applyWaitPose } from "./wait";
import { FLOAT_X } from "./approvedTackle";
import { WATERLINE_Y } from "./floatLanding";

export const RETURN_DURATION = 1.35;
export const RETURN_CLIP = "RETURN_TO_READY" as const;

export type ReturnSample = KeepSample & { done: boolean };

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

export function isReturnClip(clip: string): boolean {
  return clip === "RETURN_TO_READY";
}

export function sampleReturn(
  t: number,
  fromKeep: boolean,
  fightT: number,
  prepHold = PREP_DURATION,
  landHold = LAND_DURATION,
  holdClock = 0,
): ReturnSample {
  const from = fromKeep
    ? sampleKeep(KEEP_DURATION, fightT, prepHold, landHold, holdClock)
    : sampleRelease(RELEASE_DURATION, fightT, prepHold, landHold, holdClock);
  const u = smooth(t / RETURN_DURATION);
  return {
    ...from,
    pitch: lerp(from.pitch, READY_PITCH, u),
    yaw: lerp(from.yaw, 0, u),
    aim: lerp(from.aim, 0, u),
    armRX: lerp(from.armRX, 0, u),
    armRFore: lerp(from.armRFore, 0, u),
    armLX: lerp(from.armLX, 0, u),
    armLFore: lerp(from.armLFore, 0, u),
    headX: lerp(from.headX, 0, u),
    bend: lerp(from.bend, 0, u),
    tension: lerp(from.tension, 0.05, u),
    splash: false,
    twist: 0,
    tail: 0,
    nose: 0,
    progress: u,
    lift: 0,
    fade: 1,
    detached: true,
    done: t >= RETURN_DURATION,
  };
}

export function applyReturnPose(man: THREE.Object3D, s: ReturnSample): void {
  applyWaitPose(man, s);
}

export function returnFloatWorld(start: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const u = smooth(t / RETURN_DURATION);
  out.set(lerp(start.x, FLOAT_X, u), lerp(start.y, WATERLINE_Y, u), lerp(start.z, 0, u));
  return out;
}

export function returnLeaderWorld(floatPos: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  out.set(floatPos.x, floatPos.y - 0.14, floatPos.z);
  return out;
}
