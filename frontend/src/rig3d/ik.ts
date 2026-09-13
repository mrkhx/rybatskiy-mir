import * as THREE from "three";

const _end = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _toEnd = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _world = new THREE.Quaternion();
const _parent = new THREE.Quaternion();
const _next = new THREE.Quaternion();
const _ident = new THREE.Quaternion();

/** CCD IK on a bone chain. `chain` is root→…→end effector (e.g. upper, lower, hand). */
export function ccdIK(chain: THREE.Object3D[], target: THREE.Vector3, iterations = 10, clamp = 1) {
  if (chain.length < 2) return;
  const end = chain[chain.length - 1];
  if (!end) return;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = chain.length - 2; i >= 0; i--) {
      const bone = chain[i];
      if (!bone) continue;
      bone.updateWorldMatrix(true, false);
      end.updateWorldMatrix(true, false);
      _origin.setFromMatrixPosition(bone.matrixWorld);
      _end.setFromMatrixPosition(end.matrixWorld);
      _toEnd.subVectors(_end, _origin).normalize();
      _toTarget.subVectors(target, _origin);
      const dist = _toTarget.length();
      if (dist < 1e-5) continue;
      _toTarget.multiplyScalar(1 / dist);
      _q.setFromUnitVectors(_toEnd, _toTarget);
      if (clamp < 1) _q.slerp(_ident, 1 - clamp);
      _world.setFromRotationMatrix(bone.matrixWorld);
      _next.copy(_q).multiply(_world);
      if (bone.parent) {
        _parent.setFromRotationMatrix(bone.parent.matrixWorld);
        bone.quaternion.copy(_parent.invert().multiply(_next));
      } else {
        bone.quaternion.copy(_next);
      }
      bone.updateMatrix();
      bone.updateWorldMatrix(false, true);
    }
  }
}

export function boneChain(root: THREE.Object3D, names: string[]): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const n of names) {
    const o = root.getObjectByName(n);
    if (o) out.push(o);
  }
  return out;
}

/** Two-bone arm IK (shoulder → elbow → wrist) via CCD. */
export function twoBoneIK(
  root: THREE.Object3D,
  names: [string, string, string],
  target: THREE.Vector3,
  iterations = 8,
) {
  const chain = boneChain(root, names);
  if (chain.length < 3) return;
  const upper = chain[0]!;
  const lower = chain[1]!;
  const hand = chain[2]!;
  upper.updateWorldMatrix(true, false);
  lower.updateWorldMatrix(true, false);
  hand.updateWorldMatrix(true, false);
  const shoulder = new THREE.Vector3().setFromMatrixPosition(upper.matrixWorld);
  const elbow = new THREE.Vector3().setFromMatrixPosition(lower.matrixWorld);
  const wrist = new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld);
  const len = shoulder.distanceTo(elbow) + elbow.distanceTo(wrist);
  const to = target.clone().sub(shoulder);
  const dist = to.length();
  if (dist > len * 0.98) {
    to.setLength(len * 0.98);
    target = shoulder.clone().add(to);
  }
  ccdIK(chain, target, iterations, 1);
}
