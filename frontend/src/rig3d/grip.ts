import * as THREE from "three";

const _gripOff = new THREE.Vector3();
const _hr = new THREE.Vector3();
const _hl = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _invMan = new THREE.Matrix4();
const _basis = new THREE.Matrix4();

const DEG = Math.PI / 180;
/** Character space: +X left, +Y up, +Z forward. Yaw to the RIGHT is −X. */
const PITCH = 12 * DEG;
const YAW = 6 * DEG;
const REEL_SEAT_ALONG = 0.22;

/**
 * READY rod — orientation and position only. Does not touch bones.
 * Blank: +12° pitch, +6° yaw right, reel under.
 * Handle sits between the two hands, slightly below the wrist joints
 * so the mesh is not pierced.
 */
export function placeRodReady(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  const handR = man.getObjectByName("Hand_R");
  const handL = man.getObjectByName("Hand_L");
  if (!handR) return false;
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
  handR.updateWorldMatrix(true, false);
  _invMan.copy(man.matrixWorld).invert();
  _hr.setFromMatrixPosition(handR.matrixWorld).applyMatrix4(_invMan);
  if (handL) {
    handL.updateWorldMatrix(true, false);
    _hl.setFromMatrixPosition(handL.matrixWorld).applyMatrix4(_invMan);
    // 70% right (reel seat) / 30% left (rear grip), then drop below the wrist bones.
    _hr.lerp(_hl, 0.3);
  }
  _hr.y -= 0.03;
  _gripOff.set(0, REEL_SEAT_ALONG, 0).applyQuaternion(rod.quaternion);
  rod.position.copy(_hr).sub(_gripOff);
  return true;
}

export function attachRodToHand(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  return placeRodReady(man, rod);
}
