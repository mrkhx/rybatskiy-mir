export type CharClip =
  | "IDLE"
  | "WALK"
  | "READY"
  | "AIM"
  | "CAST_BACKSWING"
  | "CAST_FORWARD"
  | "CAST_FOLLOW"
  | "FLOAT_LANDING"
  | "WAIT"
  | "BITE_REACTION"
  | "HOOKSET"
  | "REEL"
  | "FIGHT_LIGHT"
  | "FIGHT_HEAVY"
  | "LAND"
  | "RETURN_IDLE"
  | "TURN_LEFT"
  | "TURN_RIGHT"
  | "STEP_LEFT"
  | "STEP_RIGHT";

export type FishClip =
  | "SWIM_IDLE"
  | "SWIM_FAST"
  | "TURN_LEFT"
  | "TURN_RIGHT"
  | "STRUGGLE_LIGHT"
  | "STRUGGLE_HEAVY"
  | "SURFACE"
  | "LANDED";

export type IkMode = "none" | "support" | "reel";

export type DebugFlags = {
  skeleton: boolean;
  ik: boolean;
  rodAnchors: boolean;
  fishSkeleton: boolean;
  line: boolean;
  fps: boolean;
  orbit: boolean;
  fingers: boolean;
  armAxes: boolean;
};

export const LOOPING_CHAR = new Set<CharClip>([
  "IDLE",
  "WALK",
  "READY",
  "AIM",
  "WAIT",
  "REEL",
  "FIGHT_LIGHT",
  "FIGHT_HEAVY",
  "TURN_LEFT",
  "TURN_RIGHT",
]);

export const LOOPING_FISH = new Set<FishClip>([
  "SWIM_IDLE",
  "SWIM_FAST",
  "TURN_LEFT",
  "TURN_RIGHT",
  "STRUGGLE_LIGHT",
  "STRUGGLE_HEAVY",
  "SURFACE",
  "LANDED",
]);

export const CAST_SEQ: CharClip[] = ["CAST_BACKSWING", "CAST_FORWARD", "CAST_FOLLOW", "WAIT"];

export function tensionFor(clip: CharClip): number {
  switch (clip) {
    case "WAIT":
      return 0.08;
    case "BITE_REACTION":
      return 0.28;
    case "HOOKSET":
      return 0.4;
    case "REEL":
      return 0.22;
    case "FIGHT_LIGHT":
      return 0.48;
    case "FIGHT_HEAVY":
      return 0.82;
    case "CAST_BACKSWING":
      return 0.12;
    case "CAST_FORWARD":
      return 0.28;
    case "CAST_FOLLOW":
      return 0.1;
    case "FLOAT_LANDING":
      return 0.08;
    case "LAND":
      return 0.12;
    default:
      return 0.05;
  }
}

export function ikFor(clip: CharClip): IkMode {
  if (
    clip === "IDLE" ||
    clip === "WALK" ||
    clip === "READY" ||
    clip === "AIM" ||
    clip === "FLOAT_LANDING" ||
    clip === "RETURN_IDLE" ||
    clip.startsWith("CAST") ||
    clip.startsWith("TURN") ||
    clip.startsWith("STEP")
  ) {
    return "none";
  }
  if (clip === "REEL") return "reel";
  return "support";
}
