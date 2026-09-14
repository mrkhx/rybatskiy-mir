/**
 * Client visual FSM driven by an existing backend Session.
 * Does not call fishing APIs — Play() / useServerFishing own the network.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "../api/client";
import { HOOK_DURATION } from "../rig3d/hookset";
import { LAND_DURATION } from "../rig3d/land";
import { PREP_DURATION } from "../rig3d/landPrep";
import { bootstrapVisual } from "../rig3d/serverFishingVisualAdapter";
import { CAST_SEQ, type CharClip, type FishClip } from "../rig3d/types";

const PRECAST_MS = 350;
const HOLD_BEFORE_RESULT_MS = 700;
const LOST_RECOVER_MS = 400;

export type CatchDecision = "keep" | "release" | null;

export function useFishingVisualsFromSession(opts: {
  enabled: boolean;
  session: Session | null;
  lastDecision: CatchDecision;
  decisionGen: number;
  reelNonce?: number;
}) {
  const { enabled, session, lastDecision, decisionGen, reelNonce = 0 } = opts;
  const [charClip, setCharClip] = useState<CharClip>("READY");
  const [fishClip, setFishClip] = useState<FishClip>("SWIM_IDLE");
  const [biteKey, setBiteKey] = useState(0);
  const [hookKey, setHookKey] = useState(0);
  const [fightKey, setFightKey] = useState(0);
  const [reelKey, setReelKey] = useState(0);
  const [prepKey, setPrepKey] = useState(0);
  const [landKey, setLandKey] = useState(0);
  const [holdKey, setHoldKey] = useState(0);
  const [releaseKey, setReleaseKey] = useState(0);
  const [keepKey, setKeepKey] = useState(0);
  const [returnKey, setReturnKey] = useState(0);
  const [keepComplete, setKeepComplete] = useState(false);
  const [releaseComplete, setReleaseComplete] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);

  const bootClip = useRef(false);
  const landLock = useRef(false);
  const recoverLock = useRef(false);
  const lastReel = useRef(reelNonce);
  const lastDecisionGen = useRef(decisionGen);
  const prevState = useRef<string | null>(null);

  const state = session?.state ?? null;

  useEffect(() => {
    if (!enabled) {
      bootClip.current = false;
      landLock.current = false;
      recoverLock.current = false;
      prevState.current = null;
      return;
    }
    if (!session) return;
    if (bootClip.current) return;
    bootClip.current = true;
    const boot = bootstrapVisual(session.state);
    setCharClip(boot.clip);
    setResultOpen(boot.result);
    prevState.current = session.state;
    if (boot.clip === "BITE_REACTION") setBiteKey((n) => n + 1);
    if (boot.clip === "HOOKSET") setHookKey((n) => n + 1);
    if (boot.clip === "FIGHT_LIGHT") setFightKey((n) => n + 1);
    if (boot.clip === "LANDED_HOLD") setHoldKey((n) => n + 1);
  }, [enabled, session]);

  useEffect(() => {
    if (!enabled) return;
    if (state !== "WAITING_BITE") return;
    if (charClip !== "READY" && charClip !== "IDLE") return;
    setCharClip("AIM");
    const id = window.setTimeout(() => {
      setCharClip((c) => (c === "AIM" ? "CAST_BACKSWING" : c));
    }, PRECAST_MS);
    return () => window.clearTimeout(id);
  }, [enabled, state, charClip]);

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

  useEffect(() => {
    if (!enabled) return;
    if (state !== "BITE") return;
    if (charClip !== "WAIT" && charClip !== "FLOAT_LANDING") return;
    setBiteKey((n) => n + 1);
    setCharClip("BITE_REACTION");
  }, [enabled, state, charClip]);

  useEffect(() => {
    if (!enabled) return;
    if (state !== "HOOKED" && state !== "FIGHTING") return;
    if (charClip === "HOOKSET" || charClip === "FIGHT_LIGHT" || charClip === "REEL") return;
    if (charClip === "LAND_PREP" || charClip === "LAND" || charClip === "LANDED_HOLD") return;
    setHookKey((n) => n + 1);
    setCharClip("HOOKSET");
  }, [enabled, state, charClip]);

  useEffect(() => {
    if (!enabled) return;
    if (charClip !== "HOOKSET") return;
    if (state !== "HOOKED" && state !== "FIGHTING") return;
    const id = window.setTimeout(() => {
      setFightKey((n) => n + 1);
      setCharClip("FIGHT_LIGHT");
      setFishClip("STRUGGLE_LIGHT");
    }, (HOOK_DURATION + 0.08) * 1000);
    return () => window.clearTimeout(id);
  }, [enabled, charClip, hookKey, state]);

  useEffect(() => {
    if (!enabled) return;
    if (reelNonce === lastReel.current) return;
    lastReel.current = reelNonce;
    if (state !== "FIGHTING") return;
    if (charClip !== "FIGHT_LIGHT" && charClip !== "REEL") return;
    setReelKey((n) => n + 1);
    setCharClip("REEL");
  }, [enabled, reelNonce, state, charClip]);

  useEffect(() => {
    if (!enabled) return;
    if (state !== "LANDED") return;
    if (landLock.current) return;
    if (charClip !== "FIGHT_LIGHT" && charClip !== "REEL" && charClip !== "HOOKSET") return;
    landLock.current = true;
    setPrepKey((n) => n + 1);
    setCharClip("LAND_PREP");
  }, [enabled, state, charClip]);

  useEffect(() => {
    if (!enabled) return;
    if (charClip !== "LAND_PREP") return;
    if (state !== "LANDED") return;
    const id = window.setTimeout(() => {
      setLandKey((n) => n + 1);
      setCharClip("LAND");
    }, PREP_DURATION * 1000);
    return () => window.clearTimeout(id);
  }, [enabled, charClip, prepKey, state]);

  useEffect(() => {
    if (!enabled) return;
    if (charClip !== "LAND") return;
    if (state !== "LANDED") return;
    const id = window.setTimeout(() => {
      setHoldKey((n) => n + 1);
      setCharClip("LANDED_HOLD");
    }, LAND_DURATION * 1000);
    return () => window.clearTimeout(id);
  }, [enabled, charClip, landKey, state]);

  useEffect(() => {
    if (!enabled) return;
    if (charClip !== "LANDED_HOLD") return;
    if (state !== "LANDED") return;
    if (resultOpen) return;
    const id = window.setTimeout(() => setResultOpen(true), HOLD_BEFORE_RESULT_MS);
    return () => window.clearTimeout(id);
  }, [enabled, charClip, holdKey, state, resultOpen]);

  useEffect(() => {
    if (!enabled) return;
    if (decisionGen === lastDecisionGen.current) return;
    lastDecisionGen.current = decisionGen;
    if (!lastDecision) return;
    setResultOpen(false);
    if (lastDecision === "keep") {
      setKeepComplete(false);
      setKeepKey((n) => n + 1);
      setCharClip("KEEP");
    } else {
      setReleaseComplete(false);
      setReleaseKey((n) => n + 1);
      setCharClip("RELEASE");
    }
  }, [enabled, decisionGen, lastDecision]);

  useEffect(() => {
    if (!enabled) return;
    if (charClip !== "KEEP" && charClip !== "RELEASE") return;
    if (charClip === "KEEP" && !keepComplete) return;
    if (charClip === "RELEASE" && !releaseComplete) return;
    const id = window.setTimeout(() => {
      setReturnKey((n) => n + 1);
      setCharClip("RETURN_TO_READY");
      setResultOpen(false);
    }, 280);
    return () => window.clearTimeout(id);
  }, [enabled, keepComplete, releaseComplete, charClip]);

  const onReleaseComplete = useCallback(() => setReleaseComplete(true), []);
  const onKeepComplete = useCallback(() => setKeepComplete(true), []);

  const onReturnComplete = useCallback(() => {
    setResultOpen(false);
    setKeepComplete(false);
    setReleaseComplete(false);
    landLock.current = false;
    recoverLock.current = false;
    setCharClip("READY");
    setFishClip("SWIM_IDLE");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (state !== "LOST" && state !== "BROKEN") return;
    if (recoverLock.current) return;
    if (charClip === "RETURN_TO_READY" || charClip === "READY") return;
    recoverLock.current = true;
    const id = window.setTimeout(() => {
      setReturnKey((n) => n + 1);
      setCharClip("RETURN_TO_READY");
      setResultOpen(false);
    }, LOST_RECOVER_MS);
    return () => window.clearTimeout(id);
  }, [enabled, state, charClip]);

  useEffect(() => {
    if (state === "READY") landLock.current = false;
  }, [state]);

  return {
    charClip,
    fishClip,
    biteKey,
    hookKey,
    fightKey,
    reelKey,
    prepKey,
    landKey,
    holdKey,
    releaseKey,
    keepKey,
    returnKey,
    keepComplete,
    releaseComplete,
    resultOpen,
    onCastComplete,
    onLandingComplete,
    onCharFinished,
    onReleaseComplete,
    onKeepComplete,
    onReturnComplete,
  };
}
