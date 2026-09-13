import * as THREE from "three";

const _gripOff = new THREE.Vector3();
const _anchor = new THREE.Vector3();
const _index = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _invMan = new THREE.Matrix4();
const _basis = new THREE.Matrix4();
const _euler = new THREE.Euler();
const _worldQ = new THREE.Quaternion();
const _parentQ = new THREE.Quaternion();

const DEG = Math.PI / 180;
const PITCH = 30 * DEG;
const REEL_SEAT_ALONG = 0.11;

/** Moderate wrap around the cork after the wrist is aligned. */
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

/**
 * Turn the right wrist so the handle runs through the fist (Hand +X = blank),
 * fingers can curl around it. Does not move the rod or the wrist joint position.
 */
function orientRightWrist(man: THREE.Object3D, rod: THREE.Object3D): void {
  const hand = man.getObjectByName("Hand_R");
  if (!hand || !hand.parent) return;
  rod.updateWorldMatrix(true, false);
  const e = rod.matrixWorld.elements;
  // Blank +Y in world = handle axis, butt → tip.
  _x.set(e[4], e[5], e[6]).normalize();
  // Fingers toward camera (−Z) so they wrap around the cork, not along it.
  _y.set(0, 0, -1);
  _y.addScaledVector(_x, -_y.dot(_x));
  if (_y.lengthSq() < 1e-8) _y.set(0, -1, 0);
  _y.normalize();
  _z.crossVectors(_x, _y).normalize();
  _y.crossVectors(_z, _x).normalize();
  _basis.makeBasis(_x, _y, _z);
  _worldQ.setFromRotationMatrix(_basis);
  hand.parent.updateWorldMatrix(true, false);
  _parentQ.setFromRotationMatrix(hand.parent.matrixWorld);
  hand.quaternion.copy(_parentQ).invert().multiply(_worldQ);
}

export function closeRightFist(man: THREE.Object3D, rod: THREE.Object3D): void {
  orientRightWrist(man, rod);
  for (const name of Object.keys(FIST_Z)) {
    const b = man.getObjectByName(name);
    if (!b) continue;
    _euler.setFromQuaternion(b.quaternion, "XYZ");
    _euler.z += FIST_Z[name];
    b.quaternion.setFromEuler(_euler);
  }
}

export function placeRodReady(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  const handR = man.getObjectByName("Hand_R");
  const thumb = man.getObjectByName("Thumb_R_1");
  const index = man.getObjectByName("Index_R_1");
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
  _invMan.copy(man.matrixWorld).invert();

  const grip = thumb ?? handR;
  grip.updateWorldMatrix(true, false);
  _anchor.setFromMatrixPosition(grip.matrixWorld);
  if (index) {
    index.updateWorldMatrix(true, false);
    _index.setFromMatrixPosition(index.matrixWorld);
    _anchor.lerp(_index, 0.4);
  }
  _anchor.applyMatrix4(_invMan);

  _gripOff.set(0, REEL_SEAT_ALONG, 0).applyQuaternion(rod.quaternion);
  rod.position.copy(_anchor).sub(_gripOff);
  return true;
}

export function attachRodToHand(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  return placeRodReady(man, rod);
}
