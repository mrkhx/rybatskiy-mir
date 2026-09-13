import type { BoneName, RigPose } from "./types";

/** Deltas from A-pose. Keep painted sleeves from flipping inside-out. */
export const JOINT_LIMITS: Partial<Record<BoneName, [number, number]>> = {
  pelvis: [-8, 8],
  torso: [-12, 12],
  head: [-10, 10],
  upperArm_L: [-58, 14],
  forearm_L: [-8, 40],
  hand_L: [-18, 18],
  upperArm_R: [-36, 32],
  forearm_R: [-22, 22],
  hand_R: [-20, 16],
  thigh_L: [-8, 10],
  shin_L: [-8, 8],
  foot_L: [-6, 6],
  thigh_R: [-8, 10],
  shin_R: [-8, 8],
  foot_R: [-6, 6],
};

export function clampAngle(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function clampPose(pose: RigPose): RigPose {
  const rot: RigPose["rot"] = { ...pose.rot };
  for (const [id, range] of Object.entries(JOINT_LIMITS)) {
    const key = id as BoneName;
    const [lo, hi] = range;
    rot[key] = clampAngle(rot[key] ?? 0, lo, hi);
  }
  return {
    ...pose,
    rot,
    rodBend: clampAngle(pose.rodBend, 0, 18),
    originX: clampAngle(pose.originX, -10, 10),
    originY: clampAngle(pose.originY, -10, 10),
  };
}
