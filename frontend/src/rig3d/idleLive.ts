/**
 * READY→AIM arm raise. Rod is glued to the right hand — arms lift it.
 * No idle rocking. CAST does not use this.
 */
import * as THREE from "three";

const DEG = Math.PI / 180;
const REST: Record<string, THREE.Quaternion> = {};
const _q = new THREE.Quaternion();
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

function getBone(man: THREE.Object3D, name: string): THREE.Bone | null {
  let found: THREE.Bone | null = null;
  man.traverse((o) => {
    if (found) return;
    if ((o as THREE.Bone).isBone && o.name === name) found = o as THREE.Bone;
  });
  return found;
}

function add(man: THREE.Object3D, name: string, axis: THREE.Vector3, angle: number) {
  const b = getBone(man, name);
  if (!b) return;
  if (!REST[name]) REST[name] = b.quaternion.clone();
  b.quaternion.copy(REST[name]);
  _q.setFromAxisAngle(axis, angle);
  b.quaternion.multiply(_q);
}

/** u=0 READY, u=1 AIM. Both arms raise the glued rod. */
export function applyAimArms(man: THREE.Object3D, u: number): void {
  const k = Math.max(0, Math.min(1, u));
  add(man, "UpperArm_R", AXIS_Z, 10 * DEG * k);
  add(man, "LowerArm_R", AXIS_X, 12 * DEG * k);
  add(man, "UpperArm_L", AXIS_Z, 9 * DEG * k);
  add(man, "LowerArm_L", AXIS_X, 11 * DEG * k);
}

export function liveArms(man: THREE.Object3D, _dt: number): void {
  applyAimArms(man, 0);
}
