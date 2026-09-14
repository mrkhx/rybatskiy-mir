/**
 * READY/AIM: visible arm+rod hold motion. Torso planted. CAST does not use this.
 */
import * as THREE from "three";

const DEG = Math.PI / 180;
const REST: Record<string, THREE.Quaternion> = {};
const _q = new THREE.Quaternion();
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
let t = 0;

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

/** Both arms lift/lower the rod together — readable from the side. */
export function liveArms(man: THREE.Object3D, dt: number): void {
  t += dt;
  const s = Math.sin(t * 1.05);
  add(man, "UpperArm_R", AXIS_Z, 9 * DEG * s);
  add(man, "LowerArm_R", AXIS_X, 11 * DEG * s);
  add(man, "UpperArm_L", AXIS_Z, 8 * DEG * s);
  add(man, "LowerArm_L", AXIS_X, 10 * DEG * s);
}

export function amplifyIdle(man: THREE.Object3D): void {
  liveArms(man, 1 / 60);
}
