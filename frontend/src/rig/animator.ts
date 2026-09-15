import { useEffect, useRef, useState } from "react";
import { clampPose } from "./limits";
import { CLIPS, LOOPING, POSES, easeT, type ClipStep, type EaseName } from "./poses";
import { emptyPose, type AnimState, type BoneName, type RigPose } from "./types";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number) {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * t;
}

const BONES: BoneName[] = [
  "pelvis",
  "torso",
  "head",
  "hairBack",
  "hairFront",
  "upperArm_L",
  "forearm_L",
  "hand_L",
  "upperArm_R",
  "forearm_R",
  "hand_R",
  "thigh_L",
  "shin_L",
  "foot_L",
  "thigh_R",
  "shin_R",
  "foot_R",
];

export function mixPose(a: RigPose, b: RigPose, t: number): RigPose {
  const rot: RigPose["rot"] = {};
  for (const id of BONES) {
    rot[id] = lerpAngle(a.rot[id] ?? 0, b.rot[id] ?? 0, t);
  }
  return clampPose({
    rot,
    originX: lerp(a.originX, b.originX, t),
    originY: lerp(a.originY, b.originY, t),
    rodRot: lerpAngle(a.rodRot, b.rodRot, t),
    rodBend: lerp(a.rodBend, b.rodBend, t),
    ik: t > 0.5 ? b.ik : a.ik,
    crank: lerp(a.crank, b.crank, t),
  });
}

function applyCycle(pose: RigPose, state: AnimState, t: number): RigPose {
  const rot = { ...pose.rot };
  let originX = pose.originX;
  let originY = pose.originY;
  let rodRot = pose.rodRot;
  let rodBend = pose.rodBend;
  let crank = pose.crank;

  if (state === "IDLE" || state === "READY" || state === "RETURN_IDLE") {
    const b = Math.sin(t * 1.85);
    originY += b * 1.8;
    rot.torso = (rot.torso ?? 0) + b * 0.7;
    rot.head = (rot.head ?? 0) + Math.sin(t * 1.2) * 0.5;
    rot.pelvis = (rot.pelvis ?? 0) + Math.sin(t * 0.92) * 0.45;
  }
  if (state === "WAIT" || state === "AIM") {
    const bob = Math.sin(t * 1.35);
    rodRot += bob * 2.2;
    rodBend += (bob + 1) * 0.8;
    rot.torso = (rot.torso ?? 0) + Math.sin(t * 1.7) * 0.5;
    originY += Math.sin(t * 1.7) * 1.2;
  }
  if (state === "REEL") {
    crank = (t * 1.05) % 1;
    rot.torso = (rot.torso ?? 0) + Math.sin(t * 6.6) * 0.28;
    rot.upperArm_R = (rot.upperArm_R ?? 0) + Math.sin(t * 6.6) * 0.9;
    rot.forearm_R = (rot.forearm_R ?? 0) + Math.sin(t * 6.6) * 1.4;
    rot.hand_R = (rot.hand_R ?? 0) + Math.sin(t * 6.6) * 2.2;
    rodBend += 1.1 + Math.sin(t * 2.4) * 0.5;
  }
  if (state === "FIGHT_LIGHT") {
    const w = Math.sin(t * 3.6);
    originX += w * 1.4;
    rot.torso = (rot.torso ?? 0) + w * 1.6;
    rot.pelvis = (rot.pelvis ?? 0) + w * 0.9;
    rot.upperArm_R = (rot.upperArm_R ?? 0) + Math.sin(t * 4.4) * 1.1;
    rot.forearm_R = (rot.forearm_R ?? 0) + Math.sin(t * 4.4) * 1.4;
    rodBend += 2 + (Math.sin(t * 4.8) + 1) * 1.4;
    rodRot += Math.sin(t * 3.6) * 1.8;
  }
  if (state === "FIGHT_HEAVY") {
    const w = Math.sin(t * 6.2);
    originX += w * 4;
    originY += Math.abs(Math.sin(t * 3.1)) * 2;
    rot.torso = (rot.torso ?? 0) + w * 4;
    rot.pelvis = (rot.pelvis ?? 0) + Math.sin(t * 3.1) * 2.4;
    rot.head = (rot.head ?? 0) + Math.sin(t * 6.4) * 2;
    rodBend += 5 + (Math.sin(t * 7.2) + 1) * 3;
    rodRot += w * 4;
  }
  return clampPose({ ...pose, rot, originX, originY, rodRot, rodBend, crank });
}

type PlayCmd =
  | { kind: "state"; state: AnimState; duration: number; ease: EaseName }
  | { kind: "clip"; steps: ClipStep[] };

export function useRigAnimator(initial: AnimState = "IDLE") {
  const [state, setState] = useState<AnimState>(initial);
  const [pose, setPose] = useState<RigPose>(() => POSES[initial] ?? emptyPose());
  const poseRef = useRef(pose);
  const stateRef = useRef(state);
  const cmdRef = useRef<PlayCmd | null>(null);
  const fromRef = useRef<RigPose>(pose);
  const tRef = useRef(0);
  const clockRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clockRef.current += dt;
      const cmd = cmdRef.current;
      if (cmd) {
        if (cmd.kind === "state") {
          tRef.current += dt;
          const u = easeT(tRef.current / cmd.duration, cmd.ease);
          const mixed = mixPose(fromRef.current, POSES[cmd.state], Math.min(1, u));
          if (u >= 1) {
            cmdRef.current = null;
            stateRef.current = cmd.state;
            setState(cmd.state);
            poseRef.current = mixed;
          } else {
            poseRef.current = mixed;
          }
        } else {
          const steps = cmd.steps;
          const acc = tRef.current + dt;
          let idx = 0;
          let elapsed = acc;
          while (idx < steps.length && elapsed > steps[idx]!.duration) {
            elapsed -= steps[idx]!.duration;
            idx += 1;
          }
          if (idx >= steps.length) {
            const lastStep = steps[steps.length - 1]!;
            cmdRef.current = null;
            stateRef.current = lastStep.state;
            setState(lastStep.state);
            poseRef.current = POSES[lastStep.state];
            fromRef.current = poseRef.current;
            tRef.current = 0;
          } else {
            const step = steps[idx]!;
            const prev = idx === 0 ? fromRef.current : POSES[steps[idx - 1]!.state];
            const u = easeT(elapsed / step.duration, step.ease);
            poseRef.current = mixPose(prev, POSES[step.state], u);
            if (stateRef.current !== step.state) {
              stateRef.current = step.state;
              setState(step.state);
            }
            tRef.current = acc;
          }
        }
      }
      const live = applyCycle(poseRef.current, stateRef.current, clockRef.current);
      setPose(live);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const playState = (next: AnimState, duration = 0.4, ease: EaseName = "inOut") => {
    fromRef.current = poseRef.current;
    tRef.current = 0;
    cmdRef.current = { kind: "state", state: next, duration, ease };
  };

  const playClip = (name: string) => {
    const steps = CLIPS[name];
    if (!steps?.length) return;
    fromRef.current = poseRef.current;
    tRef.current = 0;
    cmdRef.current = { kind: "clip", steps };
    stateRef.current = steps[0]!.state;
    setState(steps[0]!.state);
  };

  return { pose, state, looping: LOOPING.has(state), playState, playClip };
}
