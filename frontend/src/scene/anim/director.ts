import { useEffect, useRef } from "react";
import type { AnimState, SceneSnap } from "./types";

type Clock = { state: AnimState; entered: number; now: number };

const CAST_START = 0.32;
const CAST_RELEASE = 0.22;
const CAST_END = 0.7;
const HOOKSET = 0.38;

function fromSession(s: string | null, tension: number): AnimState {
  if (!s || s === "IDLE" || s === "READY") return "IDLE";
  if (s === "CAST") return "CAST_END";
  if (s === "WAITING_BITE") return "WAITING";
  if (s === "BITE") return "BITE_REACTION";
  if (s === "HOOKED") return "HOOKSET";
  if (s === "FIGHTING") return tension > 0.72 ? "FIGHT_HEAVY" : "FIGHT_LIGHT";
  if (s === "LANDED") return "LAND_FISH";
  if (s === "LOST" || s === "BROKEN") return "LOSE_FISH";
  return "IDLE";
}

export function useAnimDirector(
  snap: SceneSnap,
  castNonce: number,
  hookNonce: number,
) {
  const clock = useRef<Clock>({ state: "IDLE", entered: 0, now: 0 });
  const lastCast = useRef(castNonce);
  const lastHook = useRef(hookNonce);
  const lastSess = useRef(snap.sessionState);

  useEffect(() => {
    clock.current.now = performance.now() / 1000;
  }, []);

  const step = (now: number): AnimState => {
    const c = clock.current;
    if (c.entered === 0) c.entered = now;
    c.now = now;
    const elapsed = now - c.entered;

    if (castNonce !== lastCast.current) {
      lastCast.current = castNonce;
      c.state = "CAST_START";
      c.entered = now;
      return c.state;
    }
    if (hookNonce !== lastHook.current) {
      lastHook.current = hookNonce;
      c.state = "HOOKSET";
      c.entered = now;
      return c.state;
    }

    if (c.state === "CAST_START" && elapsed >= CAST_START) {
      c.state = "CAST_RELEASE";
      c.entered = now;
    } else if (c.state === "CAST_RELEASE" && elapsed >= CAST_RELEASE) {
      c.state = "CAST_END";
      c.entered = now;
    } else if (c.state === "CAST_END" && elapsed >= CAST_END) {
      const next = fromSession(snap.sessionState, snap.tension);
      c.state = next === "IDLE" ? "WAITING" : next;
      c.entered = now;
    } else if (c.state === "HOOKSET" && elapsed >= HOOKSET) {
      c.state = snap.sessionState === "FIGHTING" || snap.sessionState === "HOOKED"
        ? (snap.tension > 0.72 ? "FIGHT_HEAVY" : "FIGHT_LIGHT")
        : fromSession(snap.sessionState, snap.tension);
      c.entered = now;
    } else if (
      c.state !== "CAST_START" &&
      c.state !== "CAST_RELEASE" &&
      c.state !== "CAST_END" &&
      c.state !== "HOOKSET"
    ) {
      let next = fromSession(snap.sessionState, snap.tension);
      if (next === "IDLE" && snap.force >= 0.72 && snap.sessionState === "READY") next = "AIM";
      if (next === "FIGHT_LIGHT" && snap.fightProgress > 0.55 && snap.tension < 0.55) next = "REEL";
      if (next !== c.state) {
        c.state = next;
        c.entered = now;
      }
    }

    lastSess.current = snap.sessionState;
    return c.state;
  };

  return { clock, step };
}

export function stateAge(clock: Clock): number {
  return Math.max(0, clock.now - clock.entered);
}
