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
import { applyRightGrip, attachRodToHand } from "./grip";
import { LOOPING_CHAR, ikFor, tensionFor, type CharClip, type DebugFlags, type FishClip } from "./types";

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
  onFps?: (n: number) => void;
  onCharFinished?: (name: string) => void;
  onReports?: (reports: SceneReports) => void;
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
  onFps,
  onCharFinished,
  onReports,
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
  const extraYaw = useRef(0);
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
    hardenMaterials(rod);
    hardenMaterials(pike);
    pike.rotation.y = Math.PI / 2;
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
    const next = manActions[charClip];
    if (!next) return;
    const fade = charClip.startsWith("CAST") || charClip === "HOOKSET" || charClip === "BITE_REACTION" ? 0.12 : 0.22;
    for (const a of Object.values(manActions)) {
      if (a !== next && a.isRunning()) a.fadeOut(fade);
    }
    next.enabled = true;
    next.reset();
    next.timeScale = charClip === "HOOKSET" ? 1.4 : charClip === "BITE_REACTION" ? 1.15 : charClip === "REEL" ? 1.1 : 1;
    next.setLoop(LOOPING_CHAR.has(charClip) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    next.clampWhenFinished = !LOOPING_CHAR.has(charClip);
    next.fadeIn(fade);
    next.play();
    charRef.current = charClip;
  }, [charClip, manActions]);

  useEffect(() => {
    const next = fishActions[fishClip];
    if (!next) return;
    for (const a of Object.values(fishActions)) {
      if (a !== next && a.isRunning()) a.fadeOut(0.25);
    }
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.25).play();
  }, [fishClip, fishActions]);

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
    const wantsRod = clip === "READY";
    if (wantsRod && !attached.current) {
      attached.current = attachRodToHand(man, rod);
      rod.visible = true;
    } else if (!wantsRod && attached.current) {
      rod.removeFromParent();
      rod.visible = false;
      attached.current = false;
    }

    if (attached.current) aimRod(man, rod, clip);
    applyRodBend(rod, tensionFor(clip));
    spinReel(rod, dt, clip === "REEL");

    const ikMode = ikFor(clip);
    if (ikMode !== "none") {
      const targetName = ikMode === "reel" ? "ReelHandleTarget" : "RodSupportTarget";
      if (worldOf(rod, targetName, _target)) {
        twoBoneIK(man, ["UpperArm_L", "LowerArm_L", "Hand_L"], _target, 8);
      }
    }

    if (debug.line !== false) {
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
      </group>
      <group position={[0.55, 0.55, -1.65]} scale={fishScale}>
        <primitive object={pike} />
      </group>
      <primitive object={helpers.skel} />
      <primitive object={helpers.fishSkel} />
      {debug.line && (
        <line>
          <primitive object={lineGeo} attach="geometry" />
          <lineBasicMaterial color="#d8dde4" transparent opacity={0.75} />
        </line>
      )}
      {debug.ik && <IkDots rod={rod} />}
      {debug.rodAnchors && <AnchorDots rod={rod} />}
      <gridHelper args={[6, 12, "#7a8a94", "#3d4a52"]} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.42} scale={4.5} blur={2.4} far={3.5} color="#1a1c18" />
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

function AnchorDots({ rod }: { rod: THREE.Object3D }) {
  const refs = {
    RodTip: useRef<THREE.Mesh>(null),
    LineStart: useRef<THREE.Mesh>(null),
    Reel: useRef<THREE.Mesh>(null),
    RodGrip: useRef<THREE.Mesh>(null),
  };
  useFrame(() => {
    (Object.keys(refs) as Array<keyof typeof refs>).forEach((name) => {
      const mesh = refs[name].current;
      if (mesh && worldOf(rod, name, _tip)) mesh.position.copy(_tip);
    });
  });
  return (
    <group>
      {(["RodTip", "LineStart", "Reel", "RodGrip"] as const).map((name) => (
        <mesh key={name} ref={refs[name]}>
          <sphereGeometry args={[0.018, 10, 10]} />
          <meshBasicMaterial color="#7ec8ff" />
        </mesh>
      ))}
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
