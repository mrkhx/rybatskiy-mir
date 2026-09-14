/**
 * READY/AIM arm life only. Torso stays planted. CAST does not use this.
 */
import * as THREE from "three";

const DEG = Math.PI / 180;
const REST: Record<string, THREE.Quaternion> = {};
const _q = new THREE.Quaternion();
const AXIS_X = new THREE.Vector3(1, 0, 0);
let t = 0;

function getBone(man: THREE.Object3D, name: string): THREE.Bone | null {
  let found: THREE.Bone | null = null;
  man.traverse((o) => {
    if (found) return;
    if ((o as THREE.Bone).isBone && o.name === name) found = o as THREE.Bone;
  });
  return found;
}

function addX(man: THREE.Object3D, name: string, angle: number) {
  const b = getBone(man, name);
  if (!b) return;
  if (!REST[name]) REST[name] = b.quaternion.clone();
  b.quaternion.copy(REST[name]);
  _q.setFromAxisAngle(AXIS_X, angle);
  b.quaternion.multiply(_q);
}

export function liveArms(man: THREE.Object3D, dt: number): void {
  t += dt;
  addX(man, "UpperArm_R", 2.4 * DEG * Math.sin(t * 1.35));
  addX(man, "LowerArm_R", 1.8 * DEG * Math.sin(t * 1.35 + 0.5));
  addX(man, "UpperArm_L", 2.0 * DEG * Math.sin(t * 1.22 + 0.9));
  addX(man, "LowerArm_L", 1.5 * DEG * Math.sin(t * 1.22 + 1.3));
}

export function amplifyIdle(man: THREE.Object3D): void {
  liveArms(man, 1 / 60);
}
