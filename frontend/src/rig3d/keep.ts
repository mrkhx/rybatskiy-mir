/**
 * KEEP — stow the catch after KEEP_SELECTED. t=0 matches LANDED HOLD.
 * No keepnet mesh, XP, coins, or READY. Fish fades out, leader hangs from RigEnd.
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import { LAND_DURATION } from "./land";
import { applyHoldPose, sampleHold, type HoldSample } from "./landedHold";
import { PREP_DURATION } from "./landPrep";

export const KEEP_DURATION = 1.3;
export const KEEP_FADE_START = 0.5;
export const KEEP_FADE_END = 0.9;
export const KEEP_DETACH = 0.95;
export const KEEP_CLIP = "KEEP" as const;

export type KeepSample = HoldSample & {
  fade: number;
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

export function isKeepClip(clip: string): boolean {
  return clip === "KEEP";
}

export function sampleKeep(
  t: number,
  fightT: number,
  prepHold = PREP_DURATION,
  landHold = LAND_DURATION,
  holdClock = 0,
): KeepSample {
  const frozen = sampleHold(holdClock, fightT, prepHold, landHold);
  const u = smooth(t / KEEP_DURATION);
  const fade = smooth(clamp01((t - KEEP_FADE_START) / (KEEP_FADE_END - KEEP_FADE_START)));
  return {
    ...frozen,
    pitch: frozen.pitch - 4 * DEG * u,
    headX: frozen.headX + 1.5 * DEG * u,
    bend: lerp(frozen.bend, 0.01, u),
    tension: lerp(frozen.tension, 0.12, u),
    splash: false,
    twist: lerp(frozen.twist, 0, fade),
    tail: lerp(frozen.tail, 0, fade),
    nose: lerp(frozen.nose, 0.04, u),
    progress: u,
    lift: 1,
    fade,
    detached: t >= KEEP_DETACH,
    done: t >= KEEP_DURATION,
  };
}

export function applyKeepPose(man: THREE.Object3D, s: KeepSample): void {
  applyHoldPose(man, s);
}

/** t=0 copies HOLD; slight draw-in toward the angler. */
export function keepFishWorld(start: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const pull = smooth(clamp01(t / 0.7));
  const len = Math.hypot(start.x, start.z) || 1;
  const nx = start.x / len;
  const nz = start.z / len;
  const dist = lerp(len, len * 0.9, pull);
  out.set(nx * dist, start.y + 0.03 * pull, nz * dist);
  return out;
}

export function keepFloatWorld(
  start: THREE.Vector3,
  fish: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const u = smooth(clamp01(t / KEEP_DURATION));
  out.set(
    lerp(start.x, fish.x, 0.08 * u),
    start.y,
    lerp(start.z, fish.z, 0.08 * u),
  );
  return out;
}

export function keepLeaderWorld(
  fish: THREE.Vector3,
  floatPos: THREE.Vector3,
  detachAt: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  if (t < KEEP_DETACH) {
    out.copy(fish);
    return out;
  }
  const k = smooth(clamp01((t - KEEP_DETACH) / 0.22));
  out.set(
    lerp(detachAt.x, floatPos.x, k),
    lerp(detachAt.y, floatPos.y - 0.14, k),
    lerp(detachAt.z, floatPos.z, k),
  );
  return out;
}

export function setPikeFade(root: THREE.Object3D, alpha: number): void {
  const a = clamp01(alpha);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat) continue;
      mat.transparent = a < 0.999;
      mat.opacity = a;
      mat.depthWrite = a > 0.92;
    }
  });
}
