/**
 * FIGHT_LIGHT — compact float-rod hold after approved HOOKSET.
 * t=0 matches sampleHookPose(HOOK_DURATION). Does not start LAND / REEL.
 *
 * LOCKED: approvedFight.ts — FIGHT_LIGHT at 5d7e6ea3d712842444838f233345a2ad9cdb6885
 * Tackle: RodTip → FloatAttach → FLOAT → FloatBottom → leader → FishPullPoint
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import { HOOK_DURATION, sampleHookFloat, sampleHookPose } from "./hookset";
import { applyWaitPose, type WaitSample } from "./wait";
import { WATER_Y } from "./approvedTackle";

export {
  APPROVED_FIGHT_COMMIT,
  APPROVED_FIGHT_CHAIN,
  APPROVED_FIGHT_TOPOLOGY,
} from "./approvedFight";

export const FIGHT_LOOP = 5.0;
export const FIGHT_CLIP = "FIGHT_LIGHT" as const;
export const FISH_DEPTH = -0.32;
export const FISH_PULL_Z = 0.34;
export const FISH_PULL_X = 0.22;
export const FISH_PULL_Y = 0.07;

export type FightSample = WaitSample & {
  phase: "hold" | "pullA" | "settle" | "pullB" | "return";
  pull: number;
  side: number;
  away: number;
  fishX: number;
  fishY: number;
  fishZ: number;
  floatDip: number;
  floatFollow: number;
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

export function isFightClip(clip: string): boolean {
  return clip === "FIGHT_LIGHT";
}

function envelope(t: number): { pull: number; side: number; away: number; phase: FightSample["phase"] } {
  const x = ((t % FIGHT_LOOP) + FIGHT_LOOP) % FIGHT_LOOP;
  if (x < 1.5) {
    const live = x < 0.35 ? smooth(x / 0.35) : 1;
    const breath = 0.07 * Math.sin(x * 2.05) * live;
    return { pull: Math.max(0, breath), side: 0.08 * Math.sin(x * 1.15) * live, away: 0.04 * live, phase: "hold" };
  }
  if (x < 2.1) {
    const u = smooth((x - 1.5) / 0.6);
    return { pull: lerp(0.08, 1, u), side: lerp(0.08, 1, u), away: lerp(0.04, 0.55, u), phase: "pullA" };
  }
  if (x < 3.4) {
    const u = smooth((x - 2.1) / 1.3);
    return { pull: lerp(1, 0.18, u), side: lerp(1, 0.12, u), away: lerp(0.55, 0.1, u), phase: "settle" };
  }
  if (x < 4.1) {
    const u = smooth((x - 3.4) / 0.7);
    return { pull: lerp(0.18, 0.92, u), side: lerp(0.12, -0.9, u), away: lerp(0.1, 0.5, u), phase: "pullB" };
  }
  const u = smooth((x - 4.1) / 0.9);
  return { pull: lerp(0.92, 0, u), side: lerp(-0.9, 0, u), away: lerp(0.5, 0, u), phase: "return" };
}

export function sampleFight(t: number): FightSample {
  const base = sampleHookPose(HOOK_DURATION);
  const hookF = sampleHookFloat(HOOK_DURATION);
  const e = envelope(t);
  const x = ((t % FIGHT_LOOP) + FIGHT_LOOP) % FIGHT_LOOP;
  const dive = x < 0.35 ? smooth(x / 0.35) : 1;
  const depth = lerp(hookF.dip, FISH_DEPTH - FISH_PULL_Y * e.pull, dive);
  return {
    pitch: base.pitch - 3.2 * DEG * e.pull,
    yaw: base.yaw + 3.5 * DEG * e.side,
    aim: base.aim + 0.035 * e.pull,
    armRX: base.armRX + 2.4 * DEG * e.pull,
    armRFore: base.armRFore + 1.1 * DEG * e.pull,
    armLX: base.armLX + 1.4 * DEG * e.pull,
    armLFore: base.armLFore,
    headX: base.headX + 1.2 * DEG * e.pull,
    bend: base.bend + 0.05 * e.pull,
    tension: base.tension + 0.1 * e.pull,
    phase: e.phase,
    pull: e.pull,
    side: e.side,
    away: e.away,
    fishX: FISH_PULL_X * e.away,
    fishY: depth,
    fishZ: FISH_PULL_Z * e.side,
    floatDip: hookF.dip - 0.018 * e.pull,
    floatFollow: 0.58 * Math.max(e.away, Math.abs(e.side) * 0.7),
  };
}

export function applyFightPose(man: THREE.Object3D, s: WaitSample): void {
  applyWaitPose(man, s);
}

export function fightFishWorld(
  rest: THREE.Vector3,
  s: FightSample,
  out: THREE.Vector3,
): THREE.Vector3 {
  return out.set(rest.x + s.fishX, WATER_Y + s.fishY, rest.z + s.fishZ);
}
