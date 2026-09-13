"use client";

import { useMemo, type ReactNode } from "react";
import { applyLeftArmIk } from "./ik";
import { computeWorld } from "./kinematics";
import type { BoneName, RigManifest, RigPart, RigPose } from "./types";
import { BONE_TREE } from "./types";

const BASE = "/characters/adult-male";

type Props = {
  manifest: RigManifest;
  pose: RigPose;
  showBones?: boolean;
  showAnchors?: boolean;
  scale?: number;
  panY?: number;
};

export function CharacterRig({ manifest, pose, showBones, showAnchors, scale = 1, panY = 0 }: Props) {
  const solved = useMemo(() => applyLeftArmIk(manifest, pose), [manifest, pose]);
  const world = useMemo(() => computeWorld(manifest, solved), [manifest, solved]);
  const byId = useMemo(
    () => Object.fromEntries(manifest.parts.map((p) => [p.id, p])) as Record<BoneName, RigPart>,
    [manifest],
  );

  const renderBone = (id: BoneName): ReactNode => {
    const part = byId[id];
    if (!part) return null;
    const parent = part.parent === "root" ? null : byId[part.parent as BoneName];
    const left = parent ? part.x - parent.x : part.x + solved.originX;
    const top = parent ? part.y - parent.y : part.y + solved.originY;
    const rot = solved.rot[id] ?? 0;
    const kids = BONE_TREE[id] ?? [];
    return (
      <div
        key={id}
        className="rig-bone"
        data-bone={id}
        style={{
          left,
          top,
          transform: `rotate(${rot}deg)`,
          zIndex: part.zIndex,
        }}
      >
        <img
          className="rig-sprite"
          src={`${BASE}/${part.image}`}
          alt=""
          draggable={false}
          style={{
            left: -part.pivotX,
            top: -part.pivotY,
            width: part.width,
            height: part.height,
          }}
        />
        {kids.map((child) => renderBone(child))}
        {id === "hand_R" ? <RodNode manifest={manifest} pose={solved} showAnchors={showAnchors} /> : null}
      </div>
    );
  };

  const w = manifest.nativeCanvasWidth;
  const h = manifest.nativeCanvasHeight;

  return (
    <div
      className="rig-scale"
      style={{
        width: w * scale,
        height: h * scale,
        transform: panY ? `translateY(${panY}px)` : undefined,
      }}
    >
      <div
        className="rig-canvas"
        style={{
          width: w,
          height: h,
          transform: `scale(${scale})`,
        }}
      >
        {renderBone("pelvis")}
        {(showBones || showAnchors) && (
          <DebugOverlay manifest={manifest} world={world} showBones={showBones} showAnchors={showAnchors} />
        )}
      </div>
    </div>
  );
}

function RodNode({
  manifest,
  pose,
  showAnchors,
}: {
  manifest: RigManifest;
  pose: RigPose;
  showAnchors?: boolean;
}) {
  const rod = manifest.rod;
  const hand = manifest.parts.find((p) => p.id === "hand_R");
  const grip = manifest.anchors.RodGrip;
  if (!hand || !grip) return null;
  const s = rod.scale;
  const left = grip.x - hand.x;
  const top = grip.y - hand.y;
  const rot = rod.defaultRotation + pose.rodRot;
  return (
    <div
      className="rig-rod"
      data-bone="rod"
      style={{
        left,
        top,
        transform: `rotate(${rot}deg)`,
        zIndex: 15,
      }}
    >
      <img
        className="rig-rod-img"
        src={`${BASE}/${rod.image}`}
        alt=""
        draggable={false}
        style={{
          left: -rod.pivotX * s,
          top: -rod.pivotY * s,
          width: rod.width * s,
          height: rod.height * s,
        }}
      />
      {pose.rodBend !== 0 && (
      <div
        className="rig-rod-blank"
        style={{
          transform: `rotate(${pose.rodBend}deg)`,
          transformOrigin: `${(rod.reelX - rod.pivotX) * s}px ${(rod.reelY - rod.pivotY) * s}px`,
        }}
      >
        <img
          className="rig-rod-img"
          src={`${BASE}/${rod.image}`}
          alt=""
          draggable={false}
          style={{
            left: -rod.pivotX * s,
            top: -rod.pivotY * s,
            width: rod.width * s,
            height: rod.height * s,
            clipPath: `inset(0 0 0 ${Math.max(0, (rod.reelX - 8) * s)}px)`,
            opacity: 0.95,
          }}
        />
      </div>
      )}
      {showAnchors && (
        <>
          <i className="rig-dot grip" style={{ left: 0, top: 0 }} />
          <i
            className="rig-dot support"
            style={{ left: (rod.supportX - rod.pivotX) * s, top: (rod.supportY - rod.pivotY) * s }}
          />
          <i className="rig-dot tip" style={{ left: (rod.tipX - rod.pivotX) * s, top: (rod.tipY - rod.pivotY) * s }} />
          <i className="rig-dot reel" style={{ left: (rod.reelX - rod.pivotX) * s, top: (rod.reelY - rod.pivotY) * s }} />
        </>
      )}
    </div>
  );
}

function DebugOverlay({
  manifest,
  world,
  showBones,
  showAnchors,
}: {
  manifest: RigManifest;
  world: ReturnType<typeof computeWorld>;
  showBones?: boolean;
  showAnchors?: boolean;
}) {
  const w = manifest.nativeCanvasWidth;
  const h = manifest.nativeCanvasHeight;
  const B = world.bones;
  const lines: Array<[string, string]> = [
    ["pelvis", "torso"],
    ["torso", "head"],
    ["torso", "upperArm_L"],
    ["upperArm_L", "forearm_L"],
    ["forearm_L", "hand_L"],
    ["torso", "upperArm_R"],
    ["upperArm_R", "forearm_R"],
    ["forearm_R", "hand_R"],
    ["pelvis", "thigh_L"],
    ["thigh_L", "shin_L"],
    ["shin_L", "foot_L"],
    ["pelvis", "thigh_R"],
    ["thigh_R", "shin_R"],
    ["shin_R", "foot_R"],
  ];
  return (
    <svg className="rig-debug" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      {showBones &&
        lines.map(([a, b]) => {
          const A = B[a];
          const C = B[b];
          if (!A || !C) return null;
          return <line key={`${a}-${b}`} x1={A.x} y1={A.y} x2={C.x} y2={C.y} className="rig-debug-bone" />;
        })}
      {showBones &&
        Object.entries(B).map(([id, xf]) => (
          <circle key={id} cx={xf.x} cy={xf.y} r={7} className="rig-debug-joint" />
        ))}
      {showAnchors && (
        <>
          <circle cx={world.rod.grip.x} cy={world.rod.grip.y} r={9} className="rig-debug-grip" />
          <circle cx={world.rod.support.x} cy={world.rod.support.y} r={9} className="rig-debug-support" />
          <circle cx={world.rod.tip.x} cy={world.rod.tip.y} r={8} className="rig-debug-tip" />
          <circle cx={world.rod.reel.x} cy={world.rod.reel.y} r={8} className="rig-debug-reel" />
          <line
            x1={world.rod.grip.x}
            y1={world.rod.grip.y}
            x2={world.rod.tip.x}
            y2={world.rod.tip.y}
            className="rig-debug-rod"
          />
        </>
      )}
    </svg>
  );
}
