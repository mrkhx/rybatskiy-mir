import * as THREE from "three";
import type { CharClip } from "./types";

/** Gardener digits flex on local Z. Bind already has ~+50–80°; +Z opens, −Z closes. */
const CLOSE: Record<string, [number, number, number]> = {
  Index_R_1: [0, 0, -0.85],
  Index_R_2: [0, 0, -1.05],
  Index_R_3: [0, 0, -0.7],
  Middle_R_1: [0, 0, -0.9],
  Middle_R_2: [0, 0, -1.1],
  Middle_R_3: [0, 0, -0.7],
  Ring_R_1: [0, 0, -0.85],
  Ring_R_2: [0, 0, -1.0],
  Ring_R_3: [0, 0, -0.65],
  Pinky_R_1: [0, 0, -0.75],
  Pinky_R_2: [0, 0, -0.9],
  Pinky_R_3: [0, 0, -0.55],
  Thumb_R_1: [0.1, 0.45, 0.15],
  Thumb_R_2: [0.05, 0.25, 0.35],
  Thumb_R_3: [0, 0.1, 0.25],
};
for (const [k, v] of Object.entries({ ...CLOSE })) {
  CLOSE[k.replace("_R_", "_L_")] = v;
}

const _palm = new THREE.Vector3();
const _gripOff = new THREE.Vector3();
const _a = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _invMan = new THREE.Matrix4();
const _basis = new THREE.Matrix4();
const _handWorld = new THREE.Matrix4();

const DEG = Math.PI / 180;
const PITCH = 12 * DEG;
const YAW = 7 * DEG;
const REEL_SEAT_ALONG = 0.22;

const _fe = new THREE.Euler();
const _fq = new THREE.Quaternion();

export function applyRightGrip(root: THREE.Object3D, clip: CharClip) {
  if (clip !== "READY") return;
  for (const [name, xyz] of Object.entries(CLOSE)) {
    const b = root.getObjectByName(name);
    if (!b) continue;
    _fe.setFromQuaternion(b.quaternion, "XYZ");
    _fe.x += xyz[0];
    _fe.y += xyz[1];
    _fe.z += xyz[2];
    b.quaternion.setFromEuler(_fe);
  }
}

/**
 * Character space bind. Reel-seat sits in the RIGHT PALM, not the wrist joint.
 * Hand local: +Y = fingers, −Z ≈ palm. Offset (0, 4.5cm, −2cm) from Hand_R.
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
  // Palm centre, not the wrist pivot — stops the blank piercing the mesh.
  _palm.set(0, 0.062, 0.028);
  _handWorld.copy(hand.matrixWorld);
  _palm.applyMatrix4(_handWorld);
  _palm.applyMatrix4(_invMan);
  _gripOff.set(0, REEL_SEAT_ALONG, 0).applyQuaternion(rod.quaternion);
  rod.position.copy(_palm).sub(_gripOff);
  return true;
}

export function attachRodToHand(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  return placeRodReady(man, rod);
}
