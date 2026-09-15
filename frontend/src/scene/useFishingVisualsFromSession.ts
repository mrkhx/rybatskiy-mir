/**
 * Client visual FSM driven by an existing backend Session.
 * Does not call fishing APIs — Play() / useServerFishing own the network.
 */
import { scheduleVisualTransition } from "./visibleTransition";
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

export type FishingVisualStatus = { clip: CharClip; resultOpen: boolean };

export type CatchDecision = "keep" | "release" | null;

export function useFishingVisualsFromSession(opts: {
  enabled: boolean;
  session: Session | null;
  lastDecision: CatchDecision;
  decisionGen: number;
  reelNonce?: number;
  castNonce?: number;
  /** Production scenes signal completion after rendering the final pose. */
  frameDriven?: boolean;
}) {
  const { enabled, session, lastDecision, decisionGen, reelNonce = 0, castNonce = 0, frameDriven = false } = opts;
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
  const activeSession = useRef<string | null>(null);
  const currentClip = useRef(charClip);
  currentClip.current = charClip;
  const landLock = useRef(false);
  const fightShown = useRef(false);
  const recoverLock = useRef(false);
  const lastCast = useRef(castNonce);
  const lastReel = useRef(reelNonce);
  const lastDecisionGen = useRef(decisionGen);
  const prevState = useRef<string | null>(null);

  const state = session?.state ?? null;
  const serverState = useRef(state);
  serverState.current = state;
  const beginLanding = useCallback(() => {
    if (landLock.current) return;
    landLock.current = true;
    currentClip.current = "LAND_PREP";
    setPrepKey((n) => n + 1);
    setCharClip("LAND_PREP");
  }, []);
  const onVisualPhaseComplete = useCallback((phase: CharClip) => {
    if (!enabled || activeSession.current !== session?.id || currentClip.current !== phase) return;
    const next = (clip: CharClip) => { currentClip.current = clip; setCharClip(clip); };
    if (phase === "AIM") {
      if (["CAST", "WAITING_BITE", "BITE", "HOOKED", "FIGHTING"].includes(serverState.current ?? "")) next("CAST_BACKSWING");
    } else if (phase === "FIGHT_LIGHT") {
      fightShown.current = true;
      if (serverState.current === "LANDED") beginLanding();
    } else if (phase === "HOOKSET" || phase === "REEL") {
      if (!["HOOKED", "FIGHTING", "LANDED"].includes(serverState.current ?? "")) return;
      if (phase === "REEL" && serverState.current === "LANDED" && fightShown.current) {
        beginLanding();
        return;
      }
      setFightKey((n) => n + 1);
      setFishClip("STRUGGLE_LIGHT");
      next("FIGHT_LIGHT");
    } else if (serverState.current === "LANDED") {
      if (phase === "LAND_PREP") { setLandKey((n) => n + 1); next("LAND"); }
      else if (phase === "LAND") { setHoldKey((n) => n + 1); next("LANDED_HOLD"); }
      else if (phase === "LANDED_HOLD") setResultOpen(true);
    }
  }, [enabled, session?.id, beginLanding]);


  useEffect(() => {
    if (!enabled || !session) {
      setCharClip("READY");
      setResultOpen(false);
      setKeepComplete(false);
      setReleaseComplete(false);
      bootClip.current = false;
      activeSession.current = null;
      landLock.current = false;
      recoverLock.current = false;
      prevState.current = null;
      return;
    }
    if (bootClip.current && activeSession.current === session.id) return;
    const decisionHandoff = bootClip.current && session.state === "READY"
      && decisionGen !== lastDecisionGen.current && lastDecision !== null;
    activeSession.current = session.id;
    bootClip.current = true;
    // /decide creates a new server session. Finish the current KEEP/RELEASE before READY.
    if (decisionHandoff) return;
    landLock.current = false;
    fightShown.current = false;
    recoverLock.current = false;
    lastCast.current = castNonce;
    lastReel.current = reelNonce;
    lastDecisionGen.current = decisionGen;
    setKeepComplete(false);
    setReleaseComplete(false);
    setFishClip(session.state === "FIGHTING" ? "STRUGGLE_LIGHT" : "SWIM_IDLE");
    const boot = bootstrapVisual(session.state);
    setCharClip(boot.clip);
    setResultOpen(false);
    prevState.current = session.state;
    if (boot.clip === "BITE_REACTION") setBiteKey((n) => n + 1);
    if (boot.clip === "HOOKSET") setHookKey((n) => n + 1);
    if (boot.clip === "FIGHT_LIGHT") setFightKey((n) => n + 1);
    if (boot.clip === "LANDED_HOLD") setHoldKey((n) => n + 1);
  }, [enabled, session, castNonce, reelNonce, decisionGen, lastDecision]);

  useEffect(() => {
    if (!enabled) return;
    const previous = prevState.current;
    prevState.current = state;
    const castConfirmed = castNonce !== lastCast.current;
    lastCast.current = castNonce;
    if (state !== "WAITING_BITE" && state !== "CAST") return;
    if (!castConfirmed && previous !== "READY" && previous !== "IDLE") return;
    setResultOpen(false);
    setKeepComplete(false);
    setReleaseComplete(false);
    fightShown.current = false;
    setCharClip("AIM");
  }, [enabled, state, charClip, castNonce]);

  // The timer belongs to AIM, not to the effect that enters AIM.
  // Server polling must not restart or cancel this visual transition.
  useEffect(() => {
    if (!enabled || frameDriven || charClip !== "AIM") return;
    const cancel = scheduleVisualTransition(() => onVisualPhaseComplete("AIM"), PRECAST_MS);
    return cancel;
  }, [enabled, charClip, frameDriven, onVisualPhaseComplete]);

  const onCastComplete = useCallback(() => {
    if (!enabled || activeSession.current !== session?.id) return;
    setCharClip((c) => (c.startsWith("CAST") ? "FLOAT_LANDING" : c));
  }, [enabled, session?.id]);

  const onLandingComplete = useCallback(() => {
    if (!enabled || activeSession.current !== session?.id) return;
    setCharClip((c) => (c === "FLOAT_LANDING" ? "WAIT" : c));
  }, [enabled, session?.id]);

  const onCharFinished = useCallback((name: string) => {
    if (!enabled || activeSession.current !== session?.id || currentClip.current !== name) return;
    if (name.startsWith("CAST")) return;
    const i = CAST_SEQ.indexOf(name as CharClip);
    const next = i >= 0 ? CAST_SEQ[i + 1] : undefined;
    if (next) setCharClip(next);
  }, [enabled, session?.id]);

  useEffect(() => {
    if (!enabled) return;
    if (state !== "BITE") return;
    if (charClip !== "WAIT") return;
    setBiteKey((n) => n + 1);
    setCharClip("BITE_REACTION");
  }, [enabled, state, charClip]);

  useEffect(() => {
    if (!enabled) return;
    if (state !== "HOOKED" && state !== "FIGHTING") return;
    if (charClip !== "WAIT" && charClip !== "BITE_REACTION") return;
    setHookKey((n) => n + 1);
    setCharClip("HOOKSET");
  }, [enabled, state, charClip]);

  useEffect(() => {
    if (!enabled || frameDriven || charClip !== "HOOKSET") return;
    return scheduleVisualTransition(() => onVisualPhaseComplete("HOOKSET"), (HOOK_DURATION + 0.08) * 1000);
  }, [enabled, frameDriven, charClip, hookKey, onVisualPhaseComplete]);

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
    if (!enabled || frameDriven || charClip !== "REEL") return;
    return scheduleVisualTransition(() => onVisualPhaseComplete("REEL"), 1200);
  }, [enabled, frameDriven, charClip, reelKey, onVisualPhaseComplete]);

  useEffect(() => {
    if (!enabled) return;
    if (state !== "LANDED") return;
    if (landLock.current) return;
    if (charClip !== "FIGHT_LIGHT" && charClip !== "REEL") return;
    if (frameDriven && (charClip === "REEL" || !fightShown.current)) return;
    beginLanding();
  }, [enabled, state, charClip, frameDriven, beginLanding]);

  useEffect(() => {
    if (!enabled || frameDriven || charClip !== "LAND_PREP") return;
    if (state !== "LANDED") return;
    return scheduleVisualTransition(() => onVisualPhaseComplete("LAND_PREP"), PREP_DURATION * 1000);
  }, [enabled, frameDriven, charClip, prepKey, onVisualPhaseComplete, state]);

  useEffect(() => {
    if (!enabled || frameDriven || charClip !== "LAND") return;
    if (state !== "LANDED") return;
    return scheduleVisualTransition(() => onVisualPhaseComplete("LAND"), LAND_DURATION * 1000);
  }, [enabled, frameDriven, charClip, landKey, onVisualPhaseComplete, state]);

  useEffect(() => {
    if (!enabled || frameDriven || charClip !== "LANDED_HOLD") return;
    if (state !== "LANDED") return;
    if (resultOpen) return;
    return scheduleVisualTransition(() => onVisualPhaseComplete("LANDED_HOLD"), HOLD_BEFORE_RESULT_MS);
  }, [enabled, frameDriven, charClip, holdKey, onVisualPhaseComplete, state, resultOpen]);

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
    const cancel = scheduleVisualTransition(() => {
      setReturnKey((n) => n + 1);
      setCharClip("RETURN_TO_READY");
      setResultOpen(false);
    }, 280);
    return cancel;
  }, [enabled, keepComplete, releaseComplete, charClip]);

  const onReleaseComplete = useCallback(() => {
    if (enabled && activeSession.current === session?.id && currentClip.current === "RELEASE") setReleaseComplete(true);
  }, [enabled, session?.id]);
  const onKeepComplete = useCallback(() => {
    if (enabled && activeSession.current === session?.id && currentClip.current === "KEEP") setKeepComplete(true);
  }, [enabled, session?.id]);

  const onReturnComplete = useCallback(() => {
    if (!enabled || activeSession.current !== session?.id || currentClip.current !== "RETURN_TO_READY") return;
    setResultOpen(false);
    setKeepComplete(false);
    setReleaseComplete(false);
    landLock.current = false;
    fightShown.current = false;
    recoverLock.current = false;
    setCharClip("READY");
    setFishClip("SWIM_IDLE");
  }, [enabled, session?.id]);

  useEffect(() => {
    if (!enabled) return;
    if (state !== "LOST" && state !== "BROKEN") return;
    if (recoverLock.current) return;
    if (charClip === "RETURN_TO_READY" || charClip === "READY") return;
    const cancel = scheduleVisualTransition(() => {
      setReturnKey((n) => n + 1);
      setCharClip("RETURN_TO_READY");
      setResultOpen(false);
      recoverLock.current = true;
    }, LOST_RECOVER_MS);
    return cancel;
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
    onVisualPhaseComplete,
    onCastComplete,
    onLandingComplete,
    onCharFinished,
    onReleaseComplete,
    onKeepComplete,
    onReturnComplete,
  };
}
