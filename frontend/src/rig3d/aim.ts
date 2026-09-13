/**
 * PRE-CAST (AIM) — READY + raised tip, float off the water hanging on the line.
 * Does not rewrite READY. No IK. No world-copy. No CAST.
 */
import * as THREE from "three";
import { DEG, READY_PITCH } from "./approvedReady";

/** 42° — inside 35–45°, clearly above READY 30°. */
export const AIM_PITCH = 42 * DEG;
export const AIM_YAW = 4 * DEG;
/** Slack hang, not a fight line. */
export const AIM_LINE_TENSION = 0.05;
/** Metres below RodTip, slightly back toward the body. */
export const PRECAST_HANG_DROP = 1.08;
export const PRECAST_HANG_IN = 0.16;

void READY_PITCH;

const SPINE_X = 5 * DEG;
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

export function applyAimPose(man: THREE.Object3D): void {
  addLocalX(man, "Spine", SPINE_X);
  addLocalX(man, "Spine1", SPINE1_X);
  addLocalX(man, "Neck", NECK_X);
  addLocalX(man, "Head", HEAD_X);
}
