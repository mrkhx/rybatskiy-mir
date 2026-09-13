"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { applyRodBend } from "./rodBend";
import { PRODUCTION } from "../scene3d/assets/paths";
import "../rig/rig.css";
import "./rig3d.css";

type View = "side" | "reel" | "reel34" | "spool" | "rotor" | "roller" | "foot" | "handle";

const CAM: Record<View, { pos: [number, number, number]; target: [number, number, number]; fov: number }> = {
  side: { pos: [4.6, 0.4, 1.2], target: [0, 0, 1.2], fov: 32 },
  reel: { pos: [0.14, -0.05, 0.28], target: [0, -0.055, 0.28], fov: 26 },
  reel34: { pos: [0.12, 0.02, 0.16], target: [0, -0.05, 0.29], fov: 28 },
  spool: { pos: [0.02, -0.055, 0.42], target: [0, -0.055, 0.30], fov: 24 },
  rotor: { pos: [0.10, -0.03, 0.38], target: [0, -0.05, 0.31], fov: 24 },
  roller: { pos: [0.06, 0.01, 0.36], target: [0, -0.034, 0.31], fov: 20 },
  foot: { pos: [0.10, -0.005, 0.28], target: [0, -0.02, 0.28], fov: 24 },
  handle: { pos: [-0.12, -0.05, 0.28], target: [-0.04, -0.055, 0.28], fov: 24 },
};

function CamRig({ view }: { view: View }) {
  const cam = useThree((s) => s.camera as THREE.PerspectiveCamera);
  useEffect(() => {
    const c = CAM[view];
    cam.position.set(...c.pos);
    cam.fov = c.fov;
    cam.near = 0.01;
    cam.updateProjectionMatrix();
    cam.lookAt(...c.target);
  }, [view, cam]);
  return null;
}

function RodScene({ tension, view }: { tension: number; view: View }) {
  const gltf = useGLTF(PRODUCTION.rod);
  const rod = useMemo(() => {
    const r = cloneSkinned(gltf.scene);
    r.rotation.x = Math.PI / 2;
    return r;
  }, [gltf.scene]);
  const sticky = useRef(true);

  useEffect(() => {
    sticky.current = true;
  }, [view]);

  useEffect(() => {
    rod.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => {
        const s = mat as THREE.MeshStandardMaterial;
        s.side = THREE.DoubleSide;
        if (s.emissive) s.emissive.setHex(0x2a2824);
        if (s.emissiveIntensity !== undefined) s.emissiveIntensity = 0.35;
        if (s.color) {
          const n = `${s.name || ""} ${m.name || ""}`.toLowerCase();
          if (n.includes("graphite") || n.includes("blank")) s.color.setHex(0x5a564c);
        }
      });
    });
  }, [rod]);

  useFrame(({ camera }) => {
    applyRodBend(rod, tension);
    (window as unknown as { __ROD?: THREE.Object3D }).__ROD = rod;
    if (!sticky.current) return;
    const c = CAM[view];
    camera.position.set(...c.pos);
    const p = camera as THREE.PerspectiveCamera;
    p.fov = c.fov;
    p.near = 0.01;
    p.updateProjectionMatrix();
    camera.lookAt(...c.target);
  });

  return (
    <>
      <primitive object={rod} />
      <OrbitControls
        key={view}
        makeDefault
        target={CAM[view].target}
        minDistance={0.04}
        onStart={() => {
          sticky.current = false;
        }}
      />
    </>
  );
}

export function RodLab() {
  const [view, setView] = useState<View>("side");
  const [tension, setTension] = useState(0);
  const cam = CAM[view];

  return (
    <main className="rig-lab rig3d-lab">
      <header className="rig-lab-top">
        <div>
          <p className="rig-lab-kicker">Рыбацкий мир · rod asset</p>
          <h1>Production rod · {view}</h1>
        </div>
        <div className="rig-lab-meta">
          <a href="/dev/rig3d" className="rig-lab-back">
            360° lab
          </a>
        </div>
      </header>
      <section className="rig-stage rig3d-stage" aria-label="Production rod">
        <Canvas
          className="rig3d-canvas"
          camera={{ position: cam.pos, fov: 35, near: 0.05, far: 40 }}
          gl={{ antialias: true, alpha: false }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={["#4a5860"]} />
          <hemisphereLight args={["#f0f4f7", "#5a6570", 1.25]} />
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 5, 4]} intensity={2.0} color="#fff4e0" />
          <directionalLight position={[-3, 1, -2]} intensity={0.8} color="#c5d4de" />
          <Suspense fallback={null}>
            <CamRig view={view} />
            <RodScene tension={tension} view={view} />
          </Suspense>
          <gridHelper args={[6, 12, "#6a7a84", "#3d4a52"]} />
        </Canvas>
      </section>
      <nav className="rig-dock">
        <div className="rig-toggles">
          {(["side", "reel", "reel34", "spool", "rotor", "roller", "foot", "handle"] as View[]).map((v) => (
            <button key={v} type="button" className={view === v ? "is-on" : ""} onClick={() => setView(v)}>
              {v}
            </button>
          ))}
        </div>
        <label className="rig3d-scale">
          tension
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={tension}
            onChange={(e) => setTension(Number(e.target.value))}
          />
          <span>{tension.toFixed(2)}</span>
        </label>
      </nav>
    </main>
  );
}
