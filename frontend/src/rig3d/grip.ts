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
const _a = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _invMan = new THREE.Matrix4();
const _basis = new THREE.Matrix4();

export function applyRightGrip(root: THREE.Object3D, clip: CharClip, amount = 1) {
  if (!FISHING.has(clip)) return;
  for (const [name, xyz] of Object.entries(CURL)) {
    const b = root.getObjectByName(name);
    if (!b) continue;
    _e.set(xyz[0] * amount, xyz[1] * amount, xyz[2] * amount, "XYZ");
    _q.setFromEuler(_e);
    b.quaternion.multiply(_q);
  }
}

/**
 * READY attach. Parent to the character root (uniform scale) so Rocketbox
 * arm shear cannot stretch the blank. Position tracks Hand_R in *character
 * space*; rotation is a fixed man-local bind:
 *   blank = mostly character +Z (forward), 10–20° up, ≤10° right
 *   reel  = world/character down
 * Viewer yaw lives on the group above `man`, so it cannot change the bind.
 */
export function placeRodReady(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  const hand = man.getObjectByName("Hand_R");
  if (!hand) return false;
  if (rod.parent !== man) man.add(rod);
  rod.visible = true;
  rod.scale.setScalar(1);

  // man +Z = character forward, +Y = up, +X = right.
  _y.set(0.08, 0.28, 0.96).normalize();
  _z.set(0, -1, 0);
  _z.addScaledVector(_y, -_z.dot(_y));
  if (_z.lengthSq() < 1e-8) _z.set(1, 0, 0);
  _z.normalize();
  _x.crossVectors(_y, _z).normalize();
  _z.crossVectors(_x, _y).normalize();
  _basis.makeBasis(_x, _y, _z);
  rod.quaternion.setFromRotationMatrix(_basis);

  man.updateWorldMatrix(true, false);
  hand.updateWorldMatrix(true, false);
  _invMan.copy(man.matrixWorld).invert();
  _a.setFromMatrixPosition(hand.matrixWorld).applyMatrix4(_invMan);
  const grip = rod.getObjectByName("RodGrip");
  if (grip) {
    _gripLocal.set(0, 0.12, 0).applyQuaternion(rod.quaternion);
  } else {
    _gripLocal.set(0, 0, 0);
  }
  rod.position.copy(_a).sub(_gripLocal);
  return true;
}

export function attachRodToHand(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  return placeRodReady(man, rod);
}
