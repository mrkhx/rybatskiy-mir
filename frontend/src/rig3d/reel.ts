/**
 * REEL — calm float-rod retrieve after approved FIGHT_LIGHT.
 * t=0 pose matches current fight sample. Left hand reaches the left handle.
 * Tackle stays RodTip → FloatAttach → float → FloatBottom → leader → FishPullPoint.
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import { AIM_ARM, AXIS_X, applyArmSpins } from "./idleLive";
import type { WaitSample } from "./wait";

export const REEL_REACH = 0.32;
export const REEL_HANDLE_SPEED = 8.4;
export const REEL_APPROACH = 0.11;
export const REEL_APPROACH_CAP = 0.7;
export const REEL_ARM_LX = 26 * DEG;
export const REEL_ARM_LZ = 14 * DEG;
export const REEL_FORE = 38 * DEG;
export const REEL_CRANK = 5.5 * DEG;

function clamp01(u: number) {
  return Math.max(0, Math.min(1, u));
}
function smooth(u: number) {
  const t = clamp01(u);
  return t * t * (3 - 2 * t);
}

export function isReelClip(clip: string): boolean {
  return clip === "REEL";
}

export function reelSpeedFor(pull: number, reach: number): number {
  const r = clamp01(reach);
  const drag = 1 - 0.55 * clamp01(pull);
  return REEL_HANDLE_SPEED * drag * r;
}

export function applyReelLeftArm(man: THREE.Object3D, s: WaitSample, reach: number, handleAngle = 0): void {
  const u = smooth(reach);
  if (u <= 1e-4) return;
  const crank = Math.sin(handleAngle) * u;
  const crankC = Math.cos(handleAngle) * u;
  applyArmSpins(man, "UpperArm_L", [
    { axis: AIM_ARM.UpperArm_L.axis, angle: AIM_ARM.UpperArm_L.angle * s.aim + REEL_ARM_LZ * u },
    { axis: AXIS_X, angle: s.armLX + REEL_ARM_LX * u + REEL_CRANK * 0.45 * crankC },
  ]);
  applyArmSpins(man, "LowerArm_L", [
    { axis: AIM_ARM.LowerArm_L.axis, angle: AIM_ARM.LowerArm_L.angle * s.aim },
    { axis: AXIS_X, angle: s.armLFore + REEL_FORE * u + REEL_CRANK * crank },
  ]);
}
