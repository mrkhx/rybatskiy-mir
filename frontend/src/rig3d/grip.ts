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
/** 30° to the horizon, character-forward. Identity +Y is vertical, so this is the blank axis. */
const PITCH = 30 * DEG;
const YAW = 0;
const REEL_SEAT_ALONG = 0.22;

/**
 * READY rod only. No bone writes, no IK, no FSM.
 * Blank: character forward, 30° up. Reel under. Grip at the thumb base / finger line.
 */
export function placeRodReady(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  const handR = man.getObjectByName("Hand_R");
  const thumb = man.getObjectByName("Thumb_R_1");
  const index = man.getObjectByName("Index_R_1");
  if (!handR) return false;
  if (rod.parent !== man) man.add(rod);
  rod.visible = true;
  rod.scale.setScalar(1);

  // man-local: +Y up, +Z character forward. Blank = forward and 30° up.
  _y.set(-Math.sin(YAW), Math.sin(PITCH), Math.cos(PITCH) * Math.cos(YAW)).normalize();
  _z.set(0, -1, 0);
  _z.addScaledVector(_y, -_z.dot(_y)).normalize();
  if (_z.lengthSq() < 1e-8) _z.set(1, 0, 0).normalize();
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
    // Finger line: between thumb base and index, not the palm centre / wrist.
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
