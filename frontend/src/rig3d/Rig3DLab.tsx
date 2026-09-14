"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Lights, Rig3DScene, type SceneReports } from "./Rig3DScene";
import { CAST_SEQ, type CharClip, type DebugFlags, type FishClip } from "./types";
import { DEBUG_PROXY, PRODUCTION, resolveProductionAssets, type ResolvedAssets } from "../scene3d/assets/paths";
import { summarize, type AdapterReport } from "../scene3d/assets/contract";
import "../rig/rig.css";
import "./rig3d.css";

const AZIMUTHS = [0, 45, 90, 135, 180, 225, 270, 315] as const;

const CHAR_PRIMARY: Array<{ id: CharClip | "CAST"; label: string }> = [
  { id: "IDLE", label: "Idle" },
  { id: "WALK", label: "Walk" },
  { id: "READY", label: "Ready" },
  { id: "AIM", label: "Aim" },
  { id: "CAST", label: "Cast" },
  { id: "FLOAT_LANDING", label: "Landing" },
  { id: "WAIT", label: "Wait" },
  { id: "BITE_REACTION", label: "Bite" },
  { id: "HOOKSET", label: "Hookset" },
  { id: "REEL", label: "Reel" },
  { id: "FIGHT_LIGHT", label: "Fight" },
  { id: "FIGHT_HEAVY", label: "Fight heavy" },
  { id: "LAND_PREP", label: "Approach" },
  { id: "RETURN_IDLE", label: "Return idle" },
];

const FISH_BTNS: Array<{ id: FishClip; label: string }> = [
  { id: "SWIM_IDLE", label: "Swim" },
  { id: "SWIM_FAST", label: "Swim fast" },
  { id: "TURN_LEFT", label: "Turn" },
  { id: "STRUGGLE_LIGHT", label: "Struggle" },
  { id: "STRUGGLE_HEAVY", label: "Struggle+" },
  { id: "SURFACE", label: "Surface" },
];

function ReportChip({ report }: { report: AdapterReport | null }) {
  if (!report) return <span className="rig3d-chip is-wait">…</span>;
  const fails = report.checks.filter((c) => !c.ok && c.level === "fail").length;
  const cls = report.pass ? "is-pass" : "is-fail";
  return (
    <span
      className={`rig3d-chip ${cls}`}
      title={report.checks.map((c) => `${c.ok ? "ok" : c.level} ${c.id}: ${c.detail}`).join("\n")}
    >
      {report.kind} {report.pass ? "PASS" : `FAIL ${fails}`} · {report.triangleCount} tri · {report.source}
    </span>
  );
}

export function Rig3DLab() {
  const [charClip, setCharClip] = useState<CharClip>("IDLE");
  const [fishClip, setFishClip] = useState<FishClip>("SWIM_IDLE");
  const [fishScale, setFishScale] = useState(1);
  const [fps, setFps] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [yaw, setYaw] = useState(0);
  const [autoYaw, setAutoYaw] = useState(false);
  const [assets, setAssets] = useState<ResolvedAssets>({
    fisherman: PRODUCTION.fisherman,
    rod: PRODUCTION.rod,
    pike: DEBUG_PROXY.pike,
    source: { fisherman: "production", rod: "production", pike: "debug" },
    productionPresent: { fisherman: true, rod: true, pike: false },
  });
  const [reports, setReports] = useState<SceneReports | null>(null);
  const [debug, setDebug] = useState<DebugFlags>({
    skeleton: false,
    ik: false,
    rodAnchors: false,
    fishSkeleton: false,
    line: false,
    fps: true,
    orbit: false,
    fingers: false,
    armAxes: false,
  });
  const [lineOn, setLineOn] = useState(true);
  const [floatOn, setFloatOn] = useState(true);
  const [lineTension, setLineTension] = useState(0);
  const [wave, setWave] = useState(0.4);
  const [biteKey, setBiteKey] = useState(0);
  const [hookKey, setHookKey] = useState(0);
  const [fightKey, setFightKey] = useState(0);
  const [reelKey, setReelKey] = useState(0);
  const [prepKey, setPrepKey] = useState(0);

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  useEffect(() => {
    let cancelled = false;
    resolveProductionAssets().then((next) => {
      if (cancelled) return;
      // HEAD probe in the preview iframe can fail while GET of the GLB works.
      // Do not unload the production fisherman for a false-negative probe.
      setAssets({
        fisherman: next.productionPresent.fisherman ? next.fisherman : PRODUCTION.fisherman,
        rod: next.productionPresent.rod ? next.rod : PRODUCTION.rod,
        pike: next.productionPresent.pike ? next.pike : DEBUG_PROXY.pike,
        source: {
          fisherman: "production",
          rod: next.productionPresent.rod ? "production" : "production",
          pike: next.productionPresent.pike ? "production" : "debug",
        },
        productionPresent: {
          fisherman: true,
          rod: next.productionPresent.rod || true,
          pike: next.productionPresent.pike,
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const playChar = useCallback((id: CharClip | "CAST") => {
    if (id === "CAST") {
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "FLOAT_LANDING") {
      if (charClip.startsWith("CAST")) {
        setCharClip("FLOAT_LANDING");
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "WAIT") {
      if (charClip === "FLOAT_LANDING" || charClip.startsWith("CAST") || charClip === "BITE_REACTION") {
        setCharClip("WAIT");
        return;
      }
      if (charClip === "WAIT") return;
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "BITE_REACTION") {
      if (charClip === "WAIT" || charClip === "BITE_REACTION" || charClip === "FLOAT_LANDING" || charClip.startsWith("CAST") || charClip === "HOOKSET") {
        setBiteKey((n) => n + 1);
        setCharClip("BITE_REACTION");
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "HOOKSET") {
      if (charClip === "BITE_REACTION" || charClip === "HOOKSET") {
        setHookKey((n) => n + 1);
        setCharClip("HOOKSET");
        return;
      }
      if (charClip === "WAIT" || charClip === "FLOAT_LANDING" || charClip.startsWith("CAST") || charClip === "FIGHT_LIGHT") {
        setBiteKey((n) => n + 1);
        setCharClip("BITE_REACTION");
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "FIGHT_LIGHT") {
      if (charClip === "REEL") {
        setCharClip("FIGHT_LIGHT");
        return;
      }
      if (charClip === "HOOKSET" || charClip === "FIGHT_LIGHT") {
        setFightKey((n) => n + 1);
        setCharClip("FIGHT_LIGHT");
        return;
      }
      if (charClip === "BITE_REACTION") {
        setHookKey((n) => n + 1);
        setCharClip("HOOKSET");
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "REEL") {
      if (charClip === "FIGHT_LIGHT" || charClip === "REEL") {
        setReelKey((n) => n + 1);
        setCharClip("REEL");
        return;
      }
      if (charClip === "HOOKSET") {
        setFightKey((n) => n + 1);
        setCharClip("FIGHT_LIGHT");
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "LAND_PREP") {
      if (charClip === "REEL" || charClip === "FIGHT_LIGHT" || charClip === "LAND_PREP") {
        setPrepKey((n) => n + 1);
        setCharClip("LAND_PREP");
        return;
      }
      if (charClip === "HOOKSET") {
        setFightKey((n) => n + 1);
        setCharClip("FIGHT_LIGHT");
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    setCharClip(id);
  }, [charClip]);

  const onCastComplete = useCallback(() => {
    setCharClip((c) => (c.startsWith("CAST") ? "FLOAT_LANDING" : c));
  }, []);

  const onLandingComplete = useCallback(() => {
    setCharClip((c) => (c === "FLOAT_LANDING" ? "WAIT" : c));
  }, []);

  const onCharFinished = useCallback((name: string) => {
    if (name.startsWith("CAST")) return;
    const i = CAST_SEQ.indexOf(name as CharClip);
    const next = i >= 0 ? CAST_SEQ[i + 1] : undefined;
    if (next) setCharClip(next);
  }, []);

  const tog = (key: keyof DebugFlags) => setDebug((d) => ({ ...d, [key]: !d[key] }));
  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);
  const available = useMemo(() => new Set(reports?.fisherman.clips ?? []), [reports]);
  const fishermanPass = Boolean(reports?.fisherman.pass);
  const productionReady = Boolean(fishermanPass && reports?.rod.pass && reports?.pike.pass);
  const azimuthDeg = Math.round(((yaw * 180) / Math.PI + 360) % 360);

  return (
    <main className="rig-lab rig3d-lab">
      <header className="rig-lab-top">
        <div>
          <p className="rig-lab-kicker">Рыбацкий Мир · 3D contract</p>
          <h1>Production 360° lab</h1>
          <p className="rig3d-kicker">REEL → LAND PREP · подход рыбы</p>
        </div>
        <div className="rig-lab-meta">
          <span className="rig-lab-state">{charClip.replaceAll("_", " ")}</span>
          <span className="rig-lab-state">{autoYaw ? "auto" : `${azimuthDeg}°`}</span>
          {debug.fps && <span className="rig-lab-state">{fps || "—"} fps</span>}
          <a href="/dev/rod" className="rig-lab-back">
            Rod
          </a>
          <a href="/dev/rig" className="rig-lab-back">
            2.5D lab
          </a>
          <a href="/" className="rig-lab-back">
            К озеру
          </a>
        </div>
      </header>

      <section className="rig-stage rig3d-stage" aria-label="3D риг рыбака">
        <div className="rig3d-banner" role="status">
          {!reports ? (
            <>
              <strong>ЗАГРУЗКА</strong>
              <span>production fisherman.glb · ~17 МБ, подождите</span>
            </>
          ) : fishermanPass ? (
            <>
              <strong className="is-pass">FISHERMAN PASS</strong>
              <span>
                {productionReady
                  ? "production set complete"
                  : "персонаж production · rod/pike ещё debug"}
              </span>
            </>
          ) : (
            <>
              <strong className="is-fail">FISHERMAN FAIL</strong>
              <span>
                {assets.productionPresent.fisherman
                  ? "файл в production не проходит contract"
                  : "нет production GLB — на сцене debug proxy, это не персонаж игры"}
              </span>
            </>
          )}
        </div>
        {!reports && (
          <div className="rig3d-loading" role="status">
            Загрузка персонажа…
          </div>
        )}
        <div className="rig3d-report">
          <ReportChip report={reports?.fisherman ?? null} />
          <ReportChip report={reports?.rod ?? null} />
          <ReportChip report={reports?.pike ?? null} />
        </div>
        <Canvas
          className="rig3d-canvas"
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          dpr={dpr}
          camera={{ position: [0, 1.85, -6.2], fov: 36, near: 0.08, far: 60 }}
          frameloop={hidden ? "never" : "always"}
          onCreated={({ gl, camera }) => {
            gl.setClearColor(0x000000, 0);
            camera.lookAt(0, 1.15, 0);
          }}
        >
          <Suspense fallback={null}>
            <Lights />
            <Rig3DScene
              fishermanUrl={assets.fisherman}
              rodUrl={assets.rod}
              pikeUrl={assets.pike}
              fishermanSource={assets.source.fisherman}
              rodSource={assets.source.rod}
              pikeSource={assets.source.pike}
              yaw={yaw}
              autoYaw={autoYaw}
              charClip={charClip}
              fishClip={fishClip}
              fishScale={fishScale}
              debug={debug}
              lineOn={lineOn}
              floatOn={floatOn}
              lineTension={lineTension}
              wave={wave}
              onFps={setFps}
              onCharFinished={onCharFinished}
              onCastComplete={onCastComplete}
              onLandingComplete={onLandingComplete}
              biteKey={biteKey}
              hookKey={hookKey}
              fightKey={fightKey}
              reelKey={reelKey}
              prepKey={prepKey}
              onReports={setReports}
            />
            <OrbitControls
              enablePan={debug.orbit}
              enableRotate={debug.orbit}
              enableZoom
              makeDefault
              target={[0, 1.15, 0]}
              minDistance={2.4}
              maxDistance={14}
              maxPolarAngle={Math.PI * 0.49}
            />
          </Suspense>
        </Canvas>
      </section>

      <nav className="rig-dock" aria-label="Позы 3D рига">
        <div className="rig-toggles">
          <span className="rig3d-az-label">360°</span>
          {AZIMUTHS.map((deg) => (
            <button
              key={deg}
              type="button"
              className={!autoYaw && (Math.abs(azimuthDeg - deg) < 8 || (deg === 0 && azimuthDeg > 352)) ? "is-on" : ""}
              onClick={() => {
                setAutoYaw(false);
                setYaw((deg * Math.PI) / 180);
              }}
            >
              {deg}°
            </button>
          ))}
          <button type="button" className={autoYaw ? "is-on" : ""} onClick={() => setAutoYaw((v) => !v)}>
            Auto rotate
          </button>
        </div>
        <div className="rig-toggles">
          <button type="button" className={lineOn ? "is-on" : ""} onClick={() => setLineOn((v) => !v)}>
            Line {lineOn ? "ON" : "OFF"}
          </button>
          <button type="button" className={floatOn ? "is-on" : ""} onClick={() => setFloatOn((v) => !v)}>
            Float {floatOn ? "ON" : "OFF"}
          </button>
          <label className="rig3d-scale">
            Tension
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={lineTension}
              onChange={(e) => setLineTension(Number(e.target.value))}
            />
            <span>{lineTension.toFixed(2)}</span>
          </label>
          <label className="rig3d-scale">
            Wave
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={wave}
              onChange={(e) => setWave(Number(e.target.value))}
            />
            <span>{wave.toFixed(2)}</span>
          </label>
        </div>
        <div className="rig-toggles">
          {(
            [
              ["skeleton", "Skeleton"],
              ["ik", "IK targets"],
              ["rodAnchors", "Rod anchors"],
              ["fingers", "Finger bones"],
              ["armAxes", "Arm axes"],
              ["fishSkeleton", "Fish skeleton"],
              ["line", "Line"],
              ["fps", "FPS"],
              ["orbit", "Orbit cam"],
            ] as Array<[keyof DebugFlags, string]>
          ).map(([k, label]) => (
            <button key={k} type="button" className={debug[k] ? "is-on" : ""} onClick={() => tog(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="rig-actions">
          {CHAR_PRIMARY.map((a) => {
            const need = a.id === "CAST" ? "CAST_BACKSWING" : a.id;
            const missing = Boolean(
              reports &&
                !available.has(need) &&
                a.id !== "IDLE" &&
                a.id !== "AIM" &&
                a.id !== "READY" &&
                a.id !== "CAST" &&
                a.id !== "FLOAT_LANDING" &&
                a.id !== "WAIT" &&
                a.id !== "BITE_REACTION" &&
                a.id !== "HOOKSET" &&
                a.id !== "FIGHT_LIGHT" &&
                a.id !== "REEL" &&
                a.id !== "LAND_PREP",
            );
            const active =
              a.id === "CAST"
                ? charClip.startsWith("CAST")
                : a.id === "FLOAT_LANDING"
                  ? charClip === "FLOAT_LANDING"
                  : charClip === a.id;
            return (
              <button
                key={a.id}
                type="button"
                className={active ? "is-on" : ""}
                disabled={missing || a.id === "FIGHT_HEAVY"}
                onClick={() => playChar(a.id)}
                title={missing ? "clip отсутствует в GLB" : undefined}
              >
                {a.label}
              </button>
            );
          })}
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
        {reports && !reports.fisherman.pass && (
          <p className="rig3d-fail-note">
            Validator: {summarize(reports.fisherman)}. Нужен внешний skinned GLB 30–70k, 2K PBR, 360° mesh — см.
            public/models/production.
          </p>
        )}
      </nav>
    </main>
  );
}
