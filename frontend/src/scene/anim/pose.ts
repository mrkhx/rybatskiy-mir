import type { AnimState, Pose, SceneSnap } from "./types";
import { REST_FLOAT, REST_GRIP } from "./types";

export function idlePose(): Pose {
  return {
    lean: 0,
    head: 0,
    breath: 0,
    armRSh: -18,
    armREl: 22,
    armLSh: 12,
    armLEl: 16,
    rodAngle: 14,
    rodBend: 0.04,
    gripX: REST_GRIP.x,
    gripY: REST_GRIP.y,
    tipX: 48.8,
    tipY: 35.2,
    lureX: REST_GRIP.x,
    lureY: REST_GRIP.y,
    lureFlying: false,
    floatX: REST_FLOAT.x,
    floatY: REST_FLOAT.y,
    floatSub: 0.12,
    floatTilt: 0,
    floatVisible: false,
    lineSag: 0.55,
    lineBroken: false,
    fishX: REST_FLOAT.x,
    fishY: REST_FLOAT.y + 4,
    fishVis: 0,
    splash: 0,
    rings: 0,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function easeOut(t: number) {
  return 1 - (1 - t) * (1 - t);
}

function tipFrom(gripX: number, gripY: number, angleDeg: number, bend: number, len = 26) {
  const a = (angleDeg * Math.PI) / 180;
  const bow = bend * 7;
  return {
    x: gripX + Math.cos(a) * len,
    y: gripY + Math.sin(a) * len + bow,
  };
}

export function solvePose(state: AnimState, age: number, t: number, snap: SceneSnap, prev: Pose): Pose {
  const p = { ...prev };
  const br = Math.sin(t * 1.7);
  p.breath = br;
  p.gripX = REST_GRIP.x;
  p.gripY = REST_GRIP.y + br * 0.12;
  p.lineBroken = snap.sessionState === "BROKEN";
  p.lureFlying = false;
  p.splash = Math.max(0, p.splash - 1.6 * 0.016);
  p.rings = state === "WAITING" || state === "BITE_REACTION" ? 1 : Math.max(0, p.rings - 0.4 * 0.016);

  const wind = snap.wx === "STORM" || snap.wx === "WIND" ? 1 : snap.wx === "CALM" ? 0.12 : 0.4;
  const wave = Math.sin(t * 1.3) * 0.35 * wind;

  switch (state) {
    case "IDLE": {
      p.lean = 0;
      p.head = br * 0.3;
      p.armRSh = -18 + br * 1;
      p.armREl = 22 + br;
      p.armLSh = 12;
      p.armLEl = 16;
      p.rodAngle = 12 + br * 0.6 + wave * 0.4;
      p.rodBend = 0.05;
      p.floatVisible = false;
      p.fishVis = lerp(p.fishVis, 0, 0.08);
      p.lineSag = 0.7;
      break;
    }
    case "AIM": {
      p.lean = -6 + br * 0.4;
      p.head = -4;
      p.armRSh = -38;
      p.armREl = 8;
      p.armLSh = 6;
      p.rodAngle = -18;
      p.rodBend = 0.12;
      p.floatVisible = false;
      p.lineSag = 0.85;
      break;
    }
    case "CAST_START": {
      const k = easeOut(age / 0.32);
      p.lean = lerp(0, -11, k);
      p.head = lerp(0, -8, k);
      p.armRSh = lerp(-18, -58, k);
      p.armREl = lerp(22, 4, k);
      p.rodAngle = lerp(14, -42, k);
      p.rodBend = lerp(0.05, 0.45, k);
      p.floatVisible = false;
      p.lineSag = 0.9;
      break;
    }
    case "CAST_RELEASE": {
      const k = easeOut(age / 0.22);
      p.lean = lerp(-11, 6, k);
      p.head = lerp(-8, 4, k);
      p.armRSh = lerp(-58, 8, k);
      p.armREl = lerp(4, 28, k);
      p.rodAngle = lerp(-42, 18, k);
      p.rodBend = lerp(0.45, 0.08, k);
      p.lureFlying = true;
      p.lureX = lerp(REST_GRIP.x, REST_FLOAT.x * 0.55, k);
      p.lureY = lerp(REST_GRIP.y - 8, 28, k);
      p.floatVisible = false;
      p.lineSag = 0.25;
      break;
    }
    case "CAST_END": {
      const k = easeOut(age / 0.7);
      p.lean = lerp(6, 1, k);
      p.head = lerp(4, 0, k);
      p.armRSh = lerp(8, -16, k);
      p.armREl = lerp(28, 20, k);
      p.rodAngle = lerp(18, 12, k);
      p.rodBend = 0.1;
      p.lureFlying = k < 0.92;
      const arc = Math.sin(k * Math.PI) * -18;
      p.lureX = lerp(REST_GRIP.x + 8, REST_FLOAT.x, k);
      p.lureY = lerp(30, REST_FLOAT.y, k) + arc * (1 - k);
      p.floatVisible = k > 0.88;
      p.floatX = REST_FLOAT.x;
      p.floatY = REST_FLOAT.y;
      p.lineSag = lerp(0.15, 0.45, k);
      if (k > 0.88) p.splash = Math.max(p.splash, 1);
      if (k > 0.9) p.rings = 1;
      break;
    }
    case "WAITING": {
      p.lean = 0;
      p.head = br * 0.25;
      p.armRSh = -16 + br;
      p.armREl = 20 + br;
      p.armLSh = 10;
      p.rodAngle = 11 + br * 0.5 + wave * 0.3;
      p.rodBend = 0.07;
      p.floatVisible = true;
      p.floatX = REST_FLOAT.x + Math.sin(t * 0.9) * 0.35 * wind;
      p.floatY = REST_FLOAT.y + Math.sin(t * 1.6) * 0.45 + wave * 0.15;
      p.floatSub = 0.14 + Math.sin(t * 1.6) * 0.04;
      p.floatTilt = Math.sin(t * 1.4) * 6;
      p.lineSag = 0.42 + br * 0.05;
      p.fishVis = lerp(p.fishVis, 0, 0.1);
      break;
    }
    case "BITE_REACTION": {
      const nibble = Math.sin(t * 18);
      const dip = 0.5 + 0.5 * Math.sin(t * 3.2);
      p.lean = 2 + nibble * 0.8;
      p.head = 3;
      p.armRSh = -14;
      p.armREl = 18;
      p.rodAngle = 14 + nibble * 3;
      p.rodBend = 0.18 + dip * 0.12;
      p.floatVisible = true;
      p.floatX = REST_FLOAT.x + Math.sin(t * 9) * 1.1;
      p.floatY = REST_FLOAT.y + dip * 2.4;
      p.floatSub = 0.25 + dip * 0.55;
      p.floatTilt = nibble * 14;
      p.lineSag = 0.2;
      p.rings = 1;
      p.splash = Math.max(p.splash, dip > 0.85 ? 0.55 : 0.15);
      break;
    }
    case "HOOKSET": {
      const k = easeOut(age / 0.38);
      p.lean = lerp(2, -8, k);
      p.head = -6;
      p.armRSh = lerp(-14, -42, k);
      p.armREl = lerp(18, 6, k);
      p.rodAngle = lerp(14, -38, k);
      p.rodBend = lerp(0.2, 0.7, k);
      p.floatVisible = k < 0.55;
      p.floatSub = lerp(0.4, 1, k);
      p.lineSag = lerp(0.2, 0.02, k);
      p.splash = Math.max(p.splash, 0.8);
      p.fishVis = lerp(0, 0.35, k);
      break;
    }
    case "FIGHT_LIGHT":
    case "FIGHT_HEAVY":
    case "REEL": {
      const heavy = state === "FIGHT_HEAVY";
      const yank = Math.sin(t * (heavy ? 7.2 : 4.4));
      const pull = snap.tension;
      p.lean = (heavy ? 8 : 4) + yank * (heavy ? 3 : 1.4);
      p.head = yank * 2;
      p.armRSh = -28 + yank * 8;
      p.armREl = 12 + yank * 10;
      p.armLSh = 4 + yank * 6;
      p.rodAngle = -40 - pull * 18 + yank * (heavy ? 7 : 3);
      p.rodBend = 0.35 + pull * 0.55;
      p.floatVisible = false;
      p.lineSag = 0.02 + (1 - pull) * 0.08;
      p.fishX = REST_FLOAT.x + yank * (heavy ? 5 : 2.4) - snap.fightProgress * 6;
      p.fishY = REST_FLOAT.y + 3 + Math.sin(t * 3) * 1.4 - snap.fightProgress * 2;
      p.fishVis = 0.35 + snap.fightProgress * 0.5;
      p.splash = Math.max(p.splash, Math.abs(yank) > 0.85 ? 0.7 : 0.12);
      p.rings = 0.6;
      break;
    }
    case "LAND_FISH": {
      const k = easeOut(Math.min(1, age / 0.9));
      p.lean = lerp(6, -2, k);
      p.head = 4;
      p.armRSh = -22;
      p.armREl = 16;
      p.rodAngle = -34;
      p.rodBend = lerp(0.6, 0.12, k);
      p.floatVisible = false;
      p.lineSag = 0.15;
      p.fishX = lerp(REST_FLOAT.x - 4, 34, k);
      p.fishY = lerp(REST_FLOAT.y, 50, k);
      p.fishVis = 1;
      p.splash = k < 0.4 ? 0.6 : 0.1;
      break;
    }
    case "LOSE_FISH": {
      p.lean = 3;
      p.head = -2;
      p.armRSh = -10;
      p.armREl = 24;
      p.rodAngle = -18;
      p.rodBend = 0.04;
      p.floatVisible = false;
      p.lineSag = p.lineBroken ? 1 : 0.8;
      p.lineBroken = snap.sessionState === "BROKEN" || p.lineBroken;
      p.fishVis = lerp(p.fishVis, 0, 0.12);
      break;
    }
  }

  const tip = tipFrom(p.gripX, p.gripY, p.rodAngle, p.rodBend);
  p.tipX = tip.x;
  p.tipY = tip.y;
  if (!p.lureFlying && p.floatVisible) {
    p.lureX = p.floatX;
    p.lureY = p.floatY - 1.6 + p.floatSub * 1.2;
  } else if (!p.lureFlying && (state === "FIGHT_LIGHT" || state === "FIGHT_HEAVY" || state === "REEL")) {
    p.lureX = p.fishX;
    p.lureY = p.fishY;
  }
  return p;
}

export function windAmount(t: number, wx: string) {
  const amp = wx === "STORM" ? 1 : wx === "WIND" || wx === "DOWNPOUR" ? 0.78 : wx === "CALM" ? 0.12 : 0.42;
  return Math.sin(t * 0.85) * amp + Math.sin(t * 1.7) * amp * 0.35;
}
