/**
 * AIM — small offset on top of approved READY.
 * Does not rewrite READY. No IK. No world-copy.
 */
import * as THREE from "three";
import { DEG, READY_PITCH } from "./approvedReady";

/** Tip a bit higher than READY 30°. Still well below a cast. */
export const AIM_PITCH = READY_PITCH + 10 * DEG;
/** Slight aim to the fisherman's right, toward the water. */
export const AIM_YAW = 6 * DEG;
/** Line a little tighter than READY sag, not a fight. */
export const AIM_LINE_TENSION = 0.22;

const SPINE_X = 4 * DEG;
const SPINE1_X = 3 * DEG;
const NECK_X = 5 * DEG;
const HEAD_X = 4 * DEG;

const REST: Record<string, THREE.Quaternion> = {};
const _qx = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0);

function getBone(man: THREE.Object3D, name: string): THREE.Bone | null {
  let found: THREE.Bone | null = null;
  man.traverse((o) => {
    if (found) return;
    if ((o as THREE.Bone).isBone && o.name === name) found = o as THREE.Bone;
  });
  return found;
}

function addLocalX(man: THREE.Object3D, name: string, angle: number) {
  const b = getBone(man, name);
  if (!b) return;
  if (!REST[name]) REST[name] = b.quaternion.clone();
  b.quaternion.copy(REST[name]);
  _qx.setFromAxisAngle(_axisX, angle);
  b.quaternion.multiply(_qx);
}

/** Tiny collected lean + look along the blank. Arms untouched. */
export function applyAimPose(man: THREE.Object3D): void {
  addLocalX(man, "Spine", SPINE_X);
  addLocalX(man, "Spine1", SPINE1_X);
  addLocalX(man, "Neck", NECK_X);
  addLocalX(man, "Head", HEAD_X);
}
