/** Strict production GLB contract. Debug proxies never satisfy this. */

export const CONTRACT_VERSION = "1.0.0";

export const FORBIDDEN_GENERATORS = [
  "rybatskiy-mir-rig3d",
  "rybatskiy-mir",
  "three.js procedural",
  "capsule-humanoid",
];

export const FISHERMAN_BONES = [
  "Hips",
  "Spine",
  "Spine1",
  "Chest",
  "Neck",
  "Head",
  "UpperArm_L",
  "LowerArm_L",
  "Hand_L",
  "UpperArm_R",
  "LowerArm_R",
  "Hand_R",
  "UpperLeg_L",
  "LowerLeg_L",
  "Foot_L",
  "UpperLeg_R",
  "LowerLeg_R",
  "Foot_R",
] as const;

export const FINGER_ROOTS = [
  "Thumb_L",
  "Index_L",
  "Middle_L",
  "Ring_L",
  "Pinky_L",
  "Thumb_R",
  "Index_R",
  "Middle_R",
  "Ring_R",
  "Pinky_R",
] as const;

export const FISHERMAN_CLIPS = [
  "IDLE",
  "WALK",
  "READY",
  "AIM",
  "CAST_BACKSWING",
  "CAST_FORWARD",
  "CAST_FOLLOW",
  "WAIT",
  "BITE_REACTION",
  "HOOKSET",
  "REEL",
  "FIGHT_LIGHT",
  "FIGHT_HEAVY",
  "LAND",
  "RETURN_IDLE",
] as const;

export const FISHERMAN_CLIPS_OPTIONAL = ["TURN_LEFT", "TURN_RIGHT", "STEP_LEFT", "STEP_RIGHT"] as const;

export const ROD_NODES = [
  "RodGrip",
  "RodTip",
  "LineStart",
  "Reel",
  "ReelHandle",
  "RodSupportTarget",
  "ReelHandleTarget",
] as const;

export const PIKE_BONES = ["PikeRoot", "Spine_0", "Tail", "Jaw", "Pectoral_L", "Pectoral_R", "Dorsal", "Anal"] as const;

export const PIKE_CLIPS = [
  "SWIM_IDLE",
  "SWIM_FAST",
  "TURN_LEFT",
  "TURN_RIGHT",
  "STRUGGLE_LIGHT",
  "STRUGGLE_HEAVY",
  "SURFACE",
  "LANDED",
] as const;

export const LIMITS = {
  fisherman: { trisMin: 30000, trisMax: 70000, heightMin: 1.55, heightMax: 1.95, depthMin: 0.18 },
  rod: { trisMin: 2000, trisMax: 25000, lengthMin: 1.4, lengthMax: 3.2 },
  pike: { trisMin: 8000, trisMax: 40000, lengthMin: 0.35, lengthMax: 1.6 },
  texMin: 1024,
  texTarget: 2048,
};

export type CheckLevel = "fail" | "warn";

export type ContractCheck = {
  id: string;
  ok: boolean;
  level: CheckLevel;
  detail: string;
};

export type AdapterReport = {
  kind: "fisherman" | "rod" | "pike";
  url: string;
  source: "production" | "debug";
  pass: boolean;
  generator: string;
  triangleCount: number;
  skinned: boolean;
  bones: string[];
  clips: string[];
  checks: ContractCheck[];
  stats: Record<string, string | number | boolean>;
};

export function summarize(report: AdapterReport): string {
  const failed = report.checks.filter((c) => !c.ok && c.level === "fail").map((c) => c.id);
  if (report.pass) return "PASS";
  return `FAIL ${failed.join(", ")}`;
}
