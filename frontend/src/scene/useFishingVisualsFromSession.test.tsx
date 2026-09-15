import { StrictMode, type PropsWithChildren } from "react";
import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../api/client";
import { HOOK_DURATION } from "../rig3d/hookset";
import { LAND_DURATION } from "../rig3d/land";
import { PREP_DURATION } from "../rig3d/landPrep";
import { useFishingVisualsFromSession, type CatchDecision } from "./useFishingVisualsFromSession";

function session(state: string): Session {
  return { id: "test", state, spotId: "old-bridge", method: "FLOAT", speciesId: null,
    weightG: null, lengthCm: null, tier: null, tension: .5, fishStamina: .8,
    lineIntegrity: 1, fightProgress: .2, biteAt: null, loseReason: null,
    depthM: 1.4, retrieve: null, playerHint: null };
}
const wrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>;
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("server visual orchestration", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("plays PRE-CAST despite polling and waits for landing before showing a real BITE", () => {
    const { result, rerender, unmount } = renderHook(({ state }) => useFishingVisualsFromSession({
      enabled: true, session: session(state), lastDecision: null, decisionGen: 0,
    }), { initialProps: { state: "READY" }, wrapper });
    rerender({ state: "WAITING_BITE" });
    expect(result.current.charClip).toBe("AIM");
    advance(200);
    rerender({ state: "WAITING_BITE" });
    advance(149);
    expect(result.current.charClip).toBe("AIM");
    advance(1);
    expect(result.current.charClip).toBe("CAST_BACKSWING");
    rerender({ state: "BITE" });
    expect(result.current.charClip).toBe("CAST_BACKSWING");
    act(() => result.current.onCastComplete());
    expect(result.current.charClip).toBe("FLOAT_LANDING");
    act(() => result.current.onLandingComplete());
    expect(result.current.charClip).toBe("BITE_REACTION");
    expect(result.current.biteKey).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("handles KEEP and RELEASE in consecutive cycles without remounting", () => {
    let props = { id: "cycle-0", state: "READY", castNonce: 0, reelNonce: 0, decisionGen: 0, lastDecision: null as CatchDecision };
    const { result, rerender } = renderHook((p) => useFishingVisualsFromSession({
      ...p, enabled: true, session: { ...session(p.state), id: p.id },
    }), { initialProps: props, wrapper });
    const send = (p: Partial<typeof props>) => { props = { ...props, ...p }; rerender(props); };
    for (const choice of ["keep", "release"] as const) {
      send({ state: "WAITING_BITE", castNonce: props.castNonce + 1 });
      advance(350);
      expect(result.current.charClip).toBe("CAST_BACKSWING");
      act(() => result.current.onCastComplete());
      act(() => result.current.onLandingComplete());
      advance(60000);
      expect(result.current.charClip).toBe("WAIT"); // no timer-generated bite
      send({ state: "BITE" });
      expect(result.current.charClip).toBe("BITE_REACTION");
      send({ state: "HOOKED" });
      advance(100);
      send({ state: "FIGHTING" });
      advance((HOOK_DURATION + .08) * 1000 - 100);
      expect(result.current.charClip).toBe("FIGHT_LIGHT");
      send({ reelNonce: props.reelNonce + 1 });
      expect(result.current.charClip).toBe("REEL");
      advance(1200);
      expect(result.current.charClip).toBe("FIGHT_LIGHT");
      send({ state: "LANDED" });
      expect(result.current.charClip).toBe("LAND_PREP");
      advance(PREP_DURATION * 1000);
      expect(result.current.charClip).toBe("LAND");
      advance(LAND_DURATION * 1000);
      expect(result.current.charClip).toBe("LANDED_HOLD");
      advance(700);
      expect(result.current.resultOpen).toBe(true);
      send({ id: `cycle-${props.decisionGen + 1}`, state: "READY", lastDecision: choice, decisionGen: props.decisionGen + 1 });
      expect(result.current.charClip).toBe(choice.toUpperCase());
      act(() => choice === "keep" ? result.current.onKeepComplete() : result.current.onReleaseComplete());
      advance(280);
      expect(result.current.charClip).toBe("RETURN_TO_READY");
      act(() => result.current.onReturnComplete());
      expect(result.current.charClip).toBe("READY");
    }
  });

  it("does not let an early LANDED response cancel HOOKSET", () => {
    const { result, rerender } = renderHook(({ state }) => useFishingVisualsFromSession({
      enabled: true, session: session(state), lastDecision: null, decisionGen: 0,
    }), { initialProps: { state: "BITE" }, wrapper });
    rerender({ state: "HOOKED" });
    advance(100);
    rerender({ state: "LANDED" });
    expect(result.current.charClip).toBe("HOOKSET");
    advance((HOOK_DURATION + .08) * 1000 - 101);
    expect(result.current.charClip).toBe("HOOKSET");
    advance(1);
    expect(result.current.charClip).toBe("LAND_PREP");
  });

  it("resets an unrelated replacement session and ignores callbacks from the old session", () => {
    const { result, rerender } = renderHook(({ id, state }) => useFishingVisualsFromSession({
      enabled: true, session: { ...session(state), id }, lastDecision: null, decisionGen: 0,
    }), { initialProps: { id: "first", state: "READY" }, wrapper });
    rerender({ id: "first", state: "WAITING_BITE" });
    const old = result.current;
    advance(100);
    rerender({ id: "replacement", state: "READY" });
    advance(1000);
    expect(result.current.charClip).toBe("READY");
    rerender({ id: "replacement", state: "WAITING_BITE" });
    advance(350);
    expect(result.current.charClip).toBe("CAST_BACKSWING");
    act(() => { old.onCastComplete(); old.onReturnComplete(); old.onKeepComplete(); });
    expect(result.current.charClip).toBe("CAST_BACKSWING");
    expect(result.current.keepComplete).toBe(false);
    act(() => result.current.onCastComplete());
    expect(result.current.charClip).toBe("FLOAT_LANDING");
  });

  it("waits for HOLD before showing a restored catch result", () => {
    const { result } = renderHook(() => useFishingVisualsFromSession({
      enabled: true, session: session("LANDED"), lastDecision: null, decisionGen: 0,
    }), { wrapper });
    expect(result.current.charClip).toBe("LANDED_HOLD");
    expect(result.current.resultOpen).toBe(false);
    advance(699);
    expect(result.current.resultOpen).toBe(false);
    advance(1);
    expect(result.current.resultOpen).toBe(true);
  });

  it("does not replay events accumulated while the controller was disabled", () => {
    const { result, rerender } = renderHook(({ enabled, generation }) => useFishingVisualsFromSession({
      enabled, session: session("WAITING_BITE"), lastDecision: "keep",
      decisionGen: generation, castNonce: generation, reelNonce: generation,
    }), { initialProps: { enabled: true, generation: 0 }, wrapper });
    expect(result.current.charClip).toBe("WAIT");
    rerender({ enabled: false, generation: 1 });
    expect(result.current.charClip).toBe("READY");
    rerender({ enabled: true, generation: 1 });
    expect(result.current.charClip).toBe("WAIT");
    expect(result.current.keepComplete).toBe(false);
    advance(1000);
    expect(result.current.charClip).toBe("WAIT");
  });

  it("replays confirmed recasts and clears an interrupted PRE-CAST on unmount", () => {
    const { result, rerender, unmount } = renderHook(({ castNonce }) => useFishingVisualsFromSession({
      enabled: true, session: session("WAITING_BITE"), lastDecision: null, decisionGen: 0, castNonce,
    }), { initialProps: { castNonce: 0 }, wrapper });
    expect(result.current.charClip).toBe("WAIT");
    rerender({ castNonce: 1 });
    expect(result.current.charClip).toBe("AIM");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
