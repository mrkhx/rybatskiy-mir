import { computeWorld } from "./kinematics";
import { d2r, r2d } from "./kinematics";
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
  const ux = Math.cos(base);
  const uy = Math.sin(base);
  const cx = ox + ux * dist;
  const cy = oy + uy * dist;
  const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1);
  const a = Math.acos(cosA);
  const a1 = base - sign * a;
  const ex = ox + Math.cos(a1) * l1;
  const ey = oy + Math.sin(a1) * l1;
  const a2 = Math.atan2(cy - ey, cx - ex);
  return { a1, a2 };
}

/** Overwrite left-arm deltas so the wrist reaches rod support / reel. */
export function applyLeftArmIk(manifest: RigManifest, pose: RigPose): RigPose {
  if (pose.ik === "none") return pose;
  const world = computeWorld(manifest, pose);
  const shoulder = world.bones.upperArm_L;
  if (!shoulder) return pose;

  let target = world.rod.support;
  if (pose.ik === "reel") {
    const ang = pose.crank * Math.PI * 2;
    const r = 34;
    target = {
      x: world.rod.reel.x + Math.cos(ang) * r,
      y: world.rod.reel.y + Math.sin(ang) * r,
    };
  }

  const l1 = manifest.boneLengths.upperArm_L;
  const l2 = manifest.boneLengths.forearm_L;
  const sign = target.y > shoulder.y ? 1 : -1;
  const { a1, a2 } = solve2Bone(shoulder.x, shoulder.y, target.x, target.y, l1, l2, sign);

  const torso = world.bones.torso;
  const ancestor = torso?.angle ?? 0;
  const bindU = d2r(manifest.bindPoseAngles.upperArm_L ?? 0);
  const bindF = d2r(manifest.bindPoseAngles.forearm_L ?? 0);
  const bindH = d2r(manifest.bindPoseAngles.hand_L ?? 0);

  const upperDelta = r2d(a1 - bindU - ancestor);
  const foreDelta = r2d(a2 - bindF - (ancestor + d2r(upperDelta)));
  const rodDir = world.rod.angle;
  const handWorld = ancestor + d2r(upperDelta) + d2r(foreDelta);
  const handDelta = r2d(rodDir - bindH - handWorld);

  return {
    ...pose,
    rot: {
      ...pose.rot,
      upperArm_L: upperDelta,
      forearm_L: foreDelta,
      hand_L: handDelta,
    },
  };
}
