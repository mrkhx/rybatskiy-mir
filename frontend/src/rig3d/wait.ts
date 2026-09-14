/**
 * WAIT — calm bite-watch after approved FLOAT LANDING.
 * u=0 matches CAST follow-through / landing hold. Do not rewrite CAST.
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import { CAST_DURATION, sampleCast } from "./cast";
import { AIM_ARM, AXIS_X, applyArmSpins } from "./idleLive";

export const WAIT_BLEND = 0.32;
export const WAIT_PITCH = 22 * DEG;
export const WAIT_AIM = 0.78;
export const WAIT_ARM_RX = 2 * DEG;
export const WAIT_ARM_RFORE = 3 * DEG;
export const WAIT_ARM_LX = 0;
export const WAIT_ARM_LFORE = 2 * DEG;
export const WAIT_HEAD_X = 5 * DEG;
export const WAIT_BREATH_PERIOD = 4.2;
export const WAIT_LINE_TENSION = 0.08;
/** Hold FLOAT LANDING settle before auto WAIT. */
export const WAIT_AFTER_LANDING = 0.82;

export type WaitSample = {
  pitch: number;
  yaw: number;
  aim: number;
  armRX: number;
  armRFore: number;
  armLX: number;
  armLFore: number;
  headX: number;
  bend: number;
  tension: number;
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

export function isWaitClip(clip: string): boolean {
  return clip === "WAIT";
}

export function sampleWait(u: number, clock = 0): WaitSample {
  const end = sampleCast(CAST_DURATION);
  const k = smooth(u);
  const breath = k >= 0.999 ? Math.sin((clock / WAIT_BREATH_PERIOD) * Math.PI * 2) : 0;
  const b = 0.35 * DEG * breath;
  return {
    pitch: lerp(end.pitch, WAIT_PITCH, k),
    yaw: end.yaw,
    aim: lerp(1, WAIT_AIM, k) + 0.012 * breath,
    armRX: lerp(end.armRX, WAIT_ARM_RX, k),
    armRFore: lerp(end.armRFore, WAIT_ARM_RFORE, k) + b,
    armLX: lerp(end.armLX, WAIT_ARM_LX, k),
    armLFore: lerp(end.armLFore, WAIT_ARM_LFORE, k),
    headX: WAIT_HEAD_X * k + 0.25 * DEG * breath,
    bend: lerp(end.bend, 0.016, k),
    tension: WAIT_LINE_TENSION,
  };
}

/** One overlay source. u=0 is CAST end so FLOAT LANDING → WAIT does not snap. */
export function applyWaitPose(man: THREE.Object3D, s: WaitSample): void {
  applyArmSpins(man, "UpperArm_R", [
    { axis: AIM_ARM.UpperArm_R.axis, angle: AIM_ARM.UpperArm_R.angle * s.aim },
    { axis: AXIS_X, angle: s.armRX },
  ]);
  applyArmSpins(man, "LowerArm_R", [
    { axis: AIM_ARM.LowerArm_R.axis, angle: AIM_ARM.LowerArm_R.angle * s.aim },
    { axis: AXIS_X, angle: s.armRFore },
  ]);
  applyArmSpins(man, "UpperArm_L", [
    { axis: AIM_ARM.UpperArm_L.axis, angle: AIM_ARM.UpperArm_L.angle * s.aim },
    { axis: AXIS_X, angle: s.armLX },
  ]);
  applyArmSpins(man, "LowerArm_L", [
    { axis: AIM_ARM.LowerArm_L.axis, angle: AIM_ARM.LowerArm_L.angle * s.aim },
    { axis: AXIS_X, angle: s.armLFore },
  ]);
  applyArmSpins(man, "Head", [{ axis: AXIS_X, angle: s.headX }]);
}
