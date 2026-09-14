/**
 * PRE-CAST (AIM) runtime — consumes approvedPrecast.ts.
 * Torso overlays are off: local X on this skeleton is a side-lean, not forward.
 * Stance stays the planted READY pose.
 */
import {
  AIM_PITCH,
  AIM_YAW,
  AIM_LINE_TENSION,
  PRECAST_HANG_DROP,
  PRECAST_HANG_IN,
} from "./approvedPrecast";
import type * as THREE from "three";

export {
  AIM_PITCH,
  AIM_YAW,
  AIM_LINE_TENSION,
  PRECAST_HANG_DROP,
  PRECAST_HANG_IN,
};

export function applyAimPose(_man: THREE.Object3D): void {
  /* planted READY stance — do not roll Spine/Neck */
}
