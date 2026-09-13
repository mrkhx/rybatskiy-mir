"use client";

import { useEffect, useRef, useState } from "react";
import { CharacterRig } from "./CharacterRig";
import { useRigAnimator } from "./animator";
import type { AnimState, RigManifest } from "./types";
import "./rig.css";

const MANIFEST_URL = "/characters/adult-male/manifest.json";

const PRIMARY: Array<{ id: string; label: string; run: "state" | "clip"; state?: AnimState; clip?: string }> = [
  { id: "idle", label: "Idle", run: "state", state: "IDLE" },
  { id: "aim", label: "Aim", run: "state", state: "AIM" },
  { id: "wait", label: "Wait", run: "state", state: "WAIT" },
  { id: "reel", label: "Reel", run: "state", state: "REEL" },
  { id: "fight-l", label: "Fight light", run: "state", state: "FIGHT_LIGHT" },
];

const SECONDARY: Array<{ id: string; label: string; run: "state" | "clip"; state?: AnimState; clip?: string }> = [
  { id: "a-pose", label: "A-pose", run: "state", state: "A_POSE" },
  { id: "ready", label: "Ready", run: "state", state: "READY" },
  { id: "cast", label: "Cast", run: "clip", clip: "CAST" },
  { id: "bite", label: "Bite", run: "state", state: "BITE_REACTION" },
  { id: "hook", label: "Hookset", run: "clip", clip: "HOOK" },
  { id: "fight-h", label: "Fight heavy", run: "state", state: "FIGHT_HEAVY" },
  { id: "land", label: "Land", run: "clip", clip: "LAND_SEQ" },
];

export function RigLab() {
  const [manifest, setManifest] = useState<RigManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBones, setShowBones] = useState(false);
  const [showAnchors, setShowAnchors] = useState(false);
  const [artOnly, setArtOnly] = useState(true);
  const [closeUp, setCloseUp] = useState(false);
  const [scale, setScale] = useState(0.28);
  const [panY, setPanY] = useState(0);
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
      const fit = Math.min(width / manifest.nativeCanvasWidth, height / manifest.nativeCanvasHeight);
      const next = Math.max(0.12, fit * (closeUp ? 1.28 : 0.94));
      setScale(next);
      setPanY(closeUp ? height * 0.06 : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [manifest, closeUp]);

  const bones = artOnly ? false : showBones;
  const anchors = artOnly ? false : showAnchors;

  const renderAction = (a: (typeof PRIMARY)[number]) => {
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
          else if (a.state) playState(a.state, 0.4);
        }}
      >
        {a.label}
      </button>
    );
  };

  return (
    <main className={`rig-lab${closeUp ? " is-close" : ""}`}>
      <header className="rig-lab-top">
        <div>
          <p className="rig-lab-kicker">Рыбацкий Мир · debug</p>
          <h1>Adult male · 2.5D rig</h1>
        </div>
        <div className="rig-lab-meta">
          <span className="rig-lab-state">{state.replaceAll("_", " ")}</span>
          <a href="/dev/rig3d" className="rig-lab-back">
            3D lab
          </a>
          <a href="/" className="rig-lab-back">
            К озеру
          </a>
        </div>
      </header>

      <section ref={stageRef} className="rig-stage" aria-label="Риг рыбака">
        {!artOnly && <div className="rig-floor" />}
        {error && <p className="rig-lab-error">{error}</p>}
        {manifest && (
          <CharacterRig
            manifest={manifest}
            pose={pose}
            scale={scale}
            panY={panY}
            showBones={bones}
            showAnchors={anchors}
          />
        )}
      </section>

      <nav className="rig-dock" aria-label="Позы и анимации">
        <div className="rig-toggles">
          <button type="button" className={artOnly ? "is-on" : ""} onClick={() => setArtOnly((v) => !v)}>
            Art only
          </button>
          <button
            type="button"
            className={!artOnly && showBones ? "is-on" : ""}
            onClick={() => {
              setArtOnly(false);
              setShowBones((v) => !v);
            }}
          >
            Bones
          </button>
          <button
            type="button"
            className={!artOnly && showAnchors ? "is-on" : ""}
            onClick={() => {
              setArtOnly(false);
              setShowAnchors((v) => !v);
            }}
          >
            Anchors
          </button>
          <button type="button" className={closeUp ? "is-on" : ""} onClick={() => setCloseUp((v) => !v)}>
            Close-up
          </button>
        </div>
        <div className="rig-actions">{PRIMARY.map(renderAction)}</div>
        <div className="rig-actions rig-actions-more">{SECONDARY.map(renderAction)}</div>
      </nav>
    </main>
  );
}
