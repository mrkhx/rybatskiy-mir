"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lights, Rig3DScene, type SceneReports } from "./Rig3DScene";
import { CAST_SEQ, type CharClip, type DebugFlags, type FishClip } from "./types";
import { CatchResultCard } from "./CatchResultCard";
import { DEBUG_CATCH_RESULT, type CatchChoice, type CatchResultData } from "./catchResult";
import { HOOK_DURATION } from "./hookset";
import { LAND_DURATION } from "./land";
import { PREP_DURATION } from "./landPrep";
import { DEBUG_PROXY, PRODUCTION, resolveProductionAssets, type ResolvedAssets } from "../scene3d/assets/paths";
import { summarize, type AdapterReport } from "../scene3d/assets/contract";
import {
  bootstrapVisual,
  canServerCast,
  canServerDecide,
  canServerHook,
  canServerReel,
  catchResultFromSession,
  labelVisual,
  SERVER_DOCK_ACTIONS,
  type LabMode,
} from "./serverFishingVisualAdapter";
import { useServerFishing } from "./useServerFishing";
import "../rig/rig.css";
import "./rig3d.css";

const AZIMUTHS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
const PRECAST_MS = 350;
const HOLD_BEFORE_RESULT_MS = 700;
const LOST_RECOVER_MS = 400;

const CHAR_PRIMARY: Array<{ id: CharClip | "CAST" | "CATCH_RESULT"; label: string }> = [
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
  { id: "LAND", label: "Land" },
  { id: "LANDED_HOLD", label: "Hold" },
  { id: "CATCH_RESULT", label: "Result" },
  { id: "RELEASE", label: "Release" },
  { id: "KEEP", label: "Keep" },
  { id: "RETURN_TO_READY", label: "Return" },
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
  const [mode, setMode] = useState<LabMode>("DEBUG");
  const serverOn = mode === "SERVER";
  const fishing = useServerFishing(serverOn);
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
  const [landKey, setLandKey] = useState(0);
  const [holdKey, setHoldKey] = useState(0);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultRecord, setResultRecord] = useState(false);
  const [catchChoice, setCatchChoice] = useState<CatchChoice | null>(null);
  const [releaseKey, setReleaseKey] = useState(0);
  const [releaseComplete, setReleaseComplete] = useState(false);
  const [keepKey, setKeepKey] = useState(0);
  const [keepComplete, setKeepComplete] = useState(false);
  const [returnKey, setReturnKey] = useState(0);
  const landLock = useRef(false);
  const recoverLock = useRef(false);
  const bootClip = useRef(false);

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

  const playChar = useCallback((id: CharClip | "CAST" | "CATCH_RESULT") => {
    if (id !== "CATCH_RESULT") {
      setResultOpen(false);
      setCatchChoice(null);
    }
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
    if (id === "LAND") {
      if (charClip === "LAND_PREP" || charClip === "LAND") {
        setLandKey((n) => n + 1);
        setCharClip("LAND");
        return;
      }
      if (charClip === "REEL" || charClip === "FIGHT_LIGHT") {
        setPrepKey((n) => n + 1);
        setCharClip("LAND_PREP");
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "LANDED_HOLD") {
      if (charClip === "LAND" || charClip === "LANDED_HOLD") {
        setHoldKey((n) => n + 1);
        setCharClip("LANDED_HOLD");
        return;
      }
      if (charClip === "LAND_PREP") {
        setLandKey((n) => n + 1);
        setCharClip("LAND");
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "CATCH_RESULT") {
      if (charClip === "LANDED_HOLD" || charClip === "LAND") {
        if (charClip === "LAND") setCharClip("LANDED_HOLD");
        setCatchChoice(null);
        setResultOpen(true);
        return;
      }
      if (charClip === "LAND_PREP") {
        setLandKey((n) => n + 1);
        setCharClip("LAND");
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "RELEASE") {
      if (charClip === "LANDED_HOLD" || charClip === "LAND" || charClip === "RELEASE") {
        if (charClip === "LAND") setCharClip("LANDED_HOLD");
        setCatchChoice("RELEASE_SELECTED");
        setReleaseComplete(false);
        setReleaseKey((n) => n + 1);
        setCharClip("RELEASE");
        setResultOpen(false);
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "KEEP") {
      if (charClip === "LANDED_HOLD" || charClip === "LAND" || charClip === "KEEP") {
        if (charClip === "LAND") setCharClip("LANDED_HOLD");
        setCatchChoice("KEEP_SELECTED");
        setKeepComplete(false);
        setKeepKey((n) => n + 1);
        setCharClip("KEEP");
        setResultOpen(false);
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    if (id === "RETURN_TO_READY") {
      if (charClip === "KEEP" || charClip === "RELEASE" || charClip === "RETURN_TO_READY") {
        setReturnKey((n) => n + 1);
        setCharClip("RETURN_TO_READY");
        setResultOpen(false);
        return;
      }
      setCharClip("CAST_BACKSWING");
      return;
    }
    setCharClip(id);
  }, [charClip]);

  const startCastVisual = useCallback(() => {
    setCatchChoice(null);
    setResultOpen(false);
    setCharClip("AIM");
    window.setTimeout(() => {
      setCharClip((c) => (c === "AIM" ? "CAST_BACKSWING" : c));
    }, PRECAST_MS);
  }, []);

  const playReturn = useCallback(() => {
    setReturnKey((n) => n + 1);
    setCharClip("RETURN_TO_READY");
    setResultOpen(false);
  }, []);

  const onServerCast = useCallback(async () => {
    if (!canServerCast(fishing.session?.state, charClip, fishing.pending)) return;
    const s = await fishing.cast();
    if (!s) return;
    startCastVisual();
  }, [charClip, fishing, startCastVisual]);

  const onServerHook = useCallback(async () => {
    if (!canServerHook(fishing.session?.state, charClip, fishing.pending)) return;
    const s = await fishing.hook();
    if (!s) return;
    if (s.state === "HOOKED" || s.state === "FIGHTING") {
      setHookKey((n) => n + 1);
      setCharClip("HOOKSET");
    }
  }, [charClip, fishing]);

  const onServerReel = useCallback(async () => {
    if (!canServerReel(fishing.session?.state, charClip)) return;
    setReelKey((n) => n + 1);
    setCharClip("REEL");
    await fishing.tick(true);
  }, [charClip, fishing]);

  const onServerDecide = useCallback(
    async (keep: boolean) => {
      if (!canServerDecide(fishing.session?.state, resultOpen, catchChoice, fishing.pending)) return;
      const s = await fishing.decide(keep);
      if (!s) return;
      if (keep) {
        setCatchChoice("KEEP_SELECTED");
        setKeepComplete(false);
        setKeepKey((n) => n + 1);
        setCharClip("KEEP");
        setResultOpen(false);
      } else {
        setCatchChoice("RELEASE_SELECTED");
        setReleaseComplete(false);
        setReleaseKey((n) => n + 1);
        setCharClip("RELEASE");
        setResultOpen(false);
      }
    },
    [catchChoice, fishing, resultOpen],
  );

  const onDock = useCallback(
    (id: CharClip | "CAST" | "CATCH_RESULT") => {
      if (!serverOn) {
        playChar(id);
        return;
      }
      if (id === "CAST") {
        void onServerCast();
        return;
      }
      if (id === "HOOKSET") {
        void onServerHook();
        return;
      }
      if (id === "REEL") {
        void onServerReel();
        return;
      }
      if (id === "KEEP") {
        void onServerDecide(true);
        return;
      }
      if (id === "RELEASE") {
        void onServerDecide(false);
        return;
      }
      if (id === "READY") {
        void fishing.connect();
      }
    },
    [fishing, onServerCast, onServerDecide, onServerHook, onServerReel, playChar, serverOn],
  );

  const onCastComplete = useCallback(() => {
    setCharClip((c) => (c.startsWith("CAST") ? "FLOAT_LANDING" : c));
  }, []);

  const onLandingComplete = useCallback(() => {
    setCharClip((c) => (c === "FLOAT_LANDING" ? "WAIT" : c));
  }, []);

  useEffect(() => {
    if (catchChoice !== "RELEASE_SELECTED") return;
    if (charClip === "RELEASE" || charClip === "RETURN_TO_READY" || charClip === "READY" || charClip === "KEEP") return;
    const id = window.setTimeout(() => {
      setReleaseComplete(false);
      setReleaseKey((n) => n + 1);
      setCharClip("RELEASE");
      setResultOpen(false);
    }, 360);
    return () => window.clearTimeout(id);
  }, [catchChoice, charClip]);

  useEffect(() => {
    if (catchChoice !== "KEEP_SELECTED") return;
    if (charClip === "KEEP" || charClip === "RETURN_TO_READY" || charClip === "READY" || charClip === "RELEASE") return;
    const id = window.setTimeout(() => {
      setKeepComplete(false);
      setKeepKey((n) => n + 1);
      setCharClip("KEEP");
      setResultOpen(false);
    }, 360);
    return () => window.clearTimeout(id);
  }, [catchChoice, charClip]);

  const onReleaseComplete = useCallback(() => {
    setReleaseComplete(true);
  }, []);

  const onKeepComplete = useCallback(() => {
    setKeepComplete(true);
  }, []);

  useEffect(() => {
    if (charClip !== "KEEP" && charClip !== "RELEASE") return;
    if (charClip === "KEEP" && !keepComplete) return;
    if (charClip === "RELEASE" && !releaseComplete) return;
    const id = window.setTimeout(() => {
      setReturnKey((n) => n + 1);
      setCharClip("RETURN_TO_READY");
      setResultOpen(false);
    }, 280);
    return () => window.clearTimeout(id);
  }, [keepComplete, releaseComplete, charClip]);

  const onReturnComplete = useCallback(() => {
    setCatchChoice(null);
    setResultOpen(false);
    setKeepComplete(false);
    setReleaseComplete(false);
    landLock.current = false;
    recoverLock.current = false;
    setCharClip("READY");
  }, []);

  const onCharFinished = useCallback((name: string) => {
    if (name.startsWith("CAST")) return;
    const i = CAST_SEQ.indexOf(name as CharClip);
    const next = i >= 0 ? CAST_SEQ[i + 1] : undefined;
    if (next) setCharClip(next);
  }, []);

  useEffect(() => {
    if (!serverOn) {
      bootClip.current = false;
      landLock.current = false;
      recoverLock.current = false;
      return;
    }
    if (!fishing.connected || !fishing.session) return;
    if (bootClip.current) return;
    bootClip.current = true;
    const boot = bootstrapVisual(fishing.session.state);
    setCharClip(boot.clip);
    setResultOpen(boot.result);
    if (boot.clip === "BITE_REACTION") setBiteKey((n) => n + 1);
    if (boot.clip === "HOOKSET") setHookKey((n) => n + 1);
    if (boot.clip === "FIGHT_LIGHT") setFightKey((n) => n + 1);
    if (boot.clip === "LANDED_HOLD") setHoldKey((n) => n + 1);
  }, [serverOn, fishing.connected, fishing.session]);

  useEffect(() => {
    if (!serverOn) return;
    if (charClip !== "WAIT") return;
    if (fishing.session?.state !== "WAITING_BITE") return;
    let busy = false;
    const t = window.setInterval(() => {
      if (busy) return;
      busy = true;
      void fishing.peekBite().finally(() => {
        busy = false;
      });
    }, 900);
    return () => window.clearInterval(t);
  }, [serverOn, charClip, fishing.session?.state, fishing.peekBite]);

  useEffect(() => {
    if (!serverOn) return;
    if (charClip !== "WAIT") return;
    if (fishing.session?.state !== "BITE") return;
    setBiteKey((n) => n + 1);
    setCharClip("BITE_REACTION");
  }, [serverOn, charClip, fishing.session?.state]);

  useEffect(() => {
    if (!serverOn) return;
    if (charClip !== "HOOKSET") return;
    if (fishing.session?.state !== "HOOKED" && fishing.session?.state !== "FIGHTING") return;
    const id = window.setTimeout(() => {
      setFightKey((n) => n + 1);
      setCharClip("FIGHT_LIGHT");
    }, (HOOK_DURATION + 0.08) * 1000);
    return () => window.clearTimeout(id);
  }, [serverOn, charClip, hookKey, fishing.session?.state]);

  useEffect(() => {
    if (!serverOn) return;
    const state = fishing.session?.state;
    if (state !== "HOOKED" && state !== "FIGHTING") return;
    if (charClip !== "HOOKSET" && charClip !== "FIGHT_LIGHT" && charClip !== "REEL") return;
    if (state === "HOOKED") {
      void fishing.tick();
      return;
    }
    const t = window.setInterval(() => {
      void fishing.tick();
    }, 420);
    return () => window.clearInterval(t);
  }, [serverOn, charClip, fishing.tick, fishing.session?.state]);

  useEffect(() => {
    if (!serverOn) return;
    if (fishing.session?.state !== "LANDED") return;
    if (landLock.current) return;
    if (charClip !== "FIGHT_LIGHT" && charClip !== "REEL") return;
    landLock.current = true;
    setPrepKey((n) => n + 1);
    setCharClip("LAND_PREP");
  }, [serverOn, fishing.session?.state, charClip]);

  useEffect(() => {
    if (!serverOn) return;
    if (charClip !== "LAND_PREP") return;
    if (fishing.session?.state !== "LANDED") return;
    const id = window.setTimeout(() => {
      setLandKey((n) => n + 1);
      setCharClip("LAND");
    }, PREP_DURATION * 1000);
    return () => window.clearTimeout(id);
  }, [serverOn, charClip, prepKey, fishing.session?.state]);

  useEffect(() => {
    if (!serverOn) return;
    if (charClip !== "LAND") return;
    if (fishing.session?.state !== "LANDED") return;
    const id = window.setTimeout(() => {
      setHoldKey((n) => n + 1);
      setCharClip("LANDED_HOLD");
    }, LAND_DURATION * 1000);
    return () => window.clearTimeout(id);
  }, [serverOn, charClip, landKey, fishing.session?.state]);

  useEffect(() => {
    if (!serverOn) return;
    if (charClip !== "LANDED_HOLD") return;
    if (fishing.session?.state !== "LANDED") return;
    if (resultOpen || catchChoice) return;
    const id = window.setTimeout(() => {
      setCatchChoice(null);
      setResultOpen(true);
    }, HOLD_BEFORE_RESULT_MS);
    return () => window.clearTimeout(id);
  }, [serverOn, charClip, holdKey, fishing.session?.state, resultOpen, catchChoice]);

  useEffect(() => {
    if (!serverOn) return;
    const state = fishing.session?.state;
    if (state !== "LOST" && state !== "BROKEN") return;
    if (recoverLock.current) return;
    if (charClip === "RETURN_TO_READY" || charClip === "READY") return;
    recoverLock.current = true;
    const id = window.setTimeout(() => {
      void fishing.recover();
      playReturn();
    }, LOST_RECOVER_MS);
    return () => window.clearTimeout(id);
  }, [serverOn, fishing.recover, fishing.session?.state, charClip, playReturn]);

  const tog = (key: keyof DebugFlags) => setDebug((d) => ({ ...d, [key]: !d[key] }));
  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);
  const available = useMemo(() => new Set(reports?.fisherman.clips ?? []), [reports]);
  const fishermanPass = Boolean(reports?.fisherman.pass);
  const productionReady = Boolean(fishermanPass && reports?.rod.pass && reports?.pike.pass);
  const serverCatch = useMemo(
    () => catchResultFromSession(fishing.session, fishing.speciesNames),
    [fishing.session, fishing.speciesNames],
  );
  const catchData = useMemo<CatchResultData>(() => {
    if (serverOn && serverCatch) return serverCatch;
    return { ...DEBUG_CATCH_RESULT, isRecord: resultRecord };
  }, [serverOn, serverCatch, resultRecord]);
  const azimuthDeg = Math.round(((yaw * 180) / Math.PI + 360) % 360);
  const visualLabel = labelVisual(charClip, resultOpen, catchChoice, keepComplete, releaseComplete);

  return (
    <main className="rig-lab rig3d-lab">
      <header className="rig-lab-top">
        <div>
          <p className="rig-lab-kicker">Рыбацкий Мир · 3D contract</p>
          <h1>Production 360° lab</h1>
          <p className="rig3d-kicker">{serverOn ? "SERVER · backend FSM" : "DEBUG · ручной цикл"}</p>
        </div>
        <div className="rig-lab-meta">
          <span className="rig3d-mode" role="group" aria-label="Lab mode">
            <button type="button" className={!serverOn ? "is-on" : ""} onClick={() => setMode("DEBUG")}>
              DEBUG
            </button>
            <button type="button" className={serverOn ? "is-on" : ""} onClick={() => setMode("SERVER")}>
              SERVER
            </button>
          </span>
          <span className="rig-lab-state">{visualLabel}</span>
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
        {serverOn && (
          <aside className="rig3d-server-panel" aria-label="Server fishing status">
            <p>
              <span>Server</span> {fishing.session?.state ?? "—"}
            </p>
            <p>
              <span>Visual</span> {visualLabel}
            </p>
            <p>
              <span>Event</span> {fishing.lastEvent}
            </p>
            <p>
              <span>Pending</span> {fishing.pending}
            </p>
            <p className={fishing.error ? "is-err" : ""}>
              <span>Error</span> {fishing.error ?? "none"}
            </p>
          </aside>
        )}
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
              landKey={landKey}
              holdKey={holdKey}
              releaseKey={releaseKey}
              keepKey={keepKey}
              returnKey={returnKey}
              stowFish={keepComplete || releaseComplete || charClip === "RETURN_TO_READY"}
              onReleaseComplete={onReleaseComplete}
              onKeepComplete={onKeepComplete}
              onReturnComplete={onReturnComplete}
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
        {resultOpen && (
          <CatchResultCard
            data={catchData}
            choice={catchChoice}
            busy={serverOn && fishing.pending === "decide"}
            onKeep={() => {
              if (serverOn) void onServerDecide(true);
              else setCatchChoice("KEEP_SELECTED");
            }}
            onRelease={() => {
              if (serverOn) void onServerDecide(false);
              else setCatchChoice("RELEASE_SELECTED");
            }}
          />
        )}
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
                a.id !== "LAND_PREP" &&
                a.id !== "LAND" &&
                a.id !== "LANDED_HOLD" &&
                a.id !== "CATCH_RESULT" &&
                a.id !== "RELEASE" &&
                a.id !== "KEEP" &&
                a.id !== "RETURN_TO_READY",
            );
            const active =
              a.id === "CAST"
                ? charClip.startsWith("CAST")
                : a.id === "CATCH_RESULT"
                  ? resultOpen
                  : a.id === "FLOAT_LANDING"
                    ? charClip === "FLOAT_LANDING"
                    : charClip === a.id;
            const blocked = serverOn && !SERVER_DOCK_ACTIONS.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                className={active ? "is-on" : ""}
                disabled={missing || a.id === "FIGHT_HEAVY" || blocked}
                onClick={() => onDock(a.id)}
                title={missing ? "clip отсутствует в GLB" : blocked ? "SERVER: только backend actions" : undefined}
              >
                {a.label}
              </button>
            );
          })}
          <button
            type="button"
            className={resultRecord ? "is-on" : ""}
            disabled={serverOn}
            onClick={() => setResultRecord((v) => !v)}
            title="Показать статус нового рекорда"
          >
            Рекорд
          </button>
          <button
            type="button"
            disabled={!resultOpen || serverOn}
            onClick={() => setCatchChoice(null)}
            title="Вернуть CATCH RESULT без выбора"
          >
            Сброс
          </button>
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
