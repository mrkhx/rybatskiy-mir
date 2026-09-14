/**
 * PRE-CAST (AIM) runtime — consumes approvedPrecast.ts.
 * Do not retune here.
 */
import * as THREE from "three";
import {
  AIM_PITCH,
  AIM_YAW,
  AIM_LINE_TENSION,
  PRECAST_HANG_DROP,
  PRECAST_HANG_IN,
  PRECAST_SPINE_X,
  PRECAST_SPINE1_X,
  PRECAST_NECK_X,
  PRECAST_HEAD_X,
} from "./approvedPrecast";

export {
  AIM_PITCH,
  AIM_YAW,
  AIM_LINE_TENSION,
  PRECAST_HANG_DROP,
  PRECAST_HANG_IN,
};

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

export function applyAimPose(man: THREE.Object3D): void {
  addLocalX(man, "Spine", PRECAST_SPINE_X);
  addLocalX(man, "Spine1", PRECAST_SPINE1_X);
  addLocalX(man, "Neck", PRECAST_NECK_X);
  addLocalX(man, "Head", PRECAST_HEAD_X);
}
