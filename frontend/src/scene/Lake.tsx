import { useEffect, useRef } from "react";
import type { Session } from "../api/client";
import { useAnimDirector, stateAge } from "./anim/director";
import { idlePose, solvePose, windAmount } from "./anim/pose";
import type { Pose, SceneSnap } from "./anim/types";
import { AnglerRig, type AnglerHandle } from "./live/AnglerRig";
import { LiveCanvas, type LiveHandle } from "./live/LiveCanvas";
import { sceneQuality } from "./quality";

type LakeProps = {
  tod: string;
  wx: string;
  session?: Session | null;
  force?: number;
  feeding?: boolean;
  castNonce?: number;
  hookNonce?: number;
};

const A = "/scene/forest-lake";
const V = "v=7";

export function Lake({ tod, wx, session, force = 0.55, feeding, castNonce = 0, hookNonce = 0 }: LakeProps) {
  const root = useRef<HTMLDivElement>(null);
  const angler = useRef<AnglerHandle>(null);
  const live = useRef<LiveHandle>(null);
  const poseRef = useRef<Pose>(idlePose());
  const quality = sceneQuality();
  const snap: SceneSnap = {
    sessionState: session?.state ?? null,
    tension: session?.tension ?? 0,
    fishStamina: session?.fishStamina ?? 1,
    fightProgress: session?.fightProgress ?? 0,
    force,
    wx,
    feeding: Boolean(feeding),
  };
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const { clock, step } = useAnimDirector(snap, castNonce, hookNonce);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const set = (x: number, y: number) => {
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    };
    const onLeave = () => set(0, 0);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const s = snapRef.current;
      const state = stepRef.current(t);
      let pose = solvePose(state, stateAge(clock.current), t, s, poseRef.current);
      const lake = root.current;
      const wrist = lake?.querySelector(".wrist");
      if (lake && wrist) {
        const a = lake.getBoundingClientRect();
        const b = wrist.getBoundingClientRect();
        if (b.width > 0) {
          const aspect = a.width / a.height;
          const ang = (pose.rodAngle * Math.PI) / 180;
          const len = 21;
          pose = {
            ...pose,
            gripX: ((b.left + b.width / 2 - a.left) / a.width) * 100,
            gripY: ((b.top + b.height / 2 - a.top) / a.height) * 100,
          };
          pose.tipX = pose.gripX + Math.cos(ang) * len;
          pose.tipY = pose.gripY + Math.sin(ang) * len * aspect + pose.rodBend * 4 * aspect;
        }
      }
      poseRef.current = pose;
      angler.current?.apply(pose);
      live.current?.draw(pose, t, dt, s.wx);
      if (lake) {
        lake.style.setProperty("--wind", windAmount(t, s.wx).toFixed(3));
        lake.style.setProperty("--shake", (s.tension * 1.6).toFixed(3));
        lake.style.setProperty("--breath", pose.breath.toFixed(3));
        lake.setAttribute("data-anim", state);
        lake.setAttribute("data-quality", quality);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [clock, quality]);

  return (
    <div
      ref={root}
      className="lake"
      data-tod={tod}
      data-wx={wx}
      data-anim="IDLE"
      data-feed={feeding ? "1" : "0"}
      data-quality={quality}
    >
      <img className="lyr sky par-far" src={`${A}/sky.webp?${V}`} alt="" />
      <div className="sun-glow par-far" />
      <img className="lyr far-forest par-far" src={`${A}/far-forest.webp?${V}`} alt="" />
      <img className="lyr trees-l par-mid" src={`${A}/trees.webp?${V}`} alt="" />
      <img className="lyr trees-r par-mid" src={`${A}/trees-b.webp?${V}`} alt="" />

      <div className="lyr water par-play">
        <img className="water-tex" src={`${A}/water.webp?${V}`} alt="" />
        <div className="water-reflect" />
        <div className="water-sheen" />
      </div>

      <img className="lyr lilies-a par-play lily-sway" src={`${A}/lilies.webp?${V}`} alt="" />
      <img className="lyr lilies-b lily-sway-b" src={`${A}/lilies.webp?${V}`} alt="" />
      <img className="lyr rocks par-play" src={`${A}/rocks.webp?${V}`} alt="" />

      <div className="lyr play-rig par-play">
        <img className="pier-reflect" src={`${A}/pier.webp?${V}`} alt="" />
        <div className="pier-shadow" />
        <img className="pier" src={`${A}/pier.webp?${V}`} alt="" />
        <div className="pier-wet" />
        <div className="angler">
          <AnglerRig ref={angler} />
        </div>
      </div>

      <LiveCanvas ref={live} />

      <img className="lyr reeds-l par-fg reed-wind-a" src={`${A}/reeds.webp?${V}`} alt="" />
      <img className="lyr reeds-r par-fg reed-wind-b" src={`${A}/reeds.webp?${V}`} alt="" />
      <img className="lyr branch par-fg branch-wind" src={`${A}/branch.webp?${V}`} alt="" />

      <div className="wash" />
      <div className="fog-sheet" />
      <div className="vignette-sheet" />
      <div className="caustic-sheet" />
      <div className="weather-rain" />
      <div className="weather-snow" />
      <div className="lightning" />
      {feeding && <div className="feed-ring" />}
    </div>
  );
}
