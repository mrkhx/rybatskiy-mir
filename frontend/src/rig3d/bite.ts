/**
 * BITE — float-first bite after approved WAIT.
 * t=0 matches WAIT rest. Does not start HOOKSET.
 */
import * as THREE from "three";
import { DEG } from "./approvedReady";
import {
  WAIT_AIM,
  WAIT_ARM_LFORE,
  WAIT_ARM_LX,
  WAIT_ARM_RFORE,
  WAIT_ARM_RX,
  WAIT_HEAD_X,
  WAIT_LINE_TENSION,
  WAIT_PITCH,
  applyWaitPose,
  type WaitSample,
} from "./wait";

export const BITE_DURATION = 1.05;
export const BITE_PRE = 0.18;
export const BITE_PAUSE = 0.38;
export const BITE_SINK = 0.68;
export const BITE_PRE_DIP = 0.02;
export const BITE_SINK_DIP = 0.078;
export const BITE_SIDE = 0.05;
export const BITE_TILT = 0.16;
export const BITE_TENSION = 0.55;
export const BITE_HEAD = 4 * DEG;
export const BITE_AIM = 0.08;
export const BITE_ARM = 1.6 * DEG;
export const BITE_BEND = 0.028;

export type BiteFloat = {
  dip: number;
  side: number;
  tilt: number;
  tension: number;
  phase: "pre" | "pause" | "sink" | "hold";
  react: number;
};

function clamp01(u: number) {
  return Math.max(0, Math.min(1, u));
}
function lerp(a: number, b: number, u: number) {
  return a + (b - a) * u;
}
function smooth(u: number) {
  const t = clamp01(u);
  return t * t * (3 - 2 * t);
}

export function isBiteClip(clip: string): boolean {
  return clip === "BITE_REACTION";
}

export function sampleBiteFloat(t: number): BiteFloat {
  const x = Math.max(0, t);
  if (x < BITE_PRE) {
    const u = smooth(x / BITE_PRE);
    return {
      dip: -BITE_PRE_DIP * u,
      side: 0.006 * u,
      tilt: 0.04 * u,
      tension: lerp(WAIT_LINE_TENSION, 0.18, u),
      phase: "pre",
      react: 0,
    };
  }
  if (x < BITE_PAUSE) {
    const u = smooth((x - BITE_PRE) / (BITE_PAUSE - BITE_PRE));
    return {
      dip: lerp(-BITE_PRE_DIP, -BITE_PRE_DIP * 0.55, u),
      side: lerp(0.006, 0.01, u),
      tilt: lerp(0.04, 0.025, u),
      tension: lerp(0.18, 0.2, u),
      phase: "pause",
      react: 0,
    };
  }
  if (x < BITE_SINK) {
    const u = smooth((x - BITE_PAUSE) / (BITE_SINK - BITE_PAUSE));
    return {
      dip: lerp(-BITE_PRE_DIP * 0.55, -BITE_SINK_DIP, u),
      side: lerp(0.01, BITE_SIDE, u),
      tilt: lerp(0.025, BITE_TILT, u),
      tension: lerp(0.2, BITE_TENSION, u),
      phase: "sink",
      react: smooth((x - 0.48) / 0.2),
    };
  }
  const u = smooth((x - BITE_SINK) / (BITE_DURATION - BITE_SINK));
  return {
    dip: -BITE_SINK_DIP - 0.006 * u,
    side: BITE_SIDE + 0.008 * u,
    tilt: lerp(BITE_TILT, BITE_TILT * 0.85, u),
    tension: lerp(BITE_TENSION, 0.58, u),
    phase: "hold",
    react: 1,
  };
}

export function sampleBitePose(biteT: number): WaitSample {
  const b = sampleBiteFloat(biteT);
  const r = b.react;
  const tip = b.phase === "pre" || b.phase === "pause" ? 0 : Math.max(r, b.phase === "sink" ? 0.35 : 1);
  return {
    pitch: WAIT_PITCH,
    yaw: 0,
    aim: WAIT_AIM + BITE_AIM * r,
    armRX: WAIT_ARM_RX + BITE_ARM * r,
    armRFore: WAIT_ARM_RFORE + 0.4 * DEG * r,
    armLX: WAIT_ARM_LX,
    armLFore: WAIT_ARM_LFORE,
    headX: WAIT_HEAD_X + BITE_HEAD * r,
    bend: 0.016 + BITE_BEND * tip,
    tension: b.tension,
  };
}

export function applyBitePose(man: THREE.Object3D, s: WaitSample): void {
  applyWaitPose(man, s);
}
