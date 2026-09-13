import * as THREE from "three";

const _gripOff = new THREE.Vector3();
const _anchor = new THREE.Vector3();
const _index = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _invMan = new THREE.Matrix4();
const _basis = new THREE.Matrix4();

const DEG = Math.PI / 180;
const PITCH = 30 * DEG;
const REEL_SEAT_ALONG = 0.11;

/**
 * READY rod only. No bone / IK / FSM writes.
 *
 * The fisherman mesh faces man-local −X (camera is on −Z looking +Z, so at
 * yaw 180° / group identity the nose points screen-right = world −X).
 * Blank = that facing, 30° up. Reel under.
 */
export function placeRodReady(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  const handR = man.getObjectByName("Hand_R");
  const thumb = man.getObjectByName("Thumb_R_1");
  const index = man.getObjectByName("Index_R_1");
  if (!handR) return false;
  if (rod.parent !== man) man.add(rod);
  rod.visible = true;
  rod.scale.setScalar(1);

  // man −X = character facing. Pitch 30° up from the horizon.
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
