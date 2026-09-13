export type AnimState =
  | "IDLE"
  | "AIM"
  | "CAST_START"
  | "CAST_RELEASE"
  | "CAST_END"
  | "WAITING"
  | "BITE_REACTION"
  | "HOOKSET"
  | "FIGHT_LIGHT"
  | "FIGHT_HEAVY"
  | "REEL"
  | "LAND_FISH"
  | "LOSE_FISH";

export type SceneSnap = {
  sessionState: string | null;
  tension: number;
  fishStamina: number;
  fightProgress: number;
  force: number;
  wx: string;
  feeding: boolean;
};

export type Pose = {
  lean: number;
  head: number;
  breath: number;
  armRSh: number;
  armREl: number;
  armLSh: number;
  armLEl: number;
  rodAngle: number;
  rodBend: number;
  gripX: number;
  gripY: number;
  tipX: number;
  tipY: number;
  lureX: number;
  lureY: number;
  lureFlying: boolean;
  floatX: number;
  floatY: number;
  floatSub: number;
  floatTilt: number;
  floatVisible: boolean;
  lineSag: number;
  lineBroken: boolean;
  fishX: number;
  fishY: number;
  fishVis: number;
  splash: number;
  rings: number;
};

export const REST_FLOAT = { x: 63.5, y: 61.2 };
export const REST_GRIP = { x: 28.4, y: 54.8 };
