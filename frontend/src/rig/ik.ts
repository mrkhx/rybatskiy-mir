import { computeWorld } from "./kinematics";
import { d2r, r2d } from "./kinematics";
import { clampAngle, clampPose, JOINT_LIMITS } from "./limits";
import type { RigManifest, RigPose } from "./types";

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function solve2Bone(
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  l1: number,
  l2: number,
  sign: number,
) {
  let dx = tx - ox;
  let dy = ty - oy;
  const raw = Math.hypot(dx, dy) || 0.001;
  const maxd = l1 + l2 - 0.75;
  const mind = Math.abs(l1 - l2) + 0.75;
  const dist = clamp(raw, mind, maxd);
  const base = Math.atan2(dy, dx);
  const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1);
  const a = Math.acos(cosA);
  const a1 = base - sign * a;
  const ex = ox + Math.cos(a1) * l1;
  const ey = oy + Math.sin(a1) * l1;
  const a2 = Math.atan2(oy + Math.sin(base) * dist - ey, ox + Math.cos(base) * dist - ex);
  return { a1, a2 };
}

function clampBone(id: "upperArm_L" | "forearm_L" | "hand_L", v: number) {
  const range = JOINT_LIMITS[id];
  if (!range) return v;
  return clampAngle(v, range[0], range[1]);
}

function sampleRodPoint(
  grip: { x: number; y: number },
  tip: { x: number; y: number },
  t: number,
) {
  return { x: grip.x + (tip.x - grip.x) * t, y: grip.y + (tip.y - grip.y) * t };
}

/**
 * Place the left wrist on the rod without flipping the painted sleeve.
 * Samples the blank and keeps the solution with the smallest joint-limit error
 * so the hand comes to the rod instead of stretching across the chest.
 */
export function applyLeftArmIk(manifest: RigManifest, pose: RigPose): RigPose {
  const limited = clampPose(pose);
  if (limited.ik === "none") return limited;
  const world = computeWorld(manifest, limited);
  const shoulder = world.bones.upperArm_L;
  if (!shoulder) return limited;

  const l1 = manifest.boneLengths.upperArm_L;
  const l2 = manifest.boneLengths.forearm_L;
  const sign = 1;
  const torso = world.bones.torso;
  const ancestor = torso?.angle ?? 0;
  const bindU = d2r(manifest.bindPoseAngles.upperArm_L ?? 0);
  const bindF = d2r(manifest.bindPoseAngles.forearm_L ?? 0);
  const bindH = d2r(manifest.bindPoseAngles.hand_L ?? 0);

  let preferred = world.rod.support;
  if (limited.ik === "reel") {
    const ang = limited.crank * Math.PI * 2;
    const r = 12;
    preferred = {
      x: world.rod.reel.x + Math.cos(ang) * r,
      y: world.rod.reel.y + Math.sin(ang) * r,
    };
  }

  let best: { upper: number; fore: number; hand: number; score: number } | null = null;
  for (let i = 0; i <= 24; i += 1) {
    const t = 0.22 + (0.72 * i) / 24;
    const p = sampleRodPoint(world.rod.grip, world.rod.tip, t);
    const { a1, a2 } = solve2Bone(shoulder.x, shoulder.y, p.x, p.y, l1, l2, sign);
    const upperRaw = r2d(a1 - bindU - ancestor);
    const upper = clampBone("upperArm_L", upperRaw);
    const foreRaw = r2d(a2 - bindF - (ancestor + d2r(upper)));
    const fore = clampBone("forearm_L", foreRaw);
    const handWorld = ancestor + d2r(upper) + d2r(fore);
    const hand = clampBone("hand_L", r2d(world.rod.angle - bindH - handWorld));
    const limitErr = Math.abs(upper - upperRaw) + Math.abs(fore - foreRaw);
    const prefErr = Math.hypot(p.x - preferred.x, p.y - preferred.y) / 80;
    const score = limitErr * 4 + prefErr;
    if (!best || score < best.score) best = { upper, fore, hand, score };
  }
  if (!best) return limited;

  return {
    ...limited,
    rot: {
      ...limited.rot,
      upperArm_L: best.upper,
      forearm_L: best.fore,
      hand_L: best.hand,
    },
  };
}
