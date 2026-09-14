/**
 * Float-rod CAST timeline. Starts from approved PRE-CAST.
 * Local bone overlays only — no IK, no world-copy, no retarget.
 *
 * PRE-CAST visual rod is the Hand_R-glued READY blank (arms already raised).
 * Do not start CAST at AIM_PITCH 42° / AIM_YAW 4° — that reseats the rod
 * onto a different parent/pitch for one frame and snaps elbows/wrists.
 */
import * as THREE from "three";
import { DEG, READY_PITCH } from "./approvedReady";
import { AIM_LINE_TENSION } from "./approvedPrecast";
import { AIM_ARM, AXIS_X, applyArmSpins } from "./idleLive";

export const CAST_DURATION = 1.4;
export const CAST_RELEASE_AT = 0.88;

/** Actual PRE-CAST blank pitch (arm-glued READY rod). Not AIM_PITCH. */
export const CAST_START_PITCH = READY_PITCH;
/** Short float-rod backswing: +16° from the PRE-CAST blank. */
export const CAST_BACK_PITCH = READY_PITCH + 16 * DEG;
export const CAST_START_YAW = 0;

export type CastSample = {
  pitch: number;
  yaw: number;
  spineX: number;
  spine1X: number;
  neckX: number;
  headX: number;
  armRX: number;
  armRFore: number;
  armLX: number;
  armLFore: number;
  bend: number;
  tension: number;
  released: boolean;
  phase: "back" | "forward" | "release" | "fly";
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
function easeIn(u: number) {
  const t = clamp01(u);
  return t * t;
}
function easeOut(u: number) {
  const t = clamp01(u);
  return 1 - (1 - t) * (1 - t);
}

export function sampleCast(time: number): CastSample {
  const t = Math.max(0, Math.min(CAST_DURATION, time));
  const yaw = CAST_START_YAW;
  if (t < 0.3) {
    const u = smooth(t / 0.3);
    return {
      pitch: lerp(CAST_START_PITCH, CAST_BACK_PITCH, u),
      yaw,
      spineX: lerp(0, 2 * DEG, u),
      spine1X: lerp(0, 1 * DEG, u),
      neckX: lerp(0, 3 * DEG, u),
      headX: lerp(0, 2 * DEG, u),
      armRX: lerp(0, -14 * DEG, u),
      armRFore: lerp(0, 10 * DEG, u),
      armLX: lerp(0, -6 * DEG, u),
      armLFore: lerp(0, 6 * DEG, u),
      bend: 0.03 * u,
      tension: lerp(AIM_LINE_TENSION, 0.12, u),
      released: false,
      phase: "back",
    };
  }
  if (t < 0.75) {
    const u = easeIn((t - 0.3) / 0.45);
    return {
      pitch: lerp(CAST_BACK_PITCH, 22 * DEG, u),
      yaw,
      spineX: lerp(2 * DEG, 8 * DEG, u),
      spine1X: lerp(1 * DEG, 5 * DEG, u),
      neckX: lerp(3 * DEG, 6 * DEG, u),
      headX: lerp(2 * DEG, 5 * DEG, u),
      armRX: lerp(-14 * DEG, 16 * DEG, u),
      armRFore: lerp(10 * DEG, -2 * DEG, u),
      armLX: lerp(-6 * DEG, 8 * DEG, u),
      armLFore: lerp(6 * DEG, 2 * DEG, u),
      bend: lerp(0.03, 0.1, u),
      tension: lerp(0.12, 0.28, u),
      released: false,
      phase: "forward",
    };
  }
  if (t < 0.95) {
    const u = easeOut((t - 0.75) / 0.2);
    return {
      pitch: lerp(22 * DEG, 18 * DEG, u),
      yaw,
      spineX: lerp(8 * DEG, 7 * DEG, u),
      spine1X: lerp(5 * DEG, 4 * DEG, u),
      neckX: lerp(6 * DEG, 5 * DEG, u),
      headX: lerp(5 * DEG, 4 * DEG, u),
      armRX: lerp(16 * DEG, 10 * DEG, u),
      armRFore: lerp(-2 * DEG, 2 * DEG, u),
      armLX: lerp(8 * DEG, 4 * DEG, u),
      armLFore: lerp(2 * DEG, 2 * DEG, u),
      bend: lerp(0.1, 0.04, u),
      tension: lerp(0.28, 0.15, u),
      released: t >= CAST_RELEASE_AT,
      phase: "release",
    };
  }
  const u = smooth((t - 0.95) / 0.45);
  return {
    pitch: lerp(18 * DEG, 20 * DEG, u),
    yaw,
    spineX: lerp(7 * DEG, 5 * DEG, u),
    spine1X: lerp(4 * DEG, 3 * DEG, u),
    neckX: lerp(5 * DEG, 4 * DEG, u),
    headX: lerp(4 * DEG, 3 * DEG, u),
    armRX: lerp(10 * DEG, 6 * DEG, u),
    armRFore: lerp(2 * DEG, 4 * DEG, u),
    armLX: lerp(4 * DEG, 2 * DEG, u),
    armLFore: lerp(2 * DEG, 3 * DEG, u),
    bend: lerp(0.04, 0.02, u),
    tension: lerp(0.15, 0.55, u),
    released: true,
    phase: "fly",
  };
}

/** Arms follow the cast from the PRE-CAST AIM overlay. One source of motion. */
export function applyCastPose(man: THREE.Object3D, s: CastSample): void {
  applyArmSpins(man, "UpperArm_R", [
    { axis: AIM_ARM.UpperArm_R.axis, angle: AIM_ARM.UpperArm_R.angle },
    { axis: AXIS_X, angle: s.armRX },
  ]);
  applyArmSpins(man, "LowerArm_R", [
    { axis: AIM_ARM.LowerArm_R.axis, angle: AIM_ARM.LowerArm_R.angle },
    { axis: AXIS_X, angle: s.armRFore },
  ]);
  applyArmSpins(man, "UpperArm_L", [
    { axis: AIM_ARM.UpperArm_L.axis, angle: AIM_ARM.UpperArm_L.angle },
    { axis: AXIS_X, angle: s.armLX },
  ]);
  applyArmSpins(man, "LowerArm_L", [
    { axis: AIM_ARM.LowerArm_L.axis, angle: AIM_ARM.LowerArm_L.angle },
    { axis: AXIS_X, angle: s.armLFore },
  ]);
}

export function isCastClip(clip: string): boolean {
  return clip.startsWith("CAST");
}
