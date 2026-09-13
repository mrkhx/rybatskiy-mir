import * as THREE from "three";
import type { CharClip } from "./types";

const CURL: Record<string, [number, number, number]> = {
  Thumb_R_1: [0.35, 0.5, 0.15],
  Thumb_R_2: [0.15, 0.4, 0],
  Thumb_R_3: [0.1, 0.25, 0],
  Index_R_1: [0, 0, 0.85],
  Index_R_2: [0, 0, 1.05],
  Index_R_3: [0, 0, 0.7],
  Middle_R_1: [0, 0, 0.9],
  Middle_R_2: [0, 0, 1.1],
  Middle_R_3: [0, 0, 0.7],
  Ring_R_1: [0, 0, 0.88],
  Ring_R_2: [0, 0, 1.05],
  Ring_R_3: [0, 0, 0.65],
  Pinky_R_1: [0, 0, 0.8],
  Pinky_R_2: [0, 0, 0.95],
  Pinky_R_3: [0, 0, 0.6],
};

const FISHING: Set<CharClip> = new Set([
  "AIM",
  "CAST_BACKSWING",
  "CAST_FORWARD",
  "CAST_FOLLOW",
  "WAIT",
  "BITE_REACTION",
  "HOOKSET",
  "REEL",
  "FIGHT_LIGHT",
  "FIGHT_HEAVY",
  "LAND",
]);

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _gripLocal = new THREE.Vector3();
const _mountPos = new THREE.Vector3();
const _mountScl = new THREE.Vector3();

/** Additive finger curl so the right hand reads as holding the grip.

  Disabled on the restored bind-pose character. These Euler offsets were
  authored for Mixamo bone roll and twist Rocketbox fingers.
*/
export function applyRightGrip(root: THREE.Object3D, clip: CharClip, amount = 1) {
  if (!FISHING.has(clip)) return;
  const w = clip === "IDLE" ? 0.35 * amount : amount;
  for (const [name, xyz] of Object.entries(CURL)) {
    const b = root.getObjectByName(name);
    if (!b) continue;
    _e.set(xyz[0] * w, xyz[1] * w, xyz[2] * w, "XYZ");
    _q.setFromEuler(_e);
    b.quaternion.multiply(_q);
  }
}

export function ensureRodGrip(man: THREE.Object3D): THREE.Object3D | null {
  const hand = man.getObjectByName("Hand_R");
  if (!hand) return null;
  hand.updateWorldMatrix(true, false);
  hand.matrixWorld.decompose(_mountPos, _q, _mountScl);
  const boneScale = (Math.abs(_mountScl.x) + Math.abs(_mountScl.y) + Math.abs(_mountScl.z)) / 3;
  const compensate = boneScale > 1e-8 ? 1 / boneScale : 100;

  let g = man.getObjectByName("CharRodMount");
  if (!g || g.parent !== hand) {
    g = new THREE.Object3D();
    g.name = "CharRodMount";
    hand.add(g);
  }
  g.scale.setScalar(compensate);
  g.position.set(0, 6, 2);
  g.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  return g;
}

/** Parent the production rod so its RodGrip sits in the right palm. */
export function attachRodToHand(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  const mount = ensureRodGrip(man);
  if (!mount) return false;
  if (rod.parent === mount) return true;
  mount.add(rod);
  rod.position.set(0, 0, 0);
  rod.rotation.set(0, 0, 0);
  rod.scale.setScalar(0.72);
  rod.updateMatrixWorld(true);
  const grip = rod.getObjectByName("RodGrip");
  if (grip) {
    grip.updateWorldMatrix(true, false);
    _gripLocal.setFromMatrixPosition(grip.matrixWorld);
    mount.worldToLocal(_gripLocal);
    rod.position.sub(_gripLocal);
  }
  return true;
}
