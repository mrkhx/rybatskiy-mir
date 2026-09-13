"use client";

import { useEffect, useRef, useState } from "react";
import { CharacterRig } from "./CharacterRig";
import { useRigAnimator } from "./animator";
import type { AnimState, RigManifest } from "./types";
import "./rig.css";

const MANIFEST_URL = "/characters/adult-male/manifest.json";

const ACTIONS: Array<{ id: string; label: string; run: "state" | "clip"; state?: AnimState; clip?: string }> = [
  { id: "a-pose", label: "A-pose", run: "state", state: "A_POSE" },
  { id: "idle", label: "Idle", run: "state", state: "IDLE" },
  { id: "ready", label: "Ready", run: "state", state: "READY" },
  { id: "aim", label: "Aim", run: "state", state: "AIM" },
  { id: "cast", label: "Cast", run: "clip", clip: "CAST" },
  { id: "wait", label: "Wait", run: "state", state: "WAIT" },
  { id: "bite", label: "Bite", run: "state", state: "BITE_REACTION" },
  { id: "hook", label: "Hookset", run: "clip", clip: "HOOK" },
  { id: "reel", label: "Reel", run: "state", state: "REEL" },
  { id: "fight-l", label: "Fight light", run: "state", state: "FIGHT_LIGHT" },
  { id: "fight-h", label: "Fight heavy", run: "state", state: "FIGHT_HEAVY" },
  { id: "land", label: "Land", run: "clip", clip: "LAND_SEQ" },
];

export function RigLab() {
  const [manifest, setManifest] = useState<RigManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBones, setShowBones] = useState(false);
  const [showAnchors, setShowAnchors] = useState(false);
  const [scale, setScale] = useState(0.28);
  const stageRef = useRef<HTMLElement>(null);
  const { pose, state, playState, playClip } = useRigAnimator("IDLE");

  useEffect(() => {
    let cancelled = false;
    fetch(MANIFEST_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`manifest ${r.status}`);
        return r.json();
      })
      .then((data: RigManifest) => {
        if (!cancelled) setManifest(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось загрузить rig");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !manifest) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const next = Math.min(width / manifest.nativeCanvasWidth, height / manifest.nativeCanvasHeight) * 0.92;
      setScale(Math.max(0.12, next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [manifest]);

  return (
    <main className="rig-lab">
      <header className="rig-lab-top">
        <div>
          <p className="rig-lab-kicker">Рыбацкий Мир · debug</p>
          <h1>Adult male · 2.5D rig</h1>
        </div>
        <div className="rig-lab-meta">
          <span className="rig-lab-state">{state.replaceAll("_", " ")}</span>
          <a href="/" className="rig-lab-back">
            К озеру
          </a>
        </div>
      </header>

      <section ref={stageRef} className="rig-stage" aria-label="Риг рыбака">
        <div className="rig-floor" />
        {error && <p className="rig-lab-error">{error}</p>}
        {manifest && (
          <CharacterRig
            manifest={manifest}
            pose={pose}
            scale={scale}
            showBones={showBones}
            showAnchors={showAnchors}
          />
        )}
      </section>

      <nav className="rig-dock" aria-label="Позы и анимации">
        <div className="rig-toggles">
          <button type="button" className={showBones ? "is-on" : ""} onClick={() => setShowBones((v) => !v)}>
            Bones
          </button>
          <button type="button" className={showAnchors ? "is-on" : ""} onClick={() => setShowAnchors((v) => !v)}>
            Anchors
          </button>
        </div>
        <div className="rig-actions">
          {ACTIONS.map((a) => {
            const active =
              (a.run === "state" && a.state === state) ||
              (a.clip === "CAST" && state.startsWith("CAST")) ||
              (a.clip === "HOOK" && state === "HOOKSET") ||
              (a.clip === "LAND_SEQ" && (state === "LAND" || state === "RETURN_IDLE"));
            return (
              <button
                key={a.id}
                type="button"
                className={active ? "is-on" : ""}
                onClick={() => {
                  if (a.run === "clip" && a.clip) playClip(a.clip);
                  else if (a.state) playState(a.state, a.state === "HOOKSET" ? 0.12 : 0.38);
                }}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
