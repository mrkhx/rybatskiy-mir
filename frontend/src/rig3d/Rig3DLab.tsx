"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Lights, Rig3DScene } from "./Rig3DScene";
import { CAST_SEQ, type CharClip, type DebugFlags, type FishClip } from "./types";
import "../rig/rig.css";
import "./rig3d.css";

const CHAR_PRIMARY: Array<{ id: CharClip | "CAST"; label: string }> = [
  { id: "IDLE", label: "Idle" },
  { id: "AIM", label: "Aim" },
  { id: "CAST", label: "Cast" },
  { id: "WAIT", label: "Wait" },
  { id: "BITE_REACTION", label: "Bite" },
  { id: "HOOKSET", label: "Hookset" },
  { id: "REEL", label: "Reel" },
  { id: "FIGHT_LIGHT", label: "Fight light" },
  { id: "FIGHT_HEAVY", label: "Fight heavy" },
  { id: "LAND", label: "Land" },
];

const FISH_BTNS: Array<{ id: FishClip; label: string }> = [
  { id: "SWIM_IDLE", label: "Swim" },
  { id: "SWIM_FAST", label: "Swim fast" },
  { id: "TURN_LEFT", label: "Turn" },
  { id: "STRUGGLE_LIGHT", label: "Struggle" },
  { id: "STRUGGLE_HEAVY", label: "Struggle+" },
  { id: "SURFACE", label: "Surface" },
];

export function Rig3DLab() {
  const [charClip, setCharClip] = useState<CharClip>("IDLE");
  const [fishClip, setFishClip] = useState<FishClip>("SWIM_IDLE");
  const [fishScale, setFishScale] = useState(1);
  const [fps, setFps] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [debug, setDebug] = useState<DebugFlags>({
    skeleton: false,
    ik: false,
    rodAnchors: false,
    fishSkeleton: false,
    line: true,
    fps: true,
    orbit: false,
  });

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  const playChar = useCallback((id: CharClip | "CAST") => {
    if (id === "CAST") {
      setCharClip("CAST_BACKSWING");
      return;
    }
    setCharClip(id);
  }, []);

  const onCharFinished = useCallback((name: string) => {
    const i = CAST_SEQ.indexOf(name as CharClip);
    const next = i >= 0 ? CAST_SEQ[i + 1] : undefined;
    if (next) setCharClip(next);
  }, []);

  const tog = (key: keyof DebugFlags) => setDebug((d) => ({ ...d, [key]: !d[key] }));

  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);

  return (
    <main className="rig-lab rig3d-lab">
      <header className="rig-lab-top">
        <div>
          <p className="rig-lab-kicker">Рыбацкий Мир · 3D prototype</p>
          <h1>Adult male · WebGL rig</h1>
        </div>
        <div className="rig-lab-meta">
          <span className="rig-lab-state">{charClip.replaceAll("_", " ")}</span>
          {debug.fps && <span className="rig-lab-state">{fps || "—"} fps</span>}
          <a href="/dev/rig" className="rig-lab-back">
            2.5D lab
          </a>
          <a href="/" className="rig-lab-back">
            К озеру
          </a>
        </div>
      </header>

      <section className="rig-stage rig3d-stage" aria-label="3D риг рыбака">
        <Canvas
          className="rig3d-canvas"
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          dpr={dpr}
          camera={{ position: [2.35, 1.38, 3.4], fov: 32, near: 0.08, far: 40 }}
          frameloop={hidden ? "never" : "always"}
          onCreated={({ gl, camera }) => {
            gl.setClearColor(0x000000, 0);
            camera.lookAt(0, 1.05, 0);
          }}
        >
          <Suspense fallback={null}>
            <Lights />
            <Rig3DScene
              charClip={charClip}
              fishClip={fishClip}
              fishScale={fishScale}
              debug={debug}
              onFps={setFps}
              onCharFinished={onCharFinished}
            />
            <OrbitControls
              enablePan={debug.orbit}
              enableRotate={debug.orbit}
              enableZoom={debug.orbit}
              makeDefault
              target={[0, 1.05, 0]}
              maxPolarAngle={Math.PI * 0.49}
            />
          </Suspense>
        </Canvas>
      </section>

      <nav className="rig-dock" aria-label="Позы 3D рига">
        <div className="rig-toggles">
          {(
            [
              ["skeleton", "Skeleton"],
              ["ik", "IK targets"],
              ["rodAnchors", "Rod anchors"],
              ["fishSkeleton", "Fish skeleton"],
              ["line", "Line"],
              ["fps", "FPS"],
              ["orbit", "Orbit"],
            ] as Array<[keyof DebugFlags, string]>
          ).map(([k, label]) => (
            <button key={k} type="button" className={debug[k] ? "is-on" : ""} onClick={() => tog(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="rig-actions">
          {CHAR_PRIMARY.map((a) => (
            <button
              key={a.id}
              type="button"
              className={
                a.id === "CAST"
                  ? charClip.startsWith("CAST")
                    ? "is-on"
                    : ""
                  : charClip === a.id
                    ? "is-on"
                    : ""
              }
              onClick={() => playChar(a.id)}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="rig-actions rig-actions-more">
          {FISH_BTNS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={fishClip === a.id ? "is-on" : ""}
              onClick={() => setFishClip(a.id)}
            >
              {a.label}
            </button>
          ))}
          <label className="rig3d-scale">
            Fish scale
            <input
              type="range"
              min={0.45}
              max={2.2}
              step={0.05}
              value={fishScale}
              onChange={(e) => setFishScale(Number(e.target.value))}
            />
            <span>{fishScale.toFixed(2)}</span>
          </label>
        </div>
      </nav>
    </main>
  );
}
