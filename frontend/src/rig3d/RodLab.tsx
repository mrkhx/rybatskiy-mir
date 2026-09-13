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

type View = "side" | "top" | "front" | "34" | "handle" | "guides" | "tip";

const CAM: Record<View, { pos: [number, number, number]; target: [number, number, number] }> = {
  side: { pos: [0, 1.2, 4.4], target: [0, 1.2, 0] },
  top: { pos: [0, 5.2, 0.05], target: [0, 1.2, 0] },
  front: { pos: [0, -2.2, 0.35], target: [0, 0.8, 0] },
  "34": { pos: [2.6, -1.4, 2.0], target: [0, 1.2, 0] },
  handle: { pos: [0.55, -0.25, 0.35], target: [0, 0.2, 0] },
  guides: { pos: [0.55, 1.2, 0.4], target: [0, 1.2, 0] },
  tip: { pos: [0.35, 2.4, 0.22], target: [0, 2.42, 0] },
};

function CamRig({ view }: { view: View }) {
  const cam = useThree((s) => s.camera);
  useEffect(() => {
    const c = CAM[view];
    cam.position.set(...c.pos);
    cam.lookAt(...c.target);
  }, [view, cam]);
  return null;
}

function RodScene({ tension, view }: { tension: number; view: View }) {
  const gltf = useGLTF(PRODUCTION.rod);
  const rod = useMemo(() => cloneSkinned(gltf.scene), [gltf.scene]);
  const controls = useRef<any>(null);

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

  useFrame(() => {
    applyRodBend(rod, tension);
    const ctrl = controls.current;
    if (!ctrl) return;
    const c = CAM[view];
    ctrl.target.set(...c.target);
  });

  return (
    <>
      <primitive object={rod} />
      <OrbitControls ref={controls} makeDefault target={CAM[view].target} />
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
          <h1>Production rod</h1>
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
          {(["side", "top", "front", "34", "handle", "guides", "tip"] as View[]).map((v) => (
            <button key={v} type="button" className={view === v ? "is-on" : ""} onClick={() => setView(v)}>
              {v === "34" ? "3/4" : v}
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
