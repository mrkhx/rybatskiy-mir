"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { inspectFisherman } from "../scene3d/assets/characterAdapter";
import { inspectRod } from "../scene3d/assets/rodAdapter";
import { inspectPike } from "../scene3d/assets/fishAdapter";
import { DEBUG_PROXY, PRODUCTION, type AssetSource } from "../scene3d/assets/paths";
import type { AdapterReport } from "../scene3d/assets/contract";
import { importHumanoid } from "../scene3d/assets/retarget";
import { twoBoneIK } from "./ik";
import { applyRodBend, aimRod, spinReel, worldOf } from "./rodBend";
import { seatRodInHand, closeRightFist, rollRightWristOut, measureRodPitchYaw } from "./grip";
import { applyAimArms } from "./idleLive";
import { applyAimPose, AIM_PITCH, AIM_YAW, AIM_LINE_TENSION } from "./aim";
import { applyCastPose, CAST_DURATION, CAST_START_PITCH, CAST_START_YAW, isCastClip, sampleCast } from "./cast";
import { holdsCastPose, isFloatLanding, makeLandingSim } from "./floatLanding";
import { applyWaitPose, isWaitClip, sampleWait, WAIT_AFTER_LANDING, WAIT_BLEND, WAIT_LINE_TENSION } from "./wait";
import { applyBitePose, BITE_DURATION, isBiteClip, sampleBitePose } from "./bite";
import { applyHookPose, HOOK_DURATION, isHookClip, sampleHookPose } from "./hookset";
import { applyFightPose, FIGHT_LOOP, fightFishWorld, isFightClip, sampleFight } from "./fight";
import { applyReelLeftArm, isReelClip, REEL_APPROACH, REEL_APPROACH_CAP, REEL_REACH, reelSpeedFor } from "./reel";
import { applyLandPrepPose, isPrepClip, PREP_DURATION, prepFishWorld, sampleLandPrep } from "./landPrep";
import { applyLandPose, isLandClip, LAND_DURATION, LAND_FISH_SCALE, LAND_SURFACE_T, landFishWorld, sampleLand } from "./land";
import { applyHoldPose, holdFishWorld, isHoldClip, sampleHold } from "./landedHold";
import { applyReleasePose, isReleaseClip, RELEASE_DETACH, RELEASE_DURATION, RELEASE_ENTER, releaseFishWorld, releaseLeaderWorld, sampleRelease } from "./release";
import { applyKeepPose, isKeepClip, KEEP_DETACH, KEEP_DURATION, keepFishWorld, keepLeaderWorld, sampleKeep, setPikeFade } from "./keep";
import { applyReturnPose, isReturnClip, RETURN_DURATION, returnLeaderWorld, sampleReturn } from "./returnReady";
import { LOOPING_CHAR, ikFor, tensionFor, type CharClip, type DebugFlags, type FishClip } from "./types";
import { FishingLineView, LakeFloat, WaterPlane } from "./FloatActor";
import { WaterSplash } from "./waterSplash";

useGLTF.preload(PRODUCTION.fisherman);
useGLTF.preload(PRODUCTION.rod);
useGLTF.preload(DEBUG_PROXY.fisherman);
useGLTF.preload(DEBUG_PROXY.rod);
useGLTF.preload(DEBUG_PROXY.pike);

const _target = new THREE.Vector3();
const _fishMouth = new THREE.Vector3();
const _tip = new THREE.Vector3();
const _mid = new THREE.Vector3();

export type SceneReports = {
  fisherman: AdapterReport;
  rod: AdapterReport;
  pike: AdapterReport;
};

type Props = {
  fishermanUrl: string;
  rodUrl: string;
  pikeUrl: string;
  fishermanSource: AssetSource;
  rodSource: AssetSource;
  pikeSource: AssetSource;
  yaw: number;
  autoYaw?: boolean;
  charClip: CharClip;
  fishClip: FishClip;
  fishScale: number;
  debug: DebugFlags;
  lineOn?: boolean;
  floatOn?: boolean;
  lineTension?: number;
  wave?: number;
  onFps?: (n: number) => void;
  onCharFinished?: (name: string) => void;
  onCastComplete?: () => void;
  onLandingComplete?: () => void;
  biteKey?: number;
  hookKey?: number;
  fightKey?: number;
  reelKey?: number;
  prepKey?: number;
  landKey?: number;
  holdKey?: number;
  releaseKey?: number;
  keepKey?: number;
  returnKey?: number;
  stowFish?: boolean;
  onReleaseComplete?: () => void;
  onKeepComplete?: () => void;
  onReturnComplete?: () => void;
  onReports?: (reports: SceneReports) => void;
  /** Forest Lake overlay: no debug grid / lab water plate. */
  embed?: boolean;
};

function hardenMaterials(root: THREE.Object3D) {
  root.traverse((o: THREE.Object3D) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const cloned = mats.map((mat) => {
      const std = (mat as THREE.MeshStandardMaterial).clone();
      std.side = THREE.DoubleSide;
      if (std.envMapIntensity !== undefined) std.envMapIntensity = 0.22;
      if (std.roughness !== undefined) std.roughness = Math.min(0.92, (std.roughness ?? 0.6) + 0.06);
      return std;
    });
    mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0]!;
  });
}

function hardenRodMaterials(root: THREE.Object3D) {
  root.traverse((o: THREE.Object3D) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const meshName = (mesh.name || "").toLowerCase();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const cloned = mats.map((mat) => {
      const std = (mat as THREE.MeshStandardMaterial).clone();
      std.side = THREE.DoubleSide;
      const n = `${std.name || ""} ${meshName}`.toLowerCase();
      if (std.envMapIntensity !== undefined) std.envMapIntensity = 0.7;
      if (n.includes("graphite") || n.includes("blank")) {
        if (std.color) std.color.setHex(0x4a463c);
        if (std.roughness !== undefined) std.roughness = 0.42;
        if (std.metalness !== undefined) std.metalness = 0.28;
      } else if (n.includes("cork") || n.includes("tape") || n.includes("handle")) {
        if (std.color) std.color.setHex(0xc4a574);
        if (std.roughness !== undefined) std.roughness = 0.72;
        if (std.metalness !== undefined) std.metalness = 0.02;
      } else if (n.includes("reel") || n.includes("chrome") || n.includes("seat") || n.includes("spool")) {
        if (std.color) std.color.setHex(0xc0bbb3);
        if (std.roughness !== undefined) std.roughness = 0.28;
        if (std.metalness !== undefined) std.metalness = 0.55;
      }
      if (std.emissive) std.emissive.setHex(0x2c2a24);
      if (std.emissiveIntensity !== undefined) std.emissiveIntensity = 0.32;
      return std;
    });
    mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0]!;
  });
}

export function Rig3DScene({
  fishermanUrl,
  rodUrl,
  pikeUrl,
  fishermanSource,
  rodSource,
  pikeSource,
  yaw,
  autoYaw = false,
  charClip,
  fishClip,
  fishScale,
  debug,
  lineOn = true,
  floatOn = true,
  lineTension = 0,
  wave = 0.4,
  onFps,
  onCharFinished,
  onCastComplete,
  onLandingComplete,
  biteKey = 0,
  hookKey = 0,
  fightKey = 0,
  reelKey = 0,
  prepKey = 0,
  landKey = 0,
  holdKey = 0,
  releaseKey = 0,
  keepKey = 0,
  returnKey = 0,
  stowFish = false,
  onReleaseComplete,
  onKeepComplete,
  onReturnComplete,
  onReports,
  embed = false,
}: Props) {
  const manGltf = useGLTF(fishermanUrl);
  const rodGltf = useGLTF(rodUrl);
  const pikeGltf = useGLTF(pikeUrl);

  const man = useMemo(() => {
    importHumanoid(manGltf);
    return cloneSkinned(manGltf.scene);
  }, [manGltf]);
  const rod = useMemo(() => cloneSkinned(rodGltf.scene), [rodGltf.scene]);
  const pike = useMemo(() => cloneSkinned(pikeGltf.scene), [pikeGltf.scene]);

  const manMixer = useMemo(() => new THREE.AnimationMixer(man), [man]);
  const fishMixer = useMemo(() => new THREE.AnimationMixer(pike), [pike]);
  const manActions = useMemo(() => {
    importHumanoid(manGltf);
    const m: Record<string, THREE.AnimationAction> = {};
    for (const clip of manGltf.animations) {
      m[clip.name] = manMixer.clipAction(clip);
    }
    return m;
  }, [manGltf, manMixer]);
  const fishActions = useMemo(() => {
    const m: Record<string, THREE.AnimationAction> = {};
    for (const clip of pikeGltf.animations) m[clip.name] = fishMixer.clipAction(clip);
    return m;
  }, [pikeGltf.animations, fishMixer]);

  const charRef = useRef<CharClip>(charClip);
  const lineGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const linePts = useMemo(() => new Float32Array(9), []);
  const fpsAcc = useRef({ t: 0, frames: 0 });
  const attached = useRef(false);
  const gripKey = useRef("");
  const aimU = useRef(0);
  const extraYaw = useRef(0);
  const floatRef = useRef<THREE.Group>(null);
  const castT = useRef(0);
  const castFrom = useRef({ pitch: CAST_START_PITCH, yaw: CAST_START_YAW, armed: false });
  const castDone = useRef(false);
  const landSim = useRef(makeLandingSim());
  const landT = useRef(0);
  const landDone = useRef(false);
  const waitU = useRef(0);
  const waitClock = useRef(0);
  const biteT = useRef(0);
  const hookT = useRef(0);
  const fightT = useRef(0);
  const reelReach = useRef(0);
  const reelApproach = useRef(0);
  const prepT = useRef(0);
  const outT = useRef(0);
  const prepHold = useRef(PREP_DURATION);
  const fishPrepStart = useRef(new THREE.Vector3());
  const fishLandStart = useRef(new THREE.Vector3());
  const fishHoldStart = useRef(new THREE.Vector3());
  const landHoldT = useRef(LAND_DURATION);
  const holdT = useRef(0);
  const relT = useRef(0);
  const releaseHoldClock = useRef(0);
  const fishReleaseStart = useRef(new THREE.Vector3());
  const leaderEnd = useRef(new THREE.Vector3());
  const detachAt = useRef(new THREE.Vector3());
  const detached = useRef(false);
  const releaseDone = useRef(false);
  const keepT = useRef(0);
  const keepHoldClock = useRef(0);
  const fishKeepStart = useRef(new THREE.Vector3());
  const keepDone = useRef(false);
  const retT = useRef(0);
  const returnFromKeep = useRef(true);
  const returnHoldClock = useRef(0);
  const returnDone = useRef(false);
  const splashOnce = useRef(false);
  const fishHold = useRef<THREE.Group>(null);
  const fishPoint = useRef(new THREE.Vector3());
  const fishRest = useRef(new THREE.Vector3());
  const fishArmed = useRef(false);
  const onCastCompleteRef = useRef(onCastComplete);
  onCastCompleteRef.current = onCastComplete;
  const onLandingCompleteRef = useRef(onLandingComplete);
  onLandingCompleteRef.current = onLandingComplete;
  const onReleaseCompleteRef = useRef(onReleaseComplete);
  onReleaseCompleteRef.current = onReleaseComplete;
  const onKeepCompleteRef = useRef(onKeepComplete);
  onKeepCompleteRef.current = onKeepComplete;
  const onReturnCompleteRef = useRef(onReturnComplete);
  onReturnCompleteRef.current = onReturnComplete;
  const helpers = useMemo(() => {
    const skel = new THREE.SkeletonHelper(man);
    skel.visible = false;
    const fishSkel = new THREE.SkeletonHelper(pike);
    fishSkel.visible = false;
    const ARM = ["UpperArm_L", "LowerArm_L", "Hand_L", "UpperArm_R", "LowerArm_R", "Hand_R"] as const;
    const armAxes = ARM.map((name) => {
      const h = new THREE.AxesHelper(0.14);
      h.name = `Axis_${name}`;
      h.visible = false;
      return { name, helper: h };
    });
    const pivots = ARM.map((name) => {
      const g = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 10, 10),
        new THREE.MeshBasicMaterial({ color: name.endsWith("_L") ? 0x7ec8e3 : 0xe3b27e }),
      );
      g.name = `Pivot_${name}`;
      g.visible = false;
      return { name, mesh: g };
    });
    return { skel, fishSkel, armAxes, pivots };
  }, [man, pike]);

  useEffect(() => {
    for (const { name, helper } of helpers.armAxes) {
      const b = man.getObjectByName(name);
      if (b && helper.parent !== b) b.add(helper);
    }
    for (const { name, mesh } of helpers.pivots) {
      const b = man.getObjectByName(name);
      if (b && mesh.parent !== b) b.add(mesh);
    }
  }, [helpers, man]);

  useEffect(() => {
    attached.current = false;
    hardenMaterials(man);
    hardenRodMaterials(rod);
    hardenMaterials(pike);
    pike.rotation.y = Math.PI / 2;
    (window as unknown as { __RIG3D?: { man: THREE.Object3D; rod: THREE.Object3D } }).__RIG3D = { man, rod };
    onReports?.({
      fisherman: inspectFisherman(manGltf, fishermanUrl, fishermanSource),
      rod: inspectRod(rodGltf, rodUrl, rodSource),
      pike: inspectPike(pikeGltf, pikeUrl, pikeSource),
    });
    return () => {
      manMixer.stopAllAction();
      fishMixer.stopAllAction();
    };
  }, [
    man,
    rod,
    pike,
    manMixer,
    fishMixer,
    manGltf,
    rodGltf,
    pikeGltf,
    fishermanUrl,
    rodUrl,
    pikeUrl,
    fishermanSource,
    rodSource,
    pikeSource,
    onReports,
  ]);

  useEffect(() => {
    const onFin = (e: THREE.Event<"finished", THREE.AnimationMixer> & { action: THREE.AnimationAction }) => {
      const name = e.action.getClip().name;
      if (name === charRef.current) onCharFinished?.(name);
    };
    manMixer.addEventListener("finished", onFin);
    return () => manMixer.removeEventListener("finished", onFin);
  }, [manMixer, onCharFinished]);

  useEffect(() => {
    const planted = charClip === "AIM" || holdsCastPose(charClip) || isWaitClip(charClip) || isBiteClip(charClip) || isHookClip(charClip) || isFightClip(charClip) || isReelClip(charClip) || isPrepClip(charClip) || isLandClip(charClip) || isHoldClip(charClip) || isReleaseClip(charClip) || isKeepClip(charClip) || isReturnClip(charClip);
    const next =
      manActions[charClip] ??
      (planted ? manActions.READY : undefined);
    if (!next) return;

    const plant = planted;
    const prev = charRef.current;
    const prevPlanted = prev === "AIM" || holdsCastPose(prev) || isWaitClip(prev) || isBiteClip(prev) || isHookClip(prev) || isFightClip(prev) || isReelClip(prev) || isPrepClip(prev) || isLandClip(prev) || isHoldClip(prev) || isReleaseClip(prev) || isKeepClip(prev) || isReturnClip(prev) || prev === "READY";
    const sameReady =
      next === manActions.READY &&
      (charClip === "READY" || planted) &&
      prevPlanted;

    if (sameReady) {
      next.enabled = true;
      next.weight = 1;
      next.paused = false;
      next.timeScale = 0;
      next.time = 0;
      if (!next.isRunning()) next.play();
      charRef.current = charClip;
      if (charClip.startsWith("CAST") && !prev.startsWith("CAST")) {
        castT.current = 0;
        castFrom.current.armed = false;
        castDone.current = false;
        landT.current = 0;
        landDone.current = false;
        waitU.current = 0;
        waitClock.current = 0;
      }
      if (isFloatLanding(charClip) && !isFloatLanding(prev)) {
        landT.current = 0;
        landDone.current = false;
      }
      if (isWaitClip(charClip) && !isWaitClip(prev)) {
        waitU.current = 0;
        waitClock.current = 0;
      }
      if (isBiteClip(charClip)) biteT.current = 0;
      if (isHookClip(charClip)) hookT.current = 0;
      if (isFightClip(charClip) && !isFightClip(prev) && !isReelClip(prev) && !isPrepClip(prev)) {
        fightT.current = 0;
        fishArmed.current = false;
        reelApproach.current = 0;
        reelReach.current = 0;
      }
      if (isPrepClip(charClip) && !isPrepClip(prev)) {
        prepT.current = 0;
        fishPrepStart.current.copy(fishPoint.current);
      }
      if (isLandClip(charClip) && !isLandClip(prev)) {
        outT.current = 0;
        splashOnce.current = false;
        prepHold.current = prepT.current > 0.05 ? prepT.current : PREP_DURATION;
        fishLandStart.current.copy(fishPoint.current);
      }
      if (isHoldClip(charClip) && !isHoldClip(prev)) {
        holdT.current = 0;
        landHoldT.current = isLandClip(prev) && outT.current > 0.05 ? outT.current : LAND_DURATION;
        fishHoldStart.current.copy(fishPoint.current);
      }
      if (isReleaseClip(charClip) && !isReleaseClip(prev)) {
        relT.current = 0;
        splashOnce.current = false;
        detached.current = false;
        releaseDone.current = false;
        releaseHoldClock.current = isHoldClip(prev) ? holdT.current : 0;
        fishReleaseStart.current.copy(fishPoint.current);
        leaderEnd.current.copy(fishPoint.current);
        detachAt.current.copy(fishPoint.current);
      }
      if (isKeepClip(charClip) && !isKeepClip(prev)) {
        keepT.current = 0;
        detached.current = false;
        keepDone.current = false;
        keepHoldClock.current = isHoldClip(prev) ? holdT.current : 0;
        fishKeepStart.current.copy(fishPoint.current);
        leaderEnd.current.copy(fishPoint.current);
        detachAt.current.copy(fishPoint.current);
      }
      if (isReturnClip(charClip) && !isReturnClip(prev)) {
        retT.current = 0;
        returnDone.current = false;
        returnFromKeep.current = isKeepClip(prev) || (!isReleaseClip(prev) && keepDone.current);
        returnHoldClock.current = isKeepClip(prev) ? keepHoldClock.current : releaseHoldClock.current;
        castFrom.current.armed = false;
      }
      if (charClip === "READY" && isReturnClip(prev)) {
        fightT.current = 0;
        biteT.current = 0;
        hookT.current = 0;
        reelReach.current = 0;
        reelApproach.current = 0;
        prepT.current = 0;
        outT.current = 0;
        holdT.current = 0;
        relT.current = 0;
        keepT.current = 0;
        retT.current = 0;
        waitU.current = 0;
        waitClock.current = 0;
        fishArmed.current = false;
        detached.current = false;
        splashOnce.current = false;
        releaseDone.current = false;
        keepDone.current = false;
        returnDone.current = false;
        aimU.current = 0;
        extraYaw.current = 0;
        castFrom.current.armed = false;
        pike.visible = true;
        setPikeFade(pike, 1);
        pike.position.set(0, 0, 0);
        landSim.current = makeLandingSim();
      }
      return;
    }

    const fade = charClip === "HOOKSET" || charClip === "BITE_REACTION" ? 0.12 : 0.18;
    for (const a of Object.values(manActions)) {
      if (a !== next && a.isRunning()) a.fadeOut(fade);
    }
    next.enabled = true;
    next.reset();
    next.timeScale = charClip === "HOOKSET"
      ? 1.4
      : charClip === "BITE_REACTION"
        ? 1.15
        : charClip === "REEL"
          ? 1.1
          : 1;
    next.time = 0;
    next.setLoop(LOOPING_CHAR.has(charClip) || plant || charClip === "READY" ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    next.clampWhenFinished = !LOOPING_CHAR.has(charClip) && !plant && charClip !== "READY";
    next.weight = 1;
    next.fadeIn(charClip === "READY" || plant ? 0 : fade);
    next.play();
    charRef.current = charClip;
    if (charClip.startsWith("CAST") && !prev.startsWith("CAST")) {
      castT.current = 0;
      castFrom.current.armed = false;
      castDone.current = false;
      landT.current = 0;
      landDone.current = false;
      waitU.current = 0;
      waitClock.current = 0;
    }
    if (isFloatLanding(charClip) && !isFloatLanding(prev)) {
      landT.current = 0;
      landDone.current = false;
    }
    if (isWaitClip(charClip) && !isWaitClip(prev)) {
      waitU.current = 0;
      waitClock.current = 0;
    }
    if (isBiteClip(charClip)) biteT.current = 0;
    if (isHookClip(charClip)) hookT.current = 0;
    if (isFightClip(charClip) && !isFightClip(prev) && !isReelClip(prev) && !isPrepClip(prev)) {
      fightT.current = 0;
      fishArmed.current = false;
      reelApproach.current = 0;
      reelReach.current = 0;
    }
    if (isPrepClip(charClip) && !isPrepClip(prev)) {
      prepT.current = 0;
      fishPrepStart.current.copy(fishPoint.current);
    }
    if (isLandClip(charClip) && !isLandClip(prev)) {
      outT.current = 0;
      splashOnce.current = false;
      prepHold.current = prepT.current > 0.05 ? prepT.current : PREP_DURATION;
      fishLandStart.current.copy(fishPoint.current);
    }
    if (isHoldClip(charClip) && !isHoldClip(prev)) {
      holdT.current = 0;
      landHoldT.current = isLandClip(prev) && outT.current > 0.05 ? outT.current : LAND_DURATION;
      fishHoldStart.current.copy(fishPoint.current);
    }
    if (isReleaseClip(charClip) && !isReleaseClip(prev)) {
      relT.current = 0;
      splashOnce.current = false;
      detached.current = false;
      releaseDone.current = false;
      releaseHoldClock.current = isHoldClip(prev) ? holdT.current : 0;
      fishReleaseStart.current.copy(fishPoint.current);
      leaderEnd.current.copy(fishPoint.current);
      detachAt.current.copy(fishPoint.current);
    }
    if (isKeepClip(charClip) && !isKeepClip(prev)) {
      keepT.current = 0;
      detached.current = false;
      keepDone.current = false;
      keepHoldClock.current = isHoldClip(prev) ? holdT.current : 0;
      fishKeepStart.current.copy(fishPoint.current);
      leaderEnd.current.copy(fishPoint.current);
      detachAt.current.copy(fishPoint.current);
    }
    if (isReturnClip(charClip) && !isReturnClip(prev)) {
      retT.current = 0;
      returnDone.current = false;
      returnFromKeep.current = isKeepClip(prev) || (!isReleaseClip(prev) && keepDone.current);
      returnHoldClock.current = isKeepClip(prev) ? keepHoldClock.current : releaseHoldClock.current;
      castFrom.current.armed = false;
    }
    if (charClip === "READY" && isReturnClip(prev)) {
      fightT.current = 0;
      biteT.current = 0;
      hookT.current = 0;
      reelReach.current = 0;
      reelApproach.current = 0;
      prepT.current = 0;
      outT.current = 0;
      holdT.current = 0;
      relT.current = 0;
      keepT.current = 0;
      retT.current = 0;
      waitU.current = 0;
      waitClock.current = 0;
      fishArmed.current = false;
      detached.current = false;
      splashOnce.current = false;
      releaseDone.current = false;
      keepDone.current = false;
      returnDone.current = false;
      aimU.current = 0;
      extraYaw.current = 0;
      castFrom.current.armed = false;
      pike.visible = true;
      setPikeFade(pike, 1);
      pike.position.set(0, 0, 0);
      landSim.current = makeLandingSim();
    }
  }, [charClip, manActions]);

  useEffect(() => {
    biteT.current = 0;
  }, [biteKey]);

  useEffect(() => {
    hookT.current = 0;
  }, [hookKey]);

  useEffect(() => {
    fightT.current = 0;
    fishArmed.current = false;
    reelApproach.current = 0;
    reelReach.current = 0;
  }, [fightKey]);

  useEffect(() => {
    reelReach.current = 0;
  }, [reelKey]);

  useEffect(() => {
    prepT.current = 0;
    fishPrepStart.current.copy(fishPoint.current);
  }, [prepKey]);

  useEffect(() => {
    outT.current = 0;
    splashOnce.current = false;
    prepHold.current = prepT.current > 0.05 ? prepT.current : PREP_DURATION;
    fishLandStart.current.copy(fishPoint.current);
  }, [landKey]);

  useEffect(() => {
    holdT.current = 0;
    landHoldT.current = outT.current > 0.05 ? outT.current : LAND_DURATION;
    fishHoldStart.current.copy(fishPoint.current);
  }, [holdKey]);

  useEffect(() => {
    relT.current = 0;
    splashOnce.current = false;
    detached.current = false;
    releaseDone.current = false;
    releaseHoldClock.current = holdT.current;
    fishReleaseStart.current.copy(fishPoint.current);
    leaderEnd.current.copy(fishPoint.current);
    detachAt.current.copy(fishPoint.current);
  }, [releaseKey]);

  useEffect(() => {
    keepT.current = 0;
    detached.current = false;
    keepDone.current = false;
    keepHoldClock.current = holdT.current;
    fishKeepStart.current.copy(fishPoint.current);
    leaderEnd.current.copy(fishPoint.current);
    detachAt.current.copy(fishPoint.current);
  }, [keepKey]);

  useEffect(() => {
    retT.current = 0;
    returnDone.current = false;
    returnFromKeep.current = keepDone.current && !releaseDone.current;
    returnHoldClock.current = keepDone.current ? keepHoldClock.current : releaseHoldClock.current;
    castFrom.current.armed = false;
  }, [returnKey]);

  useEffect(() => {
    const next = fishActions[fishClip];
    if (!next) return;
    if (isLandClip(charClip) || isHoldClip(charClip) || isReleaseClip(charClip) || isKeepClip(charClip)) return;
    for (const a of Object.values(fishActions)) {
      if (a !== next && a.isRunning()) a.fadeOut(0.25);
    }
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.25).play();
  }, [fishClip, fishActions, charClip]);

  useEffect(() => {
    if (!isLandClip(charClip) && !isHoldClip(charClip) && !isReleaseClip(charClip) && !isKeepClip(charClip)) return;
    const a = fishActions.SURFACE ?? fishActions.STRUGGLE_LIGHT ?? fishActions.SWIM_IDLE;
    if (!a) return;
    if (a.isRunning()) return;
    for (const other of Object.values(fishActions)) {
      if (other !== a && other.isRunning()) other.fadeOut(0.12);
    }
    a.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.12).play();
  }, [charClip, fishActions, landKey, holdKey]);

  useEffect(() => {
    helpers.skel.visible = debug.skeleton || debug.fingers;
    helpers.fishSkel.visible = debug.fishSkeleton;
    for (const { helper } of helpers.armAxes) helper.visible = debug.armAxes;
    for (const { mesh } of helpers.pivots) mesh.visible = debug.armAxes;
  }, [debug.skeleton, debug.fishSkeleton, debug.armAxes, helpers]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (autoYaw) extraYaw.current += dt * 0.45;
    else extraYaw.current = 0;
    manMixer.update(dt);
    fishMixer.update(dt);

    const clip = charRef.current;
    const casting = isCastClip(clip);
    const landing = isFloatLanding(clip);
    const waiting = isWaitClip(clip);
    const biting = isBiteClip(clip);
    const hooking = isHookClip(clip);
    const fighting = isFightClip(clip);
    const reeling = isReelClip(clip);
    const prepping = isPrepClip(clip);
    const outing = isLandClip(clip);
    const holding = isHoldClip(clip);
    const releasing = isReleaseClip(clip);
    const keeping = isKeepClip(clip);
    const returning = isReturnClip(clip);
    if (casting) {
      const seek = (window as unknown as { __CAST_SEEK?: number }).__CAST_SEEK;
      if (typeof seek === "number") castT.current = Math.max(0, Math.min(CAST_DURATION, seek));
      else castT.current = Math.min(CAST_DURATION, castT.current + dt);
      (window as unknown as { __CAST_T?: number }).__CAST_T = castT.current;
      if (castT.current >= CAST_DURATION && !castDone.current) {
        castDone.current = true;
        onCastCompleteRef.current?.();
      }
    }
    if (landing) {
      landT.current += dt;
      if (landT.current >= WAIT_AFTER_LANDING && !landDone.current) {
        landDone.current = true;
        onLandingCompleteRef.current?.();
      }
    }
    const wantsRod = clip === "READY" || clip === "AIM" || casting || landing || waiting || biting || hooking || fighting || reeling || prepping || outing || holding || releasing || keeping || returning;
    if (wantsRod) {
      closeRightFist(man, rod);
      rollRightWristOut(man, rod);
      if (casting || landing) {
        const s = sampleCast(casting ? castT.current : CAST_DURATION);
        applyCastPose(man, s);
        if (!castFrom.current.armed) {
          const now = measureRodPitchYaw(man, rod);
          castFrom.current.pitch = now.pitch;
          castFrom.current.yaw = now.yaw;
          castFrom.current.armed = true;
          if (gripKey.current !== "hold") {
            attached.current = seatRodInHand(man, rod, now.pitch, now.yaw);
            gripKey.current = "hold";
          }
        } else if (castT.current > 0 || landing) {
          const pitch = castFrom.current.pitch + (s.pitch - CAST_START_PITCH);
          const yaw = castFrom.current.yaw + (s.yaw - CAST_START_YAW);
          attached.current = seatRodInHand(man, rod, pitch, yaw);
          gripKey.current = "hold";
        }
        applyRodBend(rod, s.bend);
        attached.current = true;
      } else if (waiting) {
        const s = sampleWait(waitU.current, waitClock.current);
        applyWaitPose(man, s);
        if (!castFrom.current.armed) {
          const now = measureRodPitchYaw(man, rod);
          castFrom.current.pitch = now.pitch;
          castFrom.current.yaw = now.yaw;
          castFrom.current.armed = true;
        }
        const pitch = castFrom.current.pitch + (s.pitch - CAST_START_PITCH);
        const yaw = castFrom.current.yaw + (s.yaw - CAST_START_YAW);
        attached.current = seatRodInHand(man, rod, pitch, yaw);
        gripKey.current = "hold";
        applyRodBend(rod, s.bend);
        attached.current = true;
        waitU.current = Math.min(1, waitU.current + dt / WAIT_BLEND);
        waitClock.current += dt;
      } else if (biting) {
        const s = sampleBitePose(biteT.current);
        applyBitePose(man, s);
        if (!castFrom.current.armed) {
          const now = measureRodPitchYaw(man, rod);
          castFrom.current.pitch = now.pitch;
          castFrom.current.yaw = now.yaw;
          castFrom.current.armed = true;
        }
        const pitch = castFrom.current.pitch + (s.pitch - CAST_START_PITCH);
        const yaw = castFrom.current.yaw + (s.yaw - CAST_START_YAW);
        attached.current = seatRodInHand(man, rod, pitch, yaw);
        gripKey.current = "hold";
        applyRodBend(rod, s.bend);
        attached.current = true;
        if (landSim.current) landSim.current.tension = s.tension;
        biteT.current = Math.min(BITE_DURATION, biteT.current + dt);
        (window as unknown as { __BITE_T?: number }).__BITE_T = biteT.current;
      } else if (hooking) {
        const s = sampleHookPose(hookT.current);
        applyHookPose(man, s);
        if (!castFrom.current.armed) {
          const now = measureRodPitchYaw(man, rod);
          castFrom.current.pitch = now.pitch;
          castFrom.current.yaw = now.yaw;
          castFrom.current.armed = true;
        }
        const pitch = castFrom.current.pitch + (s.pitch - CAST_START_PITCH);
        const yaw = castFrom.current.yaw + (s.yaw - CAST_START_YAW);
        attached.current = seatRodInHand(man, rod, pitch, yaw);
        gripKey.current = "hold";
        applyRodBend(rod, s.bend);
        attached.current = true;
        if (landSim.current) landSim.current.tension = s.tension;
        hookT.current = Math.min(HOOK_DURATION, hookT.current + dt);
        (window as unknown as { __HOOK_T?: number }).__HOOK_T = hookT.current;
      } else if (fighting || reeling) {
        const s = sampleFight(fightT.current);
        applyFightPose(man, s);
        if (!castFrom.current.armed) {
          const now = measureRodPitchYaw(man, rod);
          castFrom.current.pitch = now.pitch;
          castFrom.current.yaw = now.yaw;
          castFrom.current.armed = true;
        }
        const pitch = castFrom.current.pitch + (s.pitch - CAST_START_PITCH);
        const yaw = castFrom.current.yaw + (s.yaw - CAST_START_YAW);
        attached.current = seatRodInHand(man, rod, pitch, yaw);
        gripKey.current = "hold";
        applyRodBend(rod, s.bend);
        attached.current = true;
        if (landSim.current) landSim.current.tension = s.tension;
        const reachTarget = reeling ? 1 : 0;
        const reachStep = dt / REEL_REACH;
        if (reelReach.current < reachTarget) reelReach.current = Math.min(reachTarget, reelReach.current + reachStep);
        else if (reelReach.current > reachTarget) reelReach.current = Math.max(reachTarget, reelReach.current - reachStep);
        const speed = reeling ? reelSpeedFor(s.pull, reelReach.current) : 0;
        spinReel(rod, dt, speed);
        if (reelReach.current > 1e-4) {
          const handle = rod.getObjectByName("ReelHandle");
          applyReelLeftArm(man, s, reelReach.current, handle?.rotation.z ?? 0);
        }
        if (!fishArmed.current) {
          const g = floatRef.current;
          if (g) {
            g.updateWorldMatrix(true, false);
            fishRest.current.setFromMatrixPosition(g.matrixWorld);
          }
          fishArmed.current = true;
        }
        fightFishWorld(fishRest.current, s, fishPoint.current);
        fishPoint.current.x -= reelApproach.current * 0.55;
        if (reeling) {
          reelApproach.current = Math.min(REEL_APPROACH_CAP, reelApproach.current + dt * REEL_APPROACH * (speed / 8.4));
        }
        fightT.current += dt;
        if (fightT.current >= FIGHT_LOOP) fightT.current = 0.4;
        (window as unknown as { __FIGHT_T?: number }).__FIGHT_T = fightT.current;
        (window as unknown as { __REEL?: { reach: number; speed: number; approach: number; pull: number } }).__REEL = {
          reach: reelReach.current,
          speed,
          approach: reelApproach.current,
          pull: s.pull,
        };
        (window as unknown as { __FIGHT?: { phase: string; pull: number; bend: number; ten: number } }).__FIGHT = {
          phase: s.phase,
          pull: s.pull,
          bend: s.bend,
          ten: s.tension,
        };
      } else if (prepping) {
        const s = sampleLandPrep(prepT.current, fightT.current);
        applyLandPrepPose(man, s);
        if (!castFrom.current.armed) {
          const now = measureRodPitchYaw(man, rod);
          castFrom.current.pitch = now.pitch;
          castFrom.current.yaw = now.yaw;
          castFrom.current.armed = true;
        }
        const pitch = castFrom.current.pitch + (s.pitch - CAST_START_PITCH);
        const yaw = castFrom.current.yaw + (s.yaw - CAST_START_YAW);
        attached.current = seatRodInHand(man, rod, pitch, yaw);
        gripKey.current = "hold";
        applyRodBend(rod, s.bend);
        attached.current = true;
        if (landSim.current) landSim.current.tension = s.tension;
        const reachStep = dt / REEL_REACH;
        if (reelReach.current > 0) reelReach.current = Math.max(0, reelReach.current - reachStep);
        const speed = reelSpeedFor(s.pull, Math.max(reelReach.current, s.spin * 0.4)) * s.spin;
        spinReel(rod, dt, speed);
        if (reelReach.current > 1e-4) {
          const handle = rod.getObjectByName("ReelHandle");
          applyReelLeftArm(man, s, reelReach.current, handle?.rotation.z ?? 0);
        }
        if (fishPrepStart.current.lengthSq() < 0.05) fishPrepStart.current.copy(fishPoint.current.lengthSq() > 0.05 ? fishPoint.current : fishRest.current);
        prepFishWorld(fishPrepStart.current, prepT.current, fishPoint.current);
        prepT.current = Math.min(PREP_DURATION, prepT.current + dt);
        const dist = Math.hypot(fishPoint.current.x, fishPoint.current.z);
        (window as unknown as { __PREP?: { t: number; dist: number; progress: number; ten: number; reach: number; lift: number; fishY: number } }).__PREP = {
          t: prepT.current,
          dist,
          progress: s.progress,
          ten: s.tension,
          reach: reelReach.current,
          lift: s.lift,
          fishY: fishPoint.current.y,
        };
      } else if (outing) {
        const s = sampleLand(outT.current, fightT.current, prepHold.current);
        applyLandPose(man, s);
        if (!castFrom.current.armed) {
          const now = measureRodPitchYaw(man, rod);
          castFrom.current.pitch = now.pitch;
          castFrom.current.yaw = now.yaw;
          castFrom.current.armed = true;
        }
        const pitch = castFrom.current.pitch + (s.pitch - CAST_START_PITCH);
        const yaw = castFrom.current.yaw + (s.yaw - CAST_START_YAW);
        attached.current = seatRodInHand(man, rod, pitch, yaw);
        gripKey.current = "hold";
        applyRodBend(rod, s.bend);
        attached.current = true;
        if (landSim.current) landSim.current.tension = s.tension;
        if (fishLandStart.current.lengthSq() < 0.05) {
          fishLandStart.current.copy(fishPoint.current.lengthSq() > 0.05 ? fishPoint.current : fishRest.current);
        }
        landFishWorld(fishLandStart.current, outT.current, fishPoint.current);
        if (!splashOnce.current && outT.current >= LAND_SURFACE_T) {
          splashOnce.current = true;
          if (landSim.current) {
            landSim.current.splashStamp += 1;
            landSim.current.splashX = fishPoint.current.x;
            landSim.current.splashZ = fishPoint.current.z;
          }
        }
        const hold = fishHold.current;
        if (hold) {
          hold.visible = true;
          hold.scale.setScalar(Math.max(0.12, fishScale * LAND_FISH_SCALE));
          _fishMouth.copy(fishPoint.current);
          if (hold.parent) hold.parent.worldToLocal(_fishMouth);
          hold.position.copy(_fishMouth);
          const yawFish = Math.atan2(fishPoint.current.x, fishPoint.current.z);
          hold.rotation.set(s.nose * 0.35 + s.twist * 0.25, yawFish, s.tail * 0.15);
          hold.updateWorldMatrix(true, true);
          const jaw = pike.getObjectByName("Jaw");
          if (jaw) {
            pike.position.set(0, 0, 0);
        landSim.current = makeLandingSim();
            hold.updateWorldMatrix(true, true);
            jaw.updateWorldMatrix(true, false);
            _tip.setFromMatrixPosition(jaw.matrixWorld);
            hold.worldToLocal(_tip);
            pike.position.copy(_tip).multiplyScalar(-1);
          }
          const tail = pike.getObjectByName("Tail");
          if (tail) tail.rotation.y = s.tail;
        }
        outT.current = Math.min(LAND_DURATION, outT.current + dt);
        (window as unknown as { __LAND?: { t: number; y: number; dist: number; splash: boolean } }).__LAND = {
          t: outT.current,
          y: fishPoint.current.y,
          dist: Math.hypot(fishPoint.current.x, fishPoint.current.z),
          splash: s.splash,
        };
      } else if (holding) {
        const s = sampleHold(holdT.current, fightT.current, prepHold.current, landHoldT.current);
        applyHoldPose(man, s);
        if (!castFrom.current.armed) {
          const now = measureRodPitchYaw(man, rod);
          castFrom.current.pitch = now.pitch;
          castFrom.current.yaw = now.yaw;
          castFrom.current.armed = true;
        }
        const pitch = castFrom.current.pitch + (s.pitch - CAST_START_PITCH);
        const yaw = castFrom.current.yaw + (s.yaw - CAST_START_YAW);
        attached.current = seatRodInHand(man, rod, pitch, yaw);
        gripKey.current = "hold";
        applyRodBend(rod, s.bend);
        attached.current = true;
        if (landSim.current) landSim.current.tension = s.tension;
        if (fishHoldStart.current.lengthSq() < 0.05) {
          fishHoldStart.current.copy(fishPoint.current.lengthSq() > 0.05 ? fishPoint.current : fishLandStart.current);
        }
        holdFishWorld(fishHoldStart.current, holdT.current, fishPoint.current);
        const hold = fishHold.current;
        if (hold) {
          hold.visible = true;
          hold.scale.setScalar(Math.max(0.12, fishScale * LAND_FISH_SCALE));
          _fishMouth.copy(fishPoint.current);
          if (hold.parent) hold.parent.worldToLocal(_fishMouth);
          hold.position.copy(_fishMouth);
          const yawFish = Math.atan2(fishPoint.current.x, fishPoint.current.z);
          hold.rotation.set(s.nose * 0.35 + s.twist * 0.25, yawFish, s.tail * 0.15);
          hold.updateWorldMatrix(true, true);
          const jaw = pike.getObjectByName("Jaw");
          if (jaw) {
            pike.position.set(0, 0, 0);
        landSim.current = makeLandingSim();
            hold.updateWorldMatrix(true, true);
            jaw.updateWorldMatrix(true, false);
            _tip.setFromMatrixPosition(jaw.matrixWorld);
            hold.worldToLocal(_tip);
            pike.position.copy(_tip).multiplyScalar(-1);
          }
          const tail = pike.getObjectByName("Tail");
          if (tail) tail.rotation.y = s.tail;
        }
        holdT.current += dt;
        (window as unknown as { __HOLD?: { t: number; y: number; dist: number; ten: number; bend: number } }).__HOLD = {
          t: holdT.current,
          y: fishPoint.current.y,
          dist: Math.hypot(fishPoint.current.x, fishPoint.current.z),
          ten: s.tension,
          bend: s.bend,
        };
      } else if (releasing) {
        const s = sampleRelease(relT.current, fightT.current, prepHold.current, landHoldT.current, releaseHoldClock.current);
        applyReleasePose(man, s);
        if (!castFrom.current.armed) {
          const now = measureRodPitchYaw(man, rod);
          castFrom.current.pitch = now.pitch;
          castFrom.current.yaw = now.yaw;
          castFrom.current.armed = true;
        }
        const pitch = castFrom.current.pitch + (s.pitch - CAST_START_PITCH);
        const yaw = castFrom.current.yaw + (s.yaw - CAST_START_YAW);
        attached.current = seatRodInHand(man, rod, pitch, yaw);
        gripKey.current = "hold";
        applyRodBend(rod, s.bend);
        attached.current = true;
        if (landSim.current) landSim.current.tension = s.tension;
        if (fishReleaseStart.current.lengthSq() < 0.05) {
          fishReleaseStart.current.copy(fishPoint.current.lengthSq() > 0.05 ? fishPoint.current : fishHoldStart.current);
        }
        releaseFishWorld(fishReleaseStart.current, relT.current, fishPoint.current);
        if (!splashOnce.current && relT.current >= RELEASE_ENTER) {
          splashOnce.current = true;
          if (landSim.current) {
            landSim.current.splashStamp += 1;
            landSim.current.splashX = fishPoint.current.x;
            landSim.current.splashZ = fishPoint.current.z;
          }
        }
        if (!detached.current && relT.current >= RELEASE_DETACH) {
          detached.current = true;
          detachAt.current.copy(fishPoint.current);
        }
        const floatG = floatRef.current;
        if (floatG) {
          floatG.updateWorldMatrix(true, false);
          _mid.setFromMatrixPosition(floatG.matrixWorld);
        } else {
          _mid.copy(fishPoint.current);
          _mid.y = 0;
        }
        releaseLeaderWorld(fishPoint.current, _mid, detachAt.current, relT.current, leaderEnd.current);
        const hold = fishHold.current;
        const hideFish = relT.current >= RELEASE_DURATION - 0.12;
        pike.visible = !hideFish;
        if (hold) {
          hold.visible = !hideFish;
          hold.scale.setScalar(Math.max(0.12, fishScale * LAND_FISH_SCALE));
          _fishMouth.copy(fishPoint.current);
          if (hold.parent) hold.parent.worldToLocal(_fishMouth);
          hold.position.copy(_fishMouth);
          const yawFish = Math.atan2(fishPoint.current.x, fishPoint.current.z);
          hold.rotation.set(s.nose * 0.35 + s.twist * 0.25, yawFish, s.tail * 0.15);
          hold.updateWorldMatrix(true, true);
          const jaw = pike.getObjectByName("Jaw");
          if (jaw) {
            pike.position.set(0, 0, 0);
        landSim.current = makeLandingSim();
            hold.updateWorldMatrix(true, true);
            jaw.updateWorldMatrix(true, false);
            _tip.setFromMatrixPosition(jaw.matrixWorld);
            hold.worldToLocal(_tip);
            pike.position.copy(_tip).multiplyScalar(-1);
          }
          const tail = pike.getObjectByName("Tail");
          if (tail) tail.rotation.y = s.tail;
        }
        relT.current = Math.min(RELEASE_DURATION, relT.current + dt);
        if (s.done && !releaseDone.current) {
          releaseDone.current = true;
          onReleaseCompleteRef.current?.();
        }
        (window as unknown as { __RELEASE?: { t: number; y: number; dist: number; detached: boolean; done: boolean } }).__RELEASE = {
          t: relT.current,
          y: fishPoint.current.y,
          dist: Math.hypot(fishPoint.current.x, fishPoint.current.z),
          detached: s.detached,
          done: s.done,
        };
      } else if (keeping) {
        const s = sampleKeep(keepT.current, fightT.current, prepHold.current, landHoldT.current, keepHoldClock.current);
        applyKeepPose(man, s);
        if (!castFrom.current.armed) {
          const now = measureRodPitchYaw(man, rod);
          castFrom.current.pitch = now.pitch;
          castFrom.current.yaw = now.yaw;
          castFrom.current.armed = true;
        }
        const pitch = castFrom.current.pitch + (s.pitch - CAST_START_PITCH);
        const yaw = castFrom.current.yaw + (s.yaw - CAST_START_YAW);
        attached.current = seatRodInHand(man, rod, pitch, yaw);
        gripKey.current = "hold";
        applyRodBend(rod, s.bend);
        attached.current = true;
        if (landSim.current) landSim.current.tension = s.tension;
        if (fishKeepStart.current.lengthSq() < 0.05) {
          fishKeepStart.current.copy(fishPoint.current.lengthSq() > 0.05 ? fishPoint.current : fishHoldStart.current);
        }
        keepFishWorld(fishKeepStart.current, keepT.current, fishPoint.current);
        if (!detached.current && keepT.current >= KEEP_DETACH) {
          detached.current = true;
          detachAt.current.copy(fishPoint.current);
        }
        const floatG = floatRef.current;
        if (floatG) {
          floatG.updateWorldMatrix(true, false);
          _mid.setFromMatrixPosition(floatG.matrixWorld);
        } else {
          _mid.copy(fishPoint.current);
        }
        keepLeaderWorld(fishPoint.current, _mid, detachAt.current, keepT.current, leaderEnd.current);
        setPikeFade(pike, 1 - s.fade);
        const hold = fishHold.current;
        const hideFish = s.fade >= 0.98;
        pike.visible = !hideFish;
        if (hold) {
          hold.visible = !hideFish;
          hold.scale.setScalar(Math.max(0.04, fishScale * LAND_FISH_SCALE * (1 - s.fade * 0.35)));
          _fishMouth.copy(fishPoint.current);
          if (hold.parent) hold.parent.worldToLocal(_fishMouth);
          hold.position.copy(_fishMouth);
          const yawFish = Math.atan2(fishPoint.current.x, fishPoint.current.z);
          hold.rotation.set(s.nose * 0.35 + s.twist * 0.25, yawFish, s.tail * 0.15);
          hold.updateWorldMatrix(true, true);
          const jaw = pike.getObjectByName("Jaw");
          if (jaw && !hideFish) {
            pike.position.set(0, 0, 0);
        landSim.current = makeLandingSim();
            hold.updateWorldMatrix(true, true);
            jaw.updateWorldMatrix(true, false);
            _tip.setFromMatrixPosition(jaw.matrixWorld);
            hold.worldToLocal(_tip);
            pike.position.copy(_tip).multiplyScalar(-1);
          }
          const tail = pike.getObjectByName("Tail");
          if (tail) tail.rotation.y = s.tail;
        }
        keepT.current = Math.min(KEEP_DURATION, keepT.current + dt);
        if (s.done && !keepDone.current) {
          keepDone.current = true;
          onKeepCompleteRef.current?.();
        }
        (window as unknown as { __KEEP?: { t: number; y: number; dist: number; fade: number; detached: boolean; done: boolean } }).__KEEP = {
          t: keepT.current,
          y: fishPoint.current.y,
          dist: Math.hypot(fishPoint.current.x, fishPoint.current.z),
          fade: s.fade,
          detached: s.detached,
          done: s.done,
        };
      } else if (returning) {
        const s = sampleReturn(
          retT.current,
          returnFromKeep.current,
          fightT.current,
          prepHold.current,
          landHoldT.current,
          returnHoldClock.current,
        );
        applyReturnPose(man, s);
        if (!castFrom.current.armed) {
          const now = measureRodPitchYaw(man, rod);
          castFrom.current.pitch = now.pitch;
          castFrom.current.yaw = now.yaw;
          castFrom.current.armed = true;
        }
        const u = Math.min(1, retT.current / RETURN_DURATION);
        const pitch = THREE.MathUtils.lerp(castFrom.current.pitch, CAST_START_PITCH, s.progress);
        const yaw = THREE.MathUtils.lerp(castFrom.current.yaw, CAST_START_YAW, s.progress);
        attached.current = seatRodInHand(man, rod, pitch, yaw);
        gripKey.current = "hold";
        applyRodBend(rod, s.bend);
        attached.current = true;
        if (landSim.current) landSim.current.tension = s.tension;
        pike.visible = false;
        setPikeFade(pike, 0);
        if (fishHold.current) fishHold.current.visible = false;
        const floatG = floatRef.current;
        if (floatG) {
          floatG.updateWorldMatrix(true, false);
          _mid.setFromMatrixPosition(floatG.matrixWorld);
        } else {
          _mid.set(0, 0, 0);
        }
        returnLeaderWorld(_mid, leaderEnd.current);
        retT.current = Math.min(RETURN_DURATION, retT.current + dt);
        if (s.done && !returnDone.current) {
          returnDone.current = true;
          onReturnCompleteRef.current?.();
        }
        (window as unknown as { __RETURN?: { t: number; u: number; done: boolean; fromKeep: boolean } }).__RETURN = {
          t: retT.current,
          u,
          done: s.done,
          fromKeep: returnFromKeep.current,
        };
      } else {
        castFrom.current.armed = false;
        const target = clip === "AIM" ? 1 : 0;
        const step = dt / 0.4;
        if (aimU.current < target) aimU.current = Math.min(target, aimU.current + step);
        else if (aimU.current > target) aimU.current = Math.max(target, aimU.current - step);
        applyAimArms(man, aimU.current);
        if (gripKey.current !== "hold") {
          attached.current = seatRodInHand(man, rod);
          applyRodBend(rod, 0);
          gripKey.current = "hold";
        }
        rod.visible = true;
      }
      rod.visible = true;
    } else if (attached.current) {
      rod.removeFromParent();
      rod.visible = false;
      attached.current = false;
      gripKey.current = "";
      aimU.current = 0;
    }

    if (attached.current && clip !== "READY" && clip !== "AIM" && !casting && !landing && !waiting && !biting && !hooking && !fighting && !reeling && !prepping && !outing && !holding && !releasing && !keeping && !returning) aimRod(man, rod, clip);
    if (!wantsRod) applyRodBend(rod, tensionFor(clip));
    if (!outing && !holding && !releasing && !keeping && pike.position.lengthSq() > 1e-8) pike.position.set(0, 0, 0);
    if (!releasing && !keeping && !returning) {
      pike.visible = true;
      setPikeFade(pike, 1);
    }

    const ikMode = ikFor(clip);
    if (ikMode !== "none") {
      const targetName = ikMode === "reel" ? "ReelHandleTarget" : "RodSupportTarget";
      if (worldOf(rod, targetName, _target)) {
        twoBoneIK(man, ["UpperArm_L", "LowerArm_L", "Hand_L"], _target, 8);
      }
    }

    if (debug.line && clip !== "READY" && !fighting && !reeling && !prepping && !outing && !holding && !releasing && !keeping && !returning) {
      worldOf(rod, "RodTip", _tip) ?? worldOf(rod, "LineStart", _tip);
      const jaw = pike.getObjectByName("Jaw") ?? pike.getObjectByName("PikeRoot");
      if (jaw) {
        jaw.updateWorldMatrix(true, false);
        _fishMouth.setFromMatrixPosition(jaw.matrixWorld);
      }
      _mid.lerpVectors(_tip, _fishMouth, 0.5);
      _mid.y -= 0.18;
      linePts[0] = _tip.x;
      linePts[1] = _tip.y;
      linePts[2] = _tip.z;
      linePts[3] = _mid.x;
      linePts[4] = _mid.y;
      linePts[5] = _mid.z;
      linePts[6] = _fishMouth.x;
      linePts[7] = _fishMouth.y;
      linePts[8] = _fishMouth.z;
      lineGeo.setAttribute("position", new THREE.BufferAttribute(linePts, 3));
      lineGeo.computeBoundingSphere();
    }

    fpsAcc.current.t += dt;
    fpsAcc.current.frames += 1;
    if (fpsAcc.current.t >= 0.4) {
      onFps?.(Math.round(fpsAcc.current.frames / fpsAcc.current.t));
      fpsAcc.current.t = 0;
      fpsAcc.current.frames = 0;
    }
  });

  return (
    <group>
      <group rotation={[0, yaw + extraYaw.current + Math.PI, 0]}>
        <primitive object={man} position={[0, 0, 0]} />
        {embed ? null : (
          <WaterPlane active={charClip === "READY" || charClip === "AIM" || holdsCastPose(charClip) || isWaitClip(charClip) || isBiteClip(charClip) || isHookClip(charClip) || isFightClip(charClip) || isReelClip(charClip) || isPrepClip(charClip) || isLandClip(charClip) || isHoldClip(charClip) || isReleaseClip(charClip) || isKeepClip(charClip) || isReturnClip(charClip)} floatOn={floatOn} />
        )}
        <LakeFloat
          ref={floatRef}
          floatOn={floatOn}
          wave={wave}
          active={charClip === "READY" || charClip === "AIM" || holdsCastPose(charClip) || isWaitClip(charClip) || isBiteClip(charClip) || isHookClip(charClip) || isFightClip(charClip) || isReelClip(charClip) || isPrepClip(charClip) || isLandClip(charClip) || isHoldClip(charClip) || isReleaseClip(charClip) || isKeepClip(charClip) || isReturnClip(charClip)}
          hanging={charClip === "AIM"}
          casting={charClip.startsWith("CAST")}
          landing={charClip === "FLOAT_LANDING"}
          waiting={charClip === "WAIT"}
          biting={charClip === "BITE_REACTION"}
          hooking={charClip === "HOOKSET"}
          fighting={charClip === "FIGHT_LIGHT"}
          reeling={charClip === "REEL"}
          prepping={charClip === "LAND_PREP"}
          outing={charClip === "LAND"}
          holding={charClip === "LANDED_HOLD"}
          releasing={charClip === "RELEASE"}
          keeping={charClip === "KEEP"}
          returning={charClip === "RETURN_TO_READY"}
          castTimeRef={castT}
          biteTimeRef={biteT}
          hookTimeRef={hookT}
          fightTimeRef={fightT}
          prepTimeRef={prepT}
          outTimeRef={outT}
          holdTimeRef={holdT}
          releaseTimeRef={relT}
          keepTimeRef={keepT}
          returnTimeRef={retT}
          approachRef={reelApproach}
          fishPointRef={fishPoint}
          simRef={landSim}
          rod={rod}
        />
        <WaterSplash simRef={landSim} />
        <group
          ref={fishHold}
          position={[0.55, 0.55, -1.65]}
          scale={charClip === "LAND" || charClip === "LANDED_HOLD" || charClip === "RELEASE" || charClip === "KEEP" ? Math.max(0.12, fishScale * LAND_FISH_SCALE) : fishScale}
          visible={
            charClip === "LAND" ||
            charClip === "LANDED_HOLD" ||
            (charClip === "RELEASE" && !stowFish) ||
            (charClip === "KEEP" && !stowFish) ||
            !(floatOn && (charClip === "READY" || charClip === "AIM" || holdsCastPose(charClip) || isWaitClip(charClip) || isBiteClip(charClip) || isHookClip(charClip) || isFightClip(charClip) || isReelClip(charClip) || isPrepClip(charClip)))
          }
        >
          <primitive object={pike} />
        </group>
      </group>
      <primitive object={helpers.skel} />
      <primitive object={helpers.fishSkel} />
      <FishingLineView
        rod={rod}
        floatRef={floatRef}
        lineOn={lineOn}
        floatOn={floatOn}
        tension={charClip === "AIM" ? AIM_LINE_TENSION : charClip === "WAIT" ? WAIT_LINE_TENSION : lineTension}
        castTimeRef={charClip.startsWith("CAST") ? castT : undefined}
        landSimRef={charClip === "FLOAT_LANDING" || charClip === "WAIT" || charClip === "BITE_REACTION" || charClip === "HOOKSET" || charClip === "FIGHT_LIGHT" || charClip === "REEL" || charClip === "LAND_PREP" || charClip === "LAND" || charClip === "LANDED_HOLD" || charClip === "RELEASE" || charClip === "KEEP" || charClip === "RETURN_TO_READY" ? landSim : undefined}
        fishPointRef={charClip === "FIGHT_LIGHT" || charClip === "REEL" || charClip === "LAND_PREP" || charClip === "LAND" || charClip === "LANDED_HOLD" || charClip === "RELEASE" || charClip === "KEEP" || charClip === "RETURN_TO_READY" ? (charClip === "RELEASE" || charClip === "KEEP" || charClip === "RETURN_TO_READY" ? leaderEnd : fishPoint) : undefined}
        wave={wave}
        debug={debug.line}
        active={charClip === "READY" || charClip === "AIM" || holdsCastPose(charClip) || isWaitClip(charClip) || isBiteClip(charClip) || isHookClip(charClip) || isFightClip(charClip) || isReelClip(charClip) || isPrepClip(charClip) || isLandClip(charClip) || isHoldClip(charClip) || isReleaseClip(charClip) || isKeepClip(charClip) || isReturnClip(charClip)}
      />
      {debug.line && charClip !== "READY" && charClip !== "FIGHT_LIGHT" && charClip !== "REEL" && charClip !== "LAND_PREP" && charClip !== "LAND" && charClip !== "LANDED_HOLD" && charClip !== "RELEASE" && charClip !== "KEEP" && charClip !== "RETURN_TO_READY" && (
        <line>
          <primitive object={lineGeo} attach="geometry" />
          <lineBasicMaterial color="#d8dde4" transparent opacity={0.75} />
        </line>
      )}
      {debug.ik && <IkDots rod={rod} />}
      {debug.rodAnchors && <AnchorDots rod={rod} man={man} />}
      {!embed && <gridHelper args={[6, 12, "#7a8a94", "#3d4a52"]} />}
      {!embed && <ContactShadows position={[0, 0.001, 0]} opacity={0.42} scale={4.5} blur={2.4} far={3.5} color="#1a1c18" />}
    </group>
  );
}

function IkDots({ rod }: { rod: THREE.Object3D }) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (a.current && worldOf(rod, "RodSupportTarget", _target)) a.current.position.copy(_target);
    if (b.current && worldOf(rod, "ReelHandleTarget", _mid)) b.current.position.copy(_mid);
  });
  return (
    <group>
      <mesh ref={a}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshBasicMaterial color="#8dcc9a" />
      </mesh>
      <mesh ref={b}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color="#c9b896" />
      </mesh>
    </group>
  );
}

function AnchorDots({ rod, man }: { rod: THREE.Object3D; man: THREE.Object3D }) {
  const refs = {
    RodTip: useRef<THREE.Mesh>(null),
    RodGrip: useRef<THREE.Mesh>(null),
    RearGrip: useRef<THREE.Mesh>(null),
    Reel: useRef<THREE.Mesh>(null),
    Hand_R: useRef<THREE.Mesh>(null),
    Hand_L: useRef<THREE.Mesh>(null),
  };
  useFrame(() => {
    const grip = rod.getObjectByName("RodGrip");
    const tip = rod.getObjectByName("RodTip");
    const reel = rod.getObjectByName("Reel");
    if (refs.RodTip.current && tip) {
      tip.updateWorldMatrix(true, false);
      refs.RodTip.current.position.setFromMatrixPosition(tip.matrixWorld);
    }
    if (refs.RodGrip.current && grip) {
      grip.updateWorldMatrix(true, false);
      refs.RodGrip.current.position.setFromMatrixPosition(grip.matrixWorld);
    }
    if (refs.Reel.current && reel) {
      reel.updateWorldMatrix(true, false);
      refs.Reel.current.position.setFromMatrixPosition(reel.matrixWorld);
    }
    if (refs.RearGrip.current) {
      _mid.set(0, 0.04, 0);
      rod.localToWorld(_mid);
      refs.RearGrip.current.position.copy(_mid);
    }
    if (refs.Hand_R.current && worldOf(man, "Hand_R", _mid)) refs.Hand_R.current.position.copy(_mid);
    if (refs.Hand_L.current && worldOf(man, "Hand_L", _tip)) refs.Hand_L.current.position.copy(_tip);
  });
  return (
    <group>
      <mesh ref={refs.RodTip}>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshBasicMaterial color="#7ec8ff" />
      </mesh>
      <mesh ref={refs.RodGrip}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshBasicMaterial color="#e3b27e" />
      </mesh>
      <mesh ref={refs.RearGrip}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshBasicMaterial color="#8dcc9a" />
      </mesh>
      <mesh ref={refs.Reel}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <meshBasicMaterial color="#c9b896" />
      </mesh>
      <mesh ref={refs.Hand_R}>
        <sphereGeometry args={[0.016, 10, 10]} />
        <meshBasicMaterial color="#ff8866" />
      </mesh>
      <mesh ref={refs.Hand_L}>
        <sphereGeometry args={[0.016, 10, 10]} />
        <meshBasicMaterial color="#66aaff" />
      </mesh>
    </group>
  );
}

export function Lights() {
  return (
    <>
      <hemisphereLight args={["#e8eef2", "#4a5560", 1.15]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3.4, 6.5, 2.8]} intensity={1.55} color="#fff4e0" />
      <directionalLight position={[-2.4, 2.2, -2.8]} intensity={0.7} color="#9eb4c8" />
      <directionalLight position={[0.2, 1.8, 4.0]} intensity={0.45} color="#ffffff" />
      <directionalLight position={[0.0, 2.4, -4.2]} intensity={0.55} color="#d7e3ea" />
    </>
  );
}
