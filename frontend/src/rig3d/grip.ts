import * as THREE from "three";

const _gripOff = new THREE.Vector3();
const _anchor = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _invMan = new THREE.Matrix4();
const _basis = new THREE.Matrix4();
const _qz = new THREE.Quaternion();
const _axisZ = new THREE.Vector3(0, 0, 1);
const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);

const DEG = Math.PI / 180;
const PITCH = 30 * DEG;
const REEL_SEAT_ALONG = 0.11;
/** Tiny outward roll of the right fist, local X, absolute each frame. */
const WRIST_OUT = 12 * DEG;
/** Thumb 15° away from the torso, around the handle (local Y). */
const THUMB_OUT = 33 * DEG;
/** Man-local +Z = toward torso at 90°. Small inward shift only. */
const _nudgeIn = new THREE.Vector3(0, 0, 0.04);

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

/** Fingers only. Does not touch Hand_R / wrist / arm. */
export function closeRightFist(man: THREE.Object3D, _rod?: THREE.Object3D): void {
  for (const name of Object.keys(FIST_Z)) {
    const b = getBone(man, name);
    if (!b) continue;
    if (!REST_Q[name]) REST_Q[name] = b.quaternion.clone();
    b.quaternion.copy(REST_Q[name]);
    _qz.setFromAxisAngle(_axisZ, FIST_Z[name]);
    b.quaternion.multiply(_qz);
  }
}

/** Tiny outward roll from clip wrist. Absolute pose — no per-frame axis rebuild. */
export function rollRightWristOut(man: THREE.Object3D, _rod?: THREE.Object3D): void {
  const hand = getBone(man, "Hand_R");
  if (!hand) return;
  if (!REST_Q.Hand_R) REST_Q.Hand_R = hand.quaternion.clone();
  hand.quaternion.copy(REST_Q.Hand_R);
  _qz.setFromAxisAngle(_axisX, WRIST_OUT);
  hand.quaternion.multiply(_qz);
  _qz.setFromAxisAngle(_axisY, THUMB_OUT);
  hand.quaternion.multiply(_qz);
}

function worldPos(b: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 {
  b.updateWorldMatrix(true, false);
  return out.setFromMatrixPosition(b.matrixWorld);
}

/** Cork through the closed right fist. Angle unchanged. */
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
  worldPos(handR, _anchor);
  const mid = getBone(man, "Middle_R_1");
  const idx = getBone(man, "Index_R_1");
  if (mid) {
    worldPos(mid, _tmp);
    _anchor.lerp(_tmp, 0.5);
  }
  if (idx) {
    worldPos(idx, _tmp);
    _anchor.lerp(_tmp, 0.25);
  }
  _invMan.copy(man.matrixWorld).invert();
  _anchor.applyMatrix4(_invMan);

  _gripOff.set(0, REEL_SEAT_ALONG, 0).applyQuaternion(rod.quaternion);
  rod.position.copy(_anchor).sub(_gripOff).add(_nudgeIn);
  return true;
}

export function attachRodToHand(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  return placeRodReady(man, rod);
}
