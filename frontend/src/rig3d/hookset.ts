/**
 * HOOKSET — short float-rod strike after approved BITE hold.
 * t=0 matches sampleBitePose(BITE_DURATION). Does not start FIGHT.
 *
 * LOCKED: approvedHookset.ts — HOOKSET at f9b312ee8dc0bfa5fd1bc779bb94f05119621903
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import {
  BITE_DURATION,
  BITE_SINK_DIP,
  sampleBiteFloat,
  sampleBitePose,
} from "./bite";
import { applyWaitPose, type WaitSample } from "./wait";

export { APPROVED_HOOKSET_COMMIT, APPROVED_HOOKSET_CHAIN } from "./approvedHookset";

export const HOOK_DURATION = 0.72;
export const HOOK_WIND = 0.1;
export const HOOK_LIFT = 0.35;
export const HOOK_PEAK = 0.52;
export const HOOK_PITCH = 58 * DEG;
export const HOOK_ARM_RX = 11 * DEG;
export const HOOK_FORE = 4.5 * DEG;
export const HOOK_AIM = 0.07;
export const HOOK_ARM_LX = 3.5 * DEG;
export const HOOK_BEND_PEAK = 0.11;
export const HOOK_TENSION_PEAK = 0.92;
export const HOOK_PULL = 0.11;
export const HOOK_POP = 0.055;

export type HookFloat = {
  dip: number;
  side: number;
  pull: number;
  tilt: number;
  tension: number;
  phase: "wind" | "lift" | "peak" | "hold";
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
function easeOut(u: number) {
  const t = clamp01(u);
  return 1 - (1 - t) * (1 - t);
}

export function isHookClip(clip: string): boolean {
  return clip === "HOOKSET";
}

function liftAmount(t: number): { lift: number; flex: number; phase: HookFloat["phase"] } {
  if (t < HOOK_WIND) {
    return { lift: 0.08 * smooth(t / HOOK_WIND), flex: 0.12 * (t / HOOK_WIND), phase: "wind" };
  }
  if (t < HOOK_LIFT) {
    const u = easeOut((t - HOOK_WIND) / (HOOK_LIFT - HOOK_WIND));
    return { lift: lerp(0.08, 1, u), flex: lerp(0.12, 1, u), phase: "lift" };
  }
  if (t < HOOK_PEAK) {
    const u = smooth((t - HOOK_LIFT) / (HOOK_PEAK - HOOK_LIFT));
    return { lift: 1, flex: lerp(1, 0.85, u), phase: "peak" };
  }
  const u = smooth((t - HOOK_PEAK) / (HOOK_DURATION - HOOK_PEAK));
  return { lift: lerp(1, 0.9, u), flex: lerp(0.85, 0.62, u), phase: "hold" };
}

export function sampleHookFloat(t: number): HookFloat {
  const end = sampleBiteFloat(BITE_DURATION);
  const { lift, flex, phase } = liftAmount(t);
  return {
    dip: lerp(end.dip, -(BITE_SINK_DIP - HOOK_POP), lift),
    side: 0.012 * lift,
    pull: -HOOK_PULL * lift,
    tilt: lerp(end.tilt, 0.07, lift),
    tension: lerp(end.tension, HOOK_TENSION_PEAK, flex),
    phase,
    lift,
  };
}

export function sampleHookPose(t: number): WaitSample {
  const end = sampleBitePose(BITE_DURATION);
  const { lift, flex } = liftAmount(t);
  return {
    pitch: lerp(end.pitch, HOOK_PITCH, lift),
    yaw: end.yaw,
    aim: end.aim + HOOK_AIM * lift,
    armRX: end.armRX + HOOK_ARM_RX * lift,
    armRFore: end.armRFore + HOOK_FORE * lift,
    armLX: end.armLX + HOOK_ARM_LX * lift,
    armLFore: end.armLFore + 1.2 * DEG * lift,
    headX: end.headX + 1.5 * DEG * lift,
    bend: end.bend + HOOK_BEND_PEAK * flex,
    tension: lerp(end.tension, HOOK_TENSION_PEAK, flex),
  };
}

export function applyHookPose(man: THREE.Object3D, s: WaitSample): void {
  applyWaitPose(man, s);
}
