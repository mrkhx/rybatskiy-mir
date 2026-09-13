import * as THREE from "three";
import type { CharClip } from "./types";

const CURL: Record<string, [number, number, number]> = {
  Thumb_R_1: [0.2, 0.3, 0.1],
  Thumb_R_2: [0.1, 0.22, 0.04],
  Thumb_R_3: [0.05, 0.12, 0],
  Index_R_1: [0, 0, 0.55],
  Index_R_2: [0, 0, 0.7],
  Index_R_3: [0, 0, 0.42],
  Middle_R_1: [0, 0, 0.6],
  Middle_R_2: [0, 0, 0.75],
  Middle_R_3: [0, 0, 0.42],
  Ring_R_1: [0, 0, 0.55],
  Ring_R_2: [0, 0, 0.68],
  Ring_R_3: [0, 0, 0.38],
  Pinky_R_1: [0, 0, 0.48],
  Pinky_R_2: [0, 0, 0.58],
  Pinky_R_3: [0, 0, 0.32],
};

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _gripOff = new THREE.Vector3();
const _a = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _invMan = new THREE.Matrix4();
const _basis = new THREE.Matrix4();

const DEG = Math.PI / 180;
/** Character space: +X left, +Y up, +Z forward. Yaw to the RIGHT is −X. */
const PITCH = 12 * DEG;
const YAW = 6 * DEG;
const REEL_SEAT_ALONG = 0.24;

export function applyRightGrip(root: THREE.Object3D, clip: CharClip, amount = 1) {
  if (clip !== "READY") return;
  const w = amount;
  for (const [name, xyz] of Object.entries(CURL)) {
    const b = root.getObjectByName(name);
    if (!b) continue;
    _e.set(xyz[0] * w, xyz[1] * w, xyz[2] * w, "XYZ");
    _q.setFromEuler(_e);
    b.quaternion.multiply(_q);
    const left = root.getObjectByName(name.replace("_R_", "_L_"));
    if (left) {
      _e.set(xyz[0] * w, xyz[1] * w, xyz[2] * w, "XYZ");
      _q.setFromEuler(_e);
      left.quaternion.multiply(_q);
    }
  }
}

/**
 * READY rod in character space, independent of viewer yaw.
 * Blank: +12° pitch, +6° yaw to the character's right, reel under (−Y).
 * Reel-seat sits in the right palm.
 */
export function placeRodReady(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  const hand = man.getObjectByName("Hand_R");
  if (!hand) return false;
  if (rod.parent !== man) man.add(rod);
  rod.visible = true;
  rod.scale.setScalar(1);

  _y.set(-Math.sin(YAW), Math.sin(PITCH), Math.cos(PITCH) * Math.cos(YAW)).normalize();
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
  _gripOff.set(0, REEL_SEAT_ALONG, 0).applyQuaternion(rod.quaternion);
  rod.position.copy(_a).sub(_gripOff);
  return true;
}

export function attachRodToHand(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  return placeRodReady(man, rod);
}
