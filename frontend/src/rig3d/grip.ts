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

const DEG = Math.PI / 180;
const PITCH = 30 * DEG;
const REEL_SEAT_ALONG = 0.11;

/**
 * Local-Z extra curl on the right fingers only (gardener flexion axis).
 * Applied after mixer + rod placement so the rod does not move.
 */
const FIST_Z: Record<string, number> = {
  Index_R_1: -50 * DEG,
  Index_R_2: -78 * DEG,
  Index_R_3: -42 * DEG,
  Middle_R_1: -48 * DEG,
  Middle_R_2: -80 * DEG,
  Middle_R_3: -44 * DEG,
  Ring_R_1: -46 * DEG,
  Ring_R_2: -78 * DEG,
  Ring_R_3: -42 * DEG,
  Pinky_R_1: -38 * DEG,
  Pinky_R_2: -72 * DEG,
  Pinky_R_3: -40 * DEG,
  Thumb_R_2: -35 * DEG,
  Thumb_R_3: -28 * DEG,
};

export function closeRightFist(man: THREE.Object3D): void {
  for (const name of Object.keys(FIST_Z)) {
    const b = man.getObjectByName(name);
    if (!b) continue;
    _euler.setFromQuaternion(b.quaternion, "XYZ");
    _euler.z += FIST_Z[name];
    b.quaternion.setFromEuler(_euler);
  }
  const thumb = man.getObjectByName("Thumb_R_1");
  if (thumb) {
    _euler.setFromQuaternion(thumb.quaternion, "XYZ");
    _euler.y += 18 * DEG;
    _euler.z -= 12 * DEG;
    thumb.quaternion.setFromEuler(_euler);
  }
}

/**
 * READY rod only. No IK / FSM / wrist writes.
 */
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
