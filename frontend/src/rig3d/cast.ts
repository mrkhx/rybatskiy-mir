/**
 * Float-rod CAST timeline. Starts from approved PRE-CAST.
 * Local bone overlays only — no IK, no world-copy, no retarget.
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import {
  AIM_PITCH,
  AIM_YAW,
  AIM_LINE_TENSION,
  PRECAST_SPINE_X,
  PRECAST_SPINE1_X,
  PRECAST_NECK_X,
  PRECAST_HEAD_X,
} from "./approvedPrecast";

export const CAST_DURATION = 1.4;
export const CAST_RELEASE_AT = 0.88;

export type CastSample = {
  pitch: number;
  yaw: number;
  spineX: number;
  spine1X: number;
  neckX: number;
  headX: number;
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
  const yaw = AIM_YAW;
  if (t < 0.3) {
    const u = smooth(t / 0.3);
    return {
      pitch: lerp(AIM_PITCH, 58 * DEG, u),
      yaw,
      spineX: lerp(PRECAST_SPINE_X, 2 * DEG, u),
      spine1X: lerp(PRECAST_SPINE1_X, 1 * DEG, u),
      neckX: lerp(PRECAST_NECK_X, 3 * DEG, u),
      headX: lerp(PRECAST_HEAD_X, 2 * DEG, u),
      bend: 0.03 * u,
      tension: lerp(AIM_LINE_TENSION, 0.12, u),
      released: false,
      phase: "back",
    };
  }
  if (t < 0.75) {
    const u = easeIn((t - 0.3) / 0.45);
    return {
      pitch: lerp(58 * DEG, 22 * DEG, u),
      yaw,
      spineX: lerp(2 * DEG, 8 * DEG, u),
      spine1X: lerp(1 * DEG, 5 * DEG, u),
      neckX: lerp(3 * DEG, 6 * DEG, u),
      headX: lerp(2 * DEG, 5 * DEG, u),
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
    bend: lerp(0.04, 0.02, u),
    tension: lerp(0.15, 0.55, u),
    released: true,
    phase: "fly",
  };
}

export function applyCastPose(_man: THREE.Object3D, _s: CastSample): void {
  /* feet planted — no Spine/Neck local-X (it leans him onto the right side) */
}

export function isCastClip(clip: string): boolean {
  return clip.startsWith("CAST");
}
