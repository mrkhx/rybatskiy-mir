export type BoneName =
  | "pelvis"
  | "torso"
  | "head"
  | "hairBack"
  | "hairFront"
  | "upperArm_L"
  | "forearm_L"
  | "hand_L"
  | "upperArm_R"
  | "forearm_R"
  | "hand_R"
  | "thigh_L"
  | "shin_L"
  | "foot_L"
  | "thigh_R"
  | "shin_R"
  | "foot_R";

export type AnimState =
  | "A_POSE"
  | "IDLE"
  | "READY"
  | "AIM"
  | "CAST_BACKSWING"
  | "CAST_FORWARD"
  | "CAST_RELEASE"
  | "CAST_FOLLOW"
  | "WAIT"
  | "BITE_REACTION"
  | "HOOKSET"
  | "REEL"
  | "FIGHT_LIGHT"
  | "FIGHT_HEAVY"
  | "LAND"
  | "RETURN_IDLE";

export type IkTarget = "none" | "support" | "reel";

export type RigPose = {
  rot: Partial<Record<BoneName, number>>;
  originX: number;
  originY: number;
  rodRot: number;
  rodBend: number;
  ik: IkTarget;
  crank: number;
};

export type RigPart = {
  id: BoneName;
  image: string;
  parent: string;
  x: number;
  y: number;
  pivotX: number;
  pivotY: number;
  cropX: number;
  cropY: number;
  width: number;
  height: number;
  defaultRotation: number;
  zIndex: number;
};

export type Anchor = { x: number; y: number };

export type RodSpec = {
  image: string;
  parent: string;
  gripAnchor: string;
  supportAnchor: string;
  width: number;
  height: number;
  pivotX: number;
  pivotY: number;
  reelX: number;
  reelY: number;
  supportX: number;
  supportY: number;
  tipX: number;
  tipY: number;
  lineStartX: number;
  lineStartY: number;
  length: number;
  scale: number;
  defaultRotation: number;
};

export type RigManifest = {
  id: string;
  name: string;
  sourceMaster: string;
  identityLock: string;
  nativeCanvasWidth: number;
  nativeCanvasHeight: number;
  baseline: number;
  characterScale: number;
  bindPoseAngles: Record<string, number>;
  parts: RigPart[];
  anchors: Record<string, Anchor>;
  rod: RodSpec;
  boneLengths: {
    upperArm_L: number;
    forearm_L: number;
    upperArm_R: number;
    forearm_R: number;
  };
};

export type WorldXf = { x: number; y: number; angle: number };

export const BONE_TREE: Record<string, BoneName[]> = {
  root: ["pelvis"],
  pelvis: ["torso", "thigh_L", "thigh_R"],
  torso: ["head", "upperArm_L", "upperArm_R"],
  head: ["hairBack", "hairFront"],
  upperArm_L: ["forearm_L"],
  forearm_L: ["hand_L"],
  hand_L: [],
  upperArm_R: ["forearm_R"],
  forearm_R: ["hand_R"],
  hand_R: [],
  thigh_L: ["shin_L"],
  shin_L: ["foot_L"],
  foot_L: [],
  thigh_R: ["shin_R"],
  shin_R: ["foot_R"],
  foot_R: [],
  hairBack: [],
  hairFront: [],
};

export function emptyPose(): RigPose {
  return {
    rot: {},
    originX: 0,
    originY: 0,
    rodRot: 0,
    rodBend: 0,
    ik: "none",
    crank: 0,
  };
}
