import { emptyPose, type AnimState, type RigPose } from "./types";

function pose(partial: Partial<RigPose> & { rot?: RigPose["rot"] }): RigPose {
  const base = emptyPose();
  return {
    ...base,
    ...partial,
    rot: { ...base.rot, ...partial.rot },
  };
}

/** Deltas in degrees from the painted A-pose. */
export const POSES: Record<AnimState, RigPose> = {
  A_POSE: pose({ ik: "none", rodRot: 18 }),

  IDLE: pose({
    ik: "support",
    rodRot: -78,
    rodBend: 3,
    rot: {
      pelvis: 1.2,
      torso: 4,
      head: -3,
      upperArm_R: 28,
      forearm_R: -22,
      hand_R: -18,
      thigh_L: 2,
      thigh_R: -2,
      shin_L: -3,
      shin_R: 2,
    },
  }),

  READY: pose({
    ik: "support",
    rodRot: -70,
    rodBend: 4,
    rot: {
      pelvis: 2,
      torso: 6,
      head: -5,
      upperArm_R: 22,
      forearm_R: -16,
      hand_R: -14,
      thigh_L: 3,
      thigh_R: -2,
    },
  }),

  AIM: pose({
    ik: "support",
    rodRot: -62,
    rodBend: 5,
    originY: -2,
    rot: {
      pelvis: 2.5,
      torso: 8,
      head: -6,
      upperArm_R: 16,
      forearm_R: -8,
      hand_R: -12,
      thigh_L: 5,
      shin_L: -4,
      thigh_R: -3,
    },
  }),

  CAST_BACKSWING: pose({
    ik: "none",
    rodRot: -8,
    rodBend: 8,
    originX: 8,
    rot: {
      pelvis: -5,
      torso: -10,
      head: 7,
      upperArm_R: -48,
      forearm_R: -14,
      hand_R: 10,
      upperArm_L: 16,
      forearm_L: 12,
      hand_L: 6,
      thigh_L: -5,
      thigh_R: 7,
      shin_R: -6,
    },
  }),

  CAST_FORWARD: pose({
    ik: "none",
    rodRot: -112,
    rodBend: 12,
    originX: -10,
    rot: {
      pelvis: 7,
      torso: 14,
      head: -8,
      upperArm_R: 52,
      forearm_R: 18,
      hand_R: -24,
      upperArm_L: 12,
      forearm_L: 22,
      thigh_L: 8,
      shin_L: -6,
      thigh_R: -6,
    },
  }),

  CAST_RELEASE: pose({
    ik: "none",
    rodRot: -128,
    rodBend: 5,
    originX: -6,
    rot: {
      pelvis: 5,
      torso: 10,
      head: -5,
      upperArm_R: 58,
      forearm_R: 10,
      hand_R: -16,
      upperArm_L: 10,
      forearm_L: 16,
      thigh_L: 6,
      thigh_R: -4,
    },
  }),

  CAST_FOLLOW: pose({
    ik: "none",
    rodRot: -96,
    rodBend: 6,
    rot: {
      pelvis: 3,
      torso: 7,
      head: -3,
      upperArm_R: 40,
      forearm_R: -8,
      hand_R: -14,
      upperArm_L: 8,
      forearm_L: 10,
    },
  }),

  WAIT: pose({
    ik: "support",
    rodRot: -66,
    rodBend: 8,
    rot: {
      pelvis: 1.5,
      torso: 5,
      head: -4,
      upperArm_R: 20,
      forearm_R: -12,
      hand_R: -14,
      thigh_L: 2,
      thigh_R: -1,
    },
  }),

  BITE_REACTION: pose({
    ik: "support",
    rodRot: -48,
    rodBend: 18,
    originY: 3,
    rot: {
      pelvis: -2,
      torso: -5,
      head: 4,
      upperArm_R: 12,
      forearm_R: 6,
      hand_R: 8,
      thigh_L: -3,
      thigh_R: 3,
    },
  }),

  HOOKSET: pose({
    ik: "support",
    rodRot: -28,
    rodBend: 10,
    originY: -8,
    originX: 4,
    rot: {
      pelvis: -6,
      torso: -12,
      head: 5,
      upperArm_R: -22,
      forearm_R: -16,
      hand_R: 6,
      thigh_L: -5,
      thigh_R: 6,
      shin_L: 3,
      shin_R: -6,
    },
  }),

  REEL: pose({
    ik: "reel",
    rodRot: -68,
    rodBend: 7,
    rot: {
      pelvis: 2,
      torso: 6,
      head: -5,
      upperArm_R: 18,
      forearm_R: -10,
      hand_R: -10,
    },
  }),

  FIGHT_LIGHT: pose({
    ik: "support",
    rodRot: -54,
    rodBend: 16,
    rot: {
      pelvis: -3,
      torso: -7,
      head: 3,
      upperArm_R: 10,
      forearm_R: 4,
      hand_R: 6,
      thigh_L: -4,
      thigh_R: 5,
      shin_L: 3,
      shin_R: -4,
    },
  }),

  FIGHT_HEAVY: pose({
    ik: "support",
    rodRot: -40,
    rodBend: 24,
    originX: 6,
    rot: {
      pelvis: -7,
      torso: -12,
      head: 7,
      upperArm_R: 4,
      forearm_R: 10,
      hand_R: 10,
      thigh_L: -8,
      thigh_R: 10,
      shin_L: 6,
      shin_R: -8,
      foot_L: 3,
      foot_R: -3,
    },
  }),

  LAND: pose({
    ik: "none",
    rodRot: -22,
    rodBend: 4,
    originY: 6,
    rot: {
      pelvis: 3,
      torso: 8,
      head: 10,
      upperArm_R: 14,
      forearm_R: 12,
      hand_R: 6,
      upperArm_L: 20,
      forearm_L: 28,
      hand_L: 8,
      thigh_L: 6,
      shin_L: -8,
      thigh_R: 3,
    },
  }),

  RETURN_IDLE: pose({
    ik: "support",
    rodRot: -78,
    rodBend: 3,
    rot: {
      pelvis: 1.2,
      torso: 4,
      head: -3,
      upperArm_R: 28,
      forearm_R: -22,
      hand_R: -18,
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
