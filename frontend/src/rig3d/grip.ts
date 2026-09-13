import * as THREE from "three";

const _gripOff = new THREE.Vector3();
const _palm = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _invMan = new THREE.Matrix4();
const _basis = new THREE.Matrix4();

const DEG = Math.PI / 180;
/** Match reference: blank forward-up 30–45°, small yaw right, reel under. */
const PITCH = 38 * DEG;
const YAW = 6 * DEG;
const REEL_SEAT_ALONG = 0.22;
/** Hand local: +Y along the fingers. Puts the cork through the palm, not the wrist joint. */
const PALM_IN_HAND = new THREE.Vector3(0, 0.07, 0.01);

/**
 * READY rod — translation/rotation of the rod only. Does not write any bones.
 */
export function placeRodReady(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  const handR = man.getObjectByName("Hand_R");
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
  _palm.copy(PALM_IN_HAND).applyMatrix4(handR.matrixWorld).applyMatrix4(_invMan);
  _gripOff.set(0, REEL_SEAT_ALONG, 0).applyQuaternion(rod.quaternion);
  rod.position.copy(_palm).sub(_gripOff);
  return true;
}

export function attachRodToHand(man: THREE.Object3D, rod: THREE.Object3D): boolean {
  return placeRodReady(man, rod);
}
