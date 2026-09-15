import type { RigManifest, RigPart, RigPose, WorldXf } from "./types";

const DEG = Math.PI / 180;

export function d2r(deg: number): number {
  return deg * DEG;
}

export function r2d(rad: number): number {
  return rad / DEG;
}

function rotate(px: number, py: number, ox: number, oy: number, angle: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: px + ox * c - oy * s, y: py + ox * s + oy * c };
}

export type WorldMap = {
  bones: Record<string, WorldXf>;
  rod: {
    grip: { x: number; y: number };
    support: { x: number; y: number };
    tip: { x: number; y: number };
    reel: { x: number; y: number };
    lineStart: { x: number; y: number };
    angle: number;
  };
};

export function computeWorld(manifest: RigManifest, pose: RigPose): WorldMap {
  const byId = Object.fromEntries(manifest.parts.map((p) => [p.id, p])) as Record<string, RigPart>;
  const bones: Record<string, WorldXf> = {};

  const visit = (id: string): WorldXf => {
    const cached = bones[id];
    if (cached) return cached;
    const part = byId[id];
    if (!part) return { x: 0, y: 0, angle: 0 };
    const delta = d2r(pose.rot[part.id] ?? 0);
    const parentPart = byId[part.parent];
    if (part.parent === "root" || !parentPart) {
      const xf: WorldXf = {
        x: part.x + pose.originX,
        y: part.y + pose.originY,
        angle: delta,
      };
      bones[id] = xf;
      return xf;
    }
    const parent = visit(part.parent);
    const lx = part.x - parentPart.x;
    const ly = part.y - parentPart.y;
    const pos = rotate(parent.x, parent.y, lx, ly, parent.angle);
    const xf: WorldXf = { x: pos.x, y: pos.y, angle: parent.angle + delta };
    bones[id] = xf;
    return xf;
  };

  for (const part of manifest.parts) visit(part.id);

  const hand = bones.hand_R ?? { x: 0, y: 0, angle: 0 };
  const wrist = byId.hand_R;
  const gripA = manifest.anchors.RodGrip;
  const rod = manifest.rod;
  const gx = wrist && gripA ? gripA.x - wrist.x : 0;
  const gy = wrist && gripA ? gripA.y - wrist.y : 0;
  const grip = rotate(hand.x, hand.y, gx, gy, hand.angle);
  const rodAngle = hand.angle + d2r(rod.defaultRotation + pose.rodRot);
  const s = rod.scale;
  const local = (x: number, y: number) => rotate(grip.x, grip.y, (x - rod.pivotX) * s, (y - rod.pivotY) * s, rodAngle);

  return {
    bones,
    rod: {
      grip,
      support: local(rod.supportX, rod.supportY),
      tip: local(rod.tipX, rod.tipY),
      reel: local(rod.reelX, rod.reelY),
      lineStart: local(rod.lineStartX, rod.lineStartY),
      angle: rodAngle,
    },
  };
}
