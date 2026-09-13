import * as THREE from "three";

const _gripOff = new THREE.Vector3();
const _anchor = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _invMan = new THREE.Matrix4();
const _basis = new THREE.Matrix4();
const _qz = new THREE.Quaternion();
const _worldQ = new THREE.Quaternion();
const _parentQ = new THREE.Quaternion();
const _manQ = new THREE.Quaternion();
const _axisZ = new THREE.Vector3(0, 0, 1);
const _palm = new THREE.Vector3(0, 0.055, 0.012);

const DEG = Math.PI / 180;
const PITCH = 30 * DEG;
const REEL_SEAT_ALONG = 0.11;

const REST_Q: Record<string, THREE.Quaternion> = {};
const FIST_Z: Record<string, number> = {
  Index_R_1: -42 * DEG,
  Index_R_2: -58 * DEG,
  Index_R_3: -32 * DEG,
  Middle_R_1: -40 * DEG,
  Middle_R_2: -60 * DEG,
  Middle_R_3: -34 * DEG,
  Ring_R_1: -38 * DEG,
  Ring_R_2: -56 * DEG,
  Ring_R_3: -32 * DEG,
  Pinky_R_1: -34 * DEG,
  Pinky_R_2: -52 * DEG,
  Pinky_R_3: -30 * DEG,
  Thumb_R_2: -24 * DEG,
  Thumb_R_3: -18 * DEG,
};

function getBone(man: THREE.Object3D, name: string): THREE.Bone | null {
  let found: THREE.Bone | null = null;
  man.traverse((o) => {
    if (found) return;
    if ((o as THREE.Bone).isBone && o.name === name) found = o as THREE.Bone;
  });
  return found;
}

function orientRightWrist(man: THREE.Object3D, rod: THREE.Object3D): void {
  const hand = getBone(man, "Hand_R");
  if (!hand || !hand.parent) return;
  _x.set(0, 1, 0).applyQuaternion(rod.quaternion).normalize();
  _y.set(0, 0, -1);
  _y.addScaledVector(_x, -_y.dot(_x));
  if (_y.lengthSq() < 1e-8) _y.set(0, -1, 0);
  _y.normalize();
  _z.crossVectors(_x, _y).normalize();
  _y.crossVectors(_z, _x).normalize();
  _basis.makeBasis(_x, _y, _z);
  _worldQ.setFromRotationMatrix(_basis);
  man.updateWorldMatrix(true, false);
  hand.parent.updateWorldMatrix(true, false);
  _parentQ.setFromRotationMatrix(hand.parent.matrixWorld);
  _manQ.setFromRotationMatrix(man.matrixWorld);
  _worldQ.premultiply(_manQ);
  hand.quaternion.copy(_parentQ).invert().multiply(_worldQ);
}

export function closeRightFist(man: THREE.Object3D, rod: THREE.Object3D): void {
  orientRightWrist(man, rod);
  for (const name of Object.keys(FIST_Z)) {
    const b = getBone(man, name);
    if (!b) continue;
    if (!REST_Q[name]) REST_Q[name] = b.quaternion.clone();
    b.quaternion.copy(REST_Q[name]);
    _qz.setFromAxisAngle(_axisZ, FIST_Z[name]);
    b.quaternion.multiply(_qz);
  }
}

export function placeRodReady(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  const handR = getBone(man, "Hand_R") ?? man.getObjectByName("Hand_R");
  if (!handR) return false;
  if (rod.parent !== man) man.add(rod);
  rod.visible = true;
  rod.scale.setScalar(1);

  _y.set(-Math.cos(PITCH), Math.sin(PITCH), 0).normalize();
  _z.set(0, -1, 0);
  _z.addScaledVector(_y, -_z.dot(_y));
  if (_z.lengthSq() < 1e-8) _z.set(0, 0, 1);
  _z.normalize();
  _x.crossVectors(_y, _z).normalize();
  _z.crossVectors(_x, _y).normalize();
  _basis.makeBasis(_x, _y, _z);
  rod.quaternion.setFromRotationMatrix(_basis);

  man.updateWorldMatrix(true, false);
  handR.updateWorldMatrix(true, false);
  _invMan.copy(man.matrixWorld).invert();
  _anchor.copy(_palm).applyMatrix4(handR.matrixWorld).applyMatrix4(_invMan);
  _gripOff.set(0, REEL_SEAT_ALONG, 0).applyQuaternion(rod.quaternion);
  rod.position.copy(_anchor).sub(_gripOff);
  return true;
}

export function attachRodToHand(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  return placeRodReady(man, rod);
}
