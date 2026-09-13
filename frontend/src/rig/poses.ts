import { emptyPose, type AnimState, type RigPose } from "./types";

function pose(partial: Partial<RigPose> & { rot?: RigPose["rot"] }): RigPose {
  const base = emptyPose();
  return {
    ...base,
    ...partial,
    rot: { ...base.rot, ...partial.rot },
  };
}

/**
 * Deltas in degrees from the painted A-pose.
 * Fishing holds keep the rod across the body (world ~-165°) so the left
 * fist meets the blank without flipping the sleeve.
 */
export const POSES: Record<AnimState, RigPose> = {
  A_POSE: pose({ ik: "none", rodRot: 10 }),

  IDLE: pose({
    ik: "support",
    rodRot: -162,
    rodBend: 2,
    rot: {
      pelvis: 1,
      torso: 2,
      head: -2,
      upperArm_R: 24,
      forearm_R: -16,
      hand_R: -6,
      upperArm_L: -52,
      forearm_L: -4,
      hand_L: 4,
      thigh_L: 2,
      thigh_R: -2,
      shin_L: -2,
      shin_R: 2,
    },
  }),

  READY: pose({
    ik: "support",
    rodRot: -156,
    rodBend: 3,
    rot: {
      pelvis: 1.5,
      torso: 3,
      head: -3,
      upperArm_R: 20,
      forearm_R: -14,
      hand_R: -6,
      upperArm_L: -50,
      forearm_L: -2,
      thigh_L: 2,
      thigh_R: -1,
    },
  }),

  AIM: pose({
    ik: "support",
    rodRot: -150,
    rodBend: 3,
    originY: -1,
    rot: {
      pelvis: 2,
      torso: 4,
      head: -3,
      upperArm_R: 16,
      forearm_R: -10,
      hand_R: -6,
      upperArm_L: -48,
      forearm_L: 0,
      thigh_L: 3,
      shin_L: -2,
      thigh_R: -2,
    },
  }),

  CAST_BACKSWING: pose({
    ik: "none",
    rodRot: -20,
    rodBend: 6,
    originX: 4,
    rot: {
      pelvis: -4,
      torso: -8,
      head: 5,
      upperArm_R: -28,
      forearm_R: -10,
      hand_R: 8,
      upperArm_L: 8,
      forearm_L: 8,
      thigh_L: -4,
      thigh_R: 5,
      shin_R: -4,
    },
  }),

  CAST_FORWARD: pose({
    ik: "none",
    rodRot: -170,
    rodBend: 8,
    originX: -6,
    rot: {
      pelvis: 5,
      torso: 10,
      head: -5,
      upperArm_R: 28,
      forearm_R: 8,
      hand_R: -12,
      upperArm_L: -30,
      forearm_L: 10,
      thigh_L: 6,
      shin_L: -4,
      thigh_R: -4,
    },
  }),

  CAST_RELEASE: pose({
    ik: "none",
    rodRot: -176,
    rodBend: 4,
    originX: -4,
    rot: {
      pelvis: 4,
      torso: 8,
      head: -3,
      upperArm_R: 30,
      forearm_R: 6,
      hand_R: -10,
      upperArm_L: -28,
      forearm_L: 8,
      thigh_L: 4,
      thigh_R: -3,
    },
  }),

  CAST_FOLLOW: pose({
    ik: "none",
    rodRot: -166,
    rodBend: 4,
    rot: {
      pelvis: 2,
      torso: 5,
      head: -2,
      upperArm_R: 24,
      forearm_R: -8,
      hand_R: -8,
      upperArm_L: -40,
      forearm_L: 4,
    },
  }),

  WAIT: pose({
    ik: "support",
    rodRot: -170,
    rodBend: 4,
    rot: {
      pelvis: 1,
      torso: 2,
      head: -2,
      upperArm_R: 22,
      forearm_R: -14,
      hand_R: -6,
      upperArm_L: -54,
      forearm_L: -4,
      thigh_L: 2,
      thigh_R: -1,
    },
  }),

  BITE_REACTION: pose({
    ik: "support",
    rodRot: -146,
    rodBend: 10,
    originY: 2,
    rot: {
      pelvis: -2,
      torso: -4,
      head: 3,
      upperArm_R: 12,
      forearm_R: 4,
      hand_R: 6,
      upperArm_L: -46,
      forearm_L: 2,
      thigh_L: -2,
      thigh_R: 2,
    },
  }),

  HOOKSET: pose({
    ik: "support",
    rodRot: -132,
    rodBend: 6,
    originY: -4,
    originX: 2,
    rot: {
      pelvis: -4,
      torso: -8,
      head: 4,
      upperArm_R: -8,
      forearm_R: -8,
      hand_R: 4,
      upperArm_L: -36,
      forearm_L: 6,
      thigh_L: -3,
      thigh_R: 4,
      shin_L: 2,
      shin_R: -4,
    },
  }),

  REEL: pose({
    ik: "reel",
    rodRot: -158,
    rodBend: 4,
    rot: {
      pelvis: 1.5,
      torso: 3,
      head: -2,
      upperArm_R: 20,
      forearm_R: -12,
      hand_R: -4,
      upperArm_L: -46,
      forearm_L: 6,
      hand_L: 6,
    },
  }),

  FIGHT_LIGHT: pose({
    ik: "support",
    rodRot: -148,
    rodBend: 9,
    rot: {
      pelvis: -3,
      torso: -6,
      head: 2,
      upperArm_R: 14,
      forearm_R: 2,
      hand_R: 4,
      upperArm_L: -50,
      forearm_L: 2,
      thigh_L: -3,
      thigh_R: 3,
      shin_L: 2,
      shin_R: -3,
    },
  }),

  FIGHT_HEAVY: pose({
    ik: "support",
    rodRot: -138,
    rodBend: 14,
    originX: 4,
    rot: {
      pelvis: -6,
      torso: -10,
      head: 5,
      upperArm_R: 8,
      forearm_R: 8,
      hand_R: 8,
      upperArm_L: -44,
      forearm_L: 6,
      thigh_L: -6,
      thigh_R: 8,
      shin_L: 4,
      shin_R: -6,
    },
  }),

  LAND: pose({
    ik: "none",
    rodRot: -40,
    rodBend: 3,
    originY: 4,
    rot: {
      pelvis: 2,
      torso: 6,
      head: 8,
      upperArm_R: 12,
      forearm_R: 8,
      hand_R: 4,
      upperArm_L: 8,
      forearm_L: 14,
      thigh_L: 4,
      shin_L: -6,
      thigh_R: 2,
    },
  }),

  RETURN_IDLE: pose({
    ik: "support",
    rodRot: -162,
    rodBend: 2,
    rot: {
      pelvis: 1,
      torso: 2,
      head: -2,
      upperArm_R: 24,
      forearm_R: -16,
      hand_R: -6,
      upperArm_L: -52,
      forearm_L: -4,
    },
  }),
};

export type EaseName = "linear" | "in" | "out" | "inOut";

export type ClipStep = { state: AnimState; duration: number; ease: EaseName };

export const CLIPS: Record<string, ClipStep[]> = {
  CAST: [
    { state: "CAST_BACKSWING", duration: 0.46, ease: "in" },
    { state: "CAST_FORWARD", duration: 0.16, ease: "out" },
    { state: "CAST_RELEASE", duration: 0.14, ease: "linear" },
    { state: "CAST_FOLLOW", duration: 0.32, ease: "out" },
    { state: "WAIT", duration: 0.4, ease: "inOut" },
  ],
  HOOK: [
    { state: "HOOKSET", duration: 0.12, ease: "out" },
    { state: "WAIT", duration: 0.28, ease: "inOut" },
  ],
  LAND_SEQ: [
    { state: "LAND", duration: 0.55, ease: "out" },
    { state: "RETURN_IDLE", duration: 0.7, ease: "inOut" },
    { state: "IDLE", duration: 0.45, ease: "inOut" },
  ],
};

export const LOOPING: Set<AnimState> = new Set([
  "IDLE",
  "WAIT",
  "REEL",
  "FIGHT_LIGHT",
  "FIGHT_HEAVY",
  "A_POSE",
  "AIM",
  "READY",
]);

export function easeT(t: number, ease: EaseName): number {
  const x = Math.max(0, Math.min(1, t));
  if (ease === "in") return x * x * x;
  if (ease === "out") return 1 - (1 - x) ** 3;
  if (ease === "inOut") return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
  return x;
}
